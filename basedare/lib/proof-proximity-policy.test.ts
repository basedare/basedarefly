import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateProximity,
  isProximityGatedDare,
  hasEvaluableTarget,
  targetCoordsReview,
  deriveAttemptDecision,
  resolveRadiusKm,
  applyProximityGate,
  DEFAULT_RADIUS_KM,
  MAX_RADIUS_KM,
  MAX_LOCATION_AGE_MS,
  MAX_ACCURACY_M,
  MAX_CLOCK_SKEW_MS,
  TARGET_COORDS_MISSING,
  type ProximityInput,
  type ProximityResult,
} from './proof-proximity-policy.ts';

const RECEIVED = new Date('2026-07-10T12:00:00.000Z');
const FRESH = new Date(RECEIVED.getTime() - 60 * 1000); // 1 min before receive

function input(overrides: Partial<ProximityInput> = {}): ProximityInput {
  return {
    hasSubmittedLocation: true,
    coordsValid: true,
    distanceKm: 1,
    radiusKm: 5,
    accuracyM: 30,
    capturedAt: FRESH,
    receivedAt: RECEIVED,
    ...overrides,
  };
}

test('inside radius → INSIDE, gate passed', () => {
  const r = evaluateProximity(input({ distanceKm: 1, radiusKm: 5 }));
  assert.equal(r.decision, 'INSIDE');
  assert.equal(r.gatePassed, true);
});

test('exactly at the boundary → INSIDE (<=)', () => {
  const r = evaluateProximity(input({ distanceKm: 5, radiusKm: 5, accuracyM: 10 }));
  assert.equal(r.decision, 'INSIDE');
});

test('clearly outside (beyond radius + accuracy) → REJECT', () => {
  const r = evaluateProximity(input({ distanceKm: 6, radiusKm: 5, accuracyM: 50 }));
  assert.equal(r.decision, 'REJECT');
  assert.equal(r.code, 'OUT_OF_RADIUS');
  assert.equal(r.gatePassed, false);
});

test('just outside but within accuracy margin → REVIEW (never auto-approve)', () => {
  // 5.1km away, radius 5km, accuracy 200m → 5.1 - 0.2 = 4.9 <= 5 → borderline
  const r = evaluateProximity(input({ distanceKm: 5.1, radiusKm: 5, accuracyM: 200 }));
  assert.equal(r.decision, 'REVIEW');
  assert.equal(r.code, 'BORDERLINE');
  assert.equal(r.gatePassed, false);
});

test('missing location → REVIEW, never auto-approve', () => {
  const r = evaluateProximity(input({ hasSubmittedLocation: false }));
  assert.equal(r.decision, 'REVIEW');
  assert.equal(r.code, 'MISSING_LOCATION');
});

test('invalid coordinates → REVIEW', () => {
  const r = evaluateProximity(input({ coordsValid: false }));
  assert.equal(r.code, 'INVALID_LOCATION');
});

test('stale capture time → REVIEW', () => {
  const stale = new Date(RECEIVED.getTime() - MAX_LOCATION_AGE_MS - 1000);
  const r = evaluateProximity(input({ capturedAt: stale }));
  assert.equal(r.code, 'STALE_LOCATION');
});

test('missing capture time → REVIEW (stale)', () => {
  assert.equal(evaluateProximity(input({ capturedAt: null })).code, 'STALE_LOCATION');
});

test('accuracy worse than threshold → REVIEW', () => {
  const r = evaluateProximity(input({ accuracyM: MAX_ACCURACY_M + 1 }));
  assert.equal(r.code, 'LOW_ACCURACY');
});

test('missing accuracy → REVIEW', () => {
  assert.equal(evaluateProximity(input({ accuracyM: null })).code, 'LOW_ACCURACY');
});

test('null distance with otherwise-valid location → REVIEW', () => {
  assert.equal(evaluateProximity(input({ distanceKm: null })).code, 'MISSING_LOCATION');
});

test('checks run in order: missing location beats a good distance', () => {
  const r = evaluateProximity(input({ hasSubmittedLocation: false, distanceKm: 0 }));
  assert.equal(r.code, 'MISSING_LOCATION');
});

// --- P1-E: freshness/accuracy must fail closed on malformed evidence ----------

test('invalid Date capture → REVIEW STALE (was leaking as fresh: NaN > max is false)', () => {
  const r = evaluateProximity(input({ capturedAt: new Date('not-a-date') }));
  assert.equal(r.decision, 'REVIEW');
  assert.equal(r.code, 'STALE_LOCATION');
});

