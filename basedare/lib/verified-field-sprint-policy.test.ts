import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFieldSprintReceiptSummary,
  canTransitionVerifiedFieldSprint,
  compileFieldSprintContracts,
  inferEvidenceQuality,
  parseAcceptedFieldTruthOutcome,
  validateSprintMissionReplacement,
  validateSprintEscrow,
  validateSprintFunding,
} from './verified-field-sprint-policy.ts';

test('compiles four independent canonical Field Truth contracts', () => {
  const contracts = compileFieldSprintContracts({
    buyerQuestion: 'Is the venue genuinely busy between 8pm and 10pm?',
    areaLabel: 'General Luna',
    freshnessWindowHours: 6,
    createdAt: new Date('2026-07-20T00:00:00Z'),
  });
  assert.equal(contracts.length, 4);
  assert.deepEqual(contracts.map((item) => item.ordinal), [1, 2, 3, 4]);
  for (const contract of contracts) {
    assert.equal(contract.snapshot.family, 'FIELD_TRUTH');
    assert.equal(contract.snapshot.freshness.maximumObservationAgeHours, 6);
    assert.match(contract.snapshot.mission.earn, /120\.00 USDC/);
  }
});

test('enforces the managed-service and reward-pool lines', () => {
  assert.equal(validateSprintFunding({ serviceRevenueUsd: 2000, rewardPoolUsd: 500, designPartnerException: false, fundingReference: 'invoice-1' }).ok, true);
  assert.equal(validateSprintFunding({ serviceRevenueUsd: 0, rewardPoolUsd: 500, designPartnerException: true, fundingReference: 'design-partner-approved' }).ok, true);
  assert.equal(validateSprintFunding({ serviceRevenueUsd: 2000, rewardPoolUsd: 480, designPartnerException: false, fundingReference: 'invoice-1' }).ok, false);
});

test('allows only forward sprint transitions', () => {
  assert.equal(canTransitionVerifiedFieldSprint('DRAFT', 'FUNDED'), true);
  assert.equal(canTransitionVerifiedFieldSprint('REVIEW', 'COMPLETE'), true);
  assert.equal(canTransitionVerifiedFieldSprint('COMPLETE', 'REVIEW'), false);
  assert.equal(canTransitionVerifiedFieldSprint('DRAFT', 'COMPLETE'), false);
});

test('requires real $125 nearby Field Truth escrow matching question and freshness', () => {
  const snapshot = compileFieldSprintContracts({
    buyerQuestion: 'Is the venue busy tonight?', areaLabel: 'General Luna', freshnessWindowHours: 6,
  })[0].snapshot;
  assert.equal(validateSprintEscrow({
    grossRewardUsd: 125, status: 'PENDING', isSimulated: false, onChainDareId: '1',
    isNearbyDare: true, outcomeContractFamily: 'FIELD_TRUTH', outcomeContractVersion: 1,
    outcomeContractSnapshot: snapshot, buyerQuestion: 'Is the venue busy tonight?', freshnessWindowHours: 6,
  }).ok, true);
  assert.equal(validateSprintEscrow({
    grossRewardUsd: 125, status: 'PENDING', isSimulated: true, onChainDareId: '1',
    isNearbyDare: true, outcomeContractFamily: 'FIELD_TRUTH', outcomeContractVersion: 1,
    outcomeContractSnapshot: snapshot, buyerQuestion: 'Is the venue busy tonight?', freshnessWindowHours: 6,
  }).ok, false);
});

test('keeps truthful negative and inconclusive results payable', () => {
  assert.equal(parseAcceptedFieldTruthOutcome({ kind: 'NO', summary: 'No queue formed during the window.', observedAt: '2026-07-20T12:00:00Z' })?.kind, 'NO');
  assert.equal(parseAcceptedFieldTruthOutcome({ kind: 'INCONCLUSIVE', summary: 'Weather interrupted observation.', observedAt: '2026-07-20T12:00:00Z' })?.kind, 'INCONCLUSIVE');
  assert.equal(parseAcceptedFieldTruthOutcome({ kind: 'PUBLISHED', summary: 'No.', observedAt: '2026-07-20T12:00:00Z' }), null);
});

