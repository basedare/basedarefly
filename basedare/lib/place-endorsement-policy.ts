export const WORTH_A_DETOUR_MIN_CONTRIBUTIONS = 3;
export const WORTH_A_DETOUR_MIN_PLACES = 2;
export const WORTH_A_DETOUR_MAX_ACTIVE = 3;

export type PlaceEndorsementEligibilityInput = {
  placeIsFresh: boolean;
  hasRecentSecureVisit: boolean;
  acceptedContributionCount: number;
  distinctContributionPlaces: number;
  activeEndorsementCount: number;
  alreadyEndorsed: boolean;
  suppressed: boolean;
};

export function evaluatePlaceEndorsementEligibility(input: PlaceEndorsementEligibilityInput) {
  const reasons: string[] = [];
  if (input.suppressed) reasons.push('This endorsement was removed by moderation.');
  if (!input.placeIsFresh) reasons.push('This place needs fresh accepted memory before it can be endorsed.');
  if (!input.hasRecentSecureVisit) reasons.push('A secure QR + GPS visit to this place from the last 180 days is required.');
  if (input.acceptedContributionCount < WORTH_A_DETOUR_MIN_CONTRIBUTIONS) {
    reasons.push(`Build ${WORTH_A_DETOUR_MIN_CONTRIBUTIONS} verified contributions or visits first.`);
  }
  if (input.distinctContributionPlaces < WORTH_A_DETOUR_MIN_PLACES) {
    reasons.push(`Contribute across at least ${WORTH_A_DETOUR_MIN_PLACES} different places first.`);
  }
  if (!input.alreadyEndorsed && input.activeEndorsementCount >= WORTH_A_DETOUR_MAX_ACTIVE) {
    reasons.push(`You can hold only ${WORTH_A_DETOUR_MAX_ACTIVE} active Worth a Detour endorsements.`);
  }
  return {
    eligible: reasons.length === 0,
    reasons,
    alreadyEndorsed: input.alreadyEndorsed,
  };
}
