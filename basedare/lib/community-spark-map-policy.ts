const DISTANCE_EPSILON_KM = 1e-9;

export type CommunitySparkPlayReason =
  | 'READY'
  | 'LOCATION_REQUIRED'
  | 'OUTSIDE_RADIUS'
  | 'INVALID_LOCATION'
  | 'INVALID_PLAY_RADIUS';

export function isCommunitySparkRecord(input: {
  bounty: number;
  missionTag?: string | null;
}) {
  return input.bounty <= 0 && input.missionTag === 'community';
}

function isFiniteNonNegative(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isFinitePositive(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isWithinRadius(distanceKm: number, radiusKm: number) {
  return distanceKm <= radiusKm + DISTANCE_EPSILON_KM;
}

export function shouldShowDareInMapViewport(input: {
  isCommunitySpark: boolean;
  distanceFromViewportCenterKm: number;
  viewportRadiusKm: number;
  discoveryRadiusKm?: number | null;
}) {
  if (
    !isFiniteNonNegative(input.distanceFromViewportCenterKm) ||
    !isFinitePositive(input.viewportRadiusKm) ||
    !isWithinRadius(input.distanceFromViewportCenterKm, input.viewportRadiusKm)
  ) {
    return false;
  }

  // Community Sparks are map content. Their small radius controls when Play
  // unlocks, not whether a person can discover that the activity exists.
  if (input.isCommunitySpark) return true;

  const discoveryRadiusKm = isFinitePositive(input.discoveryRadiusKm)
    ? input.discoveryRadiusKm
    : 5;
  return isWithinRadius(input.distanceFromViewportCenterKm, discoveryRadiusKm);
}

export function resolveCommunitySparkPlayAccess(input: {
  distanceFromPlayerKm?: number | null;
  playRadiusKm?: number | null;
}): {
  isPlayableHere: boolean | null;
  playRadiusKm: number | null;
  reason: CommunitySparkPlayReason;
} {
  if (!isFinitePositive(input.playRadiusKm)) {
    return {
      isPlayableHere: false,
      playRadiusKm: null,
      reason: 'INVALID_PLAY_RADIUS',
    };
  }

  if (input.distanceFromPlayerKm === null || input.distanceFromPlayerKm === undefined) {
    return {
      isPlayableHere: null,
      playRadiusKm: input.playRadiusKm,
      reason: 'LOCATION_REQUIRED',
    };
  }

  if (!isFiniteNonNegative(input.distanceFromPlayerKm)) {
    return {
      isPlayableHere: false,
      playRadiusKm: input.playRadiusKm,
      reason: 'INVALID_LOCATION',
    };
  }

  const isPlayableHere = isWithinRadius(
    input.distanceFromPlayerKm,
    input.playRadiusKm,
  );
  return {
    isPlayableHere,
    playRadiusKm: input.playRadiusKm,
    reason: isPlayableHere ? 'READY' : 'OUTSIDE_RADIUS',
  };
}

export function formatCommunitySparkPlayRadius(playRadiusKm: number | null | undefined) {
  if (!isFinitePositive(playRadiusKm)) return 'the play zone';
  if (playRadiusKm < 1) return `${Math.round(playRadiusKm * 1000)}m`;
  return `${Math.round(playRadiusKm * 10) / 10}km`;
}
