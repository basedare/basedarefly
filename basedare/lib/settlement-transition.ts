// Deterministic settlement-transition policy for the verify-proof money rail.
//
// Pure and dependency-free so the compare-and-set predicates that guard real
// USDC payout live in ONE tested place. The route does the actual Prisma
// updateMany; this module only decides WHICH statuses may legally enter a
// settlement and derives the idempotency key. Fail-closed posture: a status the
// module does not explicitly allow can never acquire the settlement slot.

/**
 * The status a request writes to CLAIM the settlement slot before calling the
 * on-chain payout. We reuse the existing in-flight status (rather than inventing
 * a new one) so the retry-payouts cron already recovers a request that dies
 * mid-settlement — no separate stale-lock sweeper is needed.
 */
export const SETTLEMENT_LOCK_STATUS = 'PENDING_PAYOUT';

/** The status a request writes to route a proof into human review. */
export const REVIEW_STATUS = 'PENDING_REVIEW';

/**
 * Statuses from which the payout-fallback may still write. It deliberately
 * EXCLUDES every terminal state (VERIFIED, FAILED, SETTLED, REFUNDED, ...): once
 * a settlement has finalized, a late/duplicate fallback must NEVER overwrite it
 * back to PENDING_PAYOUT (which would let the cron re-trigger a second payout).
 */
export const FALLBACK_CAS_STATES = ['PENDING_PAYOUT'] as const;

export type ProofRouteOutcome = 'REJECT' | 'REVIEW' | 'SETTLE' | 'FAIL';

/**
 * Decide the single database transition a proof attempt must claim before any
 * notification or chain side effect. Priority is deliberately fail-closed:
 * proximity rejection wins, every review signal (including paid missions) wins
 * over auto-approval, and settlement requires both verifier success and the
 * confidence threshold.
 */
export function deriveProofRouteOutcome(input: {
  proximityDecision?: string | null;
  requiresManualReview: boolean;
  paidMission: boolean;
  verificationSuccess: boolean;
  verificationConfidence: number;
  autoApproveConfidence: number;
}): ProofRouteOutcome {
  if (input.proximityDecision === 'REJECT') return 'REJECT';
  if (input.requiresManualReview || input.paidMission) return 'REVIEW';
  if (
    input.verificationSuccess &&
    Number.isFinite(input.verificationConfidence) &&
    input.verificationConfidence > input.autoApproveConfidence
  ) {
    return 'SETTLE';
  }
  return 'FAIL';
}

/** Minimal dare shape needed to decide settlement eligibility. */
export interface SettlementDareSnapshot {
  appealStatus?: string | null;
}

/**
 * The statuses from which a proof submission may legally begin settlement.
 * Normally a proof is submitted while the dare is PENDING. A FAILED dare is only
 * re-settleable when it is under an active appeal (appealStatus === 'PENDING'),
 * mirroring the route's own re-verify gate.
 */
export function preSettleStates(dare: SettlementDareSnapshot): string[] {
  return dare.appealStatus === 'PENDING' ? ['PENDING', 'FAILED'] : ['PENDING'];
}

/** Whether an observed current status may acquire the settlement slot. */
export function canAcquireSettlement(currentStatus: string, dare: SettlementDareSnapshot): boolean {
  return preSettleStates(dare).includes(currentStatus);
}

/**
 * Stable idempotency key for one (dare, media) pair. Keyed on the STABLE media
 * identity (Pinata CID or gateway URL, written once at upload) — NOT on
 * verification.proofHash, which is time-salted and differs every request.
 *
 * Returns null when no media is attached: the DB unique index treats NULLs as
 * distinct, so no-media attempts never collide (they are rejected upstream by
 * the media check anyway). When media exists, the same media re-submitted to the
 * same dare yields the same key → the unique index blocks the replay.
 */
export function buildSubmissionKey(
  dareId: string,
  mediaIdentity: string | null | undefined,
): string | null {
  const media = typeof mediaIdentity === 'string' && mediaIdentity.trim().length > 0
    ? mediaIdentity.trim()
    : null;
  return media ? `${dareId}:${media}` : null;
}
