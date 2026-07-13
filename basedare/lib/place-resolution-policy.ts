export type PlaceResolutionCandidate = {
  id: string;
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
};

function distanceMetersBetween(
  originLatitude: number,
  originLongitude: number,
  targetLatitude: number,
  targetLongitude: number
) {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(targetLatitude - originLatitude);
  const longitudeDelta = toRadians(targetLongitude - originLongitude);
  const originLatitudeRadians = toRadians(originLatitude);
  const targetLatitudeRadians = toRadians(targetLatitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitudeRadians) *
      Math.cos(targetLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function normalizePlaceIdentity(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function selectNearbyPlaceMatch<T extends PlaceResolutionCandidate>({
  latitude,
  longitude,
  requestedName,
  candidates,
  radiusMeters,
}: {
  latitude: number;
  longitude: number;
  requestedName?: string | null;
  candidates: T[];
  radiusMeters: number;
}) {
  const requestedIdentity = requestedName ? normalizePlaceIdentity(requestedName) : '';

  return candidates
    .map((venue) => {
      const distanceMeters = distanceMetersBetween(
        latitude,
        longitude,
        venue.latitude,
        venue.longitude
      );
      const venueNameIdentity = normalizePlaceIdentity(venue.name);
      const venueSlugIdentity = normalizePlaceIdentity(venue.slug);
      const identityScore = requestedIdentity
        ? venueSlugIdentity === requestedIdentity
          ? 2
          : venueNameIdentity === requestedIdentity
            ? 1
            : 0
        : 0;

      return { venue, distanceMeters, identityScore };
    })
    .filter((item) => item.distanceMeters <= radiusMeters)
    .sort(
      (a, b) =>
        b.identityScore - a.identityScore ||
        a.distanceMeters - b.distanceMeters ||
        a.venue.slug.length - b.venue.slug.length
    )[0]?.venue ?? null;
}
