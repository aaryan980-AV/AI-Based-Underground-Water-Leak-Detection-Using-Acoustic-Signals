import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.getAnalytics();
      setData(res);
    } catch (e) {
      console.error("Failed to load analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading && !data) {
    return (
      <div className="p-8 text-center text-xs text-[#5b6b7b]">
        Loading operational analytics...
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const sensorBreakdown = data?.alerts_per_sensor || [];

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#dbe3ea]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-5 h-5 text-[#0b6fb8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 className="section-title">
              System Operational Analytics
            </h2>
          </div>
          <p className="text-xs text-[#5b6b7b] mt-1">
            Operational maintenance dispatch statistics, response times, and sensor alert distribution.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="btn-secondary text-xs shadow-xs"
        >
          Refresh data
        </button>
      </div>

      {/* Row of Operational KPI Stat Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="stat-box stat-box-blue">
          <div className="stat-box-label">Total alerts</div>
          <div className="stat-box-value-container">
            <div className="stat-box-value">{kpis.total_alerts ?? 0}</div>
          </div>
        </div>

        <div className="stat-box stat-box-red">
          <div className="stat-box-label">Active leaks</div>
          <div className="stat-box-value-container">
            <div className="stat-box-value">{kpis.active_alerts ?? 0}</div>
          </div>
        </div>

        <div className="stat-box stat-box-green">
          <div className="stat-box-label">Cleared alerts</div>
          <div className="stat-box-value-container">
            <div className="stat-box-value">{kpis.cleared_alerts ?? 0}</div>
          </div>
        </div>

        <div className="stat-box stat-box-teal">
          <div className="stat-box-label">Avg response</div>
          <div className="stat-box-value-container">
            <div className="stat-box-value">
              {kpis.avg_response_time_minutes ?? 0} <span className="text-xs font-normal text-[#5b6b7b]">min</span>
            </div>
          </div>
        </div>

        <div className="stat-box stat-box-amber">
          <div className="stat-box-label">Avg repair</div>
          <div className="stat-box-value-container">
            <div className="stat-box-value">
              {kpis.avg_repair_time_minutes ?? 0} <span className="text-xs font-normal text-[#5b6b7b]">min</span>
            </div>
          </div>
        </div>

        <div className="stat-box stat-box-blue">
          <div className="stat-box-label">Sensors active</div>
          <div className="stat-box-value-container">
            <div className="stat-box-value">{kpis.active_sensors ?? 0}</div>
          </div>
        </div>
      </div>



      {/* Incident Distribution by Sensor: Bar Chart with Rounded Tops Max 3px & Palette Colors */}
      <div className="bg-white border border-[#dbe3ea] rounded-md p-4 space-y-3 shadow-sm">
        <h3 className="text-sm font-bold text-[#0a3d62]">
          Alerts per Sensor Node
        </h3>

        {/* Bar Chart Representation with light gridlines and rounded bar tops max 3px */}
        <div className="border border-[#dbe3ea] rounded-md p-3.5 bg-white">
          <div className="space-y-2.5">
            {sensorBreakdown.map((s, idx) => {
              const maxAlerts = Math.max(...sensorBreakdown.map(item => item.alert_count), 5);
              const pct = (s.alert_count / maxAlerts) * 100;
              const barColor = idx === 0 ? '#0b6fb8' : idx === 1 ? '#139a9a' : idx === 2 ? '#e69a14' : '#0b6fb8';
              return (
                <div key={s.sensor_id} className="flex items-center gap-3 text-xs">
                  <span className="w-12 font-mono font-bold text-[#0b6fb8] shrink-0">
                    {s.sensor_id}
                  </span>
                  <span className="w-48 truncate text-[#5b6b7b] shrink-0" title={s.sensor_name}>
                    {s.sensor_name}
                  </span>
                  <div className="flex-1 bg-[#f4f8fb] h-4 rounded-sm border border-[#e6edf3] overflow-hidden flex items-center">
                    <div
                      className="h-full transition-all duration-150"
                      style={{
                        width: `${Math.max(pct, s.alert_count > 0 ? 3 : 0)}%`,
                        backgroundColor: barColor,
                        borderRadius: '0 3px 3px 0'
                      }}
                    />
                  </div>
                  <span className="w-16 text-right font-mono font-medium text-[#1c2b39] shrink-0">
                    {s.alert_count} {s.alert_count === 1 ? 'alert' : 'alerts'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

