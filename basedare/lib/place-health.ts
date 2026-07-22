import {
  defaultPlaceMaintenanceOutcome,
  type PlaceMaintenanceOutcome,
  type ReportedOutcomeKind,
} from './outcome-contracts';

export const PLACE_HEALTH_STATES = [
  'FRESH',
  'AGING',
  'NEEDS_RECHECK',
  'DISPUTED',
  'RETIRED',
] as const;

export type PlaceHealthState = (typeof PLACE_HEALTH_STATES)[number];

export type PlaceHealthObservation = {
  id: string;
  buyerQuestion: string;
  reportedOutcome: unknown;
  observedAt: Date | string;
  acceptedAt: Date | string;
  refreshAt: Date | string;
  outcomeContractSnapshot?: unknown;
};

export type PlaceHealthSnapshot = {
  state: PlaceHealthState;
  reason: string;
  latestObservedAt: string | null;
  refreshAt: string | null;
  recheckProposal: null | {
    buyerQuestion: string;
    missionKitKey: string | null;
    dueAt: string;
    fundingBoundary: string;
  };
};

type ParsedObservation = {
  id: string;
  question: string;
  kind: ReportedOutcomeKind;
  maintenanceOutcome: PlaceMaintenanceOutcome;
  observedAt: Date;
  acceptedAt: Date;
  refreshAt: Date;
  missionKitKey: string | null;
};

function parseDate(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function normalizeQuestion(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();
}

function parseObservation(input: PlaceHealthObservation): ParsedObservation | null {
  if (!input.reportedOutcome || typeof input.reportedOutcome !== 'object' || Array.isArray(input.reportedOutcome)) return null;
  const outcome = input.reportedOutcome as { kind?: unknown; maintenanceOutcome?: unknown };
  if (typeof outcome.kind !== 'string' || !['YES', 'NO', 'PARTIAL', 'INCONCLUSIVE', 'COMPLETED', 'PUBLISHED'].includes(outcome.kind)) return null;
  const observedAt = parseDate(input.observedAt);
  const acceptedAt = parseDate(input.acceptedAt);
  const refreshAt = parseDate(input.refreshAt);
  if (!observedAt || !acceptedAt || !refreshAt) return null;
  const maintenanceOutcome =
    typeof outcome.maintenanceOutcome === 'string'
    && ['CONFIRMED', 'CHANGED', 'COULD_NOT_VERIFY', 'CLOSED_OR_MOVED', 'UNSAFE_OR_INACCESSIBLE', 'NEEDS_RECHECK'].includes(outcome.maintenanceOutcome)
      ? outcome.maintenanceOutcome as PlaceMaintenanceOutcome
      : defaultPlaceMaintenanceOutcome(outcome.kind as ReportedOutcomeKind);
  const snapshot = input.outcomeContractSnapshot && typeof input.outcomeContractSnapshot === 'object'
    ? input.outcomeContractSnapshot as { missionKit?: { key?: unknown } }
    : null;
  return {
    id: input.id,
    question: normalizeQuestion(input.buyerQuestion),
    kind: outcome.kind as ReportedOutcomeKind,
    maintenanceOutcome,
    observedAt,
    acceptedAt,
    refreshAt,
    missionKitKey: typeof snapshot?.missionKit?.key === 'string' ? snapshot.missionKit.key : null,
  };
}

function buildRecheckProposal(
  state: Exclude<PlaceHealthState, 'FRESH'>,
  latest: ParsedObservation,
  buyerQuestion: string,
  now: Date,
) {
  return {
    buyerQuestion: buyerQuestion.trim(),
    missionKitKey: latest.missionKitKey,
    dueAt: state === 'AGING' && latest.refreshAt > now ? latest.refreshAt.toISOString() : now.toISOString(),
    fundingBoundary: 'Proposal only. A human must approve scope and fund a new mission before routing begins.',
  };
}

export function derivePlaceHealth(
  observations: PlaceHealthObservation[],
  nowValue: Date | string = new Date(),
): PlaceHealthSnapshot {
  const now = parseDate(nowValue) ?? new Date();
  const parsed = observations
    .flatMap((observation) => {
      const value = parseObservation(observation);
      return value ? [{ ...value, buyerQuestion: observation.buyerQuestion }] : [];
    })
    .sort((left, right) => right.acceptedAt.getTime() - left.acceptedAt.getTime());

  if (!parsed.length) {
    return {
      state: 'NEEDS_RECHECK',
      reason: 'No accepted, time-bounded field observation exists for this place yet.',
      latestObservedAt: null,
      refreshAt: null,
      recheckProposal: null,
    };
  }

  const latest = parsed[0];
  const base = {
    latestObservedAt: latest.observedAt.toISOString(),
    refreshAt: latest.refreshAt.toISOString(),
  };
  if (latest.maintenanceOutcome === 'CLOSED_OR_MOVED') {
    return {
      state: 'RETIRED',
      reason: 'The latest accepted observation reports that the place closed or moved.',
      ...base,
      recheckProposal: buildRecheckProposal('RETIRED', latest, latest.buyerQuestion, now),
    };
  }

  const currentQuestionObservations = parsed.filter((item) => item.question === latest.question && item.refreshAt > now);
  const currentMaintenanceStates = new Set(currentQuestionObservations.map((item) => item.maintenanceOutcome));
  if (currentMaintenanceStates.has('CONFIRMED') && currentMaintenanceStates.has('CHANGED')) {
    return {
      state: 'DISPUTED',
      reason: 'Accepted observations within the same freshness window disagree about this place.',
      ...base,
      recheckProposal: buildRecheckProposal('DISPUTED', latest, latest.buyerQuestion, now),
    };
  }

  if (['UNSAFE_OR_INACCESSIBLE', 'NEEDS_RECHECK', 'COULD_NOT_VERIFY'].includes(latest.maintenanceOutcome)) {
    return {
      state: 'NEEDS_RECHECK',
      reason: latest.maintenanceOutcome === 'UNSAFE_OR_INACCESSIBLE'
        ? 'The latest accepted observation reports a safety or access problem.'
        : 'The latest accepted observation could not close the place question.',
      ...base,
      recheckProposal: buildRecheckProposal('NEEDS_RECHECK', latest, latest.buyerQuestion, now),
    };
  }

  if (latest.refreshAt <= now) {
    return {
      state: 'NEEDS_RECHECK',
      reason: 'The latest accepted observation has passed its refresh date.',
      ...base,
      recheckProposal: buildRecheckProposal('NEEDS_RECHECK', latest, latest.buyerQuestion, now),
    };
  }

  const lifetimeMs = Math.max(1, latest.refreshAt.getTime() - latest.observedAt.getTime());
  const elapsedRatio = (now.getTime() - latest.observedAt.getTime()) / lifetimeMs;
  if (elapsedRatio >= 0.75) {
    return {
      state: 'AGING',
      reason: 'The current observation is nearing its scheduled refresh date.',
      ...base,
      recheckProposal: buildRecheckProposal('AGING', latest, latest.buyerQuestion, now),
    };
  }

  return {
    state: 'FRESH',
    reason: 'The latest accepted place observation is still inside its freshness window.',
    ...base,
    recheckProposal: null,
  };
}
