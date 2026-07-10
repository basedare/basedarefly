import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeReviewReason, type ReviewReasonInput } from './proof-review-reason.ts';

function base(overrides: Partial<ReviewReasonInput> = {}): ReviewReasonInput {
  return {
    proximityForcedReview: false,
    proximityCode: null,
    proximityReason: null,
    sentinelRequested: false,
    paidMission: false,
    highValue: false,
    ...overrides,
  };
}

test('proximity-only review surfaces the accurate proximity clause (not a money clause)', () => {
  const r = composeReviewReason(base({
    proximityForcedReview: true,
    proximityCode: 'BORDERLINE',
    proximityReason: 'Location is 5.10km away — just outside the 5km radius within the accuracy margin.',
  }));
  assert.equal(r, 'Proximity review [BORDERLINE]: Location is 5.10km away — just outside the 5km radius within the accuracy margin.');
});

test('high-value-only review keeps the existing generic wording', () => {
  assert.equal(composeReviewReason(base({ highValue: true })), 'High-value bounty requires manual verification.');
});

test('sentinel-only review keeps the sentinel wording', () => {
  assert.equal(
    composeReviewReason(base({ sentinelRequested: true })),
    'Sentinel verification requested. Proof requires referee review.',
  );
});

test('paid-mission-only review keeps the paid-mission wording (no longer mislabeled high-value)', () => {
  assert.equal(
    composeReviewReason(base({ paidMission: true })),
    'Paid venue/brand mission requires referee review.',
  );
});

test('proximity + sentinel → BOTH clauses (sentinel takes the money slot)', () => {
  const r = composeReviewReason(base({
    sentinelRequested: true,
    proximityForcedReview: true,
    proximityCode: 'LOW_ACCURACY',
    proximityReason: 'Location accuracy is missing, negative, or worse than 200m.',
  }));
  assert.ok(r.includes('Sentinel verification requested.'));
  assert.ok(r.includes('Proximity review [LOW_ACCURACY]:'));
});

test('proximity + paid-mission → BOTH clauses', () => {
  const r = composeReviewReason(base({
    paidMission: true,
    proximityForcedReview: true,
    proximityCode: 'STALE_LOCATION',
    proximityReason: 'Submitted location capture time is too old.',
  }));
  assert.ok(r.includes('Paid venue/brand mission requires referee review.'));
  assert.ok(r.includes('Proximity review [STALE_LOCATION]:'));
});

test('sentinel outranks paid outranks high-value in the money slot', () => {
  assert.ok(composeReviewReason(base({ sentinelRequested: true, paidMission: true, highValue: true })).startsWith('Sentinel'));
  assert.ok(composeReviewReason(base({ paidMission: true, highValue: true })).startsWith('Paid'));
});

test('no trigger at all → safe generic fallback (never empty)', () => {
  assert.equal(composeReviewReason(base()), 'Proof requires referee review.');
});

test('proximity clause is NOT injected when the gate did not force review (e.g. REJECT/INSIDE)', () => {
  const r = composeReviewReason(base({
    highValue: true,
    proximityForcedReview: false,
    proximityCode: 'OUT_OF_RADIUS',
    proximityReason: 'should not appear',
  }));
  assert.equal(r, 'High-value bounty requires manual verification.');
  assert.ok(!r.includes('should not appear'));
});

test('missing proximityReason never emits a dangling clause', () => {
  const r = composeReviewReason(base({ highValue: true, proximityForcedReview: true, proximityReason: null }));
  assert.equal(r, 'High-value bounty requires manual verification.');
});
