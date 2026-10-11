# 💧 AquaGuard AI — Water Leak Detection & Response Platform

An end-to-end AI acoustic pipe monitoring and emergency dispatch system. Built with a custom 4-block PyTorch Convolutional Neural Network (CNN) trained on hydrophone and noise-logger acoustic recordings, a high-performance FastAPI backend with real-time WebSockets, and a modern Leaflet React dashboard.

---

## 🌟 Key Features

1. **Acoustic Neural Detection (LeakCNN)**
   - Normalized Log-Mel Spectrogram extraction (64 mel bins @ 8,000 Hz).
   - Augmentation: SpecAugment (time & frequency masking) + Gaussian noise + random time rolls.
   - Recording-level train/val/test split to prevent data leakage across chunked recordings.
   - Prioritized leak recall with weighted binary cross-entropy loss.
   - **Performance**: **96.85% Accuracy**, **97.26% Precision**, **97.26% Recall**, **0.9962 ROC-AUC**.

2. **Stateful Debounce Engine**
   - Eliminates transient false alarms.
   - Triggers an alert only after **2 consecutive LEAK windows** or when single-window **confidence > 0.85**.

3. **Autonomous Emergency Dispatch Engine**
   - Calculates geodesic Haversine distances to all active maintenance teams.
   - Dispatches the nearest available unit with real-time driving ETA estimation.
   - Transitions unit to `busy` status.

4. **Incident Workflow State Machine**
   - Enforces legal workflow progressions: `Team Notified` ➔ `On Work` ➔ `Work Done` ➔ `Clear Alert`.
   - Clearing an alert immediately frees the assigned team and resets the sensor to normal.
   - Comprehensive audit event log recording every state transition with timestamps and notes.

5. **Interactive Operations Dashboard**
   - **Leaflet Map**: Pulsing red markers for leak alerts, green markers for healthy nodes, maintenance unit markers.
   - **Real-Time Route Polylines**: Visualizes dispatch route with distance & ETA tooltip.
   - **Alert Feed**: Real-time sidebar with step-by-step dispatch workflow buttons.
   - **Audio Inspector**: Upload or drag-and-drop acoustic files to view time-domain waveforms, 2D spectrogram heatmaps, and prediction verdicts.
   - **Operational Analytics**: Average response and repair times, alerts per sensor, confusion matrix, and ROC curve plots.
   - **Admin Management**: Click the map to pick coordinates and provision new sensors or response teams.

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup
Install Python dependencies:
```bash
pip install -r requirements.txt
```

Run tests to verify the Haversine dispatch logic and state machine:
```bash
python -m unittest tests/test_core.py
```

Start the FastAPI backend:
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be available at: **http://localhost:8000/docs**

### 3. Frontend Setup
In a new terminal, navigate to the frontend folder and install packages:
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173** in your browser.

### 4. One-Command Windows Launch
Simply double-click `run.bat` or run:
```powershell
.\run.ps1
```

---

## 🔬 Dataset & ML Pipeline Summary

- **LEAK Class**: 500 audio recordings (1.0s each @ 8,000 Hz, mono) across 276 parent recording instances.
- **NO_LEAK Class**: 386 audio recordings (1.0s each @ 8,000 Hz, mono) across 71 parent recording instances.
- **Split Strategy**: Grouped by base recording ID:
  - Train: 242 recordings (606 audio windows)
  - Validation: 52 recordings (153 audio windows)
  - Test: 53 recordings (127 audio windows)
- **Artifacts Saved**:
  - Model weights: `ml/artifacts/leak_detector.pt`
  - Confusion Matrix: `ml/artifacts/confusion_matrix.png`
  - ROC Curve: `ml/artifacts/roc_curve.png`
  - Learning Curves: `ml/artifacts/training_curves.png`
  - Quantitative Metrics: `ml/artifacts/metrics.json`

To retrain the model at any time:
```bash
python ml/train.py
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/predict` | Upload audio file (`.wav`) for CNN inference |
| `GET` | `/api/sensors` | List all sensors with status and coordinates |
| `POST` | `/api/sensors` | Register new sensor (Admin) |
| `GET` | `/api/teams` | List maintenance teams and statuses |
| `GET` | `/api/alerts` | List incidents (filter: `active` or `resolved`) |
| `POST` | `/api/sensors/{id}/reading` | Ingest acoustic clip from a sensor |
| `POST` | `/api/alerts/{id}/status` | Transition status (`notified`, `on_work`, `work_done`, `cleared`) |
| `POST` | `/api/simulator/trigger-leak`| Force a simulated leak on a chosen sensor |
| `POST` | `/api/simulator/toggle` | Toggle continuous virtual sensor background stream |
| `GET` | `/api/analytics` | Retrieve KPIs and ML evaluation artifacts |
| `WS` | `/ws` | WebSocket real-time broadcast stream |
