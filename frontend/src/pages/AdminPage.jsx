import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  Sliders, 
  Plus, 
  MapPin, 
  Wrench, 
  Radio, 
  Check, 
  Edit, 
  Trash2, 
  Phone, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { api } from '../utils/api';

export default function AdminPage({ onRefreshSensors }) {
  const [sensors, setSensors] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sensors');
  
  // Selected map location for adding/editing
  const [clickedCoord, setClickedCoord] = useState(null);
  const [message, setMessage] = useState(null);

  // Form states
  const [sensorForm, setSensorForm] = useState({ id: '', name: '', lat: '', lng: '' });
  const [teamForm, setTeamForm] = useState({ id: '', name: '', lat: '', lng: '', phone: '' });

  const adminMapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clickMarkerRef = useRef(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sList, tList] = await Promise.all([api.getSensors(), api.getTeams()]);
      setSensors(sList);
      setTeams(tList);
    } catch (e) {
      console.error("Failed to load admin data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Initialize interactive admin map
  useEffect(() => {
    if (!adminMapRef.current || mapInstanceRef.current) return;

    const map = L.map(adminMapRef.current, {
      center: [19.0760, 72.8777],
      zoom: 12,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Click handler to pick coordinates
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      const coord = [parseFloat(lat.toFixed(5)), parseFloat(lng.toFixed(5))];
      setClickedCoord(coord);

      // Update forms
      setSensorForm(prev => ({ ...prev, lat: coord[0], lng: coord[1] }));
      setTeamForm(prev => ({ ...prev, lat: coord[0], lng: coord[1] }));

      // Add or move selection pin
      if (clickMarkerRef.current) {
        clickMarkerRef.current.setLatLng(coord);
      } else {
        clickMarkerRef.current = L.marker(coord, {
          icon: L.divIcon({
            className: 'admin-click-pin',
            html: '<div style="background:#0284c7; width:22px; height:22px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px #0284c7;"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
          })
        }).addTo(map);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const handleCreateSensor = async (e) => {
    e.preventDefault();
    try {
      await api.createSensor({
        id: sensorForm.id,
        name: sensorForm.name,
        lat: parseFloat(sensorForm.lat),
        lng: parseFloat(sensorForm.lng)
      });
      setMessage({ type: 'success', text: `Sensor ${sensorForm.id} created successfully!` });
      setSensorForm({ id: '', name: '', lat: '', lng: '' });
      loadData();
      if (onRefreshSensors) onRefreshSensors();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      await api.createTeam({
        id: teamForm.id,
        name: teamForm.name,
        lat: parseFloat(teamForm.lat),
        lng: parseFloat(teamForm.lng),
        phone: teamForm.phone
      });
      setMessage({ type: 'success', text: `Team ${teamForm.id} registered successfully!` });
      setTeamForm({ id: '', name: '', lat: '', lng: '', phone: '' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const toggleSensorStatus = async (sensor) => {
    const nextStatus = sensor.status === 'offline' ? 'normal' : 'offline';
    try {
      await api.updateSensor(sensor.id, { status: nextStatus });
      loadData();
      if (onRefreshSensors) onRefreshSensors();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const toggleTeamStatus = async (team) => {
    const nextStatus = team.status === 'available' ? 'busy' : 'available';
    try {
      await api.updateTeam(team.id, { status: nextStatus });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Sliders className="w-7 h-7 text-cyan-400" />
          <span>Municipal Asset & Sensor Administration</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Click anywhere on the map to extract precise geo-coordinates and provision new acoustic telemetry sensors or maintenance depot teams.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border flex items-center gap-2.5 text-sm ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Map & Form Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Interactive Coordinate Picker Map */}
        <div className="lg:col-span-7 bg-gray-900/80 border border-white/10 rounded-2xl overflow-hidden p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>Click Map to Select Target Coordinates</span>
            </h3>
            {clickedCoord && (
              <span className="font-mono text-xs text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-800">
                {clickedCoord[0]}, {clickedCoord[1]}
              </span>
            )}
          </div>

          <div ref={adminMapRef} className="w-full h-80 rounded-xl overflow-hidden border border-white/5" />
          <p className="text-[11px] text-gray-400">
            Clicking on any street or utility corridor populates the latitude and longitude fields automatically.
          </p>
        </div>

        {/* Provisioning Forms */}
        <div className="lg:col-span-5 bg-gray-900/80 border border-white/10 rounded-2xl p-5 space-y-4">
          
          <div className="flex items-center p-1 bg-gray-950 rounded-xl border border-white/5 text-xs font-bold">
            <button
              onClick={() => setActiveTab('sensors')}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'sensors' ? 'bg-cyan-500 text-gray-950 font-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Add Sensor</span>
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'teams' ? 'bg-blue-600 text-white font-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Add Team</span>
            </button>
          </div>

          {activeTab === 'sensors' ? (
            <form onSubmit={handleCreateSensor} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Sensor ID (e.g. S-11):</label>
                <input
                  type="text"
                  required
                  placeholder="S-11"
                  value={sensorForm.id}
                  onChange={(e) => setSensorForm({ ...sensorForm, id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Pipe Name / Street Location:</label>
                <input
                  type="text"
                  required
                  placeholder="Bandra West Linking Road Main Feeder"
                  value={sensorForm.name}
                  onChange={(e) => setSensorForm({ ...sensorForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Latitude:</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    placeholder="19.0760"
                    value={sensorForm.lat}
                    onChange={(e) => setSensorForm({ ...sensorForm, lat: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Longitude:</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    placeholder="72.8777"
                    value={sensorForm.lng}
                    onChange={(e) => setSensorForm({ ...sensorForm, lng: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Register Pipe Sensor</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateTeam} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Team ID (e.g. TEAM-05):</label>
                <input
                  type="text"
                  required
                  placeholder="TEAM-05"
                  value={teamForm.id}
                  onChange={(e) => setTeamForm({ ...teamForm, id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Team Name / Unit:</label>
                <input
                  type="text"
                  required
                  placeholder="BMC Hydraulic Unit - Kurla East"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Dispatch Phone:</label>
                <input
                  type="text"
                  required
                  placeholder="+91 22 2650 3300"
                  value={teamForm.phone}
                  onChange={(e) => setTeamForm({ ...teamForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Latitude:</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    placeholder="19.0760"
                    value={teamForm.lat}
                    onChange={(e) => setTeamForm({ ...teamForm, lat: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Longitude:</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    placeholder="72.8777"
                    value={teamForm.lng}
                    onChange={(e) => setTeamForm({ ...teamForm, lng: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Register Maintenance Team</span>
              </button>
            </form>
          )}

        </div>

      </div>

      {/* Asset Inventories Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sensors Table */}
        <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>Sensors Inventory ({sensors.length})</span>
            </h3>
            <button onClick={loadData} className="text-gray-400 hover:text-white transition">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Coords</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sensors.map((s) => (
                  <tr key={s.id} className="hover:bg-white/5 transition">
                    <td className="py-2.5 font-mono text-cyan-400 font-bold">{s.id}</td>
                    <td className="py-2.5 text-gray-200 font-medium truncate max-w-[140px]">{s.name}</td>
                    <td className="py-2.5 font-mono text-gray-400 text-[11px]">{s.lat.toFixed(3)}, {s.lng.toFixed(3)}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        s.status === 'leak' ? 'bg-rose-500/20 text-rose-300' :
                        s.status === 'offline' ? 'bg-gray-800 text-gray-400' :
                        'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => toggleSensorStatus(s)}
                        className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-semibold transition"
                      >
                        {s.status === 'offline' ? 'Bring Online' : 'Set Offline'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Maintenance Teams Table */}
        <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-400" />
              <span>Response Teams Inventory ({teams.length})</span>
            </h3>
            <button onClick={loadData} className="text-gray-400 hover:text-white transition">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Phone</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {teams.map((t) => (
                  <tr key={t.id} className="hover:bg-white/5 transition">
                    <td className="py-2.5 font-mono text-blue-400 font-bold">{t.id}</td>
                    <td className="py-2.5 text-gray-200 font-medium truncate max-w-[140px]">{t.name}</td>
                    <td className="py-2.5 font-mono text-gray-400 text-[11px]">{t.phone}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        t.status === 'busy' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => toggleTeamStatus(t)}
                        className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-semibold transition"
                      >
                        {t.status === 'busy' ? 'Make Available' : 'Set Busy'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
