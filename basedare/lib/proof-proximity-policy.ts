// Deterministic proximity policy for nearby IRL proof attempts.
//
// Pure and dependency-free (the caller computes distance via lib/geo and
// validates coordinates, then passes the results here) so thresholds live in
// ONE tested place. Browser GPS is device-reported evidence, NOT spoof-proof
// truth: being inside the radius only PERMITS the proof to continue through the
// normal verifier (media, freshness, dedup, wallet auth, reputation, Sentinel);
// it never auto-approves on its own. Missing/invalid/stale/low-accuracy
// evidence can never auto-approve (→ REVIEW). Clearly out-of-radius → REJECT.

/** Submitted location older than this (capture → receive) is treated as stale. */
export const MAX_LOCATION_AGE_MS = 15 * 60 * 1000; // 15 minutes
/** Device accuracy worse (larger) than this is too coarse to trust for a gate. */
export const MAX_ACCURACY_M = 200;
/**
 * Allowed future skew between a device capture time and the server receive time.
 * Device clocks drift; a capture stamped slightly ahead of the server is normal.
 * Anything beyond this into the future is treated as stale (fail closed) so a
 * forged future timestamp can never masquerade as fresh.
 */
export const MAX_CLOCK_SKEW_MS = 2 * 60 * 1000; // 2 minutes

/** Proximity-gated dare whose stored target coordinates are missing/invalid. */
export const TARGET_COORDS_MISSING = 'TARGET_COORDS_MISSING';

/** Default discovery radius (km) used when a dare's configured radius is unusable. */
export const DEFAULT_RADIUS_KM = 5;
/** Upper sanity bound (km) — a configured radius larger than this is clamped. */
export const MAX_RADIUS_KM = 100;

/**
 * Normalize a dare's configured discovery radius to a sane positive number.
 * A missing / non-finite / non-positive radius falls back to the default; an
 * absurdly large radius is clamped so a misconfiguration can't make the whole
 * planet "inside" the gate.
 */
export function resolveRadiusKm(raw: number | null | undefined): number {
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return DEFAULT_RADIUS_KM;
  return Math.min(raw, MAX_RADIUS_KM);
}

export type ProximityDecision = 'INSIDE' | 'REVIEW' | 'REJECT';

export interface ProximityInput {
  hasSubmittedLocation: boolean;
  coordsValid: boolean; // caller: geo.isValidCoordinates(lat, lng)
  distanceKm: number | null; // caller: geo.calculateDistance(target, submitted)
  radiusKm: number;
  accuracyM: number | null;
  capturedAt: Date | null;
  receivedAt: Date;
  maxAgeMs?: number;
  maxAccuracyM?: number;
}

export interface ProximityResult {
  decision: ProximityDecision;
  code: string;
  reason: string;
  distanceKm: number | null;
  /** True only for INSIDE — a necessary gate, never sufficient approval. */
  gatePassed: boolean;
}

function review(code: string, reason: string, distanceKm: number | null = null): ProximityResult {
  return { decision: 'REVIEW', code, reason, distanceKm, gatePassed: false };
}

