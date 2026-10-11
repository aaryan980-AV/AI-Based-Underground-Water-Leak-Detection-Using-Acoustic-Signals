import React, { useState } from 'react';
import { 
  Radio, 
  Activity, 
  Zap, 
  Battery, 
  Wifi, 
  Gauge, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Send,
  RefreshCw,
  Search
} from 'lucide-react';
import { api } from '../utils/api';

// Metadata mapping representing pipe network attributes from acoustic dataset
const SENSOR_META = {
  'S-01': { material: 'Ductile Iron', pressure: '0.32 MPa', type: 'Hydrophone', diameter: '1200 mm', zone: 'Zone 1 (Bhandup Trunk)' },
  'S-02': { material: 'Cast Iron', pressure: '0.31 MPa', type: 'Noise Logger', diameter: '900 mm', zone: 'Zone 1 (Powai)' },
  'S-03': { material: 'PE (Polyethylene)', pressure: '0.24 MPa', type: 'Noise Logger', diameter: '600 mm', zone: 'Zone 2 (BKC Commercial)' },
  'S-04': { material: 'Ductile Iron', pressure: '0.33 MPa', type: 'Hydrophone', diameter: '1000 mm', zone: 'Zone 2 (Dadar Central)' },
  'S-05': { material: 'Steel Conduit', pressure: '0.26 MPa', type: 'Hydrophone', diameter: '750 mm', zone: 'Zone 3 (Marine Drive)' },
  'S-06': { material: 'Ductile Iron', pressure: '0.28 MPa', type: 'Noise Logger', diameter: '800 mm', zone: 'Zone 3 (Worli Sea Face)' },
  'S-07': { material: 'PE (Polyethylene)', pressure: '0.22 MPa', type: 'Noise Logger', diameter: '500 mm', zone: 'Zone 4 (Andheri West)' },
  'S-08': { material: 'Cast Iron', pressure: '0.29 MPa', type: 'Hydrophone', diameter: '850 mm', zone: 'Zone 2 (Dharavi 90ft)' },
  'S-09': { material: 'PVC High-Density', pressure: '0.25 MPa', type: 'Noise Logger', diameter: '450 mm', zone: 'Zone 2 (Kurla West)' },
  'S-10': { material: 'Steel Conduit', pressure: '0.34 MPa', type: 'Hydrophone', diameter: '1100 mm', zone: 'Zone 3 (Malabar Hill)' },
  'S-11': { material: 'Ductile Iron', pressure: '0.30 MPa', type: 'Noise Logger', diameter: '700 mm', zone: 'Zone 1 (Ghatkopar)' },
  'S-12': { material: 'Ductile Iron', pressure: '0.27 MPa', type: 'Hydrophone', diameter: '650 mm', zone: 'Zone 3 (Colaba End)' },
};

export default function TelemetryPage({ sensors = [], onTriggerLeak }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [testingSensorId, setTestingSensorId] = useState(null);

  const filtered = sensors.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleSendTestReading = async (sensorId) => {
    setTestingSensorId(sensorId);
    try {
      await onTriggerLeak(sensorId);
    } finally {
      setTimeout(() => setTestingSensorId(null), 1000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Radio className="w-3.5 h-3.5" />
            <span>Telemetry & Acoustic Diagnostic Network</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Mumbai Pipeline Telemetry Stream
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time acoustic transducer diagnostics, operating pressure (MPa), and pipe material profiles across all active nodes.
          </p>
        </div>

        {/* Global Summary Badge */}
        <div className="flex items-center gap-2 p-2 bg-gray-900/90 rounded-2xl border border-white/10 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
            {sensors.filter(s => s.status === 'normal').length} Normal
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">
            {sensors.filter(s => s.status === 'leak').length} Leaks
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-gray-800 text-gray-300 font-bold">
            Total {sensors.length} Nodes
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-gray-900/60 rounded-2xl border border-white/10">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search sensor ID, area or pipe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-950 rounded-xl border border-white/5 text-xs font-semibold w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === 'all' ? 'bg-cyan-500 text-gray-950 font-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            All ({sensors.length})
          </button>
          <button
            onClick={() => setFilterStatus('normal')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === 'normal' ? 'bg-emerald-500 text-gray-950 font-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Healthy
          </button>
          <button
            onClick={() => setFilterStatus('leak')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterStatus === 'leak' ? 'bg-rose-500 text-white font-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Leak Active
          </button>
        </div>
      </div>

      {/* Grid of Telemetry Sensor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((sensor) => {
          const meta = SENSOR_META[sensor.id] || {
            material: 'Ductile Iron',
            pressure: '0.30 MPa',
            type: 'Hydrophone',
            diameter: '800 mm',
            zone: 'BMC Central'
          };
          const isLeak = sensor.status === 'leak';
          const isOffline = sensor.status === 'offline';

          return (
            <div
              key={sensor.id}
              className={`rounded-2xl border p-5 space-y-4 transition-all hover:scale-[1.01] ${
                isLeak
                  ? 'bg-gray-900/90 border-rose-500/50 shadow-xl shadow-rose-950/30 ring-1 ring-rose-500/30'
                  : 'bg-gray-900/70 border-white/10 shadow-lg hover:border-cyan-500/30'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${
                    isLeak 
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                      : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                  }`}>
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-cyan-300">{sensor.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        isLeak ? 'bg-rose-500/30 text-rose-200' :
                        isOffline ? 'bg-gray-800 text-gray-400' :
                        'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {sensor.status}
                      </span>
                    </div>
                    <div className="font-bold text-xs text-white mt-0.5 truncate max-w-[200px]" title={sensor.name}>
                      {sensor.name}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSendTestReading(sensor.id)}
                  disabled={testingSensorId === sensor.id}
                  title="Simulate acoustic leak detection"
                  className="p-2 rounded-xl bg-gray-800 hover:bg-rose-600/30 hover:text-rose-300 text-gray-400 border border-white/5 transition"
                >
                  <Send className={`w-3.5 h-3.5 ${testingSensorId === sensor.id ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Technical Pipeline Metrics */}
              <div className="grid grid-cols-2 gap-2.5 text-[11px] p-3 rounded-xl bg-gray-950/70 border border-white/5">
                <div>
                  <span className="text-gray-500 block">Pipe Material</span>
                  <span className="font-semibold text-gray-200">{meta.material}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Baseline Pressure</span>
                  <span className="font-mono font-bold text-cyan-400">{meta.pressure}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Transducer Type</span>
                  <span className="font-semibold text-gray-300">{meta.type}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Main Diameter</span>
                  <span className="font-mono text-gray-300">{meta.diameter}</span>
                </div>
              </div>

              {/* Status & Signal Indicators */}
              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-emerald-400" title="Battery Level: 96%">
                    <Battery className="w-3.5 h-3.5" />
                    <span>96%</span>
                  </div>
                  <div className="flex items-center gap-1 text-cyan-400" title="Signal: -58 dBm RSSI">
                    <Wifi className="w-3.5 h-3.5" />
                    <span>LTE-M</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(sensor.last_reading_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
