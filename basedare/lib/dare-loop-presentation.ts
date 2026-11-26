/** One Dare Loop. Categories are presentation metadata, never user roles or payment rails. */
export type DareLoopCategory = 'CHAOS' | 'CONTROL';

type EligibleDare = {
  shortId: string;
  title: string;
  locationLabel: string;
  creatorPayout: number;
  latitude: number | null;
  longitude: number | null;
  venueSlug: string | null;
  expiresAt: Date | null;
  whatToMake: string;
  missionMode: string | null;
  family: 'FIELD_TRUTH' | 'EXPERIENCE_EXECUTION' | 'PUBLICATION';
  contentRightsFingerprint: string | null;
  isAvailable: boolean;
};

export function dareLoopCategory(dare: Pick<EligibleDare, 'family' | 'contentRightsFingerprint'>): DareLoopCategory {
  return dare.family === 'EXPERIENCE_EXECUTION' && !dare.contentRightsFingerprint ? 'CHAOS' : 'CONTROL';
}

export function isMysteryDareTitle(title: string): boolean {
  // A deliberate editorial convention; never manufacture mystery inventory or hide requirements.
  return /^(?:CLASSIFIED|MYSTERY DROP)(?:\s|:|—|$)/i.test(title.trim());
}

export function buildDareLoopPresentation(dares: readonly EligibleDare[], now = Date.now()) {
  const publicDares = dares.filter(dare => dare.isAvailable && Number.isFinite(dare.creatorPayout) && dare.creatorPayout > 0 && (!dare.expiresAt || dare.expiresAt.getTime() > now)).map(dare => {
    const locationBound = dare.missionMode !== 'STREAM';
    const coordinatesValid = locationBound && dare.latitude !== null && dare.longitude !== null && Number.isFinite(dare.latitude) && Number.isFinite(dare.longitude) && Math.abs(dare.latitude) <= 90 && Math.abs(dare.longitude) <= 180;
    return {
      shortId: dare.shortId,
      title: dare.title,
      locationLabel: dare.locationLabel,
      creatorPayout: dare.creatorPayout,
      latitude: coordinatesValid ? dare.latitude : null,
      longitude: coordinatesValid ? dare.longitude : null,
      venueSlug: locationBound ? dare.venueSlug : null,
      expiresAt: dare.expiresAt?.toISOString() ?? null,
      description: dare.whatToMake,
      remainingSlots: 1, // Existing single-winner Dare record, not an invented multi-slot mechanism.
      locationBound,
      category: dareLoopCategory(dare),
      isMystery: isMysteryDareTitle(dare.title),
    };
  });
  return { listedCount: publicDares.length, listedRewardUsdc: Math.round(publicDares.reduce((sum, dare) => sum + dare.creatorPayout, 0) * 100) / 100, dares: publicDares };
}

export type DareLoopCard = ReturnType<typeof buildDareLoopPresentation>['dares'][number];
