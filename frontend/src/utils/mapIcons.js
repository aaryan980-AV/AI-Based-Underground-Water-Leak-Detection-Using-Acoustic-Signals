/**
 * Custom SVG Markers for Water Leak Monitoring System Map
 * 1. Non-leak sensor: 3D Blue Google Maps Pin (with center hole)
 * 2. Alert/leak sensor: Red Google Maps Pin (with black border and black center)
 * 3. Maintenance team: Blue Water Droplet with Upward-facing Wrench inside (matching user's exact reference)
 * 4. Offline sensor: Grey Google Maps Pin
 */

export const BLUE_PIN_SVG = `
<div class="custom-pin-wrapper sensor-normal-hover" style="cursor: pointer;">
  <svg width="28" height="38" viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 5px rgba(0, 75, 160, 0.45));">
    <!-- Blue 3D pin body -->
    <path d="M14 1C6.82 1 1 6.82 1 14c0 10.5 13 23 13 23s13-12.5 13-23c0-7.18-5.82-13-13-13z" fill="url(#blue_pin_grad)" stroke="#1565c0" stroke-width="1.2" stroke-linejoin="round"/>
    <!-- 3D Bevel Right Facet -->
    <path d="M14 1c4 0 7.8 1.8 10.2 4.6C26 7.6 27 10.7 27 14c0 10.5-13 23-13 23s2.5-6.5 2.5-12c0-4.5-1.5-8-2.5-11.5z" fill="#0d47a1" opacity="0.25"/>
    <!-- Center Hole -->
    <circle cx="14" cy="13.5" r="5" fill="#ffffff"/>
    <circle cx="14" cy="13.5" r="3.2" fill="#1565c0" opacity="0.85"/>
    <defs>
      <linearGradient id="blue_pin_grad" x1="2" y1="2" x2="26" y2="36" gradientUnits="userSpaceOnUse">
        <stop stop-color="#38bdf8"/>
        <stop offset="0.45" stop-color="#1e88e5"/>
        <stop offset="1" stop-color="#0d47a1"/>
      </linearGradient>
    </defs>
  </svg>
</div>
`;

export const RED_PIN_SVG = `
<div class="relative flex items-center justify-center custom-pin-wrapper sensor-alert-hover" style="cursor: pointer;">
  <!-- Radiating alert wave ripple -->
  <div class="absolute -top-1 w-9 h-9 rounded-full bg-red-500/40 animate-ping pointer-events-none"></div>
  <svg width="28" height="40" viewBox="0 0 28 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 8px rgba(220, 38, 38, 0.6));">
    <!-- Classic Red Pin with bold black outline -->
    <path d="M14 1.5C6.82 1.5 1 7.32 1 14.5c0 10.5 13 24 13 24s13-13.5 13-24c0-7.18-5.82-13-13-13z" fill="#ea2222" stroke="#111111" stroke-width="1.8" stroke-linejoin="round"/>
    <!-- Inner solid black circle matching user image -->
    <circle cx="14" cy="14" r="5.2" fill="#111111"/>
  </svg>
</div>
`;

export const OFFLINE_PIN_SVG = `
<div class="custom-pin-wrapper opacity-75" style="cursor: pointer;">
  <svg width="26" height="36" viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));">
    <path d="M14 1C6.82 1 1 6.82 1 14c0 10.2 13 23 13 23s13-12.8 13-23c0-7.18-5.82-13-13-13z" fill="#78909c" stroke="#37474f" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="14" cy="13.5" r="4.8" fill="#cfd8dc"/>
    <circle cx="14" cy="13.5" r="3" fill="#37474f"/>
  </svg>
</div>
`;

