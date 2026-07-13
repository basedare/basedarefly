/**
 * Settlement and community-pool helpers.
 *
 * Canonical money split:
 * - personal/self-serve dare: 96% completer, 4% BaseDare, 0% referral;
 * - managed business work: fixed service fee + separately funded reward pool;
 * - no part of the V2 settlement fee is promised to a Live Pot.
 *
 * See `docs/FINANCIAL_CANON.md` and `lib/financial-canon.ts`.
 */

import {
  MANAGED_FIELD_SPRINT,
  SETTLEMENT_SPLIT,
  calculateSuccessfulSettlement,
} from '@/lib/financial-canon';

// ============================================================================
// FEE CONFIGURATION
// ============================================================================

export const FEE_CONFIG = {
  // Matches BaseDareBountyV2 on-chain. The full 4% reaches the platform wallet.
  P2P: {
    totalFeePercent: SETTLEMENT_SPLIT.platformPercent,
    platformWalletPercent: SETTLEMENT_SPLIT.platformPercent,
    livePotPercent: SETTLEMENT_SPLIT.livePotPercent,
    creatorPercent: SETTLEMENT_SPLIT.completerPercent,
    referralPercent: SETTLEMENT_SPLIT.referralPercent,
  },

  // Managed delivery is invoiced separately. It is not a 30% bounty split.
  B2B: {
    model: 'FIXED_MANAGED_SERVICE',
    packageName: MANAGED_FIELD_SPRINT.name,
    invoiceTotalUsd: MANAGED_FIELD_SPRINT.invoiceTotalUsd,
    serviceFeeUsd: MANAGED_FIELD_SPRINT.serviceFeeUsd,
    grossRewardPoolUsd: MANAGED_FIELD_SPRINT.grossRewardPoolUsd,
    additionalCampaignRakePercent: 0,
  },

  // Sunder (Slashing for fake proofs)
  SUNDER: {
    livePotPercent: 100,    // 100% of stake goes to pot
  },

  // Weekly Rewards Distribution
  WEEKLY_REWARDS: {
    potDistributionPercent: 5,  // 5% of pot distributed weekly
    topCreatorCount: 3,         // Top 3 creators
    topScoutCount: 3,           // Top 3 scouts
    // Distribution among top 3: 50%, 30%, 20%
    rankDistribution: [0.5, 0.3, 0.2],
  },
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface P2PSettlement {
  totalAmount: number;
  creatorPayout: number;
  platformFeeAmount: number;
  livePotAmount: number;
  referrerAmount: number;
}

export interface SunderSettlement {
  stakedAmount: number;
  livePotAmount: number;
}

export interface WeeklyRewardDistribution {
  potBalanceBefore: number;
  distributionAmount: number;
  potBalanceAfter: number;
  creatorRewards: Array<{
    address: string;
    rank: number;
    amount: number;
    volume: number;
  }>;
  scoutRewards: Array<{
    address: string;
    rank: number;
    amount: number;
    creatorsRecruited: number;
  }>;
}

// ============================================================================
// FEE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate P2P Dare Settlement
 * Total Fee: 4% to BaseDare
 * Creator: 96%
 */
export function calculateP2PSettlement(
  totalAmount: number,
  _hasReferrer: boolean = false
): P2PSettlement {
  void _hasReferrer; // Kept for legacy callers; V2 never pays a referrer.
  const settlement = calculateSuccessfulSettlement(totalAmount);

  return {
    totalAmount,
    creatorPayout: settlement.completerPayoutUsd,
    platformFeeAmount: settlement.platformFeeUsd,
    livePotAmount: settlement.livePotContributionUsd,
    referrerAmount: settlement.referralFeeUsd,
  };
}

/**
 * Calculate Sunder (Slashing) Settlement
 * 100% of stake goes to Live Pot
 */
export function calculateSunderSettlement(stakedAmount: number): SunderSettlement {
  return {
    stakedAmount,
    livePotAmount: stakedAmount, // 100% to pot
  };
}

/**
 * Calculate Weekly Reward Distribution
 * Distributes 5% of pot to top performers
 */
export function calculateWeeklyRewards(
  potBalance: number,
  topCreators: Array<{ address: string; volume: number }>,
  topScouts: Array<{ address: string; creatorsRecruited: number }>
): WeeklyRewardDistribution {
  const { potDistributionPercent, rankDistribution } = FEE_CONFIG.WEEKLY_REWARDS;

  const distributionAmount = potBalance * (potDistributionPercent / 100);
  const halfDistribution = distributionAmount / 2; // 50% creators, 50% scouts

  // Calculate creator rewards
  const creatorRewards = topCreators.slice(0, 3).map((creator, index) => ({
    address: creator.address,
    rank: index + 1,
    amount: halfDistribution * rankDistribution[index],
    volume: creator.volume,
  }));

  // Calculate scout rewards
  const scoutRewards = topScouts.slice(0, 3).map((scout, index) => ({
    address: scout.address,
    rank: index + 1,
    amount: halfDistribution * rankDistribution[index],
    creatorsRecruited: scout.creatorsRecruited,
  }));

  return {
    potBalanceBefore: potBalance,
    distributionAmount,
    potBalanceAfter: potBalance - distributionAmount,
    creatorRewards,
    scoutRewards,
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that settlement amounts sum correctly
 */
export function validateP2PSettlement(settlement: P2PSettlement): boolean {
  const sum =
    settlement.creatorPayout +
    settlement.platformFeeAmount +
    settlement.livePotAmount +
    settlement.referrerAmount;

  // Allow for small floating point differences
  return Math.abs(sum - settlement.totalAmount) < 0.01;
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format settlement for logging/display
 */
export function formatP2PSettlement(settlement: P2PSettlement): string {
  return `
P2P Settlement ($${settlement.totalAmount.toFixed(2)}):
  Creator:    $${settlement.creatorPayout.toFixed(2)} (96%)
  BaseDare:   $${settlement.platformFeeAmount.toFixed(2)} (4%)
  Live Pot:   $${settlement.livePotAmount.toFixed(2)} (0%)
  Referrer:   $${settlement.referrerAmount.toFixed(2)} (0%)
`.trim();
}

/**
 * Get fee summary for UI display
 */
export function getFeeSummary(mode: 'P2P' | 'B2B'): {
  totalFee: string;
  breakdown: Array<{ label: string; percent: number; description: string }>;
} {
  if (mode === 'P2P') {
    return {
      totalFee: '4%',
      breakdown: [
        { label: 'Creator', percent: 96, description: 'Direct to performer' },
        { label: 'BaseDare', percent: 4, description: 'Settlement and liquidity rail' },
      ],
    };
  }

  return {
    totalFee: `$${MANAGED_FIELD_SPRINT.serviceFeeUsd.toLocaleString()} service fee`,
    breakdown: [
      { label: 'Creator settlement', percent: 96, description: 'Of each funded reward' },
      { label: 'Settlement fee', percent: 4, description: 'Of each successful funded reward' },
    ],
  };
}
