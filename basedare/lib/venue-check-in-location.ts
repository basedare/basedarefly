export function venueLocationError(input: { accuracyMeters?: number; locationTimestamp?: number }, radius: number, now = Date.now()): string | null {
  if (!Number.isFinite(input.accuracyMeters) || input.accuracyMeters! < 0 || input.accuracyMeters! > Math.min(radius, 100)) return 'Location is not accurate enough. Step outside and try again.';
  if (!Number.isFinite(input.locationTimestamp) || now - input.locationTimestamp! > 120_000 || input.locationTimestamp! - now > 30_000) return 'Your location expired. Get a fresh location and try again.';
  return null;
}
