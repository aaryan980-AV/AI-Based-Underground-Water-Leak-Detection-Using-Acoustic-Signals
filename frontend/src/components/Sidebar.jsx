import React, { useState } from 'react';
import { soundAlert } from '../utils/audioAlert';

export default function Sidebar({
  activeTab,
  setActiveTab,
  simulatorActive,
  onToggleSimulator,
  onTriggerLeak,
  sensors = [],
  activeAlertCount = 0,
}) {
  const [soundEnabled, setSoundEnabled] = useState(soundAlert.enabled);
  const [selectedSensor, setSelectedSensor] = useState(sensors[0]?.id || 'S-04');
  const [triggering, setTriggering] = useState(false);

  const toggleSound = () => {
    soundAlert.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await onTriggerLeak(selectedSensor);
    } finally {
      setTimeout(() => setTriggering(false), 800);
    }
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      badge: activeAlertCount > 0 ? activeAlertCount : null,
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
        </svg>
      )
    },
    {
      id: 'alerts',
      label: 'Alerts',
      badge: null,
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },
    {
      id: 'sensors',
      label: 'Sensors',
      badge: null,
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      )
    },
    {
      id: 'teams',
      label: 'Teams',
      badge: null,
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'reports',
      label: 'Reports',
      badge: null,
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'analytics',
      label: 'Analytics',
      badge: null,
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'model_performance',
      label: 'Model Performance',
      badge: 'Hybrid',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'admin',
      label: 'Admin',
      badge: null,
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
  ];

  return (
    <aside className="w-[220px] bg-[#0a3d62] border-r border-[#08304e] flex flex-col justify-between shrink-0 select-none h-[calc(100vh-51px)]">
      {/* Navigation Menu */}
      <div className="py-2.5">
        <div className="px-3.5 py-1.5 text-[11px] font-semibold text-[#8fb8d8] uppercase tracking-wider">
          Navigation
        </div>
        <nav className="flex flex-col gap-0.5 px-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-[#d64545] text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Simulator & Telemetry Controls */}
      <div className="p-3 border-t border-[#134d79] bg-[#093555] text-xs space-y-3">
        <div className="text-[11px] font-semibold text-[#8fb8d8] uppercase tracking-wider">
          Simulator Controls
        </div>

        {/* Toggle Background Simulator */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[#cfe3f3]">
            <span>Background stream:</span>
            <span className={simulatorActive ? 'text-[#2e9e5b] font-semibold' : 'text-[#8793a0]'}>
              {simulatorActive ? 'Active' : 'Stopped'}
            </span>
          </div>
          <button
            onClick={onToggleSimulator}
            className="w-full text-xs py-1.5 px-3 rounded bg-[#0e4c79] hover:bg-[#155a8e] text-white border border-[#1b5d8f] transition font-medium"
          >
            {simulatorActive ? 'Stop simulator' : 'Start simulator'}
          </button>
        </div>

        {/* Trigger Test Leak */}
        <div className="space-y-1.5 pt-2 border-t border-[#134d79]">
          <label className="block text-[#cfe3f3]">Trigger test leak:</label>
          <div className="flex gap-1.5">
            <select
              value={selectedSensor}
              onChange={(e) => setSelectedSensor(e.target.value)}
              className="flex-1 bg-[#0e4c79] border border-[#1b5d8f] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#139a9a]"
            >
              {sensors.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#0a3d62] text-white">
                  {s.id}
                </option>
              ))}
            </select>
            <button
              onClick={handleTrigger}
              disabled={triggering}
              className="btn-primary text-xs px-2.5"
              title="Push a real leak audio clip to trigger debounced alert"
            >
              {triggering ? 'Sending...' : 'Trigger'}
            </button>
          </div>
        </div>

        {/* Sound toggle */}
        <div className="pt-2 border-t border-[#134d79] flex items-center justify-between text-[#cfe3f3]">
          <label htmlFor="sound-toggle" className="cursor-pointer">
            Alert buzzer:
          </label>
          <input
            id="sound-toggle"
            type="checkbox"
            checked={soundEnabled}
            onChange={toggleSound}
            className="cursor-pointer accent-[#139a9a]"
          />
        </div>
      </div>
    </aside>
  );
}

