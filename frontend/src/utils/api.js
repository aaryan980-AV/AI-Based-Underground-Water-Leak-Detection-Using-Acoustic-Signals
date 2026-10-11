const API_BASE = '/api';

export const api = {
  // System config
  getConfig: async () => {
    const res = await fetch(`${API_BASE}/config`);
    return res.json();
  },

  // Sensors
  getSensors: async () => {
    const res = await fetch(`${API_BASE}/sensors`);
    return res.json();
  },
  createSensor: async (sensorData) => {
    const res = await fetch(`${API_BASE}/sensors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sensorData),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  updateSensor: async (id, updateData) => {
    const res = await fetch(`${API_BASE}/sensors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Teams
  getTeams: async () => {
    const res = await fetch(`${API_BASE}/teams`);
    return res.json();
  },
  createTeam: async (teamData) => {
    const res = await fetch(`${API_BASE}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamData),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  updateTeam: async (id, updateData) => {
    const res = await fetch(`${API_BASE}/teams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Alerts
  getAlerts: async (statusFilter = null) => {
    const url = statusFilter ? `${API_BASE}/alerts?status_filter=${statusFilter}` : `${API_BASE}/alerts`;
    const res = await fetch(url);
    return res.json();
  },
  updateAlertStatus: async (alertId, status, note = null) => {
    const res = await fetch(`${API_BASE}/alerts/${alertId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Status update failed');
    }
    return res.json();
  },

  // Predict
  predictAudio: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Prediction failed');
    }
    return res.json();
  },

  // Send reading from sensor
  sendSensorReading: async (sensorId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/sensors/${sensorId}/reading`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Simulator
  triggerLeak: async (sensorId) => {
    const res = await fetch(`${API_BASE}/simulator/trigger-leak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sensor_id: sensorId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  toggleSimulator: async (enable = null) => {
    const url = enable === null ? `${API_BASE}/simulator/toggle` : `${API_BASE}/simulator/toggle?enable=${enable}`;
    const res = await fetch(url, { method: 'POST' });
    return res.json();
  },
  getSimulatorStatus: async () => {
    const res = await fetch(`${API_BASE}/simulator/status`);
    return res.json();
  },

  // Analytics
  getAnalytics: async () => {
    const res = await fetch(`${API_BASE}/analytics`);
    return res.json();
  },
};
