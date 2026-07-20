export type PlaceVisitorIntent = 'explore' | 'contribute' | 'fund';

export type PlaceActionId =
  | 'join-live-dare'
  | 'directions'
  | 'verify-place'
  | 'open-venue'
  | 'check-in'
  | 'fund-dare';

export type PlaceActionPolicy = {
  intent: PlaceVisitorIntent;
  primary: PlaceActionId;
  secondary: PlaceActionId | null;
  tertiary: PlaceActionId[];
  verifyLabel: 'Be first to verify' | 'Add fresh proof';
};

const FUNDING_SOURCES = new Set([
  'brand-portal',
  'buyer-portal',
  'control',
  'first-spark-route-picker',
]);

const CONTRIBUTOR_SOURCES = new Set(['onboard', 'place-memory', 'verify-place']);

/**
 * Infer only explicit commercial/contributor intent. A normal map visit remains
 * exploration-first; selecting a venue is not permission to turn funding into
 * the universal primary action.
 */
export function resolvePlaceVisitorIntent(input: {
  action?: string | null;
  mode?: string | null;
  source?: string | null;
}): PlaceVisitorIntent {
  const action = input.action?.trim().toLowerCase();
  const mode = input.mode?.trim().toLowerCase();
  const source = input.source?.trim().toLowerCase();

  if (action === 'fund' || mode === 'venue' || (source && FUNDING_SOURCES.has(source))) {
    return 'fund';
  }

  if (action === 'verify' || (source && CONTRIBUTOR_SOURCES.has(source))) {
    return 'contribute';
  }

  return 'explore';
}

/**
 * One place-state policy for both the map command recommendation and the
 * selected-place CTA rail. Field Stations are acquisition nodes and are
 * intentionally not represented here.
 */
export function resolvePlaceActionPolicy(input: {
  hasLiveDare: boolean;
  hasClaimedMission?: boolean;
  hasVerifiedTrace: boolean;
  isPlayerNearby: boolean;
  canCheckIn: boolean;
  canNavigate: boolean;
  intent: PlaceVisitorIntent;
}): PlaceActionPolicy {
  const verifyLabel = input.hasVerifiedTrace ? 'Add fresh proof' : 'Be first to verify';
  const navigationPrimary: PlaceActionId = input.canNavigate ? 'directions' : 'open-venue';
  const navigationSecondary: PlaceActionId = input.canNavigate ? 'directions' : 'open-venue';

  if (input.hasLiveDare && input.hasClaimedMission) {
    return {
      intent: input.intent,
      primary: navigationPrimary,
      secondary: 'join-live-dare',
      tertiary: input.canNavigate ? ['open-venue', 'fund-dare'] : ['fund-dare'],
      verifyLabel,
    };
  }

  if (input.hasLiveDare) {
    return {
      intent: input.intent,
      primary: 'join-live-dare',
      secondary: navigationSecondary,
      tertiary:
        input.intent === 'contribute' || input.isPlayerNearby
          ? [
              ...(input.canNavigate ? ['open-venue' as const] : []),
              'verify-place',
              'fund-dare',
            ]
          : input.canNavigate
            ? ['open-venue', 'fund-dare']
            : ['fund-dare'],
      verifyLabel,
    };
  }

  if (input.intent === 'fund') {
    return {
      intent: input.intent,
      primary: 'fund-dare',
      secondary: navigationSecondary,
      tertiary: input.canNavigate ? ['open-venue', 'verify-place'] : ['verify-place'],
      verifyLabel,
    };
  }

  if (input.intent === 'contribute') {
    return {
      intent: input.intent,
      primary: 'verify-place',
      secondary: navigationSecondary,
      tertiary: input.canNavigate ? ['open-venue', 'fund-dare'] : ['fund-dare'],
      verifyLabel,
    };
  }

  if (!input.hasVerifiedTrace && input.isPlayerNearby) {
    return {
      intent: input.intent,
      primary: navigationPrimary,
      secondary: input.canNavigate ? 'open-venue' : null,
      tertiary: ['verify-place', 'fund-dare'],
      verifyLabel,
    };
  }

  if (input.hasVerifiedTrace) {
    return {
      intent: input.intent,
      primary: navigationPrimary,
      secondary: input.canNavigate ? 'open-venue' : null,
      tertiary:
        input.canCheckIn && input.isPlayerNearby
          ? ['check-in', 'verify-place', 'fund-dare']
          : input.isPlayerNearby
            ? ['verify-place', 'fund-dare']
            : ['fund-dare'],
      verifyLabel,
    };
  }

  return {
    intent: input.intent,
    primary: navigationPrimary,
    secondary: input.canNavigate ? 'open-venue' : null,
    tertiary: ['fund-dare'],
    verifyLabel,
  };
}
