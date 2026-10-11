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
  MapPin,
  Cpu
} from 'lucide-react';
import { soundAlert } from '../utils/audioAlert';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  wsConnected, 
  simulatorActive, 
  onToggleSimulator, 
  onTriggerLeak,
  sensors = []
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

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#0b0f19]/90 backdrop-blur-md border-b border-white/10 px-4 lg:px-8 py-3 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 text-white">
              <Droplets className="w-6 h-6 animate-pulse" />
              <div className="absolute -inset-0.5 rounded-xl bg-cyan-400 opacity-20 blur-sm"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg lg:text-xl tracking-tight text-white">
                  AQUA<span className="text-cyan-400">GUARD</span>
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  AI v2.0
                </span>
              </div>
              <p className="text-xs text-gray-400 hidden sm:block">Mumbai Metropolitan Water Grid (BMC)</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center p-1 bg-gray-900/80 rounded-xl border border-white/5 text-sm font-medium">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span className="hidden md:inline">Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('detect')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'detect'
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span className="hidden md:inline">Audio AI</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'analytics'
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden md:inline">Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'admin'
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden md:inline">Admin</span>
            </button>
          </nav>

          {/* Action Buttons & Status Indicators */}
          <div className="flex items-center gap-2 lg:gap-3">
            
            {/* WebSocket Pulse Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-gray-900/60 border-white/10">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
              <span className={wsConnected ? 'text-emerald-400' : 'text-rose-400'}>
                {wsConnected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>

            {/* Virtual Streamer Toggle */}
            <button
              onClick={onToggleSimulator}
              title={simulatorActive ? "Virtual sensor streams are streaming background clips" : "Start virtual background streaming"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                simulatorActive 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-gray-800/80 text-gray-400 border-white/5 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              {simulatorActive ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span className="hidden lg:inline">{simulatorActive ? 'Streamer Active' : 'Start Streamer'}</span>
            </button>

            {/* Demo Trigger Leak Button */}
            <button
              onClick={() => setShowTriggerModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-md shadow-rose-500/20 border border-rose-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-white" />
              <span>Trigger Leak</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              title={soundEnabled ? "Mute audio alarms" : "Unmute audio alarms"}
              className={`p-2 rounded-lg border transition-all ${
                soundEnabled 
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20' 
                  : 'bg-gray-800 text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

          </div>

        </div>
      </header>

      {/* Trigger Leak Quick Modal */}
      {showTriggerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-rose-500/10 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Trigger Simulated Water Leak</h3>
                <p className="text-xs text-gray-400">Stream a real verified leak audio clip to trigger dispatch</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Target Pipe Sensor:
              </label>
              <select
                value={selectedSensor}
                onChange={(e) => setSelectedSensor(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-900 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500"
              >
                {sensors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} — {s.name} ({s.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-gray-900/60 rounded-xl border border-white/5 text-xs text-gray-400 mb-6 space-y-1">
              <div className="flex justify-between">
                <span>Selected Node:</span>
                <span className="font-mono text-cyan-400">{selectedSensor}</span>
              </div>
              <div className="flex justify-between">
                <span>Model Pipeline:</span>
                <span className="text-gray-300">CNN Spectrogram Classifier</span>
              </div>
              <div className="flex justify-between">
                <span>Response Action:</span>
                <span className="text-rose-400 font-semibold">Immediate Nearest Team Dispatch</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowTriggerModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleTrigger}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition hover:scale-105"
              >
                Dispatch Test Leak
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