test('far-future capture → REVIEW STALE (was leaking as fresh: negative age)', () => {
  const future = new Date(RECEIVED.getTime() + 30 * 60 * 1000); // 30 min ahead
  assert.equal(evaluateProximity(input({ capturedAt: future })).code, 'STALE_LOCATION');
});

test('within-skew future capture → allowed (clock drift tolerated)', () => {
  const skewed = new Date(RECEIVED.getTime() + 60 * 1000); // 1 min ahead, < 2 min skew
  const r = evaluateProximity(input({ capturedAt: skewed, distanceKm: 1, radiusKm: 5 }));
  assert.equal(r.decision, 'INSIDE');
});

test('future capture exactly at skew boundary → allowed; 1ms past → STALE', () => {
  const atBoundary = new Date(RECEIVED.getTime() + MAX_CLOCK_SKEW_MS);
  assert.equal(evaluateProximity(input({ capturedAt: atBoundary })).decision, 'INSIDE');
  const pastBoundary = new Date(RECEIVED.getTime() + MAX_CLOCK_SKEW_MS + 1);
  assert.equal(evaluateProximity(input({ capturedAt: pastBoundary })).code, 'STALE_LOCATION');
});

test('age exactly at maxAge → allowed; 1ms older → STALE (boundary regression)', () => {
  const atMax = new Date(RECEIVED.getTime() - MAX_LOCATION_AGE_MS);
  assert.equal(evaluateProximity(input({ capturedAt: atMax })).decision, 'INSIDE');
  const overMax = new Date(RECEIVED.getTime() - MAX_LOCATION_AGE_MS - 1);
  assert.equal(evaluateProximity(input({ capturedAt: overMax })).code, 'STALE_LOCATION');
});

test('negative accuracy → REVIEW LOW_ACCURACY (was leaking: -50 > 200 is false)', () => {
  const r = evaluateProximity(input({ accuracyM: -50 }));
  assert.equal(r.decision, 'REVIEW');
  assert.equal(r.code, 'LOW_ACCURACY');
});

test('zero accuracy → allowed (legitimate high-precision fix)', () => {
  assert.equal(evaluateProximity(input({ accuracyM: 0, distanceKm: 1, radiusKm: 5 })).decision, 'INSIDE');
});

test('NaN / Infinity accuracy → REVIEW LOW_ACCURACY', () => {
  assert.equal(evaluateProximity(input({ accuracyM: NaN })).code, 'LOW_ACCURACY');
  assert.equal(evaluateProximity(input({ accuracyM: Infinity })).code, 'LOW_ACCURACY');
});

// --- isProximityGatedDare: which dares the gate applies to -------------------

test('gate applies: nearby IRL dare with coordinates', () => {
  assert.equal(
    isProximityGatedDare({ isNearbyDare: true, missionMode: 'IRL', latitude: 9.8, longitude: 126.1 }),
    true,
  );
});

test('gate applies: nearby dare MISSING coords is still gated (fail-closed, not skipped)', () => {
  // P0-A: applicability is coord-independent. A gated-but-unevaluable dare must
  // reach the fail-closed review branch, never skip the gate into auto-approve.
  assert.equal(
    isProximityGatedDare({ isNearbyDare: true, missionMode: 'IRL', latitude: null, longitude: 126.1 }),
    true,
  );
  assert.equal(
    isProximityGatedDare({ isNearbyDare: true, missionMode: 'IRL', latitude: 9.8, longitude: null }),
    true,
  );
});

test('gate skipped: STREAM dare is never proximity-gated (remote preserved)', () => {
  assert.equal(
    isProximityGatedDare({ isNearbyDare: true, missionMode: 'STREAM', latitude: 9.8, longitude: 126.1 }),
    false,
  );
});

test('gate skipped: non-nearby dare', () => {
  assert.equal(
    isProximityGatedDare({ isNearbyDare: false, missionMode: 'IRL', latitude: 9.8, longitude: 126.1 }),
    false,
  );
});

test('gate skipped: null/undefined flags default to not-gated', () => {
  assert.equal(isProximityGatedDare({}), false);
  assert.equal(isProximityGatedDare({ isNearbyDare: null, missionMode: null }), false);
});

// --- hasEvaluableTarget + targetCoordsReview: fail-closed on bad target -------

const alwaysValid = () => true;
const alwaysInvalid = () => false;

test('hasEvaluableTarget: both coords present and valid → true', () => {
  assert.equal(hasEvaluableTarget({ latitude: 9.8, longitude: 126.1 }, alwaysValid), true);
});

test('hasEvaluableTarget: a missing coord → false', () => {
  assert.equal(hasEvaluableTarget({ latitude: null, longitude: 126.1 }, alwaysValid), false);
  assert.equal(hasEvaluableTarget({ latitude: 9.8, longitude: null }, alwaysValid), false);
});