test('allows one disclosed replacement and never hides the rejected first attempt', () => {
  assert.equal(validateSprintMissionReplacement({
    sprintStatus: 'REVIEW', missionStatus: 'REJECTED', existingLinkCount: 1,
    oldDareStatus: 'FAILED', oldEvidenceDecision: 'REJECTED', replacementKind: 'REJECTED',
    fundingTreatment: 'SUPPLEMENTAL_125', replacementReason: 'Contributor proof was clearly outside the agreed radius.',
    fundingReference: 'topup-125-01',
  }).ok, true);
  assert.equal(validateSprintMissionReplacement({
    sprintStatus: 'REVIEW', missionStatus: 'REJECTED', existingLinkCount: 2,
    oldDareStatus: 'FAILED', oldEvidenceDecision: 'REJECTED', replacementKind: 'REJECTED',
    fundingTreatment: 'SUPPLEMENTAL_125', replacementReason: 'Second replacement should be blocked.',
    fundingReference: 'topup-125-02',
  }).ok, false);
  assert.equal(validateSprintMissionReplacement({
    sprintStatus: 'REVIEW', missionStatus: 'REJECTED', existingLinkCount: 1,
    oldDareStatus: 'FAILED', oldEvidenceDecision: 'REJECTED', replacementKind: 'REJECTED',
    fundingTreatment: 'RECOVERED_ESCROW', replacementReason: 'Unrecovered rejected escrow cannot be called recovered.',
    fundingReference: 'not-a-refund',
  }).ok, false);
});

test('abandoned replacement requires an authoritative refund', () => {
  assert.equal(validateSprintMissionReplacement({
    sprintStatus: 'COLLECTING', missionStatus: 'COLLECTING', existingLinkCount: 1,
    oldDareStatus: 'REFUNDED', oldEvidenceDecision: null, replacementKind: 'ABANDONED',
    fundingTreatment: 'RECOVERED_ESCROW', replacementReason: 'The claim window expired without a contributor.',
    fundingReference: 'refund-tx-01',
  }).ok, true);
  assert.equal(validateSprintMissionReplacement({
    sprintStatus: 'COLLECTING', missionStatus: 'COLLECTING', existingLinkCount: 1,
    oldDareStatus: 'CLAIMED', oldEvidenceDecision: null, replacementKind: 'ABANDONED',
    fundingTreatment: 'RECOVERED_ESCROW', replacementReason: 'Claim still has unresolved escrow.',
    fundingReference: 'none',
  }).ok, false);
});

test('receipt reports distributions, evidence and costs without averaging away dissent', () => {
  const summary = buildFieldSprintReceiptSummary([
    { ordinal: 1, outcome: 'YES', evidenceQuality: 'HIGH', evidenceFreshnessHours: 1, contributorPayoutUsd: 120, platformFeeUsd: 5, verificationTimeMinutes: 10, reviewMinutes: 4, reviewCostUsd: 3 },
    { ordinal: 2, outcome: 'NO', evidenceQuality: 'HIGH', evidenceFreshnessHours: 2, contributorPayoutUsd: 120, platformFeeUsd: 5, verificationTimeMinutes: 20, reviewMinutes: 5, reviewCostUsd: 4 },
    { ordinal: 3, outcome: 'PARTIAL', evidenceQuality: 'MEDIUM', evidenceFreshnessHours: 3, contributorPayoutUsd: 120, platformFeeUsd: 5, verificationTimeMinutes: 30, reviewMinutes: 6, reviewCostUsd: 5 },
    { ordinal: 4, outcome: 'INCONCLUSIVE', evidenceQuality: 'LOW', evidenceFreshnessHours: 4, contributorPayoutUsd: 120, platformFeeUsd: 5, verificationTimeMinutes: 40, reviewMinutes: 7, reviewCostUsd: 6 },
  ]);
  assert.deepEqual(summary.distribution, { YES: 1, NO: 1, PARTIAL: 1, INCONCLUSIVE: 1 });
  assert.deepEqual(summary.evidenceQuality, { HIGH: 2, MEDIUM: 1, LOW: 1 });
  assert.equal(summary.contributorPayoutUsd, 480);
  assert.equal(summary.platformFeeUsd, 20);
  assert.equal(summary.reviewCostUsd, 18);
  assert.equal(summary.medianVerificationMinutes, 25);
});

test('quality ladder is conservative', () => {
  assert.equal(inferEvidenceQuality({ evidenceDecision: 'ACCEPTED', mediaCid: 'cid', proximityDecision: 'INSIDE', verificationConfidence: 0.9 }), 'HIGH');
  assert.equal(inferEvidenceQuality({ evidenceDecision: 'ACCEPTED', mediaCid: 'cid', proximityDecision: 'REVIEW', verificationConfidence: 0.9 }), 'MEDIUM');
  assert.equal(inferEvidenceQuality({ evidenceDecision: 'PENDING_REVIEW', mediaCid: 'cid', proximityDecision: 'INSIDE', verificationConfidence: 1 }), 'LOW');
});