export const TEAM_LOGO_SVG = `
<div class="custom-team-wrapper team-logo-hover" style="cursor: pointer; display: flex; align-items: center; justify-content: center;">
  <svg width="30" height="40" viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(234, 88, 12, 0.55));">
    <!-- Google Maps Amber/Orange Maintenance Pin -->
    <path d="M14 1C6.82 1 1 6.82 1 14c0 10.5 13 23 13 23s13-12.5 13-23c0-7.18-5.82-13-13-13z" fill="url(#team_pin_grad)" stroke="#c2410c" stroke-width="1.2" stroke-linejoin="round"/>
    <!-- 3D Bevel Facet -->
    <path d="M14 1c4 0 7.8 1.8 10.2 4.6C26 7.6 27 10.7 27 14c0 10.5-13 23-13 23s2.5-6.5 2.5-12c0-4.5-1.5-8-2.5-11.5z" fill="#7c2d12" opacity="0.22"/>
    <!-- White center circle (Google POI marker badge) -->
    <circle cx="14" cy="13.5" r="6.2" fill="#ffffff" filter="drop-shadow(0 1px 1px rgba(0,0,0,0.2))"/>
    <!-- Google Material 'build' (wrench) icon in matching orange -->
    <path d="M17.4 9.6c-.5-.5-1.3-.7-2-.4l1 1-1 1-.9-.9c-.3.7-.1 1.5.4 2l-3.3 3.3c-.3.3-.3.7 0 1 .3.3.7.3 1 0l3.3-3.3c.5.5 1.3.7 2 .4l-.9-.9 1-1 1 1c.3-.7.1-1.5-.4-2-.3-.2-.5-.2-.7-.2z" fill="#ea580c"/>
    <defs>
      <linearGradient id="team_pin_grad" x1="2" y1="2" x2="26" y2="36" gradientUnits="userSpaceOnUse">
        <stop stop-color="#fb923c"/>
        <stop offset="0.45" stop-color="#f97316"/>
        <stop offset="1" stop-color="#ea580c"/>
      </linearGradient>
    </defs>
  </svg>
</div>
`;

export const getTeamPinSvg = (isBusy = false) => {
  if (isBusy) {
    return `
<div class="relative flex items-center justify-center custom-team-wrapper team-logo-hover" style="cursor: pointer;">
  <div class="absolute -top-1 w-9 h-9 rounded-full bg-amber-500/35 animate-ping pointer-events-none"></div>
  <svg width="30" height="40" viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(217, 119, 6, 0.6));">
    <path d="M14 1C6.82 1 1 6.82 1 14c0 10.5 13 23 13 23s13-12.5 13-23c0-7.18-5.82-13-13-13z" fill="url(#busy_team_pin_grad)" stroke="#b45309" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M14 1c4 0 7.8 1.8 10.2 4.6C26 7.6 27 10.7 27 14c0 10.5-13 23-13 23s2.5-6.5 2.5-12c0-4.5-1.5-8-2.5-11.5z" fill="#78350f" opacity="0.22"/>
    <circle cx="14" cy="13.5" r="6.2" fill="#ffffff" filter="drop-shadow(0 1px 1px rgba(0,0,0,0.2))"/>
    <path d="M17.4 9.6c-.5-.5-1.3-.7-2-.4l1 1-1 1-.9-.9c-.3.7-.1 1.5.4 2l-3.3 3.3c-.3.3-.3.7 0 1 .3.3.7.3 1 0l3.3-3.3c.5.5 1.3.7 2 .4l-.9-.9 1-1 1 1c.3-.7.1-1.5-.4-2-.3-.2-.5-.2-.7-.2z" fill="#d97706"/>
    <defs>
      <linearGradient id="busy_team_pin_grad" x1="2" y1="2" x2="26" y2="36" gradientUnits="userSpaceOnUse">
        <stop stop-color="#fde047"/>
        <stop offset="0.45" stop-color="#eab308"/>
        <stop offset="1" stop-color="#ca8a04"/>
      </linearGradient>
    </defs>
  </svg>
</div>
`;
  }
  return TEAM_LOGO_SVG;
};
