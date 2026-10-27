import React, { useState, useMemo } from 'react';
import { formatDate, formatConfidence } from '../utils/format';

export default function AlertsPage({
  alerts = [],
  sensors = [],
  teams = [],
  onUpdateStatus,
  onTriggerLeak,
  onToggleTeamStatus,
}) {
  const [activeSubTab, setActiveSubTab] = useState('alerts');
  const [alertFilter, setAlertFilter] = useState('all');
  const [expandedAlerts, setExpandedAlerts] = useState({});
  const [sortField, setSortField] = useState('id');
  const [sortAsc, setSortAsc] = useState(false);

  const toggleHistory = (id) => {
    setExpandedAlerts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedAlerts = useMemo(() => {
    let list = alerts.filter(a => {
      if (alertFilter === 'active') return a.status !== 'cleared';
      if (alertFilter === 'resolved') return a.status === 'cleared';
      return true;
    });

    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === 'created_at') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [alerts, alertFilter, sortField, sortAsc]);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#dbe3ea] gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-5 h-5 text-[#0b6fb8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h2 className="section-title">
              System Records & Incidents
            </h2>
          </div>
          <p className="text-xs text-[#5b6b7b] mt-1">
            Compact operational tables for active alerts, sensor telemetry nodes, and maintenance response teams.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 border border-[#dbe3ea] rounded-md p-1 bg-[#f4f8fb]">
          <button
            onClick={() => setActiveSubTab('alerts')}
            className={`px-3 py-1 text-xs font-medium rounded transition ${
              activeSubTab === 'alerts'
                ? 'bg-white text-[#0a3d62] font-bold shadow-xs border border-[#dbe3ea]'
                : 'text-[#5b6b7b] hover:text-[#0a3d62]'
            }`}
          >
            Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setActiveSubTab('sensors')}
            className={`px-3 py-1 text-xs font-medium rounded transition ${
              activeSubTab === 'sensors'
                ? 'bg-white text-[#0a3d62] font-bold shadow-xs border border-[#dbe3ea]'
                : 'text-[#5b6b7b] hover:text-[#0a3d62]'
            }`}
          >
            Sensors ({sensors.length})
          </button>
          <button
            onClick={() => setActiveSubTab('teams')}
            className={`px-3 py-1 text-xs font-medium rounded transition ${
              activeSubTab === 'teams'
                ? 'bg-white text-[#0a3d62] font-bold shadow-xs border border-[#dbe3ea]'
                : 'text-[#5b6b7b] hover:text-[#0a3d62]'
            }`}
          >
            Teams ({teams.length})
          </button>
        </div>
      </div>

      {/* 1. Alerts Table */}
      {activeSubTab === 'alerts' && (
        <div className="space-y-3">
          {/* Filter Bar */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#5b6b7b] font-medium">Filter status:</span>
            {['all', 'active', 'resolved'].map((f) => (
              <button
                key={f}
                onClick={() => setAlertFilter(f)}
                className={`px-3 py-1 rounded text-xs transition font-semibold ${
                  alertFilter === f
                    ? 'bg-[#0b6fb8] text-white border border-[#0b6fb8]'
                    : 'bg-white text-[#1c2b39] border border-[#dbe3ea] hover:bg-[#f4f8fb]'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="border border-[#dbe3ea] rounded-md overflow-x-auto bg-white shadow-xs">
            <table className="table-compact">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id')} className="cursor-pointer">
                    Alert ID {sortField === 'id' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('sensor_id')} className="cursor-pointer">
                    Sensor {sortField === 'sensor_id' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th>Location</th>
                  <th onClick={() => handleSort('created_at')} className="cursor-pointer">
                    Detected Time {sortField === 'created_at' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('confidence')} className="cursor-pointer">
                    Confidence {sortField === 'confidence' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th>Assigned Team</th>
                  <th>Distance / ETA</th>
                  <th onClick={() => handleSort('status')} className="cursor-pointer">
                    Status {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th>Workflow Action</th>
                  <th>History</th>
                </tr>
              </thead>
              <tbody>
                {sortedAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-[#5b6b7b]">
                      No active alerts recorded
                    </td>
                  </tr>
                ) : (
                  sortedAlerts.map((alert) => {
                    const isLeak = alert.status !== 'cleared';
                    const isExpanded = !!expandedAlerts[alert.id];

                    return (
                      <React.Fragment key={alert.id}>
                        <tr className={isLeak ? 'bg-[#fdecec]/30' : ''}>
                          <td className="font-mono font-semibold text-[#0a3d62]">
                            #{String(alert.id).padStart(3, '0')}
                          </td>
                          <td className="font-semibold text-[#0b6fb8]">
                            {alert.sensor_id}
                          </td>
                          <td className="max-w-[200px] truncate text-[#1c2b39]" title={alert.sensor_name}>
                            {alert.sensor_name || 'Main Line'}
                          </td>
                          <td className="text-[#5b6b7b] whitespace-nowrap text-xs">
                            {formatDate(alert.created_at)}
                          </td>
                          <td className="font-mono font-bold text-[#d64545]">
                            {formatConfidence(alert.confidence)}
                          </td>
                          <td className="text-[#1c2b39]">
                            {alert.assigned_team?.name || '-'}
                          </td>
                          <td className="whitespace-nowrap text-[#5b6b7b] text-xs">
                            {alert.distance_km ? `${alert.distance_km} km (${alert.eta_minutes} min)` : '-'}
                          </td>
                          <td>
                            {alert.status === 'notified' && (
                              <span className="badge-status badge-notified">Team notified</span>
                            )}
                            {alert.status === 'on_work' && (
                              <span className="badge-status badge-onwork">On work</span>
                            )}
                            {alert.status === 'work_done' && (
                              <span className="badge-status badge-workdone">Work done</span>
                            )}
                            {alert.status === 'cleared' && (
                              <span className="badge-status badge-normal">Cleared</span>
                            )}
                          </td>
                          <td>
                            {alert.status === 'notified' && (
                              <button
                                onClick={() => onUpdateStatus(alert.id, 'on_work')}
                                className="btn-primary text-xs py-1 px-2.5"
                              >
                                Begin work
                              </button>
                            )}
                            {alert.status === 'on_work' && (
                              <button
                                onClick={() => onUpdateStatus(alert.id, 'work_done')}
                                className="btn-primary text-xs py-1 px-2.5"
                              >
                                Mark done
                              </button>
                            )}
                            {alert.status === 'work_done' && (
                              <button
                                onClick={() => onUpdateStatus(alert.id, 'cleared')}
                                className="btn-secondary text-xs py-1 px-2.5 text-[#2e9e5b] font-semibold border-[#2e9e5b] hover:bg-[#e8f6ee]"
                              >
                                Clear alert
                              </button>
                            )}
                            {alert.status === 'cleared' && (
                              <span className="text-[#8793a0] text-xs font-medium">Resolved</span>
                            )}
                          </td>
                          <td>
                            <button
                              onClick={() => toggleHistory(alert.id)}
                              className="text-[#0b6fb8] hover:underline text-xs font-semibold"
                            >
                              {isExpanded ? 'Hide' : `History (${alert.events?.length || 0})`}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={10} className="bg-[#f4f8fb] p-4 border-b border-[#dbe3ea]">
                              {/* Hybrid CNN + YOLO Analysis Card */}
                              <div className="bg-white border border-[#dbe3ea] rounded-md p-3 mb-3 shadow-xs">
                                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#dbe3ea]">
                                  <div className="text-xs font-bold text-[#0a3d62] flex items-center gap-2">
                                    <span>Hybrid Neural Inference Breakdown</span>
                                    <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-[#e6f2fb] text-[#0b6fb8]">
                                      CNN (Classifier) + YOLOv8n (Localizer)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs">
                                    <span className="text-[#5b6b7b]">
                                      CNN: <strong className="text-[#0b6fb8] font-mono">{alert.cnn_confidence != null ? `${Math.round(alert.cnn_confidence * 100)}%` : formatConfidence(alert.confidence)}</strong>
                                    </span>
                                    <span className="text-[#5b6b7b]">
                                      YOLO: <strong className="text-[#139a9a] font-mono">{alert.yolo_confidence != null && alert.yolo_confidence > 0 ? `${Math.round(alert.yolo_confidence * 100)}%` : (alert.yolo_detections?.length > 0 ? `${Math.round(alert.yolo_detections[0].confidence * 100)}%` : 'No box')}</strong>
                                    </span>
                                    <span className="text-[#5b6b7b]">
                                      Fused: <strong className="text-[#d64545] font-mono">{alert.fused_confidence != null ? `${Math.round(alert.fused_confidence * 100)}%` : formatConfidence(alert.confidence)}</strong>
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                                  {/* Spectrogram with bounding boxes */}
                                  <div className="md:col-span-5 bg-slate-900 rounded border border-[#dbe3ea] overflow-hidden">
                                    <div className="px-2 py-1 bg-[#1e293b] text-[10px] text-[#94a3b8] flex justify-between">
                                      <span>Log-Mel Spectrogram (640x640)</span>
                                      <span className="text-[#38bdf8] font-mono">{alert.yolo_detections?.length || 0} box(es)</span>
                                    </div>
                                    {alert.spectrogram_image ? (
                                      <img
                                        src={alert.spectrogram_image}
                                        alt={`Spectrogram Alert #${alert.id}`}
                                        className="w-full h-auto object-contain block max-h-[190px] mx-auto"
                                      />
                                    ) : (
                                      <div className="py-12 text-center text-xs text-slate-400">
                                        No spectrogram artifact recorded for this reading
                                      </div>
                                    )}
                                  </div>

                                  {/* Bounding Box Table */}
                                  <div className="md:col-span-7">
                                    <div className="text-[11px] font-semibold text-[#0a3d62] mb-1">
                                      YOLO Localized Leak Signatures (Time & Frequency Domain):
                                    </div>
                                    {alert.yolo_detections && alert.yolo_detections.length > 0 ? (
                                      <table className="table-compact text-xs bg-white border border-[#dbe3ea] rounded w-full">
                                        <thead>
                                          <tr>
                                            <th>Box #</th>
                                            <th>Time Range</th>
                                            <th>Frequency Band</th>
                                            <th>Detection Conf</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {alert.yolo_detections.map((det, idx) => (
                                            <tr key={idx}>
                                              <td className="font-semibold text-[#0a3d62]">#{idx + 1}</td>
                                              <td className="font-mono text-[#0b6fb8]">{det.t_start}s - {det.t_end}s</td>
                                              <td className="font-mono text-[#139a9a]">{Math.round(det.f_low)} Hz - {Math.round(det.f_high)} Hz</td>
                                              <td>
                                                <span className="font-mono font-bold text-[#d64545] bg-[#fdecec] px-1.5 py-0.5 rounded">
                                                  {Math.round(det.confidence * 100)}%
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : (
                                      <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded text-xs text-[#64748b]">
                                        No localized resonance boxes were detected by YOLO for this acoustic window. Decision handled by CNN or background baseline.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="font-semibold text-xs text-[#0a3d62] mb-1.5">
                                Audit Event Trail for Alert #{String(alert.id).padStart(3, '0')}:
                              </div>
                              <table className="table-compact text-xs bg-white border border-[#dbe3ea] rounded">
                                <thead>
                                  <tr>
                                    <th>Timestamp</th>
                                    <th>Status Transition</th>
                                    <th>Event Details / Operator Note</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {alert.events.map((ev) => (
                                    <tr key={ev.id}>
                                      <td className="whitespace-nowrap text-[#5b6b7b]">
                                        {formatDate(ev.timestamp)}
                                      </td>
                                      <td className="font-medium whitespace-nowrap">
                                        {ev.to_status.replace('_', ' ').toUpperCase()}
                                      </td>
                                      <td className="text-[#5b6b7b]">
                                        {ev.note || '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Sensors Table */}
      {activeSubTab === 'sensors' && (
        <div className="border border-[#dbe3ea] rounded-md overflow-x-auto bg-white shadow-xs">
          <table className="table-compact">
            <thead>
              <tr>
                <th>Sensor ID</th>
                <th>Transducer Name / Pipeline Node</th>
                <th>Coordinates (Lat, Lng)</th>
                <th>Status</th>
                <th>Last Acoustic Reading</th>
                <th>Diagnostic Action</th>
              </tr>
            </thead>
            <tbody>
              {sensors.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono font-semibold text-[#0b6fb8]">
                    {s.id}
                  </td>
                  <td className="font-medium text-[#1c2b39]">{s.name}</td>
                  <td className="font-mono text-xs text-[#5b6b7b]">
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
                  <td className="text-[#5b6b7b] text-xs">
                    {s.last_reading_at ? formatDate(s.last_reading_at) : 'N/A'}
                  </td>
                  <td>
                    <button
                      onClick={() => onTriggerLeak(s.id)}
                      className="btn-secondary text-xs py-1 px-2.5"
                      title="Push sample reading to sensor"
                    >
                      Trigger test
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Maintenance Teams Table */}
      {activeSubTab === 'teams' && (
        <div className="border border-[#dbe3ea] rounded-md overflow-x-auto bg-white shadow-xs">
          <table className="table-compact">
            <thead>
              <tr>
                <th>Team ID</th>
                <th>Response Unit Name</th>
                <th>Direct Telephone</th>
                <th>Depot Coordinates</th>
                <th>Operational Status</th>
                <th>Toggle Status</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.id}>
                  <td className="font-mono font-semibold text-[#0b6fb8]">
                    {t.id}
                  </td>
                  <td className="font-medium text-[#1c2b39]">{t.name}</td>
                  <td className="font-mono text-xs text-[#5b6b7b]">{t.phone}</td>
                  <td className="font-mono text-xs text-[#5b6b7b]">
                    {t.lat.toFixed(4)}, {t.lng.toFixed(4)}
                  </td>
                  <td>
                    {t.status === 'available' ? (
                      <span className="badge-status badge-workdone">Available</span>
                    ) : (
                      <span className="badge-status badge-onwork">Dispatched / Busy</span>
                    )}
                  </td>
                  <td>
                    {onToggleTeamStatus && (
                      <button
                        onClick={() => onToggleTeamStatus(t)}
                        className="btn-secondary text-xs py-1 px-2.5"
                      >
                        Set {t.status === 'available' ? 'Busy' : 'Available'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

