import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AlertBanner from './components/AlertBanner';
import DashboardMap from './components/DashboardMap';
import AlertPanel from './components/AlertPanel';
import AlertsPage from './pages/AlertsPage';
import SensorsPage from './pages/SensorsPage';
import TeamsPage from './pages/TeamsPage';
import ReportsPage from './pages/ReportsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminPage from './pages/AdminPage';
import { api } from './utils/api';
import { soundAlert } from './utils/audioAlert';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sensors, setSensors] = useState([]);
  const [teams, setTeams] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeAlertFilter, setActiveAlertFilter] = useState('active');
  const [focusedAlert, setFocusedAlert] = useState(null);
  const [alertBanner, setAlertBanner] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [simulatorActive, setSimulatorActive] = useState(false);

  const wsRef = useRef(null);

  // Fetch initial system state
  const loadInitialData = async () => {
    try {
      const [sensorList, teamList, alertList, simStatus] = await Promise.all([
        api.getSensors(),
        api.getTeams(),
        api.getAlerts(),
        api.getSimulatorStatus().catch(() => ({ simulator_active: false }))
      ]);
      setSensors(sensorList);
      setTeams(teamList);
      setAlerts(alertList);
      setSimulatorActive(!!simStatus.simulator_active);

      // Keep full city overview on initial load (users can click 'Locate' on any alert to focus)
    } catch (e) {
      console.error("Initial data load error:", e);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Setup WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let socket;
    let reconnectTimer;

    const connectWebSocket = () => {
      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          setWsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            handleWebSocketMessage(msg);
          } catch (err) {
            console.warn("Could not parse WS message:", err);
          }
        };

        socket.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connectWebSocket, 3000);
        };

        socket.onerror = () => {
          socket.close();
        };

        wsRef.current = socket;
      } catch (err) {
        console.error("WebSocket init error:", err);
        reconnectTimer = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleWebSocketMessage = (msg) => {
    const { type, data } = msg;

    if (type === 'alert_created') {
      soundAlert.playAlertSound();
      setAlertBanner({
        message: data.banner_message || `Leak detected at Sensor ${data.alert?.sensor_id}`,
        alert: data.alert
      });
      setFocusedAlert(data.alert);
      loadInitialData();
    } else if (type === 'alert_updated') {
      loadInitialData();
    } else if (type === 'sensor_updated' || type === 'sensor_created') {
      api.getSensors().then(setSensors).catch(console.error);
    } else if (type === 'team_updated' || type === 'team_created') {
      api.getTeams().then(setTeams).catch(console.error);
    } else if (type === 'reading_received') {
      setSensors(prev => prev.map(s => {
        if (s.id === data.sensor_id) {
          return { ...s, last_reading_at: new Date().toISOString() };
        }
        return s;
      }));
    }
  };

  // Status transition handler
  const handleUpdateStatus = async (alertId, nextStatus) => {
    try {
      const updated = await api.updateAlertStatus(alertId, nextStatus);
      setAlerts(prev => prev.map(a => a.id === alertId ? updated : a));
      const [sList, tList] = await Promise.all([api.getSensors(), api.getTeams()]);
      setSensors(sList);
      setTeams(tList);
      if (nextStatus === 'cleared' && focusedAlert?.id === alertId) {
        setFocusedAlert(null);
      }
    } catch (err) {
      alert("Status update failed: " + err.message);
    }
  };

  // Trigger leak demo
  const handleTriggerLeak = async (sensorId) => {
    try {
      await api.triggerLeak(sensorId);
    } catch (err) {
      alert("Trigger leak failed: " + err.message);
    }
  };

  // Toggle background simulator
  const handleToggleSimulator = async () => {
    try {
      const res = await api.toggleSimulator();
      setSimulatorActive(!!res.simulator_active);
    } catch (err) {
      console.error("Toggle simulator error:", err);
    }
  };

  // Toggle team availability
  const handleToggleTeamStatus = async (team) => {
    const next = team.status === 'available' ? 'busy' : 'available';
    try {
      await api.updateTeam(team.id, { status: next });
      setTeams(prev => prev.map(t => t.id === team.id ? { ...t, status: next } : t));
    } catch (e) {
      alert("Failed to toggle team status: " + e.message);
    }
  };

  // Select sensor on map and switch to dashboard
  const handleSelectSensorOnMap = (sensor) => {
    setActiveTab('dashboard');
    const alertMatch = alerts.find(a => a.sensor_id === sensor.id && a.status !== 'cleared');
    if (alertMatch) {
      setFocusedAlert(alertMatch);
    } else {
      setFocusedAlert({
        id: null,
        sensor_id: sensor.id,
        sensor_name: sensor.name,
        sensor_lat: sensor.lat,
        sensor_lng: sensor.lng,
      });
    }
  };

  const activeAlertCount = alerts.filter(a => a.status !== 'cleared').length;
  const teamsAvailableCount = teams.filter(t => t.status === 'available').length;

  const alertsTodayCount = alerts.filter(a => {
    if (!a.created_at) return false;
    const alertDate = new Date(a.created_at);
    const now = new Date();
    return alertDate.toDateString() === now.toDateString();
  }).length;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white text-[#1f2933]">
      {/* Plain White Header Bar */}
      <Header wsConnected={wsConnected} />

      {/* Main Body with Sidebar and Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar (220px) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          simulatorActive={simulatorActive}
          onToggleSimulator={handleToggleSimulator}
          onTriggerLeak={handleTriggerLeak}
          sensors={sensors}
          activeAlertCount={activeAlertCount}
        />

        {/* Content Container */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-white">
          {/* Toast Alert Banner */}
          <AlertBanner
            banner={alertBanner}
            onDismiss={() => setAlertBanner(null)}
            onFocusAlert={(alert) => {
              setFocusedAlert(alert);
              setActiveTab('dashboard');
            }}
          />

          {/* Main Views */}
          <main className="flex-1 p-4 lg:p-5 max-w-[1720px] w-full mx-auto">
            {activeTab === 'dashboard' && (
              <div className="space-y-4 flex flex-col h-full">
                {/* Row of 4 Colored Stat Boxes */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
                  <div className="stat-box stat-box-blue">
                    <div className="stat-box-label">Total sensors</div>
                    <div className="stat-box-value-container">
                      <div className="stat-box-value">{sensors.length}</div>
                    </div>
                  </div>

                  <div className="stat-box stat-box-red">
                    <div className="stat-box-label">Active leaks</div>
                    <div className="stat-box-value-container">
                      <div className="stat-box-value">{activeAlertCount}</div>
                    </div>
                  </div>

                  <div className="stat-box stat-box-teal">
                    <div className="stat-box-label">Teams available</div>
                    <div className="stat-box-value-container">
                      <div className="stat-box-value">{teamsAvailableCount}</div>
                    </div>
                  </div>

                  <div className="stat-box stat-box-amber">
                    <div className="stat-box-label">Alerts today</div>
                    <div className="stat-box-value-container">
                      <div className="stat-box-value">{alertsTodayCount}</div>
                    </div>
                  </div>
                </div>

                {/* Below: Map (65%) and Alert Panel (35%), Same Height */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[580px]">
                  {/* Map: 65% width (col-span-8 of 12 approx 66.6%) */}
                  <div className="lg:col-span-8 flex flex-col h-full min-h-[480px]">
                    <DashboardMap
                      sensors={sensors}
                      teams={teams}
                      alerts={alerts}
                      focusedAlert={focusedAlert}
                      onSelectSensor={(sensor) => {
                        const alertMatch = alerts.find(a => a.sensor_id === sensor.id && a.status !== 'cleared');
                        if (alertMatch) {
                          setFocusedAlert(alertMatch);
                        }
                      }}
                    />
                  </div>

                  {/* Alert Panel: 35% width (col-span-4 of 12 approx 33.3%) */}
                  <div className="lg:col-span-4 flex flex-col h-full min-h-[480px]">
                    <AlertPanel
                      alerts={alerts}
                      teams={teams}
                      activeFilter={activeAlertFilter}
                      setActiveFilter={setActiveAlertFilter}
                      onUpdateStatus={handleUpdateStatus}
                      onFocusAlert={(alert) => setFocusedAlert(alert)}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'alerts' && (
              <AlertsPage
                alerts={alerts}
                sensors={sensors}
                teams={teams}
                onUpdateStatus={handleUpdateStatus}
                onTriggerLeak={handleTriggerLeak}
                onToggleTeamStatus={handleToggleTeamStatus}
              />
            )}

            {activeTab === 'sensors' && (
              <SensorsPage
                sensors={sensors}
                onSelectSensorOnMap={handleSelectSensorOnMap}
              />
            )}

            {activeTab === 'teams' && (
              <TeamsPage
                teams={teams}
                onRefreshTeams={loadInitialData}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsPage
                sensors={sensors}
                teams={teams}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsPage onNavigate={setActiveTab} />
            )}

            {activeTab === 'admin' && (
              <AdminPage onRefreshSensors={loadInitialData} />
            )}
          </main>

          {/* Simple Bottom Status Bar */}
          <footer className="border-t border-[#dbe3ea] py-2.5 px-5 text-xs text-[#5b6b7b] bg-[#f4f8fb] flex items-center justify-between shrink-0">
            <span className="font-semibold text-[#0a3d62]">Water Leak Monitoring System v1.0</span>
            <div className="flex items-center gap-4 text-[#5b6b7b]">
              <span>Monitored sensors: <strong className="text-[#0b6fb8] font-mono">{sensors.length}</strong></span>
              <span>Available teams: <strong className="text-[#139a9a] font-mono">{teamsAvailableCount}/{teams.length}</strong></span>
              <span>Active leaks: <strong className={`font-mono ${activeAlertCount > 0 ? 'text-[#d64545]' : 'text-[#2e9e5b]'}`}>{activeAlertCount}</strong></span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
