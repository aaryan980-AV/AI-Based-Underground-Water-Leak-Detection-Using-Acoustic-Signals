import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/format';

export default function Header({ wsConnected }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDateTime = formatDate(currentTime);
  const timeSeconds = String(currentTime.getSeconds()).padStart(2, '0');

  return (
    <div className="shrink-0 z-20">
      {/* Thin colored loading bar at the top */}
      <div className="top-loading-bar" />

      {/* Solid dark blue header bar (#0a3d62) with white text */}
      <header className="h-12 bg-[#0a3d62] px-5 flex items-center justify-between shrink-0 select-none text-white border-b border-[#08304e]">
        {/* Left: Water droplet icon and System Name */}
        <div className="flex items-center gap-3">
          <svg
            className="w-4 h-4 text-[#139a9a]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"
            />
          </svg>
          <h1 className="text-base font-bold text-white tracking-normal m-0">
            Water Leak Monitoring System
          </h1>
          <span className="text-xs text-[#cfe3f3] border-l border-[#1e527d] pl-3 hidden sm:inline font-normal">
            Municipal Utility Supervisory Control
          </span>
        </div>

        {/* Right: Date/time and Operator */}
        <div className="flex items-center gap-4 text-xs text-[#cfe3f3]">
          <div
            className="flex items-center gap-1.5"
            title={wsConnected ? 'Telemetry feed active' : 'Telemetry feed disconnected'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? 'bg-[#2e9e5b]' : 'bg-[#8793a0]'
              }`}
            />
            <span className="text-white font-medium">
              {wsConnected ? 'System Online' : 'Connecting...'}
            </span>
          </div>

          <span className="text-[#1e527d]">|</span>

          <span className="font-mono text-white">
            {formattedDateTime}:{timeSeconds}
          </span>

          <span className="text-[#1e527d]">|</span>

          <div className="flex items-center gap-1.5">
            <span className="font-medium text-white px-2 py-0.5 rounded bg-[#0e4c79] border border-[#1b5d8f]">
              Operator
            </span>
          </div>
        </div>
      </header>
    </div>
  );
}

