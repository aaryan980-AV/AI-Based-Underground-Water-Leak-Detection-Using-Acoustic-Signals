import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { formatDate } from '../utils/format';
import { MUMBAI_PIPELINE_GRAPH } from '../utils/mumbaiPipelineGraph';
import { 
  getStoredApiKey, 
  setStoredApiKey, 
  getGoogleMapsDirectionsUrl, 
  getGoogleMapsPlaceUrl 
} from '../utils/googleMapsLoader';
import { 
  BLUE_PIN_SVG, 
  RED_PIN_SVG, 
  OFFLINE_PIN_SVG, 
  TEAM_LOGO_SVG,
  getTeamPinSvg
} from '../utils/mapIcons';

const TILE_PROVIDERS = {
  roadmap: {
    id: 'roadmap',
    name: 'Google Maps (Roadmap)',
    shortName: 'Roadmap',
    icon: '🗺️',
    url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps'
  },
  satellite: {
    id: 'satellite',
    name: 'Google Satellite (Hybrid)',
    shortName: 'Satellite',
    icon: '🛰️',
    url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps'
  },
  terrain: {
    id: 'terrain',
    name: 'Google Terrain',
    shortName: 'Terrain',
    icon: '⛰️',
    url: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps'
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    shortName: 'OSM',
    icon: '🌐',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }
};

const MUMBAI_VIEWPOINTS = [
  { label: 'All Mumbai', center: [19.0600, 72.8650], zoom: 11 },
  { label: 'BKC Hub', center: [19.0660, 72.8685], zoom: 14 },
  { label: 'Dadar', center: [19.0178, 72.8478], zoom: 14 },
  { label: 'South Mumbai', center: [18.9400, 72.8250], zoom: 13 },
  { label: 'Powai/Bhandup', center: [19.1350, 72.9200], zoom: 13 }
];

