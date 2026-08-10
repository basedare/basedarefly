export type SiargaoSurfBreakPoint = {
  id: string;
  venueSlug: string;
  label: string;
  latitude: number;
  longitude: number;
  replacesVenueMarker: boolean;
};

// These are break/reef points in the water, not beach entrances or business
// addresses. Cloud 9 keeps its separate boardwalk place pin; the remaining
// entries use the swell echo as their canonical map marker.
export const SIARGAO_SURF_BREAK_POINTS: readonly SiargaoSurfBreakPoint[] = [
  {
    id: 'cloud-9',
    venueSlug: 'cloud-9-boardwalk',
    label: 'Cloud 9',
    latitude: 9.814,
    longitude: 126.167,
    replacesVenueMarker: false,
  },
  {
    id: 'tuason',
    venueSlug: 'tuason-point',
    label: 'Tuason',
    latitude: 9.8086523,
    longitude: 126.1696661,
    replacesVenueMarker: true,
  },
  {
    id: 'bumee-bomi',
    venueSlug: 'bumee-bomi-surf-break',
    label: 'Bumee / Bomi',
    latitude: 9.8216523,
    longitude: 126.1648605,
    replacesVenueMarker: true,
  },
  {
    id: 'rock-island',
    venueSlug: 'rock-island-surf-break',
    label: 'Rock Island',
    latitude: 9.838915,
    longitude: 126.160691,
    replacesVenueMarker: true,
  },
  {
    id: 'stimpys',
    venueSlug: 'stimpys-surf-break',
    label: 'Stimpy’s',
    latitude: 9.8441334,
    longitude: 126.1577335,
    replacesVenueMarker: true,
  },
  {
    id: 'cemetery',
    venueSlug: 'cemetery-surf-break',
    label: 'Cemetery',
    latitude: 9.784163,
    longitude: 126.1731257,
    replacesVenueMarker: true,
  },
] as const;

export const SIARGAO_CANONICAL_SURF_BREAK_VENUE_SLUGS = new Set(
  SIARGAO_SURF_BREAK_POINTS
    .filter((point) => point.replacesVenueMarker)
    .map((point) => point.venueSlug)
);
