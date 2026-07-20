export type PlaceNavigationSummary = {
  eligible: boolean;
  reason: 'INVALID_COORDINATES' | 'PRIVATE_PLACE' | 'APPROXIMATE_PLACE' | 'SENSITIVE_PLACE' | null;
};

type MetadataRecord = Record<string, unknown>;

function asMetadataRecord(value: unknown): MetadataRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as MetadataRecord
    : {};
}

export function hasUsableDirectionsCoordinates(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Public navigation must fail closed for private, sensitive, or deliberately
 * approximate pins. The map may still show those places without publishing a
 * precise arrival target to an external provider.
 */
export function resolvePlaceNavigationSummary(input: {
  latitude: number;
  longitude: number;
  placeSource?: string | null;
  metadataJson?: unknown;
  locationConfidence?: string | null;
}): PlaceNavigationSummary {
  if (!hasUsableDirectionsCoordinates(input.latitude, input.longitude)) {
    return { eligible: false, reason: 'INVALID_COORDINATES' };
  }

  const source = input.placeSource?.trim().toUpperCase() ?? '';
  if (source.includes('PRIVATE')) {
    return { eligible: false, reason: 'PRIVATE_PLACE' };
  }

  const metadata = asMetadataRecord(input.metadataJson);
  if (
    metadata.sensitive === true ||
    metadata.navigationSensitive === true ||
    metadata.hideDirections === true
  ) {
    return { eligible: false, reason: 'SENSITIVE_PLACE' };
  }

  const confidence = (
    input.locationConfidence ??
    (typeof metadata.locationConfidence === 'string' ? metadata.locationConfidence : '')
  ).trim().toLowerCase();
  if (confidence.includes('approximate')) {
    return { eligible: false, reason: 'APPROXIMATE_PLACE' };
  }

  return { eligible: true, reason: null };
}

/**
 * Google Maps universal URLs do not require an SDK or API key. A Place ID can
 * refine the destination when BaseDare has a trusted one; coordinates remain
 * the safe interoperable default.
 */
export function buildGoogleMapsDirectionsUrl(input: {
  latitude: number;
  longitude: number;
  googlePlaceId?: string | null;
}): string | null {
  if (!hasUsableDirectionsCoordinates(input.latitude, input.longitude)) {
    return null;
  }

  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('destination', `${input.latitude},${input.longitude}`);

  const placeId = input.googlePlaceId?.trim();
  if (placeId) {
    url.searchParams.set('destination_place_id', placeId.slice(0, 256));
  }

  return url.toString();
}
