import os
from datetime import datetime
from backend.database import SessionLocal, engine, Base
from backend.models import Sensor, MaintenanceTeam, Alert, AlertEvent
from backend.config import config


def seed_database(force=False):
    """Initializes tables and seeds initial sensors and maintenance teams across Mumbai."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if force:
        # Clear existing data for fresh Mumbai re-seeding
        db.query(AlertEvent).delete()
        db.query(Alert).delete()
        db.query(Sensor).delete()
        db.query(MaintenanceTeam).delete()
        db.commit()
    else:
        # Check if already seeded with Mumbai data
        first_sensor = db.query(Sensor).first()
        if first_sensor and "Mumbai" in config.CITY_NAME and (18.5 <= first_sensor.lat <= 19.5):
            print("Database already seeded with Mumbai telemetry nodes.")
            db.close()
            return
        elif first_sensor:
            # Clear old non-Mumbai data to migrate cleanly
            db.query(AlertEvent).delete()
            db.query(Alert).delete()
            db.query(Sensor).delete()
            db.query(MaintenanceTeam).delete()
            db.commit()

    print(f"Seeding Mumbai Water Distribution Network ({config.CITY_NAME})...")

    # 12 strategic sensor locations across Mumbai's primary water pipelines
    mumbai_sensors = [
        {"id": "S-01", "name": "Bhandup Treatment Complex Main Trunk", "lat": 19.1438, "lng": 72.9372},
        {"id": "S-02", "name": "Powai Lake High Pressure Conduit", "lat": 19.1250, "lng": 72.9050},
        {"id": "S-03", "name": "Bandra Kurla Complex (BKC) Hydro Hub", "lat": 19.0660, "lng": 72.8685},
        {"id": "S-04", "name": "Dadar TT Circle Arterial Junction", "lat": 19.0178, "lng": 72.8478},
        {"id": "S-05", "name": "Marine Drive Coastal Feeder Pipe", "lat": 18.9430, "lng": 72.8235},
        {"id": "S-06", "name": "Worli Sea Face Main Pipeline Valve", "lat": 19.0125, "lng": 72.8150},
        {"id": "S-07", "name": "Andheri West Link Road Distribution Loop", "lat": 19.1360, "lng": 72.8290},
        {"id": "S-08", "name": "Dharavi 90-Feet Road Transmission Node", "lat": 19.0430, "lng": 72.8550},
        {"id": "S-09", "name": "Kurla West - LBS Marg Feeder Line", "lat": 19.0710, "lng": 72.8800},
        {"id": "S-10", "name": "Malabar Hill Reservoir Outlet Valve", "lat": 18.9540, "lng": 72.8050},
        {"id": "S-11", "name": "Ghatkopar High Level Reservoir Feeder", "lat": 19.0880, "lng": 72.9150},
        {"id": "S-12", "name": "Colaba Causeway Terminal Feeder", "lat": 18.9100, "lng": 72.8250},
    ]

    for s in mumbai_sensors:
        sensor = Sensor(
            id=s["id"],
            name=s["name"],
            lat=s["lat"],
            lng=s["lng"],
            status="normal",
            last_reading_at=datetime.utcnow()
        )
        db.add(sensor)

    # 4 BMC Hydraulic Engineer Department Emergency Response Teams
    mumbai_teams = [
        {
            "id": "TEAM-01",
            "name": "BMC Rapid Hydro Unit - BKC & Central",
            "lat": 19.0620,
            "lng": 72.8650,
            "phone": "+91 22 2653 4400"
        },
        {
            "id": "TEAM-02",
            "name": "BMC Emergency Depot - Dadar (F/North Ward)",
            "lat": 19.0220,
            "lng": 72.8430,
            "phone": "+91 22 2414 5500"
        },
        {
            "id": "TEAM-03",
            "name": "Western Suburbs Valve Crew - Andheri (K/West)",
            "lat": 19.1200,
            "lng": 72.8380,
            "phone": "+91 22 2623 8800"
        },
        {
            "id": "TEAM-04",
            "name": "South Mumbai Pipeline Division - Fort (A-Ward)",
            "lat": 18.9350,
            "lng": 72.8350,
            "phone": "+91 22 2269 1100"
        },
    ]

    for t in mumbai_teams:
        team = MaintenanceTeam(
            id=t["id"],
            name=t["name"],
            lat=t["lat"],
            lng=t["lng"],
            phone=t["phone"],
            status="available"
        )
        db.add(team)

    db.commit()
    print("Database seeding completed with 12 Mumbai sensors and 4 BMC emergency teams.")
    db.close()


if __name__ == "__main__":
    seed_database(force=True)
