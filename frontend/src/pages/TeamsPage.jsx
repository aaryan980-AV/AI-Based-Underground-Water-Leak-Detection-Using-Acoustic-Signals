import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatDate } from '../utils/format';

export default function TeamsPage({ teams = [], onRefreshTeams }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamJobs, setTeamJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Stat boxes
  const totalTeams = teams.length;
  const availableCount = teams.filter(t => t.status === 'available').length;
  const busyCount = teams.filter(t => t.status === 'busy').length;

  // Load team jobs when selected
  useEffect(() => {
    if (!selectedTeam) {
      setTeamJobs([]);
      return;
    }
    let isCurrent = true;
    setLoadingJobs(true);
    api.getTeamJobs(selectedTeam.id)
      .then(data => {
        if (isCurrent) setTeamJobs(data);
      })
      .catch(err => {
        console.error("Failed to load team jobs:", err);
        if (isCurrent) setTeamJobs([]);
      })
      .finally(() => {
        if (isCurrent) setLoadingJobs(false);
      });

    return () => { isCurrent = false; };
  }, [selectedTeam]);

  const toggleTeamStatus = async (team, e) => {
    e.stopPropagation();
    const nextStatus = team.status === 'available' ? 'busy' : 'available';
    try {
      await api.updateTeam(team.id, { status: nextStatus });
      if (onRefreshTeams) onRefreshTeams();
      if (selectedTeam?.id === team.id) {
        setSelectedTeam(prev => ({ ...prev, status: nextStatus }));
      }
    } catch (err) {
      alert("Failed to toggle team status: " + err.message);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Page Title with Section Title Underline & Icon */}
      <div className="pb-3 border-b border-[#dbe3ea]">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-5 h-5 text-[#0b6fb8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="section-title">
            Maintenance Response Fleet
          </h2>
        </div>
        <p className="text-xs text-[#5b6b7b] mt-1">
          Deployment units assigned to emergency valve closures, line repairs, and acoustic correlation.
        </p>
      </div>

      {/* Top row stat boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="stat-box stat-box-blue">
          <div className="stat-box-label">Total teams</div>
          <div className="stat-box-value-container">
            <div className="stat-box-value">{totalTeams}</div>
          </div>
        </div>

        <div className="stat-box stat-box-teal">
          <div className="stat-box-label">Teams Available</div>
          <div className="stat-box-value-container">
            <div className="stat-box-value">{availableCount}</div>
          </div>
        </div>

        <div className="stat-box stat-box-amber">
          <div className="stat-box-label">Busy / En Route</div>
          <div className="stat-box-value-container">
            <div className="stat-box-value">{busyCount}</div>
          </div>
        </div>
      </div>

      {/* Teams Table */}
      <div className="border border-[#dbe3ea] rounded-md bg-white overflow-x-auto shadow-xs">
        <table className="table-compact">
          <thead>
            <tr>
              <th>Team Name / Zone</th>
              <th>Direct Phone</th>
              <th>Operational Status</th>
              <th>Current Alert</th>
              <th className="text-center">Jobs Completed</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[#5b6b7b]">
                  No response teams registered
                </td>
              </tr>
            ) : (
              teams.map((t) => {
                const isSelected = selectedTeam?.id === t.id;
                const hasCurrentAlert = t.current_alert_id && t.current_sensor_id;

                return (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTeam(isSelected ? null : t)}
                    className={`cursor-pointer transition ${
                      isSelected ? 'selected' : ''
                    }`}
                  >
                    <td className="font-medium text-[#1c2b39]">
                      <span className="font-mono font-bold text-[#0b6fb8] mr-2">
                        {t.id}
                      </span>
                      {t.name}
                    </td>
                    <td className="font-mono text-xs text-[#5b6b7b] whitespace-nowrap">
                      {t.phone}
                    </td>
                    <td>
                      {t.status === 'available' ? (
                        <span className="badge-status badge-workdone">Available</span>
                      ) : (
                        <span className="badge-status badge-onwork">Busy / Dispatched</span>
                      )}
                    </td>
                    <td>
                      {hasCurrentAlert ? (
                        <span className="font-mono text-xs font-semibold text-[#d64545] bg-[#fdecec] px-1.5 py-0.5 rounded">
                          Alert #{String(t.current_alert_id).padStart(3, '0')} (Sensor {t.current_sensor_id})
                        </span>
                      ) : (
                        <span className="text-[#8793a0]">-</span>
                      )}
                    </td>
                    <td className="text-center font-mono font-medium">
                      {t.jobs_completed ?? 0}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={(e) => toggleTeamStatus(t, e)}
                        className="btn-secondary text-xs py-1 px-2.5"
                      >
                        Set {t.status === 'available' ? 'Busy' : 'Available'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Selected Team Past Jobs Detail Table */}
      {selectedTeam && (
        <div className="bg-white border border-[#dbe3ea] rounded-md p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#dbe3ea]">
            <div>
              <h3 className="text-sm font-bold text-[#0a3d62]">
                Past Maintenance Jobs — {selectedTeam.name} ({selectedTeam.id})
              </h3>
              <p className="text-xs text-[#5b6b7b]">
                Historical emergency responses and pipeline repairs handled by this unit.
              </p>
            </div>

            <button
              onClick={() => setSelectedTeam(null)}
              className="text-[#5b6b7b] hover:text-[#1c2b39] text-xs font-semibold"
            >
              Close details
            </button>
          </div>

          {loadingJobs ? (
            <div className="text-center py-6 text-xs text-[#5b6b7b]">
              Loading job history...
            </div>
          ) : teamJobs.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#5b6b7b]">
              No past dispatch jobs recorded for this team.
            </div>
          ) : (
            <div className="border border-[#dbe3ea] rounded overflow-x-auto">
              <table className="table-compact">
                <thead>
                  <tr>
                    <th>Alert ID</th>
                    <th>Sensor ID</th>
                    <th>Location</th>
                    <th>Detected Time</th>
                    <th>Status</th>
                    <th className="text-right">Response Time</th>
                    <th className="text-right">Repair Time</th>
                    <th>Cleared Time</th>
                  </tr>
                </thead>
                <tbody>
                  {teamJobs.map((j) => (
                    <tr key={j.id}>
                      <td className="font-mono font-semibold text-[#0a3d62]">
                        #{String(j.id).padStart(3, '0')}
                      </td>
                      <td className="font-semibold text-[#0b6fb8]">
                        {j.sensor_id}
                      </td>
                      <td className="text-[#5b6b7b] max-w-xs truncate">
                        {j.sensor_name || `Sensor Location ${j.sensor_id}`}
                      </td>
                      <td className="text-[#5b6b7b] whitespace-nowrap text-xs">
                        {formatDate(j.created_at)}
                      </td>
                      <td>
                        <span className={`badge-status ${
                          j.status === 'cleared' ? 'badge-normal' : j.status === 'work_done' ? 'badge-workdone' : j.status === 'notified' ? 'badge-notified' : 'badge-onwork'
                        }`}>
                          {j.status}
                        </span>
                      </td>
                      <td className="text-right font-mono text-xs">
                        {j.response_time_minutes ? `${j.response_time_minutes} min` : '-'}
                      </td>
                      <td className="text-right font-mono text-xs">
                        {j.repair_time_minutes ? `${j.repair_time_minutes} min` : '-'}
                      </td>
                      <td className="text-[#5b6b7b] whitespace-nowrap text-xs">
                        {j.cleared_at ? formatDate(j.cleared_at) : (j.status === 'cleared' ? 'Resolved' : 'In Progress')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

