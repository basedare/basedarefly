/**
 * Scout rake engine — slice 1 (spec: docs/specs/scout-engine.md).
 *
 * PURE, READ-ONLY. Wired to nothing yet. Computes how a settled B2B venue
 * payment splits into scout commission, and decides monthly whether the active
 * scout keeps their (reassignable) active rake. The accrual/cron/endpoints that
 * persist this come later, behind a migration.
 *
 * Funding: scout comp is carved from the FAT B2B margin (venue/brand spend) —
 * never the thin 4% creator-dare fee.
 *
 * Split: discovery 25% (permanent — sourced it) + active 75% (ongoing — must
 * keep delivering). "Own it as long as you keep it alive," not forever.
 */

export const SCOUT_RAKE_CONFIG = {
  /** Share of a settled B2B venue payment allocated to scout commission. */
  commissionRate: 0.2,
  /** Split of that commission between the two roles (must sum to 1). */
  discoveryShare: 0.25, // permanent — credit for sourcing the venue
  activeShare: 0.75, // ongoing — requires continued verified delivery
  /** Monthly gate for an active scout to RETAIN active rake on a venue. */
  activeRetention: {
    minVerifiedLoopsPerMonth: 4, // verified check-ins / approved proofs / settled loops
    graceMonths: 1, // one slow month forgiven before active rake opens up
  },
  /** Rake vests after this delay; clawed back if the payment reverses. */
  vestDays: 14,
} as const;

export type ScoutRakeSplit = {
  /** Total scout commission carved from the payment. */
  commission: number;
  /** Paid to the discovery scout (0 if unassigned — returns to platform). */
  discoveryAmount: number;
  /** Paid to the active scout (0 if unassigned/lapsed — returns to platform). */
  activeAmount: number;
  /** Portion retained by the platform (unassigned roles + the non-commission remainder). */
  platformAmount: number;
};

function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

/**
 * Carve scout commission from a single settled B2B payment and split it
 * discovery/active. Unassigned roles are NOT paid out — that share stays with
 * the platform (never invented or double-paid).
 */
export function computeScoutRake(
  b2bAmount: number,
  opts: { hasDiscoveryScout?: boolean; hasActiveScout?: boolean } = {},
): ScoutRakeSplit {
  const amount = Math.max(0, Number.isFinite(b2bAmount) ? b2bAmount : 0);
  const commission = round2(amount * SCOUT_RAKE_CONFIG.commissionRate);

  const hasDiscovery = opts.hasDiscoveryScout ?? true;
  const hasActive = opts.hasActiveScout ?? true;

  const discoveryAmount = hasDiscovery ? round2(commission * SCOUT_RAKE_CONFIG.discoveryShare) : 0;
  const activeAmount = hasActive ? round2(commission * SCOUT_RAKE_CONFIG.activeShare) : 0;
  const platformAmount = round2(amount - discoveryAmount - activeAmount);

  return { commission, discoveryAmount, activeAmount, platformAmount };
}

export type ActiveRakeEvaluation = {
  /** Active scout keeps the venue's active rake next cycle. */
  retained: boolean;
  /** Active rake opens up for another scout (or the platform) to claim. */
  reassignable: boolean;
  reason: string;
};

/**
 * Monthly: does the active scout keep the venue's active rake? Discovery rake is
 * permanent and unaffected by this.
 */
export function evaluateActiveRakeEligibility(input: {
  verifiedLoopsThisMonth: number;
  /** Consecutive months below threshold, counting this one if it's slow. */
  consecutiveSlowMonths: number;
  venueStillPaying: boolean;
}): ActiveRakeEvaluation {
  const cfg = SCOUT_RAKE_CONFIG.activeRetention;

  if (!input.venueStillPaying) {
    return { retained: false, reassignable: false, reason: 'Venue is no longer paying — no active rake to assign.' };
  }
  if (input.verifiedLoopsThisMonth >= cfg.minVerifiedLoopsPerMonth) {
    return { retained: true, reassignable: false, reason: 'Met the monthly verified-loop threshold.' };
  }
  if (input.consecutiveSlowMonths <= cfg.graceMonths) {
    return { retained: true, reassignable: false, reason: 'Below threshold but within the grace period.' };
  }
  return {
    retained: false,
    reassignable: true,
    reason: 'Below threshold beyond grace — active rake opens for reassignment.',
  };
}
