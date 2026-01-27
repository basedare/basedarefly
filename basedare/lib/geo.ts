/**
 * Geolocation utilities for Nearby Dares feature
 * Privacy-first: exact coordinates never exposed to clients
 */

// Base32 character map for geohash encoding
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encode latitude/longitude to a geohash string
 * Precision levels:
 *   4 chars = ~39km
 *   5 chars = ~5km
 *   6 chars = ~1.2km (default - good for urban areas like Metro Manila)
 *   7 chars = ~150m
 *   8 chars = ~40m
 */
export function encodeGeohash(lat: number, lng: number, precision = 6): string {
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let hash = '';
  let bit = 0;
  let ch = 0;
  let isEven = true;

  while (hash.length < precision) {
    if (isEven) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        ch |= 1 << (4 - bit);
        minLng = mid;
      } else {
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        ch |= 1 << (4 - bit);
        minLat = mid;
      } else {
        maxLat = mid;
      }
    }

    isEven = !isEven;
    bit++;

    if (bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}

/**
 * Get neighboring geohash cells (for radius queries)
 * Returns the 8 adjacent cells plus the center cell
 */
export function getNeighborGeohashes(geohash: string): string[] {
  const neighbors: string[] = [geohash];
  const precision = geohash.length;

  // Decode center point
  const center = decodeGeohash(geohash);
  if (!center) return neighbors;

  // Approximate cell size based on precision
  const cellSizes: Record<number, { lat: number; lng: number }> = {
    4: { lat: 0.35, lng: 0.35 },
    5: { lat: 0.044, lng: 0.044 },
    6: { lat: 0.011, lng: 0.011 },
    7: { lat: 0.0014, lng: 0.0014 },
  };

  const cellSize = cellSizes[precision] || { lat: 0.011, lng: 0.011 };

  // Generate 8 neighbors
  const offsets = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  for (const [latOff, lngOff] of offsets) {
    const newLat = center.lat + latOff * cellSize.lat;
    const newLng = center.lng + lngOff * cellSize.lng;
    if (newLat >= -90 && newLat <= 90 && newLng >= -180 && newLng <= 180) {
      neighbors.push(encodeGeohash(newLat, newLng, precision));
    }
  }

  return [...new Set(neighbors)];
}

/**
 * Decode a geohash back to approximate coordinates (center of cell)
 */
export function decodeGeohash(hash: string): { lat: number; lng: number } | null {
  if (!hash || hash.length === 0) return null;

  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let isEven = true;

  for (const c of hash.toLowerCase()) {
    const idx = BASE32.indexOf(c);
    if (idx === -1) return null;

    for (let bit = 4; bit >= 0; bit--) {
      const bitVal = (idx >> bit) & 1;

      if (isEven) {
        const mid = (minLng + maxLng) / 2;
        if (bitVal === 1) {
          minLng = mid;
        } else {
          maxLng = mid;
        }
      } else {
        const mid = (minLat + maxLat) / 2;
        if (bitVal === 1) {
          minLat = mid;
        } else {
          maxLat = mid;
        }
      }
      isEven = !isEven;
    }
  }

  return {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2,
  };
}

/**
 * Calculate distance between two points using the Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for user-friendly display
 * Examples: "500m away", "2.3km away", "15km away"
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters}m away`;
  }

  if (km < 10) {
    return `${km.toFixed(1)}km away`;
  }

  return `${Math.round(km)}km away`;
}

/**
 * Check if a point is within a given radius of another point
 */
export function isWithinRadius(
  centerLat: number,
  centerLng: number,
  pointLat: number,
  pointLng: number,
  radiusKm: number
): boolean {
  const distance = calculateDistance(centerLat, centerLng, pointLat, pointLng);
  return distance <= radiusKm;
}

/**
 * Validate coordinates are within valid ranges
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

// PH-specific constants for testing
export const PH_TEST_COORDS = {
  manila: { lat: 14.5995, lng: 120.9842 },
  makati: { lat: 14.5547, lng: 121.0244 },
  bgc: { lat: 14.5514, lng: 121.0489 },
  moa: { lat: 14.5350, lng: 120.9830 },
  poblacion: { lat: 14.5628, lng: 121.0271 },
};
