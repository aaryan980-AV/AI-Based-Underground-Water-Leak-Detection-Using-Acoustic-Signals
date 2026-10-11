import React from 'react';
import { 
  Wrench, 
  ShieldCheck, 
  Phone, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  Truck, 
  CheckCircle2, 
  Activity,
  Users
} from 'lucide-react';
import { api } from '../utils/api';

const TEAM_DETAILS = {
  'TEAM-01': {
    jurisdiction: 'BKC, Kurla, Bandra East & Central Corridors',
    vehicle: 'Heavy Hydraulic Valve Van MH-01-EE-4102',
    lead: 'Executive Engineer R. Patil',
    equipment: ['Ultrasonic Pipe Correlator', 'Ground Hydrophone', 'Electrofusion Couplers']
  },
  'TEAM-02': {
    jurisdiction: 'Dadar, Matunga, Sion & Parel (F/North Ward)',
    vehicle: 'Rapid Emergency Response Truck MH-01-EE-7821',
    lead: 'Assistant Engineer S. Deshmukh',
    equipment: ['Acoustic Leak Logger Suite', 'High-Pressure Pipe Clamp Set', 'Emergency Pump']
  },
  'TEAM-03': {
    jurisdiction: 'Andheri, Juhu, Vile Parle & Western Suburbs',
    vehicle: 'Mobile Pipeline Workshop MH-02-CP-9934',
    lead: 'Sub-Divisional Engineer V. Sharma',
    equipment: ['Multi-Channel Correlator', 'Pipe Inspection Endoscope', 'Squeeze-off Tools']
  },
  'TEAM-04': {
    jurisdiction: 'South Mumbai, Fort, Colaba, Marine Drive (A-Ward)',
    vehicle: 'Heritage & Sub-Sea Conduit Unit MH-01-EE-1100',
    lead: 'Senior Hydraulic Officer A. Kulkarni',
    equipment: ['Underwater Acoustic Hydrophone', 'Pneumatic Pipe Cutters', 'Rapid Trench Box']
  }
};

export default function FleetPage({ teams = [], onRefreshTeams }) {
  const toggleTeamStatus = async (team) => {
    const next = team.status === 'available' ? 'busy' : 'available';
    try {
      await api.updateTeam(team.id, { status: next });
      if (onRefreshTeams) onRefreshTeams();
    } catch (e) {
      alert("Failed to toggle team status: " + e.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Truck className="w-3.5 h-3.5" />
            <span>BMC Hydraulic Engineer Department</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Emergency Maintenance Response Fleet
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Rapid deployment crews standing by across Mumbai wards with automatic nearest-unit Haversine dispatching.
          </p>
        </div>

        {/* Readiness Pill */}
        <div className="flex items-center gap-3 p-3 bg-gray-900/90 rounded-2xl border border-white/10 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{teams.filter(t => t.status === 'available').length} Units Ready</span>
          </div>
          <span className="text-gray-600">|</span>
          <div className="text-amber-400 font-bold">
            {teams.filter(t => t.status === 'busy').length} En-route / On-Site
          </div>
        </div>
      </div>

      {/* Grid of Response Fleet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teams.map((team) => {
          const isBusy = team.status === 'busy';
          const info = TEAM_DETAILS[team.id] || {
            jurisdiction: 'Mumbai Central Grid',
            vehicle: 'Emergency Utility Vehicle',
            lead: 'Duty Supervisor',
            equipment: ['Acoustic Sensor Kit', 'Emergency Clamp Set']
          };

          return (
            <div
              key={team.id}
              className={`rounded-2xl border p-6 space-y-5 transition-all shadow-xl ${
                isBusy
                  ? 'bg-gray-900/90 border-amber-500/40 shadow-amber-950/20 ring-1 ring-amber-500/20'
                  : 'bg-gray-900/70 border-white/10 hover:border-blue-500/30'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-2xl border ${
                    isBusy 
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse' 
                      : 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                  }`}>
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-blue-400">{team.id}</span>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                        isBusy ? 'bg-amber-500/30 text-amber-200' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {isBusy ? 'DISPATCHED / BUSY' : 'STANDBY (AVAILABLE)'}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-white mt-0.5">{team.name}</h3>
                  </div>
                </div>

                <button
                  onClick={() => toggleTeamStatus(team)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                    isBusy
                      ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30'
                      : 'bg-amber-600/20 text-amber-300 border-amber-500/30 hover:bg-amber-600/30'
                  }`}
                >
                  {isBusy ? 'Set Available' : 'Set Busy'}
                </button>
              </div>

              {/* Details List */}
              <div className="space-y-2.5 text-xs text-gray-300 p-3.5 rounded-xl bg-gray-950/80 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Coverage Ward:</span>
                  </span>
                  <span className="font-semibold text-gray-200">{info.jurisdiction}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Dispatch Rig:</span>
                  </span>
                  <span className="font-mono text-gray-200">{info.vehicle}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Officer in Charge:</span>
                  </span>
                  <span className="font-semibold text-gray-200">{info.lead}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Direct Hotline:</span>
                  </span>
                  <a href={`tel:${team.phone}`} className="font-mono font-bold text-cyan-400 hover:underline">
                    {team.phone}
                  </a>
                </div>
              </div>

              {/* Equipment Tags */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                  Onboard Acoustic Leak Equipment:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {info.equipment.map((eq, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-gray-800 text-[11px] text-gray-300 border border-white/5 font-medium">
                      {eq}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
