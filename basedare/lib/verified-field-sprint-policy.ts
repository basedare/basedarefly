import {
  buildOutcomeContractSnapshot,
  defaultPlaceMaintenanceOutcome,
  PLACE_MAINTENANCE_OUTCOMES,
  type PlaceMaintenanceOutcome,
  type OutcomeContractSnapshot,
  type ReportedOutcome,
  type ReportedOutcomeKind,
} from '@/lib/outcome-contracts';
import {
  MANAGED_FIELD_SPRINT,
  calculateSuccessfulSettlement,
  hasValidManagedFieldSprintPaymentLines,
  isEligibleManagedFieldSprintEscrow,
} from '@/lib/financial-canon';
import { preflightMissionKit, type MissionKitKey } from '@/lib/mission-kits';

export const VERIFIED_FIELD_SPRINT_STATUSES = [
  'DRAFT', 'FUNDED', 'ROUTING', 'COLLECTING', 'REVIEW', 'COMPLETE',
] as const;
export type VerifiedFieldSprintStatus = (typeof VERIFIED_FIELD_SPRINT_STATUSES)[number];

export const FIELD_TRUTH_RESULTS = ['YES', 'NO', 'PARTIAL', 'INCONCLUSIVE'] as const;
export type FieldTruthResult = (typeof FIELD_TRUTH_RESULTS)[number];

export const FIELD_SPRINT_EVIDENCE_QUALITY = ['HIGH', 'MEDIUM', 'LOW'] as const;
export type FieldSprintEvidenceQuality = (typeof FIELD_SPRINT_EVIDENCE_QUALITY)[number];

export const FIELD_SPRINT_REPLACEMENT_KINDS = ['REJECTED', 'ABANDONED'] as const;
export type FieldSprintReplacementKind = (typeof FIELD_SPRINT_REPLACEMENT_KINDS)[number];
export const FIELD_SPRINT_REPLACEMENT_FUNDING = ['RECOVERED_ESCROW', 'SUPPLEMENTAL_125'] as const;
export type FieldSprintReplacementFunding = (typeof FIELD_SPRINT_REPLACEMENT_FUNDING)[number];
export const MAX_FIELD_SPRINT_REPLACEMENTS_PER_MISSION = 1;
export const FIELD_SPRINT_REPEAT_DECISIONS = ['REPEAT', 'ADJUST', 'ASK', 'STOP'] as const;
export type FieldSprintRepeatDecision = (typeof FIELD_SPRINT_REPEAT_DECISIONS)[number];
export const FIELD_SPRINT_REPEAT_TERMS_VERSION = 'verified-field-sprint-repeat-v1';
export const FIELD_SPRINT_NEXT_ACTIONS = [
  'RECHECK_AFTER_FRESHNESS',
  'CORRECT_RECORD',
  'TEST_DIFFERENT_TIME',
  'COLLECT_SECOND_SAMPLE',
  'REPLACE_UNAVAILABLE_OFFER',
  'INVESTIGATE_CONFLICT',
  'NO_ACTION',
] as const;
export type FieldSprintNextAction = (typeof FIELD_SPRINT_NEXT_ACTIONS)[number];

const TRANSITIONS: Record<VerifiedFieldSprintStatus, readonly VerifiedFieldSprintStatus[]> = {
  DRAFT: ['FUNDED'],
  FUNDED: ['ROUTING'],
  ROUTING: ['COLLECTING'],
  COLLECTING: ['REVIEW'],
  REVIEW: ['COMPLETE'],
  COMPLETE: [],
};

export function canTransitionVerifiedFieldSprint(
  current: string,
  next: string,
): current is VerifiedFieldSprintStatus {
  if (!(VERIFIED_FIELD_SPRINT_STATUSES as readonly string[]).includes(current)) return false;
  return TRANSITIONS[current as VerifiedFieldSprintStatus].includes(next as VerifiedFieldSprintStatus);
}

