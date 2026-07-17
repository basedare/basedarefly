import type { PlaceAssertionKindName } from './contracts';

export const PULSE_MODEL_VERSION = 1;

export const DECAY_PRIOR_DAYS: Record<PlaceAssertionKindName, number> = {
  OPENING_WINDOW: 90,
  ITEM_PRICE: 30,
  PAYMENT_METHOD: 180,
};

export type PulseAssertionInput = {
  kind: PlaceAssertionKindName;
  hasCurrentVersion: boolean;
  observedAt: Date | null;
  supportCount: number;
  conflicted: boolean;
};

export type PulseProjection = {
  score: number;
  state: 'COLD' | 'SIMMERING' | 'IGNITING' | 'BLAZING';
  modelVersion: 1;
  components: {
    assertionCount: number;
    currentAssertionCount: number;
    activeConflictCount: number;
    recentSparkCount: number;
    coverage: number;
    freshness: number;
    support: number;
    recentSpark: number;
    rawScore: number;
    conflictCapApplied: boolean;
    criticalStalenessCapApplied: boolean;
  };
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function pulseStateForScore(score: number): PulseProjection['state'] {
  if (score >= 75) return 'BLAZING';
  if (score >= 50) return 'IGNITING';
  if (score >= 25) return 'SIMMERING';
  return 'COLD';
}

export function computePulseV1(input: {
  assertions: PulseAssertionInput[];
  recentSparkCount: number;
  now: Date;
}): PulseProjection {
  const assertions = input.assertions;
  if (assertions.length === 0) {
    return {
      score: 0,
      state: 'COLD',
      modelVersion: 1,
      components: {
        assertionCount: 0,
        currentAssertionCount: 0,
        activeConflictCount: 0,
        recentSparkCount: Math.max(0, input.recentSparkCount),
        coverage: 0,
        freshness: 0,
        support: 0,
        recentSpark: clamp01(input.recentSparkCount / 5),
        rawScore: 0,
        conflictCapApplied: false,
        criticalStalenessCapApplied: false,
      },
    };
  }

  const current = assertions.filter((assertion) => assertion.hasCurrentVersion);
  const coverage = current.length / assertions.length;
  const freshnessValues = current.map((assertion) => {
    if (!assertion.observedAt || !Number.isFinite(assertion.observedAt.getTime())) return 0;
    const ageDays = Math.max(0, input.now.getTime() - assertion.observedAt.getTime()) / 86_400_000;
    return clamp01(1 - ageDays / DECAY_PRIOR_DAYS[assertion.kind]);
  });
  const freshness = current.length
    ? freshnessValues.reduce((sum, value) => sum + value, 0) / current.length
    : 0;
  const support = current.length
    ? current.reduce((sum, assertion) => sum + clamp01(assertion.supportCount / 3), 0) / current.length
    : 0;
  const recentSpark = clamp01(input.recentSparkCount / 5);
  const rawScore = Math.round(coverage * 35 + freshness * 35 + support * 20 + recentSpark * 10);
  const activeConflictCount = assertions.filter((assertion) => assertion.conflicted).length;
  const conflictCapApplied = activeConflictCount > 0 && rawScore > 49;
  const criticalStalenessCapApplied = freshnessValues.some((value) => value === 0) && rawScore > 74;
  let score = rawScore;
  if (activeConflictCount > 0) score = Math.min(score, 49);
  if (freshnessValues.some((value) => value === 0)) score = Math.min(score, 74);

  return {
    score,
    state: pulseStateForScore(score),
    modelVersion: 1,
    components: {
      assertionCount: assertions.length,
      currentAssertionCount: current.length,
      activeConflictCount,
      recentSparkCount: Math.max(0, input.recentSparkCount),
      coverage: round6(coverage),
      freshness: round6(freshness),
      support: round6(support),
      recentSpark: round6(recentSpark),
      rawScore,
      conflictCapApplied,
      criticalStalenessCapApplied,
    },
  };
}

export function refreshDueAt(kind: PlaceAssertionKindName, observedAt: Date): Date {
  return new Date(observedAt.getTime() + DECAY_PRIOR_DAYS[kind] * 86_400_000);
}
