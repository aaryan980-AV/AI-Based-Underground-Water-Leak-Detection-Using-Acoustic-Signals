import React, { useState } from 'react';
import { formatDate, formatConfidence } from '../utils/format';

export default function AlertPanel({
  alerts = [],
  teams = [],
  activeFilter = 'active',
  setActiveFilter,
  onUpdateStatus,
  onFocusAlert
}) {
  const [expandedAlerts, setExpandedAlerts] = useState({});

  const toggleHistory = (id) => {
    setExpandedAlerts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getEffectiveTeam = (alert) => {
    if (alert.assigned_team) return alert.assigned_team;
    if (!alert.sensor_lat || !alert.sensor_lng || !teams || teams.length === 0) return null;
    let minD = Infinity;
    let closest = null;
    for (const t of teams) {
      const d = Math.hypot(t.lat - alert.sensor_lat, t.lng - alert.sensor_lng);
      if (d < minD) {
        minD = d;
        closest = t;
      }
    }
    return closest;
  };

  const getEffectiveDistanceAndEta = (alert, team) => {
    if (alert.distance_km && alert.eta_minutes) {
      return { dist: alert.distance_km, eta: alert.eta_minutes };
    }
    if (!team || !alert.sensor_lat || !alert.sensor_lng) {
      return { dist: null, eta: null };
    }
    const R = 6371;
    const dLat = (team.lat - alert.sensor_lat) * Math.PI / 180;
    const dLng = (team.lng - alert.sensor_lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(alert.sensor_lat * Math.PI / 180) * Math.cos(team.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const distKm = Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(a))) * 1000) / 1000;
    const etaMin = Math.round(((distKm / 35.0) * 60 + 5) * 10) / 10;
    return { dist: distKm, eta: etaMin };
  };

  const filteredAlerts = alerts.filter(a => {
    if (activeFilter === 'active') return a.status !== 'cleared';
    if (activeFilter === 'resolved') return a.status === 'cleared';
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'notified':
        return <span className="badge-status badge-notified">Team notified</span>;
      case 'on_work':
        return <span className="badge-status badge-onwork">On work</span>;
      case 'work_done':
        return <span className="badge-status badge-workdone">Work done</span>;
      case 'cleared':
        return <span className="badge-status badge-normal">Cleared</span>;
      default:
        return <span className="badge-status badge-leak">{status}</span>;
    }
  };

  const getAlertRowClass = (status) => {
    switch (status) {
      case 'notified':
        return 'status-notified';
      case 'on_work':
        return 'status-onwork';
      case 'work_done':
        return 'status-workdone';
      case 'cleared':
        return 'status-cleared';
      default:
        return 'status-leak';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-[#dbe3ea] rounded-md overflow-hidden shadow-sm">
      {/* Panel Header */}
      <div className="px-4 py-3 bg-[#f4f8fb] border-b border-[#dbe3ea] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-[#0a3d62]">Alert Feed</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#e6f2fb] text-[#0b6fb8] font-bold">
            {filteredAlerts.length}
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setActiveFilter('active')}
            className={`px-2.5 py-1 rounded text-xs transition font-medium ${
              activeFilter === 'active'
                ? 'bg-white text-[#0a3d62] border border-[#dbe3ea] font-bold shadow-xs'
                : 'text-[#5b6b7b] hover:text-[#0a3d62]'
            }`}
          >
            Active ({alerts.filter(a => a.status !== 'cleared').length})
          </button>
          <button
            onClick={() => setActiveFilter('resolved')}
            className={`px-2.5 py-1 rounded text-xs transition font-medium ${
              activeFilter === 'resolved'
                ? 'bg-white text-[#0a3d62] border border-[#dbe3ea] font-bold shadow-xs'
                : 'text-[#5b6b7b] hover:text-[#0a3d62]'
            }`}
          >
            Resolved ({alerts.filter(a => a.status === 'cleared').length})
          </button>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded text-xs transition font-medium ${
              activeFilter === 'all'
                ? 'bg-white text-[#0a3d62] border border-[#dbe3ea] font-bold shadow-xs'
                : 'text-[#5b6b7b] hover:text-[#0a3d62]'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Alert List Rows */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredAlerts.length === 0 ? (
          <div className="py-12 text-center text-[#5b6b7b] text-xs">
            {activeFilter === 'active' ? 'No active alerts currently detected' : 'No alerts recorded'}
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isExpanded = !!expandedAlerts[alert.id];
            const rowClass = getAlertRowClass(alert.status);

            return (
              <div
                key={alert.id}
                className={`alert-row ${rowClass}`}
              >
                {/* Header line: IDs, Status, Confidence */}
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[#0a3d62]">
                      #{String(alert.id).padStart(3, '0')}
                    </span>
                    <span className="font-semibold text-[#0b6fb8]">
                      Sensor {alert.sensor_id}
                    </span>
                    {getStatusBadge(alert.status)}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-[#d64545] bg-[#fdecec] px-1.5 py-0.5 rounded">
                      {formatConfidence(alert.confidence)}
                    </span>
                    {onFocusAlert && (
                      <button
                        onClick={() => onFocusAlert(alert)}
                        className="text-[#0b6fb8] hover:underline text-[11px] font-semibold"
                        title="Focus on map"
                      >
                        Locate
                      </button>
                    )}
                  </div>
                </div>

                {/* Location and Detected time */}
                <div className="text-xs text-[#5b6b7b] space-y-0.5 mb-2">
                  <div className="truncate text-[#1c2b39] font-medium">
                    {alert.sensor_name || `Sensor Location ${alert.sensor_id}`}
                  </div>
                  <div className="text-[11px]">
                    Detected: {formatDate(alert.created_at)}
                  </div>
                </div>

                {/* Hybrid CNN + YOLO Confidence Scores */}
                <div className="grid grid-cols-3 gap-1 mb-2 text-center text-[10px]">
                  <div className="bg-[#f4f8fb] border border-[#dbe3ea] rounded py-1 px-1">
                    <div className="text-[#5b6b7b] text-[9px] font-semibold uppercase tracking-tight">CNN Conf</div>
                    <div className="font-mono font-bold text-[#0b6fb8]">
                      {alert.cnn_confidence != null ? `${Math.round(alert.cnn_confidence * 100)}%` : formatConfidence(alert.confidence)}
                    </div>
                  </div>
                  <div className="bg-[#f4f8fb] border border-[#dbe3ea] rounded py-1 px-1">
                    <div className="text-[#5b6b7b] text-[9px] font-semibold uppercase tracking-tight">YOLO Conf</div>
                    <div className="font-mono font-bold text-[#139a9a]">
                      {alert.yolo_confidence != null && alert.yolo_confidence > 0
                        ? `${Math.round(alert.yolo_confidence * 100)}%`
                        : (alert.yolo_detections && alert.yolo_detections.length > 0 ? `${Math.round(alert.yolo_detections[0].confidence * 100)}%` : 'No box')}
                    </div>
                  </div>
                  <div className="bg-[#fdecec] border border-[#f5c6cb] rounded py-1 px-1">
                    <div className="text-[#721c24] text-[9px] font-semibold uppercase tracking-tight">Fused Conf</div>
                    <div className="font-mono font-bold text-[#d64545]">
                      {alert.fused_confidence != null ? `${Math.round(alert.fused_confidence * 100)}%` : formatConfidence(alert.confidence)}
                    </div>
                  </div>
                </div>

                {/* Assigned Team & Dispatch Info */}
                {(() => {
                  const effectiveTeam = getEffectiveTeam(alert);
                  const { dist, eta } = getEffectiveDistanceAndEta(alert, effectiveTeam);
                  return (
                    <div className="bg-white border border-[#dbe3ea] rounded p-2 text-xs mb-2.5">
                      <div className="flex items-center justify-between text-[#1c2b39]">
                        <span className="font-medium text-[#0a3d62]">
                          {effectiveTeam?.name || 'Searching nearest response unit...'}
                        </span>
                        {effectiveTeam?.phone && (
                          <span className="text-[11px] text-[#5b6b7b] font-mono">
                            {effectiveTeam.phone}
                          </span>
                        )}
                      </div>
                      {effectiveTeam && (
                        <div className="text-[11px] text-[#5b6b7b] mt-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[#0b6fb8] font-medium">Dist: {dist ?? 'N/A'} km</span>
                            <span>•</span>
                            <span className="text-[#139a9a] font-medium">ETA: {eta ?? 'N/A'} min</span>
                          </div>
                          {alert.sensor_lat && alert.sensor_lng && effectiveTeam.lat && effectiveTeam.lng && (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&origin=${effectiveTeam.lat},${effectiveTeam.lng}&destination=${alert.sensor_lat},${alert.sensor_lng}&travelmode=driving`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#0b6fb8] hover:text-[#0a3d62] font-semibold flex items-center gap-1 hover:underline text-[10px]"
                              title="Open driving directions in Google Maps"
                            >
                              Google Route ↗
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Workflow Buttons: "Team notified" blue, "On work" amber, "Work done" teal, "Clear alert" green. Currently active step is filled, others outlined */}
                <div className="grid grid-cols-4 gap-1 pt-1">
                  {/* Button 1: Team notified (Blue) */}
                  <button
                    disabled
                    title="Alert registered and maintenance team notified"
                    className={`text-[10px] sm:text-[11px] py-1 px-1 rounded font-semibold text-center transition ${
                      alert.status === 'notified'
                        ? 'bg-[#0b6fb8] text-white border border-[#0b6fb8]'
                        : 'bg-white text-[#0b6fb8] border border-[#0b6fb8] opacity-70'
                    }`}
                  >
                    Notified
                  </button>

                  {/* Button 2: On work (Amber) */}
                  <button
                    onClick={() => onUpdateStatus(alert.id, 'on_work')}
                    disabled={alert.status !== 'notified'}
                    title={alert.status === 'notified' ? 'Click to mark as On Work' : 'Work in progress'}
                    className={`text-[10px] sm:text-[11px] py-1 px-1 rounded font-semibold text-center transition ${
                      alert.status === 'on_work'
                        ? 'bg-[#e69a14] text-white border border-[#e69a14]'
                        : alert.status === 'notified'
                        ? 'bg-white text-[#e69a14] border border-[#e69a14] hover:bg-[#fff4dc] cursor-pointer'
                        : 'bg-white text-[#e69a14] border border-[#e69a14] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    On work
                  </button>

                  {/* Button 3: Work done (Teal) */}
                  <button
                    onClick={() => onUpdateStatus(alert.id, 'work_done')}
                    disabled={alert.status !== 'on_work'}
                    title={alert.status === 'on_work' ? 'Click to mark Work Done' : 'Work completed'}
                    className={`text-[10px] sm:text-[11px] py-1 px-1 rounded font-semibold text-center transition ${
                      alert.status === 'work_done'
                        ? 'bg-[#139a9a] text-white border border-[#139a9a]'
                        : alert.status === 'on_work'
                        ? 'bg-white text-[#139a9a] border border-[#139a9a] hover:bg-[#e3f5f5] cursor-pointer'
                        : 'bg-white text-[#139a9a] border border-[#139a9a] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    Work done
                  </button>

                  {/* Button 4: Clear alert (Green) */}
                  <button
                    onClick={() => onUpdateStatus(alert.id, 'cleared')}
                    disabled={alert.status !== 'work_done'}
                    title={alert.status === 'work_done' ? 'Click to Clear Alert' : 'Alert resolution'}
                    className={`text-[10px] sm:text-[11px] py-1 px-1 rounded font-semibold text-center transition ${
                      alert.status === 'cleared'
                        ? 'bg-[#2e9e5b] text-white border border-[#2e9e5b]'
                        : alert.status === 'work_done'
                        ? 'bg-white text-[#2e9e5b] border border-[#2e9e5b] hover:bg-[#e8f6ee] cursor-pointer'
                        : 'bg-white text-[#2e9e5b] border border-[#2e9e5b] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    Clear alert
                  </button>
                </div>

                {/* History expander toggle */}
                <div className="mt-2.5 pt-1.5 border-t border-[#dbe3ea] flex items-center justify-between text-[11px]">
                  <button
                    onClick={() => toggleHistory(alert.id)}
                    className="text-[#0b6fb8] hover:underline font-medium"
                  >
                    {isExpanded ? 'Hide history' : `History (${alert.events?.length || 0})`}
                  </button>
                  <span className="text-[#5b6b7b] font-medium">
                    Status: {alert.status === 'notified' ? '1/4 Notified' : alert.status === 'on_work' ? '2/4 On Work' : alert.status === 'work_done' ? '3/4 Work Done' : '4/4 Cleared'}
                  </span>
                </div>

                {/* Timestamped event log */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-[#dbe3ea]">
                    <div className="text-[11px] font-semibold text-[#0a3d62] mb-1">
                      Event Log:
                    </div>
                    {alert.events && alert.events.length > 0 ? (
                      <table className="table-compact text-[11px]">
                        <thead>
                          <tr>
                            <th className="py-1 px-1.5">Timestamp</th>
                            <th className="py-1 px-1.5">Status</th>
                            <th className="py-1 px-1.5">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {alert.events.map((ev) => (
                            <tr key={ev.id}>
                              <td className="py-1 px-1.5 text-[#5b6b7b] whitespace-nowrap">
                                {formatDate(ev.timestamp)}
                              </td>
                              <td className="py-1 px-1.5 font-medium whitespace-nowrap">
                                {ev.to_status.replace('_', ' ')}
                              </td>
                              <td className="py-1 px-1.5 text-[#5b6b7b]">
                                {ev.note || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-[11px] text-[#5b6b7b]">No logged events</div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