export function validateSprintFunding(input: {
  serviceRevenueUsd: unknown;
  rewardPoolUsd: unknown;
  designPartnerException: unknown;
  fundingReference: unknown;
}) {
  if (!hasValidManagedFieldSprintPaymentLines({
    serviceRevenueUsd: input.serviceRevenueUsd,
    rewardPoolUsd: input.rewardPoolUsd,
    designPartnerException: input.designPartnerException,
  })) {
    return { ok: false as const, reason: 'Funding must confirm the $2,000 managed-service line and full $500 reward pool, unless a named design-partner exception is recorded.' };
  }
  if (typeof input.fundingReference !== 'string' || input.fundingReference.trim().length < 3) {
    return { ok: false as const, reason: 'A payment or design-partner authorization reference is required.' };
  }
  return { ok: true as const };
}

export function compileFieldSprintContracts(input: {
  missionKitKey: MissionKitKey;
  buyerQuestion: string;
  areaLabel: string;
  freshnessWindowHours: number;
  createdAt?: Date;
}) {
  const createdAt = input.createdAt ?? new Date();
  const preflight = preflightMissionKit({
    kitKey: input.missionKitKey,
    question: input.buyerQuestion,
    freshnessWindowHours: input.freshnessWindowHours,
    areaLabel: input.areaLabel,
    createdAt,
  });
  if (!preflight.ok) throw new Error(`Mission preflight failed: ${preflight.errors.join(' ')}`);
  const question = preflight.normalizedQuestion;
  const area = preflight.normalizedAreaLabel;
  return Array.from({ length: MANAGED_FIELD_SPRINT.assignedContributorCount }, (_, index) => ({
    ordinal: index + 1,
    snapshot: {
      ...buildOutcomeContractSnapshot({
      family: 'FIELD_TRUTH',
      title: `Field check ${index + 1}: ${question}`,
      buyerQuestion: question,
      missionMode: 'IRL',
      missionTag: 'field-truth',
      amount: MANAGED_FIELD_SPRINT.grossRewardPerContributorUsd,
      locationLabel: area,
      isNearbyDare: true,
      maximumObservationAgeHours: input.freshnessWindowHours,
      createdAt,
      }),
      missionKit: preflight.snapshot,
    } satisfies OutcomeContractSnapshot,
  }));
}

export function validateSprintEscrow(input: {
  grossRewardUsd: number;
  status: string;
  isSimulated: boolean;
  onChainDareId: string | null;
  isNearbyDare: boolean;
  outcomeContractFamily: string | null;
  outcomeContractVersion: number | null;
  outcomeContractSnapshot: unknown;
  buyerQuestion: string;
  freshnessWindowHours: number;
}) {
  if (!isEligibleManagedFieldSprintEscrow(input)) {
    return { ok: false as const, reason: 'Mission must be a live, non-simulated $125 escrow.' };
  }
  if (!input.isNearbyDare) return { ok: false as const, reason: 'Field Truth missions must be location-gated.' };
  if (input.outcomeContractFamily !== 'FIELD_TRUTH' || input.outcomeContractVersion !== 1) {
    return { ok: false as const, reason: 'Mission must use the active Field Truth contract.' };
  }
  const snapshot = input.outcomeContractSnapshot as Partial<OutcomeContractSnapshot> | null;
  if (!snapshot || snapshot.family !== 'FIELD_TRUTH') return { ok: false as const, reason: 'Mission has no valid immutable Field Truth snapshot.' };
  if (snapshot.buyerQuestion?.trim() !== input.buyerQuestion.trim()) {
    return { ok: false as const, reason: 'Mission question does not match the Sprint question.' };
  }
  if (snapshot.freshness?.maximumObservationAgeHours !== input.freshnessWindowHours) {
    return { ok: false as const, reason: 'Mission freshness window does not match the Sprint.' };
  }
  return { ok: true as const };
}

