import type { FieldStationAttentionMode } from '@/lib/field-station-policy';

export type FieldStationInventorySource =
  | 'MEETUP'
  | 'DARE'
  | 'LOCAL_SIGNAL'
  | 'NIGHT_GUIDE';

export type FieldStationInventoryCandidate = {
  id: string;
  source: FieldStationInventorySource;
  attention: Exclude<FieldStationAttentionMode, 'ASK' | 'NEARBY'>;
  title: string;
  placeLabel: string;
  venueId: string | null;
  venueSlug: string | null;
  href: string;
  targetType: string;
  targetId: string;
  distanceKm: number;
  startsAt: string | null;
  endsAt: string | null;
  lastVerifiedAt: string;
  trustLabel: string;
  freshnessLabel: string;
  disclaimer: string | null;
  qualityScore: number;
};

export type FieldStationInventorySelection = {
  items: FieldStationInventoryCandidate[];
  qualifyingCount: number;
  minimumDensity: number;
  isLowDensity: boolean;
  fallbackReason: 'BELOW_MINIMUM_QUALITY_DENSITY' | null;
};

function candidateTime(candidate: FieldStationInventoryCandidate) {
  const value = Date.parse(candidate.lastVerifiedAt);
  return Number.isFinite(value) ? value : 0;
}

function compareCandidates(
  left: FieldStationInventoryCandidate,
  right: FieldStationInventoryCandidate
) {
  if (left.qualityScore !== right.qualityScore) {
    return right.qualityScore - left.qualityScore;
  }
  const freshness = candidateTime(right) - candidateTime(left);
  if (freshness !== 0) return freshness;
  if (left.distanceKm !== right.distanceKm) return left.distanceKm - right.distanceKm;
  return left.title.localeCompare(right.title);
}

/**
 * The shared selection contract used by both the physical-link resolver and the
 * lightweight Board. One place cannot occupy several recommendation slots: a
 * confirmed activity wins over the venue's lower-confidence weekly-guide row.
 */
export function selectFieldStationInventory(
  candidates: FieldStationInventoryCandidate[],
  minimumDensity: number,
  limit = 3
): FieldStationInventorySelection {
  const deduped = new Map<string, FieldStationInventoryCandidate>();
  for (const candidate of candidates) {
    if (!Number.isFinite(candidate.distanceKm) || candidate.distanceKm < 0) continue;
    const key = candidate.venueId
      ? `venue:${candidate.venueId}`
      : `${candidate.source}:${candidate.id}`;
    const current = deduped.get(key);
    if (!current || compareCandidates(candidate, current) < 0) {
      deduped.set(key, candidate);
    }
  }

  const ranked = [...deduped.values()].sort(compareCandidates);
  const qualifyingCount = ranked.length;
  const normalizedMinimum = Math.max(1, Math.floor(minimumDensity));
  const isLowDensity = qualifyingCount < normalizedMinimum;

  return {
    items: isLowDensity ? [] : ranked.slice(0, Math.max(1, Math.floor(limit))),
    qualifyingCount,
    minimumDensity: normalizedMinimum,
    isLowDensity,
    fallbackReason: isLowDensity ? 'BELOW_MINIMUM_QUALITY_DENSITY' : null,
  };
}
