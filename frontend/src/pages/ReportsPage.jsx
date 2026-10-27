import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatDate } from '../utils/format';

export default function ReportsPage({ sensors = [], teams = [] }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedSensor, setSelectedSensor] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [reportData, setReportData] = useState({ reports: [], totals: { total_count: 0, avg_response_time_min: 0, avg_repair_time_min: 0 } });
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await api.getReports({
        from: fromDate,
        to: toDate,
        sensor_id: selectedSensor,
        team_id: selectedTeam
      });
      setReportData(data);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fromDate, toDate, selectedSensor, selectedTeam]);

  // Export filtered rows to CSV
  const handleExportCSV = () => {
    const rows = reportData.reports;
    if (!rows || rows.length === 0) {
      alert("No report data available to export.");
      return;
    }

    const headers = [
      "Alert ID",
      "Sensor ID",
      "Location",
      "Detected Time",
      "Maintenance Team",
      "Response Time (min)",
      "Repair Time (min)",
      "Cleared Time"
    ];

    const escapeCSV = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvLines = [
      headers.join(","),
      ...rows.map(r => [
        escapeCSV(`#${String(r.alert_id).padStart(3, '0')}`),
        escapeCSV(r.sensor_id),
        escapeCSV(r.location),
        escapeCSV(formatDate(r.detected_time)),
        escapeCSV(r.team_name),
        r.response_time_min,
        r.repair_time_min,
        escapeCSV(formatDate(r.cleared_time))
      ].join(",")),
      // Totals line
      [
        escapeCSV("TOTALS"),
        escapeCSV(`Count: ${reportData.totals.total_count}`),
        escapeCSV(""),
        escapeCSV(""),
        escapeCSV(""),
        reportData.totals.avg_response_time_min,
        reportData.totals.avg_repair_time_min,
        escapeCSV("")
      ].join(",")
    ];

    const blob = new Blob([csvLines.join("\r\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date().toISOString().slice(0, 10);
    a.download = `water_leak_reports_${now}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setSelectedSensor('all');
    setSelectedTeam('all');
  };

  const { reports = [], totals = { total_count: 0, avg_response_time_min: 0, avg_repair_time_min: 0 } } = reportData;

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Page Title & Export Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#dbe3ea] gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-5 h-5 text-[#0b6fb8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="section-title">
              Operational Resolution Reports
            </h2>
          </div>
          <p className="text-xs text-[#5b6b7b] mt-1">
            Audited history of resolved leak alerts, response dispatch times, and on-site repair durations.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="btn-primary text-xs shrink-0 py-2 px-3.5 shadow-xs"
        >
          <svg className="w-4 h-4 mr-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#dbe3ea] rounded-md p-3.5 text-xs space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* From Date */}
          <div className="flex items-center gap-1.5">
            <label className="text-[#5b6b7b] font-medium">From:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-white border border-[#dbe3ea] rounded px-2.5 py-1 text-xs text-[#1c2b39] focus:outline-none focus:border-[#0b6fb8]"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-1.5">
            <label className="text-[#5b6b7b] font-medium">To:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-white border border-[#dbe3ea] rounded px-2.5 py-1 text-xs text-[#1c2b39] focus:outline-none focus:border-[#0b6fb8]"
            />
          </div>

          {/* Sensor Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[#5b6b7b] font-medium">Sensor:</label>
            <select
              value={selectedSensor}
              onChange={(e) => setSelectedSensor(e.target.value)}
              className="bg-white border border-[#dbe3ea] rounded px-2.5 py-1 text-xs text-[#1c2b39] focus:outline-none focus:border-[#0b6fb8]"
            >
              <option value="all">All sensors</option>
              {sensors.map(s => (
                <option key={s.id} value={s.id}>
                  {s.id} - {s.name.slice(0, 24)}...
                </option>
              ))}
            </select>
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[#5b6b7b] font-medium">Team:</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-white border border-[#dbe3ea] rounded px-2.5 py-1 text-xs text-[#1c2b39] focus:outline-none focus:border-[#0b6fb8]"
            >
              <option value="all">All teams</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {(fromDate || toDate || selectedSensor !== 'all' || selectedTeam !== 'all') && (
            <button
              onClick={resetFilters}
              className="text-xs text-[#0b6fb8] hover:underline font-semibold"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Reports Table */}
      <div className="border border-[#dbe3ea] rounded-md bg-white overflow-x-auto shadow-xs">
        <table className="table-compact">
          <thead>
            <tr>
              <th>Alert ID</th>
              <th>Sensor ID</th>
              <th>Location</th>
              <th>Detected Time</th>
              <th>Assigned Team</th>
              <th>Cleared Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[#5b6b7b]">
                  Loading report records...
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[#5b6b7b]">
                  No resolved alert incidents match the filter criteria
                </td>
              </tr>
            ) : (
              reports.map((r) => (
                <tr key={r.alert_id}>
                  <td className="font-mono font-semibold text-[#0a3d62]">
                    #{String(r.alert_id).padStart(3, '0')}
                  </td>
                  <td className="font-semibold text-[#0b6fb8]">
                    {r.sensor_id}
                  </td>
                  <td className="max-w-xs truncate text-[#1c2b39]" title={r.location}>
                    {r.location}
                  </td>
                  <td className="text-[#5b6b7b] whitespace-nowrap text-xs">
                    {formatDate(r.detected_time)}
                  </td>
                  <td className="font-medium text-[#1c2b39]">
                    {r.team_name}
                  </td>
                  <td className="text-[#5b6b7b] whitespace-nowrap text-xs">
                    {formatDate(r.cleared_time)}
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* Totals Row at the bottom */}
          {!loading && reports.length > 0 && (
            <tfoot>
              <tr className="bg-[#f4f8fb] font-bold border-t-2 border-[#dbe3ea] text-xs">
                <td colSpan={6} className="py-2.5 px-3 text-[#0a3d62]">
                  Totals: {totals.total_count} resolved incidents
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

