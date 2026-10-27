// Utility functions for formatting dates, numbers, and units

export function formatDate(dateInput) {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function formatTimeOnly(dateInput) {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function formatDistance(km) {
  if (km === null || km === undefined) return 'N/A';
  return `${Number(km).toFixed(1)} km`;
}

export function formatEta(min) {
  if (min === null || min === undefined) return 'N/A';
  return `${Math.round(min)} min`;
}

export function formatConfidence(conf) {
  if (conf === null || conf === undefined) return '0%';
  return `${(Number(conf) * 100).toFixed(1)}%`;
}
