import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  ShieldAlert, 
  Wrench, 
  Droplet, 
  Navigation, 
  Phone, 
  Clock 
} from 'lucide-react';

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

  const layersRef = useRef({
    sensorsLayer: null,
    teamsLayer: null,
    dispatchLinesLayer: null,
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: 12,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Standard clean OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    layersRef.current.sensorsLayer = L.layerGroup().addTo(map);
    layersRef.current.teamsLayer = L.layerGroup().addTo(map);
    layersRef.current.dispatchLinesLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers & Dispatch Lines
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const { sensorsLayer, teamsLayer, dispatchLinesLayer } = layersRef.current;
    sensorsLayer.clearLayers();
    teamsLayer.clearLayers();
    dispatchLinesLayer.clearLayers();

    // 1. Render Sensor Markers
    sensors.forEach((s) => {
      const isLeak = s.status === 'leak';
      const isOffline = s.status === 'offline';

      const iconHtml = isLeak
        ? `<div class="pulse-marker-leak" title="CRITICAL LEAK: ${s.id}"></div>`
        : isOffline
        ? `<div class="marker-offline" title="OFFLINE: ${s.id}"></div>`
        : `<div class="marker-normal" title="NORMAL: ${s.id}"></div>`;

      const sensorIcon = L.divIcon({
        className: 'custom-sensor-icon',
        html: iconHtml,
        iconSize: isLeak ? [26, 26] : [22, 22],
        iconAnchor: isLeak ? [13, 13] : [11, 11],
      });

      const marker = L.marker([s.lat, s.lng], { icon: sensorIcon });
      
      const popupHtml = `
        <div style="font-family: inherit; min-width: 200px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 800; font-size: 13px; color: #0284c7;">${s.id}</span>
            <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background: ${isLeak ? '#fee2e2; color: #b91c1c;' : '#dcfce7; color: #15803d;'}">
              ${s.status.toUpperCase()}
            </span>
          </div>
          <div style="font-weight: 700; font-size: 12px; color: #1e293b; margin-bottom: 6px;">${s.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">
            Coordinates: ${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}
          </div>
          <div style="font-size: 11px; color: #64748b;">
            Last Reading: ${s.last_reading_at ? new Date(s.last_reading_at).toLocaleTimeString() : 'N/A'}
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
      if (onSelectSensor) {
        marker.on('click', () => onSelectSensor(s));
      }
      sensorsLayer.addLayer(marker);
    });

    // 2. Render Maintenance Team Markers
    teams.forEach((t) => {
      const isBusy = t.status === 'busy';
      const iconClass = isBusy ? 'team-marker-busy' : 'team-marker-available';

      const teamIcon = L.divIcon({
        className: 'custom-team-icon',
        html: `<div class="${iconClass}"><span>W</span></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([t.lat, t.lng], { icon: teamIcon });
      const popupHtml = `
        <div style="font-family: inherit; min-width: 200px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 800; font-size: 13px; color: #2563eb;">${t.id}</span>
            <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background: ${isBusy ? '#fef3c7; color: #b45309;' : '#dbeafe; color: #1e40af;'}">
              ${t.status.toUpperCase()}
            </span>
          </div>
          <div style="font-weight: 700; font-size: 12px; color: #1e293b; margin-bottom: 6px;">${t.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">
            Phone: ${t.phone}
          </div>
          <div style="font-size: 11px; color: #64748b;">
            Coordinates: ${t.lat.toFixed(4)}, ${t.lng.toFixed(4)}
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
      teamsLayer.addLayer(marker);
    });

    // 3. Render Dispatch Route Polyline for Active Alerts
    const activeAlerts = alerts.filter(a => a.status !== 'cleared' && a.assigned_team && a.sensor_lat);
    activeAlerts.forEach((a) => {
      const teamCoord = [a.assigned_team.lat, a.assigned_team.lng];
      const sensorCoord = [a.sensor_lat, a.sensor_lng];

      // Draw dashed route line
      const polyline = L.polyline([teamCoord, sensorCoord], {
        color: '#ef4444',
        weight: 4,
        opacity: 0.9,
        dashArray: '8, 8',
      });

      // Midpoint badge with Distance & ETA
      const midLat = (teamCoord[0] + sensorCoord[0]) / 2;
      const midLng = (teamCoord[1] + sensorCoord[1]) / 2;

      const badgeIcon = L.divIcon({
        className: 'dispatch-badge-icon',
        html: `
          <div style="background: rgba(17, 24, 39, 0.95); backdrop-filter: blur(8px); border: 1.5px solid #ef4444; color: #fff; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 16px rgba(239, 68, 68, 0.6); white-space: nowrap;">
            <span>${a.distance_km || '?'} km</span>
            <span style="color: #94a3b8;">•</span>
            <span style="color: #fca5a5;">ETA ~${a.eta_minutes || '?'}m</span>
          </div>
        `,
        iconAnchor: [50, 14],
      });

      const badgeMarker = L.marker([midLat, midLng], { icon: badgeIcon, interactive: false });

      dispatchLinesLayer.addLayer(polyline);
      dispatchLinesLayer.addLayer(badgeMarker);
    });

  }, [sensors, teams, alerts]);

  // Auto-zoom to focused alert
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !focusedAlert) return;

    if (focusedAlert.sensor_lat && focusedAlert.sensor_lng) {
      if (focusedAlert.assigned_team) {
        const bounds = L.latLngBounds([
          [focusedAlert.sensor_lat, focusedAlert.sensor_lng],
          [focusedAlert.assigned_team.lat, focusedAlert.assigned_team.lng]
        ]);
        map.fitBounds(bounds, { padding: [70, 70], maxZoom: 15, animate: true });
      } else {
        map.flyTo([focusedAlert.sensor_lat, focusedAlert.sensor_lng], 15, { animate: true, duration: 1.2 });
      }
    }
  }, [focusedAlert]);

  // Initial bounds framing to show all Mumbai nodes
  const hasInitiallyFitRef = useRef(false);
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !sensors.length || hasInitiallyFitRef.current || focusedAlert) return;
    const group = L.featureGroup(sensors.map(s => L.marker([s.lat, s.lng])));
    map.fitBounds(group.getBounds().pad(0.12));
    hasInitiallyFitRef.current = true;
  }, [sensors, focusedAlert]);

  return (
    <div className="relative w-full h-full min-h-[520px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full min-h-[520px]" />

      {/* Map Legend Overlay in Top Left */}
      <div className="absolute top-4 left-4 z-[400] glass-panel px-3.5 py-2.5 rounded-xl border border-white/10 text-xs text-white space-y-2 pointer-events-auto shadow-lg">
        <div className="font-bold text-[10px] uppercase tracking-wider text-gray-400">
          MAP LEGEND
        </div>
        
        <div className="flex items-center gap-2.5">
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white inline-block"></span>
          <span className="text-gray-200 font-medium text-[11px]">Sensor (Normal)</span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600 border-2 border-white"></span>
          </span>
          <span className="text-rose-300 font-bold text-[11px]">Sensor (LEAK Alert)</span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="w-3.5 h-3.5 rounded bg-blue-600 border-2 border-white inline-block rotate-45"></span>
          <span className="text-gray-200 font-medium text-[11px]">BMC Unit (Available)</span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="w-3.5 h-3.5 rounded bg-amber-500 border-2 border-white inline-block rotate-45"></span>
          <span className="text-gray-200 font-medium text-[11px]">BMC Unit (Dispatched)</span>
        </div>
      </div>

    </div>
  );
}
