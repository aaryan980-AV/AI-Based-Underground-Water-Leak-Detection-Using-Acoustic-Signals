/**
 * Google Maps API Helper and Loader Utility
 * Provides dynamic loading for official Google Maps JavaScript API
 * as well as helper URLs for directions and search in Mumbai.
 */

const SCRIPT_ID = 'google-maps-api-script';

export const getStoredApiKey = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('aquaguard_google_maps_api_key') || 
         import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 
         '';
};

export const setStoredApiKey = (key) => {
  if (typeof window === 'undefined') return;
  if (key) {
    localStorage.setItem('aquaguard_google_maps_api_key', key.trim());
  } else {
    localStorage.removeItem('aquaguard_google_maps_api_key');
  }
};

export const isGoogleMapsScriptLoaded = () => {
  return typeof window !== 'undefined' && !!(window.google && window.google.maps);
};

export const loadGoogleMapsApi = (apiKey) => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window not defined'));
    }

    if (window.google && window.google.maps) {
      return resolve(window.google.maps);
    }

    const keyToUse = apiKey || getStoredApiKey();
    if (!keyToUse) {
      return reject(new Error('No Google Maps API Key provided'));
    }

    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google.maps));
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(keyToUse)}&libraries=geometry,places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps script loaded but window.google.maps is undefined'));
      }
    };

    script.onerror = (err) => {
      reject(new Error('Failed to load Google Maps API script. Please check your API key and network.'));
    };

    document.head.appendChild(script);
  });
};

/**
 * Generate Google Maps navigation link between origin and destination
 */
export const getGoogleMapsDirectionsUrl = (originLat, originLng, destLat, destLng) => {
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
};

/**
 * Generate Google Maps search / pin link for specific coordinates
 */
export const getGoogleMapsPlaceUrl = (lat, lng, queryName = '') => {
  const query = queryName ? `${encodeURIComponent(queryName)}&query_place_id=` : '';
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
};
