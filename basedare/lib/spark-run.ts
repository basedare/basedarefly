import type { FirstSparkWindowSummary, VenueDetail } from '@/lib/venue-types';

export type SparkRunMomentumState = 'cold' | 'sparked' | 'warming' | 'live' | 'packed' | 'proven';

export type SparkRunStepState = 'done' | 'active' | 'next';

export type SparkRunStep = {
  label: string;
  value: string;
  state: SparkRunStepState;
};

export type SparkRun = {
  id: string;
  venueId: string;
  venueSlug: string;
  venueName: string;
  state: SparkRunMomentumState;
  stateLabel: string;
  stateDetail: string;
  windowLabel: string;
  offerLabel: string;
  targetLabel: string;
  targetCheckIns: number;
  checkIns: number;
  proofs: number;
  redemptions: number;
  creatorCount: number;
  activeDareCount: number;
  fundingUsd: number;
  progress: number;
  receiptReady: boolean;
  repeatRecommendation: string;
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta: {
    label: string;
    href: string;
  };
  steps: SparkRunStep[];
};

type SparkRunHrefInput = {
  launchHref: string;
  mapHref: string;
  receiptHref: string;
  consoleHref?: string | null;
};

type BuildSparkRunInput = SparkRunHrefInput & {
  venue: Pick<
    VenueDetail,
    | 'id'
    | 'slug'
    | 'name'
    | 'firstSparkWindow'
    | 'activeDares'
    | 'activePerk'
    | 'topCreators'
    | 'memorySummary'
    | 'tagSummary'
    | 'liveStats'
  >;
  activation?: FirstSparkWindowSummary | null;
  liveStats?: VenueDetail['liveStats'];
  checkIns?: number;
  proofs?: number;
  redemptions?: number;
  creatorCount?: number;
  activeDareCount?: number;
  fundingUsd?: number;
};

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}K`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.max(0, Math.round(value)));
}

function buildFallbackActivation(venue: BuildSparkRunInput['venue']): FirstSparkWindowSummary {
  return {
    enabled: false,
    state: 'quiet',
    windowLabel: 'Pick slow hour',
    perkLabel: venue.activePerk?.title ?? 'Add one perk',
    targetLabel: '20 check-ins',
    targetCheckIns: 20,
    checkIns: venue.memorySummary?.checkInCount ?? 0,
    proofs: venue.memorySummary?.proofCount ?? 0,
    redemptions: venue.memorySummary?.perkRedemptionCount ?? 0,
    startsAt: null,
    endsAt: null,
    updatedAt: null,
    source: 'derived',
  };
}

function resolveMomentumState(input: {
  activation: FirstSparkWindowSummary;
  activeDareCount: number;
  checkIns: number;
  proofs: number;
  redemptions: number;
  uniqueVisitorsToday: number;
}) {
  const hasReceiptSignal = input.proofs > 0 || input.redemptions > 0;
  if (hasReceiptSignal) return 'proven';
  if (input.checkIns >= input.activation.targetCheckIns && input.activation.targetCheckIns > 0) return 'packed';
  if (input.activation.state === 'live' || input.uniqueVisitorsToday > 0) return 'live';
  if (input.checkIns > 0 || input.activeDareCount > 0 || input.activation.state === 'heating') return 'warming';
  if (input.activation.enabled) return 'sparked';
  return 'cold';
}

function getStateCopy(state: SparkRunMomentumState) {
  switch (state) {
    case 'proven':
      return {
        label: 'Receipt ready',
        detail: 'Proof exists. Sell the repeat.',
        repeat: 'Repeat the same window with a sharper perk.',
      };
    case 'packed':
      return {
        label: 'Packed',
        detail: 'Target hit. Capture one proof.',
        repeat: 'Turn the crowd signal into a Spark Receipt.',
      };
    case 'live':
      return {
        label: 'Live',
        detail: 'People are moving now.',
        repeat: 'Capture QR, proof, or redemption before the window cools.',
      };
    case 'warming':
      return {
        label: 'Warming',
        detail: 'Signal is visible. Route people.',
        repeat: 'Push one creator or guest route into the window.',
      };
    case 'sparked':
      return {
        label: 'Sparked',
        detail: 'Plan is armed. Make it visible.',
        repeat: 'Open the map signal and route first proof.',
      };
    default:
      return {
        label: 'Cold',
        detail: 'Pick a slow hour and one perk.',
        repeat: 'Start with one 90-minute First Spark Window.',
      };
  }
}

function getPrimaryCta(state: SparkRunMomentumState, hrefs: SparkRunHrefInput) {
  switch (state) {
    case 'proven':
    case 'packed':
      return { label: 'Open receipt', href: hrefs.receiptHref };
    case 'live':
      return { label: hrefs.consoleHref ? 'Open console' : 'Open map', href: hrefs.consoleHref ?? hrefs.mapHref };
    case 'warming':
    case 'sparked':
      return { label: 'Route proof', href: hrefs.mapHref };
    default:
      return { label: 'Start Spark', href: hrefs.launchHref };
  }
}

function getSecondaryCta(state: SparkRunMomentumState, hrefs: SparkRunHrefInput) {
  if (state === 'proven' || state === 'packed') {
    return { label: 'Repeat', href: hrefs.launchHref };
  }
  if (state === 'cold' || state === 'sparked') {
    return { label: 'Open map', href: hrefs.mapHref };
  }
  return { label: 'Receipt', href: hrefs.receiptHref };
}

function getStepState(done: boolean, active: boolean): SparkRunStepState {
  if (done) return 'done';
  if (active) return 'active';
  return 'next';
}

export function buildSparkRun(input: BuildSparkRunInput): SparkRun {
  const activation = input.activation ?? input.venue.firstSparkWindow ?? buildFallbackActivation(input.venue);
  const liveStats = input.liveStats ?? input.venue.liveStats;
  const activeDareCount = input.activeDareCount ?? input.venue.activeDares.length;
  const fundingUsd =
    input.fundingUsd ?? input.venue.activeDares.reduce((sum, dare) => sum + Math.max(0, dare.bounty), 0);
  const checkIns = Math.max(
    activation.checkIns,
    input.checkIns ?? 0,
    input.venue.memorySummary?.checkInCount ?? 0,
    liveStats.uniqueVisitorsToday ?? 0
  );
  const proofs = Math.max(activation.proofs, input.proofs ?? 0, input.venue.memorySummary?.proofCount ?? 0);
  const redemptions = Math.max(
    activation.redemptions,
    input.redemptions ?? 0,
    input.venue.memorySummary?.perkRedemptionCount ?? 0
  );
  const creatorCount = Math.max(
    input.creatorCount ?? 0,
    input.venue.topCreators.length,
    activeDareCount > 0 ? 1 : 0
  );
  const state = resolveMomentumState({
    activation,
    activeDareCount,
    checkIns,
    proofs,
    redemptions,
    uniqueVisitorsToday: liveStats.uniqueVisitorsToday,
  });
  const copy = getStateCopy(state);
  const progress = Math.min(100, Math.round((checkIns / Math.max(1, activation.targetCheckIns)) * 100));

  return {
    id: `venue:${input.venue.slug}:first-spark`,
    venueId: input.venue.id,
    venueSlug: input.venue.slug,
    venueName: input.venue.name,
    state,
    stateLabel: copy.label,
    stateDetail: copy.detail,
    windowLabel: activation.windowLabel,
    offerLabel: activation.perkLabel,
    targetLabel: activation.targetLabel,
    targetCheckIns: activation.targetCheckIns,
    checkIns,
    proofs,
    redemptions,
    creatorCount,
    activeDareCount,
    fundingUsd,
    progress,
    receiptReady: state === 'proven' || state === 'packed',
    repeatRecommendation: copy.repeat,
    primaryCta: getPrimaryCta(state, input),
    secondaryCta: getSecondaryCta(state, input),
    steps: [
      {
        label: 'Plan',
        value: activation.enabled ? activation.windowLabel : 'Pick hour',
        state: getStepState(activation.enabled, state === 'cold'),
      },
      {
        label: 'Perk',
        value: activation.enabled ? activation.perkLabel : 'Add perk',
        state: getStepState(activation.enabled, state === 'sparked'),
      },
      {
        label: 'Proof',
        value: `${formatCompact(proofs)} proof${proofs === 1 ? '' : 's'}`,
        state: getStepState(proofs > 0, state === 'live' || state === 'packed'),
      },
      {
        label: 'Repeat',
        value: state === 'proven' ? 'Ask now' : 'After proof',
        state: getStepState(state === 'proven', state === 'packed'),
      },
    ],
  };
}
