import React from 'react';

export default function AlertBanner({ banner, onDismiss, onFocusAlert }) {
  if (!banner) return null;

  const alert = banner.alert;
  const sensorId = alert?.sensor_id || 'Unknown';
  const confidence = alert?.confidence ? `${Math.round(alert.confidence * 100)}%` : '';
  const teamName = alert?.assigned_team?.name || 'No team';
  const distance = alert?.distance_km ? `${alert.distance_km} km` : '';

  const summaryText = banner.message || `Leak detected - Sensor ${sensorId}${confidence ? ` - Confidence ${confidence}` : ''}. ${teamName} dispatched${distance ? ` (${distance})` : ''}.`;

  return (
    <div className="fixed top-16 right-5 z-[1000] max-w-md bg-[#fdecec] border border-[#d64545] border-l-4 border-l-[#d64545] p-3.5 rounded-md shadow-md text-xs text-[#1c2b39]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="font-bold text-[#d64545] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#d64545]" />
            Leak Alert Detected
          </div>
          <p className="text-[#1c2b39] font-medium leading-snug">
            {summaryText}
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="text-[#5b6b7b] hover:text-[#1c2b39] text-base font-bold px-1"
          title="Dismiss"
        >
          ×
        </button>
      </div>

      {alert && onFocusAlert && (
        <div className="mt-2.5 pt-2 border-t border-[#f8c2be] flex justify-end gap-2">
          <button
            onClick={() => {
              onFocusAlert(alert);
              onDismiss();
            }}
            className="text-[11px] font-bold text-[#0b6fb8] hover:underline"
          >
            Locate on map →
          </button>
        </div>
      )}
    </div>
  );
}