/** Minimal dare shape needed to decide whether the proximity gate applies. */
export interface ProximityGateDare {
  isNearbyDare?: boolean | null;
  missionMode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * APPLICABILITY: whether a proof for this dare is SUPPOSED to be proximity-gated,
 * independent of whether we can actually measure it. A nearby, non-STREAM dare is
 * gated even if its stored coordinates are missing — that is a misconfiguration
 * that must fail closed to review (see hasEvaluableTarget / targetCoordsReview),
 * NEVER skip the gate into auto-approval. STREAM dares are excluded so their
 * remote behavior is preserved untouched.
 *
 * This same predicate governs three call sites and they MUST agree: the client's
 * decision to collect GPS, the server's decision to persist submitted location,
 * and the server's decision to enter the proximity branch.
 */
export function isProximityGatedDare(dare: ProximityGateDare): boolean {
  return Boolean(dare.isNearbyDare) && dare.missionMode !== 'STREAM';
}

/**
 * EVALUABILITY: whether a gated dare actually has usable target coordinates to
 * measure distance against. The coordinate validator is injected (lib/geo's
 * isValidCoordinates) so this module stays pure/dependency-free per its header.
 */
export function hasEvaluableTarget(
  dare: ProximityGateDare,
  isValid: (lat: number, lng: number) => boolean,
): boolean {
  return dare.latitude != null && dare.longitude != null && isValid(dare.latitude, dare.longitude);
}

/**
 * Result for a gated dare whose stored TARGET coordinates are missing/invalid.
 * Distinct code from MISSING_LOCATION/INVALID_LOCATION (which describe the
 * SUBMITTER) so audits can tell a misconfigured dare apart from a user who
 * omitted GPS. Fails closed to REVIEW — a gated dare can never auto-approve
 * without a target to measure against.
 */
export function targetCoordsReview(): ProximityResult {
  return review(
    TARGET_COORDS_MISSING,
    'Dare is proximity-gated but has missing/invalid target coordinates — misconfiguration, routed to review.',
  );
}

/** Terminal decision recorded on an append-only proof-attempt ledger row. */
export type AttemptLedgerDecision = 'REJECTED' | 'PENDING_REVIEW' | 'AUTO_APPROVED';

/**
 * Derive the ledger decision for one proof attempt.
 *
 * A REJECT from the proximity gate is terminal (out-of-radius evidence). Otherwise
 * the underlying verifier governs: manual-review flag wins over an auto-approve,
 * and a failed verification is recorded as rejected. The gate can only ever make
 * the recorded outcome stricter — it never flips a rejection into an approval.
 */
export function deriveAttemptDecision(
  proximityDecision: ProximityDecision | null,
  requiresManualReview: boolean,
  verificationSuccess: boolean,
): AttemptLedgerDecision {
  if (proximityDecision === 'REJECT') return 'REJECTED';
  // REVIEW is itself a manual-review signal. Keep this function safe when used
  // independently of applyProximityGate; callers must not need to mutate the
  // verifier flag first for the ledger to record the stricter outcome.
  if (proximityDecision === 'REVIEW') return 'PENDING_REVIEW';
  if (requiresManualReview) return 'PENDING_REVIEW';
  return verificationSuccess ? 'AUTO_APPROVED' : 'REJECTED';
}

/** The effective verifier outcome the settlement route acts on. */
export interface VerificationOutcome {
  success: boolean;
  requiresManualReview: boolean;
  reason: string;
}

/**
 * Fold a proximity result into the verifier outcome DECLARATIVELY — the caller
 * assigns the return value instead of mutating verification state ad hoc. A
 * REVIEW proximity result forces manual review (uncertain location can never
 * auto-approve) and annotates the reason. INSIDE / null leave the base outcome
 * unchanged; REJECT is handled by the caller as a terminal transition, so it is
 * intentionally not collapsed here. Pure.
 */
export function applyProximityGate(
  base: VerificationOutcome,
  proximity: ProximityResult | null,
): VerificationOutcome {
  if (proximity && proximity.decision === 'REVIEW' && !base.requiresManualReview) {
    return {
      success: false,
      requiresManualReview: true,
      reason: `${base.reason} Location needs review: ${proximity.reason}`,
    };
  }
  return base;
}

export function evaluateProximity(input: ProximityInput): ProximityResult {
  const maxAgeMs = input.maxAgeMs ?? MAX_LOCATION_AGE_MS;
  const maxAccuracyM = input.maxAccuracyM ?? MAX_ACCURACY_M;

  if (!input.hasSubmittedLocation) {
    return review('MISSING_LOCATION', 'No device location was submitted with this nearby proof.');
  }
  if (!input.coordsValid) {
    return review('INVALID_LOCATION', 'Submitted coordinates are invalid.');
  }
  // Freshness. Guard against an Invalid Date (getTime() → NaN, where NaN > max is
  // false and would leak through as "fresh") and against a forged FUTURE capture
  // (negative age, also not > max). Age must be finite and within
  // [-MAX_CLOCK_SKEW_MS, maxAgeMs]; anything else fails closed to review.
  const capturedMs = input.capturedAt ? input.capturedAt.getTime() : NaN;
  if (!Number.isFinite(capturedMs)) {
    return review('STALE_LOCATION', 'Submitted location is missing or has an unparseable capture time.');
  }
  const ageMs = input.receivedAt.getTime() - capturedMs;
  if (ageMs > maxAgeMs) {
    return review('STALE_LOCATION', 'Submitted location capture time is too old.');
  }
  if (ageMs < -MAX_CLOCK_SKEW_MS) {
    return review('STALE_LOCATION', 'Submitted location capture time is in the future beyond allowed clock skew.');
  }
  // Accuracy must be a finite, non-negative meter reading within the trust bound.
  // A negative accuracy is nonsensical device data and fails closed.
  if (
    input.accuracyM == null ||
    !Number.isFinite(input.accuracyM) ||
    input.accuracyM < 0 ||
    input.accuracyM > maxAccuracyM
  ) {
    return review('LOW_ACCURACY', `Location accuracy is missing, negative, or worse than ${maxAccuracyM}m.`);
  }
  if (input.distanceKm == null || !Number.isFinite(input.distanceKm)) {
    return review('MISSING_LOCATION', 'Distance to the dare could not be computed.');
  }

  if (input.distanceKm <= input.radiusKm) {
    return {
      decision: 'INSIDE',
      code: 'INSIDE_RADIUS',
      reason: `Within ${input.radiusKm}km of the dare (${input.distanceKm.toFixed(2)}km).`,
      distanceKm: input.distanceKm,
      gatePassed: true,
    };
  }

  // Outside the radius. Give the device's own accuracy the benefit of the doubt:
  // only REJECT when it is outside even after subtracting the error margin;
  // otherwise it is borderline and must go to human review, never auto-approve.
  const accuracyKm = input.accuracyM / 1000;
  if (input.distanceKm - accuracyKm > input.radiusKm) {
    return {
      decision: 'REJECT',
      code: 'OUT_OF_RADIUS',
      reason: `Location is ${input.distanceKm.toFixed(2)}km away — outside the ${input.radiusKm}km radius even allowing for reported accuracy.`,
      distanceKm: input.distanceKm,
      gatePassed: false,
    };
  }

  return review(
    'BORDERLINE',
    `Location is ${input.distanceKm.toFixed(2)}km away — just outside the ${input.radiusKm}km radius within the accuracy margin.`,
    input.distanceKm,
  );
}
