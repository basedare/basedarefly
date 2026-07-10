import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSubmissionKey,
  preSettleStates,
  canAcquireSettlement,
  deriveProofRouteOutcome,
  FALLBACK_CAS_STATES,
  SETTLEMENT_LOCK_STATUS,
} from './settlement-transition.ts';

// --- deriveProofRouteOutcome: one fail-closed transition per attempt --------

test('out-of-radius rejection wins over every approval/review signal', () => {
  assert.equal(deriveProofRouteOutcome({
    proximityDecision: 'REJECT',
    requiresManualReview: true,
    paidMission: true,
    verificationSuccess: true,
    verificationConfidence: 1,
    autoApproveConfidence: 0.8,
  }), 'REJECT');
});

test('paid missions and verifier review can never enter auto-settlement', () => {
  const base = {
    proximityDecision: 'INSIDE',
    verificationSuccess: true,
    verificationConfidence: 0.99,
    autoApproveConfidence: 0.8,
  };
  assert.equal(deriveProofRouteOutcome({ ...base, requiresManualReview: false, paidMission: true }), 'REVIEW');
  assert.equal(deriveProofRouteOutcome({ ...base, requiresManualReview: true, paidMission: false }), 'REVIEW');
});

test('settlement requires success and confidence strictly above threshold', () => {
  const base = {
    proximityDecision: 'INSIDE',
    requiresManualReview: false,
    paidMission: false,
    verificationSuccess: true,
    autoApproveConfidence: 0.8,
  };
  assert.equal(deriveProofRouteOutcome({ ...base, verificationConfidence: 0.81 }), 'SETTLE');
  assert.equal(deriveProofRouteOutcome({ ...base, verificationConfidence: 0.8 }), 'FAIL');
  assert.equal(deriveProofRouteOutcome({ ...base, verificationConfidence: Number.NaN }), 'FAIL');
  assert.equal(deriveProofRouteOutcome({ ...base, verificationConfidence: 0.99, verificationSuccess: false }), 'FAIL');
});

// --- buildSubmissionKey: stable per (dare, media), dedups replays -------------

test('same media on the same dare → identical key (blocks replay)', () => {
  const a = buildSubmissionKey('dare1', 'bafyCID');
  const b = buildSubmissionKey('dare1', 'bafyCID');
  assert.equal(a, b);
  assert.equal(a, 'dare1:bafyCID');
});

test('different media (new upload) → different key (legit retry allowed)', () => {
  assert.notEqual(buildSubmissionKey('dare1', 'bafyCID'), buildSubmissionKey('dare1', 'bafyOTHER'));
});

test('same media, different dares → different keys', () => {
  assert.notEqual(buildSubmissionKey('dare1', 'bafyCID'), buildSubmissionKey('dare2', 'bafyCID'));
});

test('no media → null key (NULLs are distinct under the unique index, never collide)', () => {
  assert.equal(buildSubmissionKey('dare1', null), null);
  assert.equal(buildSubmissionKey('dare1', undefined), null);
  assert.equal(buildSubmissionKey('dare1', '   '), null);
});

// --- preSettleStates / canAcquireSettlement: fail-closed acquisition ----------

test('PENDING dare is the normal acquirable state', () => {
  assert.deepEqual(preSettleStates({}), ['PENDING']);
  assert.equal(canAcquireSettlement('PENDING', {}), true);
});

test('FAILED is acquirable ONLY under an active appeal', () => {
  assert.deepEqual(preSettleStates({ appealStatus: 'PENDING' }), ['PENDING', 'FAILED']);
  assert.equal(canAcquireSettlement('FAILED', { appealStatus: 'PENDING' }), true);
  assert.equal(canAcquireSettlement('FAILED', {}), false);
  assert.equal(canAcquireSettlement('FAILED', { appealStatus: 'REJECTED' }), false);
});

test('terminal / in-flight statuses are NOT acquirable (fail closed)', () => {
  for (const s of ['VERIFIED', 'PENDING_PAYOUT', 'PENDING_REVIEW', 'SETTLED', 'REFUNDED', 'EXPIRED', 'CANCELLED']) {
    assert.equal(canAcquireSettlement(s, { appealStatus: 'PENDING' }), false, `${s} must not acquire`);
  }
});

test('the lock status is itself NOT re-acquirable (prevents double-settle)', () => {
  assert.equal(canAcquireSettlement(SETTLEMENT_LOCK_STATUS, {}), false);
});

// --- FALLBACK_CAS_STATES: fallback can never overwrite a terminal state -------

test('fallback CAS states exclude every terminal status', () => {
  const states: string[] = [...FALLBACK_CAS_STATES];
  for (const terminal of ['VERIFIED', 'FAILED', 'SETTLED', 'REFUNDED']) {
    assert.equal(states.includes(terminal), false, `fallback must not write over ${terminal}`);
  }
  assert.deepEqual(states, ['PENDING_PAYOUT']);
});