test('hasEvaluableTarget: coords present but validator rejects → false', () => {
  assert.equal(hasEvaluableTarget({ latitude: 9.8, longitude: 126.1 }, alwaysInvalid), false);
});

test('targetCoordsReview → REVIEW with distinct TARGET_COORDS_MISSING code', () => {
  const r = targetCoordsReview();
  assert.equal(r.decision, 'REVIEW');
  assert.equal(r.code, TARGET_COORDS_MISSING);
  assert.equal(r.gatePassed, false);
});

test('deriveAttemptDecision: TARGET_COORDS_MISSING review path records PENDING_REVIEW', () => {
  // targetCoordsReview → REVIEW → route sets requiresManualReview=true → PENDING_REVIEW
  assert.equal(deriveAttemptDecision('REVIEW', true, true), 'PENDING_REVIEW');
});

test('deriveAttemptDecision: REVIEW is fail-closed even before verifier folding', () => {
  assert.equal(deriveAttemptDecision('REVIEW', false, true), 'PENDING_REVIEW');
});

// --- resolveRadiusKm: a misconfigured radius can't break the gate --------------

test('resolveRadiusKm: valid positive radius passes through', () => {
  assert.equal(resolveRadiusKm(5), 5);
  assert.equal(resolveRadiusKm(0.5), 0.5);
});

test('resolveRadiusKm: missing/non-finite/non-positive → default', () => {
  assert.equal(resolveRadiusKm(null), DEFAULT_RADIUS_KM);
  assert.equal(resolveRadiusKm(undefined), DEFAULT_RADIUS_KM);
  assert.equal(resolveRadiusKm(0), DEFAULT_RADIUS_KM);
  assert.equal(resolveRadiusKm(-3), DEFAULT_RADIUS_KM);
  assert.equal(resolveRadiusKm(NaN), DEFAULT_RADIUS_KM);
  assert.equal(resolveRadiusKm(Infinity), DEFAULT_RADIUS_KM);
});

test('resolveRadiusKm: absurdly large radius is clamped (no whole-planet gate)', () => {
  assert.equal(resolveRadiusKm(10000), MAX_RADIUS_KM);
});

// --- applyProximityGate: declarative REVIEW fold (no caller mutation) ----------

function px(decision: ProximityResult['decision'], reason = 'r'): ProximityResult {
  return { decision, code: 'C', reason, distanceKm: null, gatePassed: decision === 'INSIDE' };
}
const okBase = { success: true, requiresManualReview: false, reason: 'ok' };

test('applyProximityGate: REVIEW forces manual review + annotates reason', () => {
  const out = applyProximityGate(okBase, px('REVIEW', 'too far'));
  assert.equal(out.success, false);
  assert.equal(out.requiresManualReview, true);
  assert.match(out.reason, /Location needs review: too far/);
});

test('applyProximityGate: INSIDE / null leave the base outcome unchanged', () => {
  assert.deepEqual(applyProximityGate(okBase, px('INSIDE')), okBase);
  assert.deepEqual(applyProximityGate(okBase, null), okBase);
});

test('applyProximityGate: REJECT is NOT collapsed here (caller transitions it)', () => {
  assert.deepEqual(applyProximityGate(okBase, px('REJECT')), okBase);
});

test('applyProximityGate: already-in-review base is left as-is (idempotent, no double-annotate)', () => {
  const base = { success: false, requiresManualReview: true, reason: 'sentinel' };
  assert.deepEqual(applyProximityGate(base, px('REVIEW')), base);
});

// --- deriveAttemptDecision: ledger outcome for one attempt -------------------

test('decision: proximity REJECT is terminal → REJECTED (even if verifier would pass)', () => {
  assert.equal(deriveAttemptDecision('REJECT', false, true), 'REJECTED');
});

test('decision: manual review wins over auto-approve → PENDING_REVIEW', () => {
  assert.equal(deriveAttemptDecision('INSIDE', true, true), 'PENDING_REVIEW');
  assert.equal(deriveAttemptDecision('REVIEW', true, true), 'PENDING_REVIEW');
  assert.equal(deriveAttemptDecision(null, true, true), 'PENDING_REVIEW');
});

test('decision: clean pass with no review → AUTO_APPROVED', () => {
  assert.equal(deriveAttemptDecision('INSIDE', false, true), 'AUTO_APPROVED');
  assert.equal(deriveAttemptDecision(null, false, true), 'AUTO_APPROVED');
});

test('decision: failed verification → REJECTED', () => {
  assert.equal(deriveAttemptDecision('INSIDE', false, false), 'REJECTED');
  assert.equal(deriveAttemptDecision(null, false, false), 'REJECTED');
});
