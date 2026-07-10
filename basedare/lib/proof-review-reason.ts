// Pure composer for the reviewer-facing manual-review reason (Dare.appealReason).
//
// A proof can land in the review queue for several independent reasons — sentinel
// requested, paid venue/brand mission, high-value bounty, and/or a proximity gate
// that could not confirm the device was inside the radius. The old code persisted
// only a single generic money-clause and DROPPED the proximity detail, so a proof
// that was queued purely because it was 5.1km from a 5km radius showed the referee
// "High-value bounty requires manual verification" — inaccurate and useless.
//
// This composer keeps every applicable clause so the referee sees the real reason.
// Pure/dependency-free so it is unit-tested and cannot silently regress.

export interface ReviewReasonInput {
  /** True only when the proximity gate itself forced review (decision === 'REVIEW'). */
  proximityForcedReview: boolean;
  proximityCode: string | null;
  proximityReason: string | null;
  sentinelRequested: boolean;
  paidMission: boolean;
  highValue: boolean;
}

/**
 * Compose the persisted review reason. Includes the money/config clause (sentinel
 * > paid > high-value) AND appends the proximity clause when the gate co-flagged
 * the proof, so multi-trigger reviews surface every signal. Never fabricates a
 * proximity clause for a non-review (e.g. REJECT) proximity result — the caller
 * gates that via proximityForcedReview.
 */
export function composeReviewReason(input: ReviewReasonInput): string {
  const clauses: string[] = [];

  if (input.sentinelRequested) {
    clauses.push('Sentinel verification requested. Proof requires referee review.');
  } else if (input.paidMission) {
    clauses.push('Paid venue/brand mission requires referee review.');
  } else if (input.highValue) {
    clauses.push('High-value bounty requires manual verification.');
  }

  if (input.proximityForcedReview && input.proximityReason) {
    const code = input.proximityCode ?? 'REVIEW';
    clauses.push(`Proximity review [${code}]: ${input.proximityReason}`);
  }

  if (clauses.length === 0) {
    return 'Proof requires referee review.';
  }
  return clauses.join(' ');
}
