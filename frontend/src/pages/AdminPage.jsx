import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { api } from '../utils/api';
import { formatDate } from '../utils/format';

export default function AdminPage({ onRefreshSensors }) {
  const [sensors, setSensors] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFormTab, setActiveFormTab] = useState('sensors');
  
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

  // Initialize interactive admin map with CartoDB Positron tiles
  useEffect(() => {
    if (!adminMapRef.current || mapInstanceRef.current) return;

    const map = L.map(adminMapRef.current, {
      center: [19.0760, 72.8777],
      zoom: 12,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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

      // Add or move selection pin in Primary Water Blue (#0b6fb8)
      if (clickMarkerRef.current) {
        clickMarkerRef.current.setLatLng(coord);
      } else {
        clickMarkerRef.current = L.marker(coord, {
          icon: L.divIcon({
            className: 'admin-click-pin',
            html: '<div style="background:#0b6fb8; width:18px; height:18px; border-radius:50%; border:2px solid white; box-shadow:0 1px 4px rgba(11,111,184,0.5);"></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
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
    if (!sensorForm.id || !sensorForm.name || !sensorForm.lat || !sensorForm.lng) {
      alert("Please fill all sensor fields or click the map.");
      return;
    }
    try {
      await api.createSensor({
        id: sensorForm.id.trim(),
        name: sensorForm.name.trim(),
        lat: parseFloat(sensorForm.lat),
        lng: parseFloat(sensorForm.lng)
      });
      setMessage({ type: 'success', text: `Sensor ${sensorForm.id} provisioned.` });
      setSensorForm({ id: '', name: '', lat: '', lng: '' });
      loadData();
      if (onRefreshSensors) onRefreshSensors();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamForm.id || !teamForm.name || !teamForm.lat || !teamForm.lng || !teamForm.phone) {
      alert("Please fill all team fields or click the map.");
      return;
    }
    try {
      await api.createTeam({
        id: teamForm.id.trim(),
        name: teamForm.name.trim(),
        lat: parseFloat(teamForm.lat),
        lng: parseFloat(teamForm.lng),
        phone: teamForm.phone.trim()
      });
      setMessage({ type: 'success', text: `Response Unit ${teamForm.id} registered.` });
      setTeamForm({ id: '', name: '', lat: '', lng: '', phone: '' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDeleteSensor = async (id) => {
    if (!window.confirm(`Delete sensor ${id}?`)) return;
    try {
      await api.deleteSensor(id);
      loadData();
      if (onRefreshSensors) onRefreshSensors();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  const handleDeleteTeam = async (id) => {
    if (!window.confirm(`Delete team ${id}?`)) return;
    try {
      await api.deleteTeam(id);
      loadData();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Page Header with Section Title Underline & Icon */}
      <div className="pb-3 border-b border-[#dbe3ea]">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-5 h-5 text-[#0b6fb8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h2 className="section-title">
            System Administration
          </h2>
        </div>
        <p className="text-xs text-[#5b6b7b] mt-1">
          Provision new acoustic telemetry sensors and maintenance teams. Click the map to populate coordinates.
        </p>
      </div>

      {message && (
        <div
          className={`p-2.5 rounded-md text-xs border ${
            message.type === 'success'
              ? 'bg-[#e8f6ee] border-[#2e9e5b] text-[#2e9e5b] font-semibold'
              : 'bg-[#fdecec] border-[#d64545] text-[#d64545] font-semibold'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Map and Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Interactive Coordinate Picker Map */}
        <div className="lg:col-span-7 bg-white border border-[#dbe3ea] rounded-md p-3.5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-[#dbe3ea]">
            <span className="font-semibold text-[#0a3d62]">
              Location Picker (Click map)
            </span>
            <span className="text-[#0b6fb8] font-mono font-bold">
              {clickedCoord ? `${clickedCoord[0]}, ${clickedCoord[1]}` : 'Click map to select location'}
            </span>
          </div>

          <div ref={adminMapRef} className="w-full h-72 border border-[#dbe3ea] rounded-md overflow-hidden" />
          <div className="text-[11px] text-[#5b6b7b]">
            Clicking any point on the map automatically populates the Latitude and Longitude fields.
          </div>
        </div>

        {/* Provisioning Forms */}
        <div className="lg:col-span-5 bg-white border border-[#dbe3ea] rounded-md p-3.5 space-y-3 shadow-xs">
          <div className="flex items-center gap-1 border-b border-[#dbe3ea] pb-2">
            <button
              onClick={() => setActiveFormTab('sensors')}
              className={`px-3 py-1 text-xs font-semibold rounded transition ${
                activeFormTab === 'sensors'
                  ? 'bg-[#0b6fb8] text-white shadow-xs'
                  : 'text-[#5b6b7b] hover:text-[#0a3d62]'
              }`}
            >
              Add Sensor
            </button>
            <button
              onClick={() => setActiveFormTab('teams')}
              className={`px-3 py-1 text-xs font-semibold rounded transition ${
                activeFormTab === 'teams'
                  ? 'bg-[#0b6fb8] text-white shadow-xs'
                  : 'text-[#5b6b7b] hover:text-[#0a3d62]'
              }`}
            >
              Add Response Team
            </button>
          </div>

          {/* Sensor Provision Form */}
          {activeFormTab === 'sensors' && (
            <form onSubmit={handleCreateSensor} className="space-y-2 text-xs">
              <div>
                <label className="block text-[#5b6b7b] mb-1 font-medium">Sensor ID (e.g. S-13):</label>
                <input
                  type="text"
                  required
                  placeholder="S-13"
                  value={sensorForm.id}
                  onChange={(e) => setSensorForm({ ...sensorForm, id: e.target.value })}
                  className="w-full bg-white border border-[#dbe3ea] rounded p-1.5 text-xs text-[#1c2b39] focus:outline-none focus:border-[#0b6fb8]"
                />
              </div>

              <div>
                <label className="block text-[#5b6b7b] mb-1 font-medium">Location Name / Pipeline Node:</label>
                <input
                  type="text"
                  required
                  placeholder="Marine Drive Feeder Junction"
                  value={sensorForm.name}
                  onChange={(e) => setSensorForm({ ...sensorForm, name: e.target.value })}
                  className="w-full bg-white border border-[#dbe3ea] rounded p-1.5 text-xs text-[#1c2b39] focus:outline-none focus:border-[#0b6fb8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#5b6b7b] mb-1 font-medium">Latitude:</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={sensorForm.lat}
                    onChange={(e) => setSensorForm({ ...sensorForm, lat: e.target.value })}
                    className="w-full bg-white border border-[#dbe3ea] rounded p-1.5 text-xs text-[#1c2b39] focus:outline-none focus:border-[#0b6fb8]"
                  />
                </div>
                <div>
                  <label className="block text-[#5b6b7b] mb-1 font-medium">Longitude:</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={sensorForm.lng}
                    onChange={(e) => setSensorForm({ ...sensorForm, lng: e.target.value })}
                    className="w-full bg-white border border-[#dbe3ea] rounded p-1.5 text-xs text-[#1c2b39] focus:outline-none focus:border-[#0b6fb8]"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary w-full mt-2 py-1.5">
                Save Sensor Node
              </button>
            </form>
          )}

          {/* Team Registration Form */}
          {activeFormTab === 'teams' && (
            <form onSubmit={handleCreateTeam} className="space-y-2 text-xs">
              <div>
                <label className="block text-[#5b6b7b] mb-1 font-medium">Team ID (e.g. TEAM-05):</label>
                <input
                  type="text"
                  required
                  placeholder="TEAM-05"
                  value={teamForm.id}
                  onChange={(e) => setTeamForm({ ...teamForm, id: e.target.value })}
                  className="w-full bg-white border border-[#dbe3ea] rounded p-1.5 text-xs text-[#1c2b39] focus:outline-none focus:border-[#0b6fb8]"
                />
              </div>

              <div>
                <label className="block text-[#5b6b7b] mb-1 font-medium">Team Name / Division:</label>
                <input
                  type="text"
                  required
                  placeholder="Bandra Emergency Valve Unit"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  className="w-full bg-white border border-[#dbe3ea] rounded p-1.5 text-xs text-[#1c2b39] focus:outline-none focus:border-[#0b6fb8]"
                />
              </div>

              <div>
                <label className="block text-[#5b6b7b] mb-1 font-medium">Phone Number:</label>
                <input
                  type="text"
                  required
                  placeholder="+91 22 2650 1200"
                  value={teamForm.phone}
                  onChange={(e) => setTeamForm({ ...teamForm, phone: e.target.value })}
                  className="w-full bg-white border border-[#dbe3ea] rounded p-1.5 text-xs text-[#1c2b39] focus:outline-none focus:border-[#0b6fb8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#5b6b7b] mb-1 font-medium">Latitude:</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={teamForm.lat}
                    onChange={(e) => setTeamForm({ ...teamForm, lat: e.target.value })}
                    className="w-full bg-white border border-[#dbe3ea] rounded p-1.5 text-xs text-[#1c2b39] focus:outline-none focus:border-[#0b6fb8]"
                  />
                </div>
                <div>
                  <label className="block text-[#5b6b7b] mb-1 font-medium">Longitude:</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={teamForm.lng}
                    onChange={(e) => setTeamForm({ ...teamForm, lng: e.target.value })}
                    className="w-full bg-white border border-[#dbe3ea] rounded p-1.5 text-xs text-[#1c2b39] focus:outline-none focus:border-[#0b6fb8]"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary w-full mt-2 py-1.5">
                Save Response Team
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Tables of Existing Assets */}
      <div className="space-y-4 pt-2">
        <div className="border border-[#dbe3ea] rounded-md bg-white shadow-xs">
          <div className="p-3 bg-[#f4f8fb] border-b border-[#dbe3ea] font-bold text-xs text-[#0a3d62]">
            Active Sensors ({sensors.length})
          </div>
          <div className="overflow-x-auto">
            <table className="table-compact">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Location Name</th>
                  <th>Coordinates</th>
                  <th>Status</th>
                  <th>Last Reading</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sensors.map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono font-semibold text-[#0b6fb8]">{s.id}</td>
                    <td className="font-medium text-[#1c2b39]">{s.name}</td>
                    <td className="font-mono text-xs text-[#5b6b7b]">
                      {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                    </td>
                    <td>
                      <span className={`badge-status ${s.status === 'leak' ? 'badge-leak' : s.status === 'offline' ? 'badge-offline' : 'badge-normal'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="text-[#5b6b7b] text-xs">{s.last_reading_at ? formatDate(s.last_reading_at) : 'N/A'}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteSensor(s.id)}
                        className="text-[#d64545] hover:underline text-xs font-semibold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border border-[#dbe3ea] rounded-md bg-white shadow-xs">
          <div className="p-3 bg-[#f4f8fb] border-b border-[#dbe3ea] font-bold text-xs text-[#0a3d62]">
            Registered Response Units ({teams.length})
          </div>
          <div className="overflow-x-auto">
            <table className="table-compact">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Team Name</th>
                  <th>Phone</th>
                  <th>Coordinates</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.id}>
                    <td className="font-mono font-semibold text-[#0b6fb8]">{t.id}</td>
                    <td className="font-medium text-[#1c2b39]">{t.name}</td>
                    <td className="font-mono text-xs text-[#5b6b7b]">{t.phone}</td>
                    <td className="font-mono text-xs text-[#5b6b7b]">
                      {t.lat.toFixed(4)}, {t.lng.toFixed(4)}
                    </td>
                    <td>
                      <span className={`badge-status ${t.status === 'available' ? 'badge-workdone' : 'badge-onwork'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteTeam(t.id)}
                        className="text-[#d64545] hover:underline text-xs font-semibold"
                      >
                        Delete
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