export function validateSprintMissionReplacement(input: {
  sprintStatus: string;
  missionStatus: string;
  existingLinkCount: number;
  oldDareStatus: string;
  oldEvidenceDecision: string | null;
  replacementKind: FieldSprintReplacementKind;
  fundingTreatment: FieldSprintReplacementFunding;
  replacementReason: string;
  fundingReference: string;
}) {
  if (!['COLLECTING', 'REVIEW'].includes(input.sprintStatus)) {
    return { ok: false as const, reason: 'Replacement is only available while a funded Sprint is collecting or under review.' };
  }
  if (input.existingLinkCount !== 1) {
    return { ok: false as const, reason: 'Each mission allows one replacement maximum.' };
  }
  const isRejected = input.missionStatus === 'REJECTED'
    && (input.oldDareStatus === 'FAILED' || input.oldEvidenceDecision === 'REJECTED');
  const isAbandoned = input.oldDareStatus === 'REFUNDED';
  if (input.replacementKind === 'REJECTED' && !isRejected) {
    return { ok: false as const, reason: 'Rejected replacement requires an authoritative failed/rejected first mission.' };
  }
  if (input.replacementKind === 'ABANDONED' && !isAbandoned) {
    return { ok: false as const, reason: 'Abandoned replacement requires the original escrow to be refunded first.' };
  }
  if (input.fundingTreatment === 'RECOVERED_ESCROW' && input.oldDareStatus !== 'REFUNDED') {
    return { ok: false as const, reason: 'Recovered-escrow treatment requires an authoritative refunded original escrow.' };
  }
  if (input.replacementKind === 'REJECTED' && input.oldDareStatus !== 'REFUNDED' && input.fundingTreatment !== 'SUPPLEMENTAL_125') {
    return { ok: false as const, reason: 'A rejected unrecovered escrow requires a separately funded replacement reward.' };
  }
  if (input.replacementReason.replace(/\s+/g, ' ').trim().length < 8) {
    return { ok: false as const, reason: 'Record a specific replacement reason.' };
  }
  if (input.fundingReference.trim().length < 3) {
    return { ok: false as const, reason: 'Record the refund or supplemental-funding reference.' };
  }
  return { ok: true as const };
}

export function parseAcceptedFieldTruthOutcome(value: unknown): ReportedOutcome | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<ReportedOutcome>;
  if (!(FIELD_TRUTH_RESULTS as readonly string[]).includes(candidate.kind ?? '')) return null;
  if (typeof candidate.summary !== 'string' || candidate.summary.trim().length < 3) return null;
  if (typeof candidate.observedAt !== 'string' || !Number.isFinite(new Date(candidate.observedAt).getTime())) return null;
  return {
    kind: candidate.kind as ReportedOutcomeKind,
    summary: candidate.summary.trim(),
    observedAt: new Date(candidate.observedAt).toISOString(),
    maintenanceOutcome:
      typeof candidate.maintenanceOutcome === 'string'
      && PLACE_MAINTENANCE_OUTCOMES.includes(candidate.maintenanceOutcome as PlaceMaintenanceOutcome)
        ? candidate.maintenanceOutcome as PlaceMaintenanceOutcome
        : defaultPlaceMaintenanceOutcome(candidate.kind as ReportedOutcomeKind),
  };
}

export function inferEvidenceQuality(input: {
  evidenceDecision: string | null;
  mediaCid: string | null;
  proximityDecision: string | null;
  verificationConfidence: number | null;
}) : FieldSprintEvidenceQuality {
  if (input.evidenceDecision !== 'ACCEPTED') return 'LOW';
  if (input.mediaCid && input.proximityDecision === 'INSIDE' && (input.verificationConfidence ?? 0) >= 0.8) return 'HIGH';
  if (input.mediaCid && ['INSIDE', 'REVIEW'].includes(input.proximityDecision ?? '')) return 'MEDIUM';
  return 'LOW';
}

export type FieldSprintReceiptMission = {
  ordinal: number;
  outcome: FieldTruthResult;
  evidenceQuality: FieldSprintEvidenceQuality;
  evidenceFreshnessHours: number | null;
  contributorPayoutUsd: number;
  platformFeeUsd: number;
  verificationTimeMinutes: number | null;
  reviewMinutes: number;
  reviewCostUsd: number;
};

