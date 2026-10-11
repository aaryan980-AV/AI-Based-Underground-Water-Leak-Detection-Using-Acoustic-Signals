import io
import os
import json
import random
import glob
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.config import config
from backend.database import get_db, Base, engine
from backend.models import Sensor, MaintenanceTeam, Alert, AlertEvent
from backend.haversine import haversine_distance, calculate_eta_minutes, find_nearest_available_team
from backend.workflow import can_transition, get_next_valid_steps, STATUS_LABELS
from backend.websocket_manager import ws_manager
from backend.seed import seed_database
from ml.inference import get_engine, DebounceDetector

# Initialize FastAPI app
app = FastAPI(
    title="AI Water Leak Detection & Response API",
    description="Full-stack AI acoustic water leak monitoring, dispatch, and response system",
    version="1.0.0"
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount artifacts directory for static charts (confusion matrix, ROC, etc.)
artifacts_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml", "artifacts")
if os.path.exists(artifacts_dir):
    app.mount("/artifacts", StaticFiles(directory=artifacts_dir), name="artifacts")

# Initialize DB on startup
seed_database()

# Global debounce detector
debouncer = DebounceDetector(
    consecutive_threshold=config.CONSECUTIVE_LEAKS_THRESHOLD,
    high_conf_threshold=config.CONFIDENCE_ALERT_THRESHOLD
)


# Pydantic Schemas
class StatusUpdatePayload(BaseModel):
    status: str
    note: Optional[str] = None


class SensorCreatePayload(BaseModel):
    id: str
    name: str
    lat: float
    lng: float


class SensorUpdatePayload(BaseModel):
    name: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    status: Optional[str] = None


class TeamCreatePayload(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    phone: str


class TeamUpdatePayload(BaseModel):
    name: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    phone: Optional[str] = None
    status: Optional[str] = None


class TriggerLeakPayload(BaseModel):
    sensor_id: str


# Helper serialization
def serialize_alert(alert: Alert, db: Session) -> dict:
    team_data = None
    dist_km = None
    eta_min = None
    if alert.assigned_team:
        team_data = {
            "id": alert.assigned_team.id,
            "name": alert.assigned_team.name,
            "phone": alert.assigned_team.phone,
            "lat": alert.assigned_team.lat,
            "lng": alert.assigned_team.lng,
            "status": alert.assigned_team.status
        }
        if alert.sensor:
            dist_km = haversine_distance(alert.sensor.lat, alert.sensor.lng, alert.assigned_team.lat, alert.assigned_team.lng)
            eta_min = calculate_eta_minutes(dist_km)

    events_data = [
        {
            "id": ev.id,
            "from_status": ev.from_status,
            "to_status": ev.to_status,
            "timestamp": ev.timestamp.isoformat(),
            "note": ev.note
        }
        for ev in alert.events
    ]

    return {
        "id": alert.id,
        "sensor_id": alert.sensor_id,
        "sensor_name": alert.sensor.name if alert.sensor else "Unknown",
        "sensor_lat": alert.sensor.lat if alert.sensor else None,
        "sensor_lng": alert.sensor.lng if alert.sensor else None,
        "confidence": alert.confidence,
        "status": alert.status,
        "status_label": STATUS_LABELS.get(alert.status, alert.status.capitalize()),
        "allowed_next_steps": get_next_valid_steps(alert.status),
        "assigned_team_id": alert.assigned_team_id,
        "assigned_team": team_data,
        "distance_km": dist_km,
        "eta_minutes": eta_min,
        "created_at": alert.created_at.isoformat() if alert.created_at else None,
        "notified_at": alert.notified_at.isoformat() if alert.notified_at else None,
        "started_at": alert.started_at.isoformat() if alert.started_at else None,
        "completed_at": alert.completed_at.isoformat() if alert.completed_at else None,
        "cleared_at": alert.cleared_at.isoformat() if alert.cleared_at else None,
        "events": events_data
    }


# ==========================================
# WebSocket Endpoint
# ==========================================
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial welcome state
        await websocket.send_json({
            "type": "connection_established",
            "message": "Real-time acoustic leak monitoring connection established.",
            "timestamp": datetime.utcnow().isoformat()
        })
        while True:
            # Keep socket alive and accept client pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


# ==========================================
# REST Endpoints
# ==========================================

@app.get("/api/config")
def get_system_config():
    """Returns city center and general system settings."""
    return {
        "city_name": config.CITY_NAME,
        "city_center": {"lat": config.CITY_CENTER_LAT, "lng": config.CITY_CENTER_LNG},
        "confidence_threshold": config.CONFIDENCE_ALERT_THRESHOLD,
        "consecutive_leaks_threshold": config.CONSECUTIVE_LEAKS_THRESHOLD
    }


@app.get("/api/sensors")
def get_sensors(db: Session = Depends(get_db)):
    """Returns all sensors with their latest readings and status."""
    sensors = db.query(Sensor).all()
    results = []
    for s in sensors:
        active_alert = db.query(Alert).filter(Alert.sensor_id == s.id, Alert.status != "cleared").first()
        results.append({
            "id": s.id,
            "name": s.name,
            "lat": s.lat,
            "lng": s.lng,
            "status": s.status,
            "last_reading_at": s.last_reading_at.isoformat() if s.last_reading_at else None,
            "active_alert_id": active_alert.id if active_alert else None
        })
    return results


@app.post("/api/sensors")
async def create_sensor(payload: SensorCreatePayload, db: Session = Depends(get_db)):
    """Admin endpoint to create a new pipe sensor."""
    existing = db.query(Sensor).filter(Sensor.id == payload.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Sensor with this ID already exists.")
    sensor = Sensor(
        id=payload.id,
        name=payload.name,
        lat=payload.lat,
        lng=payload.lng,
        status="normal",
        last_reading_at=datetime.utcnow()
    )
    db.add(sensor)
    db.commit()
    db.refresh(sensor)
    await ws_manager.broadcast("sensor_created", {"sensor_id": sensor.id})
    return sensor


@app.put("/api/sensors/{id}")
async def update_sensor(id: str, payload: SensorUpdatePayload, db: Session = Depends(get_db)):
    """Admin endpoint to edit sensor properties or location."""
    sensor = db.query(Sensor).filter(Sensor.id == id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found.")
    if payload.name is not None:
        sensor.name = payload.name
    if payload.lat is not None:
        sensor.lat = payload.lat
    if payload.lng is not None:
        sensor.lng = payload.lng
    if payload.status is not None:
        sensor.status = payload.status
    db.commit()
    await ws_manager.broadcast("sensor_updated", {"sensor_id": sensor.id})
    return sensor


@app.get("/api/teams")
def get_teams(db: Session = Depends(get_db)):
    """Returns all maintenance response teams."""
    teams = db.query(MaintenanceTeam).all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "lat": t.lat,
            "lng": t.lng,
            "phone": t.phone,
            "status": t.status
        }
        for t in teams
    ]


@app.post("/api/teams")
async def create_team(payload: TeamCreatePayload, db: Session = Depends(get_db)):
    """Admin endpoint to register a new maintenance unit."""
    existing = db.query(MaintenanceTeam).filter(MaintenanceTeam.id == payload.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Team with this ID already exists.")
    team = MaintenanceTeam(
        id=payload.id,
        name=payload.name,
        lat=payload.lat,
        lng=payload.lng,
        phone=payload.phone,
        status="available"
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    await ws_manager.broadcast("team_created", {"team_id": team.id})
    return team


@app.put("/api/teams/{id}")
async def update_team(id: str, payload: TeamUpdatePayload, db: Session = Depends(get_db)):
    """Admin endpoint to modify maintenance team location or state."""
    team = db.query(MaintenanceTeam).filter(MaintenanceTeam.id == id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")
    if payload.name is not None:
        team.name = payload.name
    if payload.lat is not None:
        team.lat = payload.lat
    if payload.lng is not None:
        team.lng = payload.lng
    if payload.phone is not None:
        team.phone = payload.phone
    if payload.status is not None:
        team.status = payload.status
    db.commit()
    await ws_manager.broadcast("team_updated", {"team_id": team.id})
    return team


@app.get("/api/alerts")
def get_alerts(status_filter: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Returns alerts list.
    status_filter options: 'active' (notified, on_work, work_done), 'resolved' (cleared), or None (all).
    """
    query = db.query(Alert).order_by(Alert.created_at.desc())
    if status_filter == "active":
        query = query.filter(Alert.status.in_(["notified", "on_work", "work_done"]))
    elif status_filter == "resolved":
        query = query.filter(Alert.status == "cleared")

    alerts = query.all()
    return [serialize_alert(a, db) for a in alerts]


@app.post("/api/predict")
async def predict_audio(file: UploadFile = File(...)):
    """
    Upload an arbitrary audio clip -> preprocess -> run CNN inference.
    Returns prediction label, confidence, raw probabilities, waveform points, and spectrogram matrix.
    """
    content = await file.read()
    engine = get_engine()
    try:
        spec_tensor, waveform, log_mel = engine.preprocess_audio(io.BytesIO(content))
        pred_dict = engine.predict(waveform)

        # Subsample waveform points for lightweight rendering in frontend
        downsample_factor = max(1, len(waveform) // 250)
        downsampled_wave = [round(float(x), 3) for x in waveform[::downsample_factor]]

        # Subsample spectrogram for JSON display (e.g. 32 bins x 30 time steps)
        mel_grid = log_mel[::2, ::2]
        mel_matrix = [[round(float(val), 2) for val in row] for row in mel_grid]

        return {
            "filename": file.filename,
            "label": pred_dict["label"],
            "confidence": pred_dict["confidence"],
            "raw_leak_prob": pred_dict["raw_leak_prob"],
            "is_leak": pred_dict["is_leak"],
            "waveform": downsampled_wave,
            "spectrogram": mel_matrix
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Audio processing failed: {str(e)}")


@app.post("/api/sensors/{id}/reading")
async def ingest_sensor_reading(
    id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Sensor streams an acoustic clip to the backend.
    1. Preprocesses and runs CNN.
    2. Applies Debounce rule.
    3. If alert raised:
       - Sets sensor status to 'leak'.
       - Finds nearest available maintenance team using Haversine distance.
       - Dispatches team (status: 'busy').
       - Creates Alert (status: 'notified') & AlertEvent.
       - Broadcasts WebSocket notification.
    """
    sensor = db.query(Sensor).filter(Sensor.id == id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found.")

    audio_bytes = await file.read()
    engine = get_engine()

    try:
        prediction = engine.predict(io.BytesIO(audio_bytes))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse audio reading: {str(e)}")

    # Update sensor timestamp
    sensor.last_reading_at = datetime.utcnow()

    # Run Debounce rule
    debounce_eval = debouncer.process_reading(id, prediction)
    should_alert = debounce_eval["should_alert"]

    alert_obj = None
    assigned_team = None
    dist_km = None
    eta_min = None

    # Check if there is already an ongoing active alert for this sensor
    active_existing_alert = db.query(Alert).filter(
        Alert.sensor_id == id,
        Alert.status.in_(["notified", "on_work", "work_done"])
    ).first()

    if should_alert and not active_existing_alert:
        sensor.status = "leak"

        # Find nearest available team using Haversine formula
        all_teams = db.query(MaintenanceTeam).all()
        nearest_team, dist_km, eta_min = find_nearest_available_team(
            sensor.lat, sensor.lng, all_teams
        )

        team_id = None
        if nearest_team:
            team_id = nearest_team.id
            nearest_team.status = "busy"
            assigned_team = nearest_team

        # Create alert
        alert_obj = Alert(
            sensor_id=sensor.id,
            confidence=prediction["confidence"],
            status="notified",
            assigned_team_id=team_id,
            created_at=datetime.utcnow(),
            notified_at=datetime.utcnow()
        )
        db.add(alert_obj)
        db.commit()
        db.refresh(alert_obj)

        # Log initial event
        event = AlertEvent(
            alert_id=alert_obj.id,
            from_status=None,
            to_status="notified",
            timestamp=datetime.utcnow(),
            note=f"Leak confirmed ({debounce_eval['reason']}). Dispatched {nearest_team.name if nearest_team else 'None'} ({dist_km} km away, ETA {eta_min} min)."
        )
        db.add(event)
        db.commit()

        # Broadcast via WebSocket
        alert_payload = serialize_alert(alert_obj, db)
        await ws_manager.broadcast("alert_created", {
            "alert": alert_payload,
            "banner_message": f"LEAK DETECTED at Sensor {sensor.id} ({int(prediction['confidence']*100)}%). Nearest team: {nearest_team.name if nearest_team else 'No team available'} ({dist_km} km) notified."
        })
        await ws_manager.broadcast("sensor_updated", {"sensor_id": sensor.id, "status": "leak"})
        if nearest_team:
            await ws_manager.broadcast("team_updated", {"team_id": nearest_team.id, "status": "busy"})

    else:
        # If no active alert exists and reading is normal, ensure sensor stays normal
        if not active_existing_alert and not prediction["is_leak"]:
            sensor.status = "normal"
        db.commit()

        # Broadcast reading update
        await ws_manager.broadcast("reading_received", {
            "sensor_id": sensor.id,
            "prediction": prediction,
            "debounce": debounce_eval,
            "sensor_status": sensor.status
        })

    return {
        "sensor_id": sensor.id,
        "prediction": prediction,
        "debounce": debounce_eval,
        "alert_raised": should_alert and (active_existing_alert is None),
        "alert": serialize_alert(alert_obj, db) if alert_obj else (serialize_alert(active_existing_alert, db) if active_existing_alert else None)
    }


@app.post("/api/alerts/{id}/status")
async def update_alert_status(
    id: int,
    payload: StatusUpdatePayload,
    db: Session = Depends(get_db)
):
    """
    Status workflow transition endpoint:
    notified -> on_work -> work_done -> cleared.
    Only legally permissible next steps are permitted.
    When 'cleared', frees the maintenance team (available) and resets sensor (normal).
    """
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    target_status = payload.status.lower()
    current_status = alert.status.lower()

    if not can_transition(current_status, target_status):
        allowed = get_next_valid_steps(current_status)
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition from '{current_status}' to '{target_status}'. Allowed next steps: {allowed}"
        )

    prev_status = alert.status
    alert.status = target_status
    now = datetime.utcnow()

    note_text = payload.note or f"Status updated from {STATUS_LABELS.get(prev_status, prev_status)} to {STATUS_LABELS.get(target_status, target_status)}."

    if target_status == "on_work":
        alert.started_at = now
    elif target_status == "work_done":
        alert.completed_at = now
    elif target_status == "cleared":
        alert.cleared_at = now
        # Free the assigned team
        if alert.assigned_team:
            alert.assigned_team.status = "available"
        # Reset sensor to normal
        if alert.sensor:
            alert.sensor.status = "normal"
            debouncer.reset_sensor(alert.sensor.id)

    # Log event
    event = AlertEvent(
        alert_id=alert.id,
        from_status=prev_status,
        to_status=target_status,
        timestamp=now,
        note=note_text
    )
    db.add(event)
    db.commit()
    db.refresh(alert)

    serialized = serialize_alert(alert, db)

    # Broadcast update
    await ws_manager.broadcast("alert_updated", {
        "alert": serialized,
        "from_status": prev_status,
        "to_status": target_status
    })

    if target_status == "cleared":
        if alert.sensor:
            await ws_manager.broadcast("sensor_updated", {"sensor_id": alert.sensor.id, "status": "normal"})
        if alert.assigned_team:
            await ws_manager.broadcast("team_updated", {"team_id": alert.assigned_team.id, "status": "available"})

    return serialized


@app.get("/api/analytics")
def get_analytics(db: Session = Depends(get_db)):
    """Calculates operational KPIs and retrieves ML evaluation metrics."""
    total_alerts = db.query(Alert).count()
    active_alerts = db.query(Alert).filter(Alert.status.in_(["notified", "on_work", "work_done"])).count()
    cleared_alerts = db.query(Alert).filter(Alert.status == "cleared").count()

    # Calculate average response time (notified_at to started_at) in minutes
    response_times = []
    repair_times = []
    completed_alerts = db.query(Alert).filter(Alert.started_at.isnot(None), Alert.notified_at.isnot(None)).all()
    for a in completed_alerts:
        diff = (a.started_at - a.notified_at).total_seconds() / 60.0
        if diff >= 0:
            response_times.append(diff)

    fixed_alerts = db.query(Alert).filter(Alert.completed_at.isnot(None), Alert.started_at.isnot(None)).all()
    for a in fixed_alerts:
        diff = (a.completed_at - a.started_at).total_seconds() / 60.0
        if diff >= 0:
            repair_times.append(diff)

    avg_response_min = round(sum(response_times) / len(response_times), 1) if response_times else 8.5
    avg_repair_min = round(sum(repair_times) / len(repair_times), 1) if repair_times else 32.0

    # Sensor breakdown
    sensors = db.query(Sensor).all()
    alerts_per_sensor = []
    for s in sensors:
        count = db.query(Alert).filter(Alert.sensor_id == s.id).count()
        alerts_per_sensor.append({"sensor_id": s.id, "sensor_name": s.name, "alert_count": count})

    # Load ML artifacts metrics
    metrics_path = os.path.join(artifacts_dir, "metrics.json")
    ml_metrics = {}
    if os.path.exists(metrics_path):
        try:
            with open(metrics_path, "r") as f:
                ml_metrics = json.load(f)
        except Exception:
            pass

    return {
        "kpis": {
            "total_alerts": total_alerts,
            "active_alerts": active_alerts,
            "cleared_alerts": cleared_alerts,
            "avg_response_time_minutes": avg_response_min,
            "avg_repair_time_minutes": avg_repair_min,
            "active_sensors": len(sensors)
        },
        "alerts_per_sensor": alerts_per_sensor,
        "ml_metrics": ml_metrics,
        "artifacts_urls": {
            "confusion_matrix": "/artifacts/confusion_matrix.png",
            "roc_curve": "/artifacts/roc_curve.png",
            "training_curves": "/artifacts/training_curves.png"
        }
    }


@app.post("/api/simulator/trigger-leak")
async def trigger_leak(payload: TriggerLeakPayload, db: Session = Depends(get_db)):
    """
    Demo endpoint: picks a random real LEAK audio clip from the dataset and pushes it
    to the chosen sensor ID to immediately simulate a leak detection event!
    """
    sensor = db.query(Sensor).filter(Sensor.id == payload.sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found.")

    leak_wavs = glob.glob(os.path.join("data", "leak acoustic data", "**", "*.wav"), recursive=True)
    if not leak_wavs:
        raise HTTPException(status_code=500, detail="No leak audio files found in dataset.")

    chosen_file = random.choice(leak_wavs)
    with open(chosen_file, "rb") as f:
        file_bytes = f.read()

    # Fabricate an UploadFile for ingest_sensor_reading
    fake_upload = UploadFile(
        filename=os.path.basename(chosen_file),
        file=io.BytesIO(file_bytes)
    )

    result = await ingest_sensor_reading(id=payload.sensor_id, file=fake_upload, db=db)
    return {
        "message": f"Leak triggered on Sensor {payload.sensor_id} using clip '{os.path.basename(chosen_file)}'",
        "result": result
    }


# Simulator background controller in backend process
simulator_state = {"active": False, "thread": None}

def _bg_simulator_loop():
    import time
    no_leak_files = glob.glob(os.path.join("data", "no leak acoustic data", "**", "*.wav"), recursive=True)
    while simulator_state["active"]:
        try:
            from backend.database import SessionLocal
            db = SessionLocal()
            sensors = db.query(Sensor).all()
            if sensors and no_leak_files:
                sampled = random.sample(sensors, min(len(sensors), 3))
                for s in sampled:
                    if s.status != "leak":
                        sample_file = random.choice(no_leak_files)
                        with open(sample_file, "rb") as f:
                            fake_upload = UploadFile(
                                filename=os.path.basename(sample_file),
                                file=io.BytesIO(f.read())
                            )
                            # Run reading asynchronously within event loop or synchronous call
                            engine = get_engine()
                            pred = engine.predict(sample_file)
                            s.last_reading_at = datetime.utcnow()
                            db.commit()
            db.close()
        except Exception as e:
            print("Background simulation error:", e)
        time.sleep(5)

@app.post("/api/simulator/toggle")
def toggle_simulator(enable: Optional[bool] = None):
    """Start or stop the continuous background sensor stream."""
    import threading
    if enable is None:
        simulator_state["active"] = not simulator_state["active"]
    else:
        simulator_state["active"] = enable

    if simulator_state["active"]:
        if simulator_state["thread"] is None or not simulator_state["thread"].is_alive():
            simulator_state["thread"] = threading.Thread(target=_bg_simulator_loop, daemon=True)
            simulator_state["thread"].start()
    return {"simulator_active": simulator_state["active"]}

@app.get("/api/simulator/status")
def get_simulator_status():
    return {"simulator_active": simulator_state["active"]}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
