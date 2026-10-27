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

  // Real demo audio sample fetcher
  getDemoSample: async (type = 'leak') => {
    const res = await fetch(`${API_BASE}/samples/demo?type=${type}`);
    if (!res.ok) throw new Error('Failed to load demo audio sample');
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : `${type}_sample.wav`;
    return new File([blob], filename, { type: 'audio/wav' });
  },

  // Sensor alert history
  getSensorAlerts: async (sensorId) => {
    const res = await fetch(`${API_BASE}/sensors/${sensorId}/alerts`);
    if (!res.ok) throw new Error('Failed to fetch sensor alert history');
    return res.json();
  },

  // Team jobs
  getTeamJobs: async (teamId) => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/jobs`);
    if (!res.ok) throw new Error('Failed to fetch team jobs');
    return res.json();
  },

  // Operational reports
  getReports: async ({ from = '', to = '', sensor_id = '', team_id = '' } = {}) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (sensor_id && sensor_id !== 'all') params.append('sensor_id', sensor_id);
    if (team_id && team_id !== 'all') params.append('team_id', team_id);
    const qs = params.toString();
    const url = qs ? `${API_BASE}/reports?${qs}` : `${API_BASE}/reports`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch reports');
    return res.json();
  },

  // Model performance comparison (CNN vs YOLO vs Fused)
  getModelComparison: async () => {
    const res = await fetch(`${API_BASE}/model-comparison`);
    if (!res.ok) throw new Error('Failed to fetch model comparison metrics');
    return res.json();
  },
};