export default function DashboardMap({
  sensors = [],
  teams = [],
  alerts = [],
  focusedAlert = null,
  onSelectSensor = null,
  center = [19.0760, 72.8777]
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const currentTileLayerRef = useRef(null);

  const [activeTileType, setActiveTileType] = useState('roadmap');
  const [showPipelineGraph, setShowPipelineGraph] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getStoredApiKey());
  const [apiKeySavedStatus, setApiKeySavedStatus] = useState('');

  const layersRef = useRef({
    tileLayer: null,
    pipelineGraphLayer: null,
    sensorsLayer: null,
    teamsLayer: null,
    dispatchLinesLayer: null,
  });

  // 1. Initialize Map with Google Maps Roadmap Layer by default
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: 11,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial Google Maps Roadmap tile layer
    const initialConfig = TILE_PROVIDERS.roadmap;
    const initialTile = L.tileLayer(initialConfig.url, {
      subdomains: initialConfig.subdomains,
      maxZoom: initialConfig.maxZoom,
      attribution: initialConfig.attribution,
    }).addTo(map);

    currentTileLayerRef.current = initialTile;

    // Layer groups
    layersRef.current.pipelineGraphLayer = L.layerGroup().addTo(map);
    layersRef.current.dispatchLinesLayer = L.layerGroup().addTo(map);
    layersRef.current.sensorsLayer = L.layerGroup().addTo(map);
    layersRef.current.teamsLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Handle Map Tile Layer Switching (Google Roadmap, Satellite, Terrain, OSM)
  const switchTileLayer = (tileType) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const config = TILE_PROVIDERS[tileType];
    if (!config) return;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    const newTile = L.tileLayer(config.url, {
      subdomains: config.subdomains,
      maxZoom: config.maxZoom,
      attribution: config.attribution,
    }).addTo(map);

    // Bring vector layers to front
    if (layersRef.current.pipelineGraphLayer) layersRef.current.pipelineGraphLayer.bringToFront?.();
    if (layersRef.current.dispatchLinesLayer) layersRef.current.dispatchLinesLayer.bringToFront?.();
    if (layersRef.current.sensorsLayer) layersRef.current.sensorsLayer.bringToFront?.();
    if (layersRef.current.teamsLayer) layersRef.current.teamsLayer.bringToFront?.();

    currentTileLayerRef.current = newTile;
    setActiveTileType(tileType);
  };

  // 3. Render Pipeline Network Graph Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const { pipelineGraphLayer } = layersRef.current;
    pipelineGraphLayer.clearLayers();

    if (!showPipelineGraph) return;

    // Detect which sensors currently have active leaks
    const leakingSensorIds = new Set(
      sensors.filter(s => s.status === 'leak').map(s => s.id)
    );

    MUMBAI_PIPELINE_GRAPH.forEach(pipe => {
      const isCompromised = leakingSensorIds.has(pipe.from) || leakingSensorIds.has(pipe.to);

      // Base pipe casing (glow effect)
      const casingLine = L.polyline(pipe.coords, {
        color: isCompromised ? '#dc2626' : '#0369a1',
        weight: isCompromised ? 7 : 5,
        opacity: isCompromised ? 0.85 : 0.65,
        lineCap: 'round',
        lineJoin: 'round'
      });

      // Animated inner flow line
      const flowLine = L.polyline(pipe.coords, {
        color: isCompromised ? '#fca5a5' : '#38bdf8',
        weight: isCompromised ? 4 : 2.5,
        opacity: 0.95,
        className: isCompromised ? 'pipe-leak-path' : 'pipe-flow-path'
      });

      // Pipeline Telemetry Info Popup
      const popupHtml = `
        <div style="font-family: inherit; min-width: 210px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 700; font-size: 13px; color: #0a3d62;">
              ${pipe.name}
            </span>
          </div>
          <div style="font-size: 11px; color: #5b6b7b; margin-bottom: 6px;">
            Pipe ID: <strong style="color: #0b6fb8;">${pipe.id}</strong> (${pipe.material})
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; margin-bottom: 8px; background: #f4f8fb; padding: 6px; border-radius: 4px; border: 1px solid #dbe3ea;">
            <div><strong>Diameter:</strong> ${pipe.diameterMm} mm</div>
            <div><strong>Pressure:</strong> ${pipe.nominalPressureBar} Bar</div>
            <div><strong>Flow:</strong> ${pipe.flowMld} MLD</div>
            <div>
              <strong>Status:</strong>
              <span style="color: ${isCompromised ? '#d64545' : '#2e9e5b'}; font-weight: 700;">
                ${isCompromised ? 'COMPROMISED' : 'NORMAL'}
              </span>
            </div>
          </div>
          <div style="font-size: 11px; color: #5b6b7b;">
            Connects: <strong>${pipe.from}</strong> ➔ <strong>${pipe.to}</strong>
          </div>
        </div>
      `;

      casingLine.bindPopup(popupHtml);
      flowLine.bindPopup(popupHtml);

      pipelineGraphLayer.addLayer(casingLine);
      pipelineGraphLayer.addLayer(flowLine);
    });
  }, [showPipelineGraph, sensors]);

  // 4. Update Markers (Sensors, Teams) & Dispatch Routes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const { sensorsLayer, teamsLayer, dispatchLinesLayer } = layersRef.current;
    sensorsLayer.clearLayers();
    teamsLayer.clearLayers();
    dispatchLinesLayer.clearLayers();

    // Render Sensors (Non-leak = Blue pin, Alert/Leak = Red pin, Offline = Grey pin)
    sensors.forEach((s) => {
      const isLeak = s.status === 'leak';
      const isOffline = s.status === 'offline';

      const sensorHtml = isLeak 
        ? RED_PIN_SVG 
        : isOffline 
        ? OFFLINE_PIN_SVG 
        : BLUE_PIN_SVG;

      const sensorIcon = L.divIcon({
        className: 'custom-sensor-icon',
        html: sensorHtml,
        iconSize: isLeak ? [28, 40] : isOffline ? [26, 36] : [28, 38],
        iconAnchor: isLeak ? [14, 40] : isOffline ? [13, 36] : [14, 38],
        popupAnchor: isLeak ? [0, -38] : isOffline ? [0, -34] : [0, -36],
      });

      const marker = L.marker([s.lat, s.lng], { icon: sensorIcon });
      const gmapsLink = getGoogleMapsPlaceUrl(s.lat, s.lng, `${s.name} Mumbai`);

      const popupHtml = `
        <div style="font-family: inherit; min-width: 220px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
            <span style="font-weight: 700; font-size: 13px; color: #0a3d62;">Sensor ${s.id}</span>
            <span style="display:inline-block; padding:1px 8px; border-radius:12px; font-weight:600; font-size:11px; background:${isLeak ? '#fdecec' : isOffline ? '#eef1f4' : '#e8f6ee'}; color:${isLeak ? '#d64545' : isOffline ? '#8793a0' : '#2e9e5b'};">
              ${s.status.toUpperCase()}
            </span>
          </div>
          <div style="font-size: 12px; color: #5b6b7b; margin-bottom: 6px;">
            ${s.name}
          </div>
          <div style="font-size: 11px; color: #5b6b7b; margin-bottom: 2px;">
            <strong>Coords:</strong> ${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}
          </div>
          <div style="font-size: 11px; color: #5b6b7b; margin-bottom: 8px;">
            <strong>Last Reading:</strong> ${s.last_reading_at ? formatDate(s.last_reading_at) : 'N/A'}
          </div>
          
          <div style="pt: 6px; border-top: 1px solid #eef2f6;">
            <a 
              href="${gmapsLink}" 
              target="_blank" 
              rel="noopener noreferrer"
              style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: #0b6fb8; text-decoration: none;"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              Open in Google Maps ↗
            </a>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);

      if (onSelectSensor) {
        marker.on('click', () => onSelectSensor(s));
      }
      sensorsLayer.addLayer(marker);
    });

    // Helper to find nearest team client-side if not assigned
    const getNearestTeamForAlert = (alertObj) => {
      if (!alertObj) return null;
      if (alertObj.assigned_team) return alertObj.assigned_team;
      if (!alertObj.sensor_lat || !alertObj.sensor_lng || !teams || teams.length === 0) return null;
      let minD = Infinity;
      let closest = null;
      for (const tm of teams) {
        const d = Math.hypot(tm.lat - alertObj.sensor_lat, tm.lng - alertObj.sensor_lng);
        if (d < minD) {
          minD = d;
          closest = tm;
        }
      }
      return closest;
    };

    // Render Teams: Only show the maintenance team near the alert location
    const activeAlerts = alerts
      .filter(a => a.status !== 'cleared')
      .map(a => ({
        ...a,
        assigned_team: a.assigned_team || getNearestTeamForAlert(a)
      }))
      .filter(a => a.assigned_team && a.sensor_lat);

    const resolvedFocusedAlert = focusedAlert && focusedAlert.status !== 'cleared'
      ? { ...focusedAlert, assigned_team: focusedAlert.assigned_team || getNearestTeamForAlert(focusedAlert) }
      : null;

    const targetAlert = resolvedFocusedAlert || (activeAlerts[0] || null);

    // Render all registered maintenance teams on the map so the full fleet is visible
    let teamsToRender = [...teams];
    if (targetAlert && targetAlert.assigned_team) {
      const exists = teamsToRender.some(t => t.id === targetAlert.assigned_team.id);
      if (!exists) {
        teamsToRender.push(targetAlert.assigned_team);
      }
    }

    teamsToRender.forEach((t) => {
      const isBusy = t.status === 'busy';

      const teamIcon = L.divIcon({
        className: 'custom-team-icon',
        html: getTeamPinSvg(isBusy),
        iconSize: [30, 40],
        iconAnchor: [15, 40],
        popupAnchor: [0, -38],
      });

      const marker = L.marker([t.lat, t.lng], { icon: teamIcon });
      const gmapsLink = getGoogleMapsPlaceUrl(t.lat, t.lng, `${t.name} Mumbai`);

      const popupHtml = `
        <div style="font-family: inherit; min-width: 210px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
            <span style="font-weight: 700; font-size: 13px; color: #0a3d62;">${t.name}</span>
            <span style="display:inline-block; padding:1px 8px; border-radius:12px; font-weight:600; font-size:11px; background:${isBusy ? '#fff4dc' : '#e3f5f5'}; color:${isBusy ? '#e69a14' : '#139a9a'};">
              ${t.status.toUpperCase()}
            </span>
          </div>
          <div style="font-size: 11px; color: #5b6b7b; margin-bottom: 2px;">
            <strong>ID:</strong> ${t.id} | <strong>Phone:</strong> ${t.phone}
          </div>
          <div style="font-size: 11px; color: #5b6b7b; margin-bottom: 8px;">
            <strong>Location:</strong> ${t.lat.toFixed(4)}, ${t.lng.toFixed(4)}
          </div>
          <div>
            <a 
              href="${gmapsLink}" 
              target="_blank" 
              rel="noopener noreferrer"
              style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: #139a9a; text-decoration: none;"
            >
              📍 View in Google Maps ↗
            </a>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
      teamsLayer.addLayer(marker);
    });

    // Render Dispatch Routes for active alerts so every assigned maintenance team has its route line visible
    const routesToRender = activeAlerts.length > 0
      ? activeAlerts
      : (targetAlert && targetAlert.assigned_team && targetAlert.sensor_lat ? [targetAlert] : []);

    routesToRender.forEach((a) => {
      const teamCoord = [a.assigned_team.lat, a.assigned_team.lng];
      const sensorCoord = [a.sensor_lat, a.sensor_lng];

      const midLat = (teamCoord[0] + sensorCoord[0]) / 2;
      const midLng = (teamCoord[1] + sensorCoord[1]) / 2;
      const midCoord = [midLat, midLng];

      const solidBlueLine = L.polyline([teamCoord, midCoord], {
        color: '#0b6fb8',
        weight: 3.5,
        opacity: 0.95,
      });

      const dashedTealLine = L.polyline([midCoord, sensorCoord], {
        color: '#139a9a',
        weight: 3.5,
        opacity: 0.95,
        dashArray: '6, 6',
      });

      const navDirectionsUrl = getGoogleMapsDirectionsUrl(
        a.assigned_team.lat, 
        a.assigned_team.lng, 
        a.sensor_lat, 
        a.sensor_lng
      );

      // Midpoint badge with distance, ETA, and clickable Google Maps directions trigger
      const badgeIcon = L.divIcon({
        className: 'dispatch-route-badge-icon',
        html: `
          <div class="dispatch-route-badge" style="cursor: pointer;" title="Click for Google Maps turn-by-turn route">
            <span style="color:#0b6fb8; font-weight:700;">${a.distance_km || '?'} km</span>
            <span style="color:#5b6b7b; margin: 0 4px;">•</span>
            <span style="color:#139a9a; font-weight:700;">ETA ${a.eta_minutes || '?'} min</span>
            <span style="color:#d97706; margin-left: 4px;">🧭</span>
          </div>
        `,
        iconAnchor: [65, 12],
      });

      const badgeMarker = L.marker([midLat, midLng], { icon: badgeIcon });
      badgeMarker.on('click', () => {
        window.open(navDirectionsUrl, '_blank', 'noopener,noreferrer');
      });

      dispatchLinesLayer.addLayer(solidBlueLine);
      dispatchLinesLayer.addLayer(dashedTealLine);
      dispatchLinesLayer.addLayer(badgeMarker);
    });

  }, [sensors, teams, alerts]);

  // Function to frame ALL 13 sensors and ALL 4 maintenance teams across Mumbai
  const fitAllMumbai = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const allPoints = [
      ...sensors.map(s => [s.lat, s.lng]),
      ...teams.map(t => [t.lat, t.lng])
    ];
    if (allPoints.length > 0) {
      const group = L.featureGroup(allPoints.map(p => L.marker(p)));
      map.fitBounds(group.getBounds().pad(0.1), { animate: true });
    }
  };

  // Initial bounds framing: frames all sensors and teams so the whole Mumbai network is visible
  const hasInitiallyFitRef = useRef(false);
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || (!sensors.length && !teams.length) || hasInitiallyFitRef.current) return;
    fitAllMumbai();
    hasInitiallyFitRef.current = true;
  }, [sensors, teams]);

  // Focus bounds on alert when explicitly selected by user
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !focusedAlert) return;

    if (focusedAlert.sensor_lat && focusedAlert.sensor_lng) {
      const team = focusedAlert.assigned_team || getNearestTeamForAlert(focusedAlert);
      if (team && team.lat && team.lng) {
        const bounds = L.latLngBounds([
          [focusedAlert.sensor_lat, focusedAlert.sensor_lng],
          [team.lat, team.lng]
        ]);
        map.fitBounds(bounds.pad(0.3), { maxZoom: 13, animate: true });
      } else {
        map.setView([focusedAlert.sensor_lat, focusedAlert.sensor_lng], 13, { animate: true });
      }
    }
  }, [focusedAlert]);

  const handleSaveApiKey = () => {
    setStoredApiKey(apiKeyInput);
    setApiKeySavedStatus('Saved! Google Maps API key active.');
    setTimeout(() => {
      setShowApiKeyModal(false);
      setApiKeySavedStatus('');
    }, 1200);
  };

  return (
    <div className="relative w-full h-full min-h-[520px] border border-[#dbe3ea] rounded-md overflow-hidden bg-[#e5e3df] shadow-sm flex flex-col">
      
      {/* Top Map Toolbar: Layer Switcher & Pipeline Network Graph Toggle */}
      <div className="absolute top-3 left-3 z-[400] flex flex-wrap items-center gap-1.5 bg-white/95 backdrop-blur-sm border border-[#dbe3ea] rounded-md p-1.5 shadow-md">
        
        {/* Layer Mode Buttons */}
        <div className="flex items-center bg-[#f0f4f8] rounded p-0.5 border border-[#dbe3ea]">
          {Object.values(TILE_PROVIDERS).map((tile) => (
            <button
              key={tile.id}
              onClick={() => switchTileLayer(tile.id)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-all flex items-center gap-1.5 ${
                activeTileType === tile.id
                  ? 'bg-white text-[#0a3d62] shadow-sm border border-[#c4d6e5]'
                  : 'text-[#5b6b7b] hover:text-[#1c2b39] hover:bg-white/60'
              }`}
              title={tile.name}
            >
              <span>{tile.icon}</span>
              <span>{tile.shortName}</span>
            </button>
          ))}
        </div>

        {/* Pipeline Network Graph Toggle */}
        <button
          onClick={() => setShowPipelineGraph(!showPipelineGraph)}
          className={`px-2.5 py-1 text-xs font-semibold rounded border transition-all flex items-center gap-1.5 ${
            showPipelineGraph
              ? 'bg-[#0b6fb8] text-white border-[#0b6fb8] shadow-sm'
              : 'bg-white text-[#5b6b7b] border-[#dbe3ea] hover:bg-[#f4f8fb]'
          }`}
          title="Toggle BMC Municipal Pipeline Network Graph Overlay"
        >
          <span>⚡</span>
          <span>Pipeline Graph: {showPipelineGraph ? 'ON' : 'OFF'}</span>
        </button>

        {/* Fit All Mumbai (13 Sensors • 4 Teams) */}
        <button
          onClick={fitAllMumbai}
          className="px-2.5 py-1 text-xs font-semibold rounded border border-[#0b6fb8] bg-[#0b6fb8]/10 text-[#0b6fb8] hover:bg-[#0b6fb8] hover:text-white transition-all flex items-center gap-1.5 shadow-xs"
          title="Fit view to show all 13 sensors and 4 maintenance teams across Mumbai"
        >
          <span>🌐</span>
          <span>View All (13 Sensors • 4 Teams)</span>
        </button>

        {/* Google API Key Setup / Config */}
        <button
          onClick={() => setShowApiKeyModal(true)}
          className="px-2.5 py-1 text-xs font-semibold rounded border border-[#dbe3ea] bg-white text-[#0a3d62] hover:bg-[#f4f8fb] transition-all flex items-center gap-1.5"
          title="Configure Google Maps API Key"
        >
          <span>🔑</span>
          <span>Google API</span>
        </button>

      </div>

      {/* Quick Jump Buttons in Top-Right under Zoom */}
      <div className="absolute top-14 right-3 z-[400] flex flex-col gap-1 bg-white/95 backdrop-blur-sm border border-[#dbe3ea] rounded-md p-1 shadow-md">
        <div className="text-[10px] font-bold text-[#0a3d62] px-1.5 py-0.5 uppercase tracking-wider">
          Mumbai Focus
        </div>
        {MUMBAI_VIEWPOINTS.map((vp) => (
          <button
            key={vp.label}
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView(vp.center, vp.zoom, { animate: true });
              }
            }}
            className="text-left px-2 py-0.5 text-[11px] font-medium text-[#5b6b7b] hover:text-[#0b6fb8] hover:bg-[#f0f7fd] rounded transition-colors"
          >
            {vp.label}
          </button>
        ))}
      </div>

      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full flex-1 min-h-[500px]" />

      {/* Official Google Maps Watermark Badge in Bottom-Right */}
      <div className="absolute bottom-3 right-3 z-[400] pointer-events-auto">
        <div className="google-maps-attribution-badge">
          <svg className="w-4 h-4 text-[#4285F4]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>
          </svg>
          <span className="font-semibold text-[#3c4043]">Google Maps</span>
          <span className="text-[10px] text-[#70757a] border-l border-gray-300 pl-1.5">
            {activeTileType === 'roadmap' ? 'Mumbai Grid' : TILE_PROVIDERS[activeTileType].shortName}
          </span>
        </div>
      </div>

      {/* Map Legend Box in Bottom-Left */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-sm border border-[#dbe3ea] rounded-md p-3 text-xs text-[#1c2b39] space-y-1.5 shadow-md pointer-events-auto max-w-[260px]">
        <div className="flex items-center justify-between pb-1 border-b border-[#dbe3ea]">
          <span className="font-bold text-[11px] text-[#0a3d62] uppercase tracking-wider">
            Water Network Legend
          </span>
          <span className="text-[10px] text-[#5b6b7b]">Mumbai Grid</span>
        </div>
        
        <div className="flex items-center gap-2.5">
          <svg width="16" height="22" viewBox="0 0 28 38" fill="none" className="shrink-0">
            <path d="M14 1C6.82 1 1 6.82 1 14c0 10.5 13 23 13 23s13-12.5 13-23c0-7.18-5.82-13-13-13z" fill="#1e88e5" stroke="#1565c0" strokeWidth="1.2"/>
            <circle cx="14" cy="13.5" r="5" fill="#ffffff"/>
            <circle cx="14" cy="13.5" r="3.2" fill="#0d47a1"/>
          </svg>
          <span className="font-medium text-[#1c2b39]">Normal Sensor (Blue Pin)</span>
        </div>

        <div className="flex items-center gap-2.5">
          <svg width="16" height="22" viewBox="0 0 28 40" fill="none" className="shrink-0">
            <path d="M14 1.5C6.82 1.5 1 7.32 1 14.5c0 10.5 13 24 13 24s13-13.5 13-24c0-7.18-5.82-13-13-13z" fill="#ea2222" stroke="#111111" strokeWidth="1.8"/>
            <circle cx="14" cy="14" r="5.2" fill="#111111"/>
          </svg>
          <span className="font-semibold text-[#d64545]">Active Leak (Red Alert Pin)</span>
        </div>

        <div className="flex items-center gap-2.5">
          <svg width="15" height="21" viewBox="0 0 28 38" fill="none" className="shrink-0 opacity-70">
            <path d="M14 1C6.82 1 1 6.82 1 14c0 10.2 13 23 13 23s13-12.8 13-23c0-7.18-5.82-13-13-13z" fill="#78909c" stroke="#37474f" strokeWidth="1.4"/>
            <circle cx="14" cy="13.5" r="4.8" fill="#cfd8dc"/>
          </svg>
          <span className="text-[#5b6b7b]">Offline Sensor</span>
        </div>

        <div className="flex items-center gap-2.5">
          <svg width="16" height="22" viewBox="0 0 28 38" fill="none" className="shrink-0">
            <path d="M14 1C6.82 1 1 6.82 1 14c0 10.5 13 23 13 23s13-12.5 13-23c0-7.18-5.82-13-13-13z" fill="#f97316" stroke="#c2410c" strokeWidth="1.2"/>
            <circle cx="14" cy="13.5" r="5.5" fill="#ffffff"/>
            <path d="M16.5 10.5c-.4-.4-1-.5-1.5-.3l.7.7-.7.7-.6-.6c-.2.5 0 1.1.3 1.5l-2.4 2.4c-.2.2-.2.5 0 .7.2.2.5.2.7 0l2.4-2.4c.4.4 1 .5 1.5.3l-.7-.7.7-.7.7.7c.2-.5 0-1.1-.3-1.5z" fill="#ea580c"/>
          </svg>
          <span className="font-medium text-[#ea580c]">Maintenance Team (Service Pin)</span>
        </div>

        {showPipelineGraph && (
          <div className="flex items-center gap-2 pt-1 border-t border-[#dbe3ea]">
            <div className="flex items-center gap-1">
              <span className="w-4 h-1 bg-[#0369a1] rounded inline-block"></span>
              <span className="w-2 h-1 bg-[#38bdf8] rounded inline-block"></span>
            </div>
            <span className="text-[11px] text-[#0369a1] font-medium">Pipeline Transmission Grid</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1 border-t border-[#dbe3ea]">
          <div className="flex items-center gap-0.5">
            <span className="w-3 h-0.5 bg-[#0b6fb8] inline-block"></span>
            <span className="w-3 h-0.5 border-t-2 border-dashed border-[#139a9a] inline-block"></span>
          </div>
          <span className="text-[11px] text-[#5b6b7b]">Dispatch & ETA path</span>
        </div>
      </div>

      {/* Google Maps API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border border-[#dbe3ea] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#dbe3ea]">
              <div className="flex items-center gap-2">
                <span className="text-xl">🗺️</span>
                <h3 className="font-bold text-[#0a3d62] text-base">Google Maps API Configuration</h3>
              </div>
              <button 
                onClick={() => setShowApiKeyModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#5b6b7b]">
              <p>
                AquaGuard is currently rendering <strong>Google Maps Live Mumbai Tiles</strong> (Roadmap, Satellite, and Terrain) with zero setup required.
              </p>
              <p>
                To enable official Google Cloud JavaScript API features (e.g., Places Autocomplete, Geocoding, Google Street View), you can save your <strong>Google Maps API Key</strong> below:
              </p>

              <div>
                <label className="block font-semibold text-[#1c2b39] mb-1">
                  Google Maps API Key
                </label>
                <input
                  type="text"
                  placeholder="AIzaSy..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full px-3 py-2 border border-[#dbe3ea] rounded-md text-xs font-mono focus:outline-none focus:border-[#0b6fb8]"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  You can also define <code>VITE_GOOGLE_MAPS_API_KEY</code> in your <code>frontend/.env</code> file.
                </span>
              </div>

              {apiKeySavedStatus && (
                <div className="p-2 rounded bg-green-50 text-green-700 text-xs font-semibold border border-green-200">
                  {apiKeySavedStatus}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#dbe3ea]">
              <button
                onClick={() => {
                  setApiKeyInput('');
                  setStoredApiKey('');
                  setApiKeySavedStatus('Cleared API key (Using Google Tiles).');
                }}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Clear Key
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveApiKey}
                  className="btn-primary text-xs px-4 py-1.5"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
