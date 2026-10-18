import { type ActivityArea } from './home-activities';

/** Resolve a browsing destination, never evidence of the visitor's location. */
export function adventureArea(query: Pick<URLSearchParams, 'get'>, saved: ActivityArea): ActivityArea {
  const lat = query.get('lat');
  const lng = query.get('lng');
  if (!lat?.trim() || !lng?.trim() || !Number.isFinite(Number(lat)) || Math.abs(Number(lat)) > 90
    || !Number.isFinite(Number(lng)) || Math.abs(Number(lng)) > 180) return saved;

  const same = Number(lat) === saved.lat && Number(lng) === saved.lng;
  const label = query.get('areaLabel')?.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 100);
  const timeZone = query.get('timeZone');
  let validZone: string | undefined;
  if (timeZone && timeZone.length <= 100) {
    try { new Intl.DateTimeFormat('en', { timeZone }); validZone = timeZone; } catch { /* Use the destination's longitude estimate. */ }
  }
  return {
    lat: Number(lat), lng: Number(lng),
    label: label || (same ? saved.label : 'Selected map area'),
    // Never carry the previous city's timezone to a different destination.
    timeZone: validZone ?? (same ? saved.timeZone : undefined),
  };
}
