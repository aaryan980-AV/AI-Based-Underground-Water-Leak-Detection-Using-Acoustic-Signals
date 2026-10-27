import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../utils/api';
import { formatDate, formatConfidence } from '../utils/format';

export default function SensorsPage({ sensors = [], onSelectSensorOnMap }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [sensorAlerts, setSensorAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // Calculate Stat Boxes
  const totalSensors = sensors.length;
  const normalCount = sensors.filter(s => s.status === 'normal').length;
  const leakCount = sensors.filter(s => s.status === 'leak').length;
  const offlineCount = sensors.filter(s => s.status === 'offline').length;

  // Filter Sensors
  const filteredSensors = useMemo(() => {
    return sensors.filter(s => {
      const matchSearch =
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [sensors, searchTerm, statusFilter]);

  // Load alert history when a sensor is selected
  useEffect(() => {
    if (!selectedSensor) {
      setSensorAlerts([]);
      return;
    }
    let isCurrent = true;
    setLoadingAlerts(true);
    api.getSensorAlerts(selectedSensor.id)
      .then(data => {
        if (isCurrent) setSensorAlerts(data);
      })
      .catch(err => {
        console.error("Failed to load sensor alerts:", err);
        if (isCurrent) setSensorAlerts([]);
      })
      .finally(() => {
        if (isCurrent) setLoadingAlerts(false);
      });

    return () => { isCurrent = false; };
  }, [selectedSensor]);

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Page Title with Section Title Underline & Droplet Icon */}
      <div className="pb-3 border-b border-[#dbe3ea]">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-5 h-5 text-[#0b6fb8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
          </svg>
          <h2 className="section-title">
            Sensors Telemetry Registry
          </h2>
        </div>
        <p className="text-xs text-[#5b6b7b] mt-1">
          Inventory of acoustic hydrophones and noise loggers deployed across municipal pipeline trunks.
        </p>
      </div>

      {/* Top row of 4 stat boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-box stat-box-blue">
          <div className="stat-box-label">Total sensors</div>
          <div className="stat-box-value-container">
            <div className="stat-box-value">{totalSensors}</div>
          </div>
        </div>

        <div className="stat-box stat-box-green">
          <div className="stat-box-label">Normal</div>
          <div className="stat-box-value-container">
            <div className="stat-box-value">{normalCount}</div>
          </div>
        </div>

        <div className="stat-box stat-box-red">
          <div className="stat-box-label">Active Leaks</div>
          <div className="stat-box-value-container">
            <div className="stat-box-value">{leakCount}</div>
          </div>
        </div>

        <div className="stat-box stat-box-grey">
          <div className="stat-box-label">Offline</div>
          <div className="stat-box-value-container">
            <div className="stat-box-value">{offlineCount}</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 border border-[#dbe3ea] rounded-md shadow-xs">
        <div className="flex flex-1 items-center gap-2">
          <input
            type="text"
            placeholder="Search by Sensor ID or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 max-w-sm bg-white border border-[#dbe3ea] rounded px-3 py-1.5 text-xs text-[#1c2b39] focus:outline-none focus:border-[#0b6fb8]"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-[#dbe3ea] rounded px-2.5 py-1.5 text-xs text-[#1c2b39] focus:outline-none focus:border-[#0b6fb8]"
          >
            <option value="all">All statuses</option>
            <option value="normal">Normal</option>
            <option value="leak">Leak</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        <div className="text-xs text-[#5b6b7b]">
          Showing {filteredSensors.length} of {sensors.length} sensors
        </div>
      </div>

      {/* Main Table and Side Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Table View */}
        <div className={`${selectedSensor ? 'lg:col-span-8' : 'lg:col-span-12'} border border-[#dbe3ea] rounded-md bg-white overflow-x-auto shadow-xs`}>
          <table className="table-compact">
            <thead>
              <tr>
                <th>Sensor ID</th>
                <th>Name / Location</th>
                <th>Latitude / Longitude</th>
                <th>Status</th>
                <th>Last Reading</th>
                <th className="text-center">Total Alerts</th>
              </tr>
            </thead>
            <tbody>
              {filteredSensors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#5b6b7b]">
                    No sensors match search criteria
                  </td>
                </tr>
              ) : (
                filteredSensors.map((s) => {
                  const isSelected = selectedSensor?.id === s.id;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedSensor(isSelected ? null : s)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'selected' : ''
                      }`}
                    >
                      <td className="font-mono font-bold text-[#0b6fb8] whitespace-nowrap">
                        {s.id}
                      </td>
                      <td className="font-medium text-[#1c2b39]">
                        {s.name}
                      </td>
                      <td className="font-mono text-xs text-[#5b6b7b] whitespace-nowrap">
                        {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                      </td>
                      <td>
                        {s.status === 'leak' ? (
                          <span className="badge-status badge-leak">Leak</span>
                        ) : s.status === 'offline' ? (
                          <span className="badge-status badge-offline">Offline</span>
                        ) : (
                          <span className="badge-status badge-normal">Normal</span>
                        )}
                      </td>
                      <td className="text-[#5b6b7b] whitespace-nowrap text-xs">
                        {formatDate(s.last_reading_at)}
                      </td>
                      <td className="text-center font-mono font-medium">
                        {s.total_alerts ?? 0}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Side Panel for Selected Sensor */}
        {selectedSensor && (
          <div className="lg:col-span-4 bg-white border border-[#dbe3ea] rounded-md p-4 space-y-3 sticky top-4 shadow-sm">
            <div className="flex items-start justify-between pb-2.5 border-b border-[#dbe3ea]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#0a3d62]">
                    Sensor {selectedSensor.id}
                  </span>
                  <span className={`badge-status ${
                    selectedSensor.status === 'leak' ? 'badge-leak' : selectedSensor.status === 'offline' ? 'badge-offline' : 'badge-normal'
                  }`}>
                    {selectedSensor.status}
                  </span>
                </div>
                <div className="text-xs text-[#5b6b7b] mt-0.5">
                  {selectedSensor.name}
                </div>
              </div>

              <button
                onClick={() => setSelectedSensor(null)}
                className="text-[#5b6b7b] hover:text-[#1c2b39] text-base font-bold px-1"
                title="Close side panel"
              >
                ×
              </button>
            </div>

            {/* Coordinates & Quick Actions */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#5b6b7b]">
                <span>Coordinates:</span>
                <span className="font-mono text-[#1c2b39] font-medium">
                  {selectedSensor.lat.toFixed(4)}, {selectedSensor.lng.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#5b6b7b]">
                <span>Last Telemetry:</span>
                <span className="text-[#1c2b39] font-medium">
                  {formatDate(selectedSensor.last_reading_at)}
                </span>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onSelectSensorOnMap && onSelectSensorOnMap(selectedSensor)}
                  className="btn-primary w-full text-xs py-1.5"
                >
                  Show on map
                </button>
              </div>
            </div>

            {/* Alert History Section */}
            <div className="pt-2.5 border-t border-[#dbe3ea] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#0a3d62]">
                  Incident Alert History
                </span>
                <span className="text-[11px] text-[#5b6b7b]">
                  {sensorAlerts.length} recorded
                </span>
              </div>

              {loadingAlerts ? (
                <div className="text-center py-4 text-xs text-[#5b6b7b]">
                  Loading alerts...
                </div>
              ) : sensorAlerts.length === 0 ? (
                <div className="text-center py-4 text-xs text-[#5b6b7b]">
                  No alert incidents on record for this sensor.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto border border-[#dbe3ea] rounded">
                  <table className="table-compact text-xs">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Detected</th>
                        <th>Conf.</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sensorAlerts.map(a => (
                        <tr key={a.id}>
                          <td className="font-mono font-semibold text-[#0a3d62]">
                            #{String(a.id).padStart(3, '0')}
                          </td>
                          <td className="text-[11px] text-[#5b6b7b] whitespace-nowrap">
                            {formatDate(a.created_at)}
                          </td>
                          <td className="font-mono text-[11px] text-[#d64545] font-semibold">
                            {formatConfidence(a.confidence)}
                          </td>
                          <td>
                            <span className="text-[11px] font-semibold text-[#0b6fb8]">
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

