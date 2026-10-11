import React, { useState } from 'react';
import { 
  Droplets, 
  Radio, 
  Activity, 
  Sliders, 
  BarChart3, 
  Volume2, 
  VolumeX, 
  Play, 
  Square, 
  AlertTriangle,
  Truck,
  PhoneCall,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import { soundAlert } from '../utils/audioAlert';

export default function Sidebar({
  activeTab,
  setActiveTab,
  wsConnected,
  simulatorActive,
  onToggleSimulator,
  onTriggerLeak,
  sensors = [],
  activeAlertCount = 0,
}) {
  const [soundEnabled, setSoundEnabled] = useState(soundAlert.enabled);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState(sensors[0]?.id || 'S-04');

  const toggleSound = () => {
    soundAlert.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const handleTrigger = () => {
    onTriggerLeak(selectedSensor);
    setShowTriggerModal(false);
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Command Map',
      icon: Radio,
      badge: activeAlertCount > 0 ? `${activeAlertCount} Leak` : null,
      badgeColor: 'bg-rose-500 text-white animate-pulse',
    },
    {
      id: 'telemetry',
      label: 'Pipe Telemetry',
      icon: Activity,
      badge: `${sensors.length} Nodes`,
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    },
    {
      id: 'fleet',
      label: 'Response Fleet',
      icon: Truck,
      badge: '4 Units',
      badgeColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    },
    {
      id: 'analytics',
      label: 'KPIs & Analytics',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'admin',
      label: 'Asset Admin',
      icon: Sliders,
      badge: null,
    },
  ];

  return (
    <>
      <aside className="w-64 lg:w-72 shrink-0 bg-[#0d121f] border-r border-white/10 flex flex-col justify-between h-screen sticky top-0 z-40 select-none shadow-2xl">
        
        {/* Top Header Section */}
        <div className="p-5 border-b border-white/10 space-y-4">
          
          {/* Logo & Brand */}
          <div 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-xl shadow-cyan-500/25 text-white group-hover:scale-105 transition-transform">
              <Droplets className="w-6 h-6 animate-pulse" />
              <div className="absolute -inset-0.5 rounded-2xl bg-cyan-400 opacity-25 blur-sm"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">
                  AQUA<span className="text-cyan-400">GUARD</span>
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  BMC
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium">Mumbai Water Grid</p>
            </div>
          </div>

          {/* Connection Status Pill */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-gray-950/80 border border-white/5 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
              <span className={`font-bold ${wsConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                {wsConnected ? 'LIVE TELEMETRY' : 'CONNECTING...'}
              </span>
            </div>
            <span className="font-mono text-[10px] text-gray-500">WS://8000</span>
          </div>

        </div>

        {/* Navigation Items (Vertical) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 mb-2">
            Operations & Control
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-md shadow-cyan-950/40'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Actions Header */}
          <div className="pt-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 mb-2">
            Simulation & Emergency Deck
          </div>

          {/* Virtual Streamer Toggle */}
          <button
            onClick={onToggleSimulator}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
              simulatorActive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-gray-900/60 text-gray-400 border-white/5 hover:bg-gray-900 hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {simulatorActive ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>Virtual Streamer</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              simulatorActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-800 text-gray-500'
            }`}>
              {simulatorActive ? 'RUNNING' : 'PAUSED'}
            </span>
          </button>

          {/* Demo Trigger Leak Button */}
          <button
            onClick={() => setShowTriggerModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-lg shadow-rose-600/20 border border-rose-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <AlertTriangle className="w-4 h-4 text-white animate-pulse" />
            <span>Simulate Leak Incident</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition"
          >
            <div className="flex items-center gap-2.5">
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-gray-400" />}
              <span>Siren Audio Alarms</span>
            </div>
            <span className={`text-[10px] font-bold ${soundEnabled ? 'text-cyan-400' : 'text-gray-400'}`}>
              {soundEnabled ? 'ON' : 'MUTED'}
            </span>
          </button>
        </div>

        {/* Bottom Footer Info & Hotline */}
        <div className="p-4 border-t border-white/10 space-y-3 bg-gray-950/50">
          
          {/* BMC Water Control Hotline */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-950/60 to-gray-900 border border-blue-500/20 text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 text-blue-400 font-bold uppercase tracking-wider text-[10px]">
              <PhoneCall className="w-3 h-3" />
              <span>BMC Emergency Hotline</span>
            </div>
            <div className="text-gray-200 font-mono font-bold">1916 / +91 22 2269 4725</div>
            <div className="text-gray-400 text-[10px]">Hydraulic Control Room (24/7)</div>
          </div>

          <div className="text-[10px] text-gray-400 text-center">
            AquaGuard AI • Municipal Hydraulic Platform
          </div>

        </div>

      </aside>

      {/* Trigger Leak Quick Modal */}
      {showTriggerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-rose-500/20 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Inject Simulated Pipe Leak</h3>
                <p className="text-xs text-gray-400">Pushes a verified acoustic leak clip to trigger Mumbai dispatch</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Target Mumbai Pipeline Sensor:
              </label>
              <select
                value={selectedSensor}
                onChange={(e) => setSelectedSensor(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-900 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500"
              >
                {sensors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} — {s.name} ({s.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-gray-900/60 rounded-xl border border-white/5 text-xs text-gray-400 mb-6 space-y-1.5">
              <div className="flex justify-between">
                <span>Selected Node:</span>
                <span className="font-mono text-cyan-400 font-bold">{selectedSensor}</span>
              </div>
              <div className="flex justify-between">
                <span>Detection Engine:</span>
                <span className="text-gray-300">PyTorch Log-Mel CNN</span>
              </div>
              <div className="flex justify-between">
                <span>Response Action:</span>
                <span className="text-rose-400 font-bold">Nearest BMC Unit Haversine Dispatch</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowTriggerModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleTrigger}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition hover:scale-105"
              >
                Trigger Incident
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
