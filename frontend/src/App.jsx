import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import AlertBanner from './components/AlertBanner';
import DashboardMap from './components/DashboardMap';
import AlertPanel from './components/AlertPanel';
import TelemetryPage from './pages/TelemetryPage';
import FleetPage from './pages/FleetPage';
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

      // Auto-focus first active alert if available
      const firstActive = alertList.find(a => a.status !== 'cleared');
      if (firstActive) {
        setFocusedAlert(firstActive);
      }
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
          console.log("[WebSocket] Real-time monitoring feed connected.");
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
          console.log("[WebSocket] Feed disconnected. Retrying in 3s...");
          reconnectTimer = setTimeout(connectWebSocket, 3000);
        };

        socket.onerror = (err) => {
          console.warn("[WebSocket] Error:", err);
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
        message: data.banner_message || `LEAK DETECTED at Sensor ${data.alert?.sensor_id}`,
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
      // update sensor last reading quietly
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
      // Refresh sensors and teams to reflect cleared status
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

  const activeAlertCount = alerts.filter(a => a.status !== 'cleared').length;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b0f19] text-gray-100 selection:bg-cyan-500 selection:text-black">
      
      {/* Left Vertical Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wsConnected={wsConnected}
        simulatorActive={simulatorActive}
        onToggleSimulator={handleToggleSimulator}
        onTriggerLeak={handleTriggerLeak}
        sensors={sensors}
        activeAlertCount={activeAlertCount}
      />

      {/* Main Scrollable Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0">
        
        {/* Emergency Alert Banner */}
        <AlertBanner
          banner={alertBanner}
          onDismiss={() => setAlertBanner(null)}
          onFocusAlert={(alert) => {
            setFocusedAlert(alert);
            setActiveTab('dashboard');
          }}
        />

        {/* Main View Area */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 max-w-[1720px] w-full mx-auto">
          {activeTab === 'dashboard' && (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 min-h-[750px]">
              
              {/* Map Area */}
              <div className="lg:col-span-8 flex flex-col h-full min-h-[500px]">
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

              {/* Right Alert Panel Feed */}
              <div className="lg:col-span-4 flex flex-col h-full min-h-[500px]">
                <AlertPanel
                  alerts={alerts}
                  activeFilter={activeAlertFilter}
                  setActiveFilter={setActiveAlertFilter}
                  onUpdateStatus={handleUpdateStatus}
                  onFocusAlert={(alert) => setFocusedAlert(alert)}
                />
              </div>

            </div>
          )}

          {activeTab === 'telemetry' && (
            <TelemetryPage sensors={sensors} onTriggerLeak={handleTriggerLeak} />
          )}

          {activeTab === 'fleet' && (
            <FleetPage teams={teams} onRefreshTeams={loadInitialData} />
          )}

          {activeTab === 'analytics' && <AnalyticsPage />}

          {activeTab === 'admin' && <AdminPage onRefreshSensors={loadInitialData} />}
        </main>

        {/* Footer Status Bar */}
        <footer className="border-t border-white/5 py-3 px-6 text-xs text-gray-500 bg-gray-950/80 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-400">AQUAGUARD AI — Mumbai Municipal Grid (BMC)</span>
            <span>•</span>
            <span>FastAPI + PyTorch CNN + Leaflet</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Active Nodes: {sensors.length}</span>
            <span>Response Units: {teams.length}</span>
            <span>Live Alerts: {activeAlertCount}</span>
          </div>
        </footer>

      </div>

    </div>
  );
}
