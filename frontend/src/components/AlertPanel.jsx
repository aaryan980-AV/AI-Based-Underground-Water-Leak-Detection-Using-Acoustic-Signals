import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  Navigation, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Phone, 
  History,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { soundAlert } from '../utils/audioAlert';

export default function AlertPanel({
  alerts = [],
  activeFilter = 'active',
  setActiveFilter,
  onUpdateStatus,
  onFocusAlert
}) {
  const [expandedAlerts, setExpandedAlerts] = useState({});

  const toggleExpand = (id) => {
    setExpandedAlerts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredAlerts = alerts.filter(a => {
    if (activeFilter === 'active') return a.status !== 'cleared';
    if (activeFilter === 'resolved') return a.status === 'cleared';
    return true;
  });

  const getWorkflowStep = (status) => {
    switch (status) {
      case 'notified': return 1;
      case 'on_work': return 2;
      case 'work_done': return 3;
      case 'cleared': return 4;
      default: return 1;
    }
  };

  const getNextActionConfig = (status) => {
    switch (status) {
      case 'notified':
        return {
          nextStatus: 'on_work',
          label: 'Begin Work (On Work)',
          color: 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30 text-white',
        };
      case 'on_work':
        return {
          nextStatus: 'work_done',
          label: 'Mark Repaired (Work Done)',
          color: 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30 text-white',
        };
      case 'work_done':
        return {
          nextStatus: 'cleared',
          label: 'Clear Alert & Free Team',
          color: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 text-white',
        };
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111827]/95 border border-white/10 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
      
      {/* Header & Tabs */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <span>Incident Alert Feed</span>
          </h2>
          <p className="text-xs text-gray-400">Real-time leak queue & dispatch management</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center p-1 bg-gray-900 rounded-xl border border-white/5 text-xs font-semibold">
          <button
            onClick={() => setActiveFilter('active')}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeFilter === 'active'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Active ({alerts.filter(a => a.status !== 'cleared').length})
          </button>
          <button
            onClick={() => setActiveFilter('resolved')}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeFilter === 'resolved'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Resolved ({alerts.filter(a => a.status === 'cleared').length})
          </button>
        </div>
      </div>

      {/* Alert Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-gray-500 px-4">
            <ShieldCheck className="w-10 h-10 text-emerald-500/60 mb-2" />
            <p className="text-sm font-semibold text-gray-300">
              {activeFilter === 'active' ? 'No Active Leak Alerts' : 'No Resolved Incidents'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {activeFilter === 'active'
                ? 'All acoustic nodes are reporting normal pressure signatures.'
                : 'Resolved historical records will display here.'}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const step = getWorkflowStep(alert.status);
            const actionConfig = getNextActionConfig(alert.status);
            const isExpanded = !!expandedAlerts[alert.id];

            return (
              <div
                key={alert.id}
                className={`rounded-xl border transition-all ${
                  alert.status === 'cleared'
                    ? 'bg-gray-900/40 border-white/5 opacity-80'
                    : 'bg-gray-900/90 border-rose-500/30 shadow-lg shadow-rose-950/20'
                }`}
              >
                {/* Main Card Content */}
                <div className="p-3.5 space-y-3">
                  
                  {/* Top Bar: Sensor ID & Confidence */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-cyan-400 font-mono">
                          {alert.sensor_id}
                        </span>
                        <span className="text-xs text-gray-300 font-semibold truncate max-w-[170px]">
                          {alert.sensor_name}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <span>{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        <span>•</span>
                        <span>{alert.sensor_lat?.toFixed(3)}, {alert.sensor_lng?.toFixed(3)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                        alert.status === 'cleared'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                      }`}>
                        {Math.round(alert.confidence * 100)}% Leak Prob
                      </span>

                      <button
                        onClick={() => onFocusAlert && onFocusAlert(alert)}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline underline-offset-2"
                      >
                        <Navigation className="w-2.5 h-2.5" />
                        <span>Zoom</span>
                      </button>
                    </div>
                  </div>

                  {/* Nearest Team Dispatch Info */}
                  {alert.assigned_team ? (
                    <div className="p-2.5 rounded-lg bg-gray-950/70 border border-white/5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                          <Wrench className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-200">{alert.assigned_team.name}</div>
                          <div className="text-[10px] text-gray-400 flex items-center gap-2">
                            <span>{alert.distance_km} km away</span>
                            <span>•</span>
                            <span className="text-amber-400 font-semibold">ETA ~{alert.eta_minutes}m</span>
                          </div>
                        </div>
                      </div>

                      <a
                        href={`tel:${alert.assigned_team.phone}`}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition"
                        title={alert.assigned_team.phone}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ) : (
                    <div className="p-2 rounded bg-gray-800/40 text-[11px] text-amber-400">
                      No maintenance unit currently available for assignment.
                    </div>
                  )}

                  {/* Workflow Stepper Indicator */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                      <span className={step >= 1 ? 'text-cyan-400' : ''}>Notified</span>
                      <span className={step >= 2 ? 'text-amber-400' : ''}>On Work</span>
                      <span className={step >= 3 ? 'text-blue-400' : ''}>Work Done</span>
                      <span className={step >= 4 ? 'text-emerald-400' : ''}>Cleared</span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 h-1.5">
                      <div className={`rounded-full ${step >= 1 ? 'bg-cyan-500' : 'bg-gray-800'}`} />
                      <div className={`rounded-full ${step >= 2 ? 'bg-amber-500' : 'bg-gray-800'}`} />
                      <div className={`rounded-full ${step >= 3 ? 'bg-blue-500' : 'bg-gray-800'}`} />
                      <div className={`rounded-full ${step >= 4 ? 'bg-emerald-500' : 'bg-gray-800'}`} />
                    </div>
                  </div>

                  {/* Next Step Action Button */}
                  {actionConfig && (
                    <button
                      onClick={() => {
                        if (actionConfig.nextStatus === 'cleared') {
                          soundAlert.playSuccessSound();
                        }
                        onUpdateStatus(alert.id, actionConfig.nextStatus);
                      }}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] ${actionConfig.color}`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{actionConfig.label}</span>
                    </button>
                  )}

                  {/* Toggle Timeline Log */}
                  <div className="pt-1 flex items-center justify-between text-[11px] text-gray-400">
                    <button
                      onClick={() => toggleExpand(alert.id)}
                      className="flex items-center gap-1 hover:text-white transition"
                    >
                      <History className="w-3 h-3" />
                      <span>Status Timeline ({alert.events?.length || 0})</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                      {alert.status_label}
                    </span>
                  </div>

                </div>

                {/* Expandable Timeline Log */}
                {isExpanded && alert.events && (
                  <div className="p-3 bg-gray-950/80 border-t border-white/5 space-y-2 text-xs">
                    {alert.events.map((ev) => (
                      <div key={ev.id} className="flex items-start gap-2 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-200">
                              {ev.to_status.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="text-gray-500 text-[10px]">
                              {new Date(ev.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          {ev.note && <p className="text-gray-400 mt-0.5">{ev.note}</p>}
                        </div>
                      </div>
                    ))}
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