export function deriveFieldSprintNextAction(input: {
  missions: FieldSprintReceiptMission[];
  missionKitKey?: MissionKitKey | null;
  freshnessWindowHours?: number | null;
}) {
  const distribution = Object.fromEntries(FIELD_TRUTH_RESULTS.map((kind) => [kind, 0])) as Record<FieldTruthResult, number>;
  for (const mission of input.missions) distribution[mission.outcome] += 1;
  const freshness = input.freshnessWindowHours && input.freshnessWindowHours > 0
    ? `after ${input.freshnessWindowHours} hours`
    : 'when the current freshness window closes';

  if (distribution.YES > 0 && distribution.NO > 0) {
    return { kind: 'INVESTIGATE_CONFLICT' as const, label: 'Investigate the disagreement', reason: 'Accepted field checks disagree. Review timing and context before changing the place record.', timing: 'Before the next commercial decision' };
  }
  if (distribution.INCONCLUSIVE >= 2 || input.missions.filter((mission) => mission.evidenceQuality === 'LOW').length >= 2) {
    return { kind: 'COLLECT_SECOND_SAMPLE' as const, label: 'Collect a clearer second sample', reason: 'The evidence did not close the question confidently enough for a durable decision.', timing: 'As soon as a better observation window is available' };
  }
  if (distribution.NO >= 3 && input.missionKitKey === 'OFFER_AVAILABLE') {
    return { kind: 'REPLACE_UNAVAILABLE_OFFER' as const, label: 'Replace or remove the unavailable offer', reason: 'Most independent checks found that the advertised offer was unavailable.', timing: 'Before promoting the offer again' };
  }
  if (distribution.NO >= 3) {
    return { kind: 'CORRECT_RECORD' as const, label: 'Correct the current place record', reason: 'Most independent checks returned a supported negative answer.', timing: 'Now, with the receipt attached' };
  }
  if (distribution.PARTIAL >= 2) {
    return { kind: 'TEST_DIFFERENT_TIME' as const, label: 'Test a different time window', reason: 'The answer appears conditional rather than consistently true or false.', timing: 'During a deliberately different operating window' };
  }
  if (distribution.YES >= 3 && input.missions.every((mission) => mission.evidenceQuality !== 'LOW')) {
    return { kind: 'RECHECK_AFTER_FRESHNESS' as const, label: 'Keep the answer, then recheck', reason: 'The current answer has strong independent support. Do not buy more fieldwork until it approaches expiry.', timing: freshness };
  }
  return { kind: 'NO_ACTION' as const, label: 'Take no action yet', reason: 'The current receipt does not justify a stronger operational move.', timing: 'Wait for a materially new question or freshness trigger' };
}

export function buildFieldSprintReceiptSummary(
  missions: FieldSprintReceiptMission[],
  context: { missionKitKey?: MissionKitKey | null; freshnessWindowHours?: number | null } = {},
) {
  if (missions.length !== MANAGED_FIELD_SPRINT.assignedContributorCount) {
    throw new Error('A complete Sprint receipt requires exactly four independent missions.');
  }
  const distribution = Object.fromEntries(FIELD_TRUTH_RESULTS.map((kind) => [kind, 0])) as Record<FieldTruthResult, number>;
  const evidenceQuality = Object.fromEntries(FIELD_SPRINT_EVIDENCE_QUALITY.map((kind) => [kind, 0])) as Record<FieldSprintEvidenceQuality, number>;
  for (const mission of missions) {
    distribution[mission.outcome] += 1;
    evidenceQuality[mission.evidenceQuality] += 1;
  }
  return {
    distribution,
    evidenceQuality,
    contributorPayoutUsd: missions.reduce((sum, item) => sum + item.contributorPayoutUsd, 0),
    platformFeeUsd: missions.reduce((sum, item) => sum + item.platformFeeUsd, 0),
    reviewMinutes: missions.reduce((sum, item) => sum + item.reviewMinutes, 0),
    reviewCostUsd: missions.reduce((sum, item) => sum + item.reviewCostUsd, 0),
    medianVerificationMinutes: median(missions.flatMap((item) => item.verificationTimeMinutes === null ? [] : [item.verificationTimeMinutes])),
    medianFreshnessHours: median(missions.flatMap((item) => item.evidenceFreshnessHours === null ? [] : [item.evidenceFreshnessHours])),
    receiptMeaning: 'Four independently accepted field observations. Negative and inconclusive results are reported, not hidden.',
    nextAction: deriveFieldSprintNextAction({ missions, ...context }),
  };
}

export function canonicalMissionSettlement() {
  return calculateSuccessfulSettlement(MANAGED_FIELD_SPRINT.grossRewardPerContributorUsd);
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round(((sorted[middle - 1] + sorted[middle]) / 2) * 100) / 100;
}
