/**
 * Fee Splitter - Live Pot (Sunder Pool) Logic
 *
 * The Live Pot is BaseDare's Progressive Jackpot / Community War Chest.
 * Every transaction feeds the pot, creating a global marketing event.
 *
 * Fee Structure:
 * - P2P Dares: 10% total fee (5% Dev, 5% Pot)
 * - Control Mode (B2B): 30% total fee (1% Scout, 19% Dev, 10% Pot)
 * - Sunder (Slashing): 100% to Live Pot
 *
 * Pot Outflows:
 * - Weekly Leaderboard rewards (top creators/scouts)
 * - Legendary Dare subsidies (community voted)
 */

// ============================================================================
// FEE CONFIGURATION
// ============================================================================

export const FEE_CONFIG = {
  // P2P Dare Settlement (Consumer)
  P2P: {
    totalFeePercent: 10,
    devWalletPercent: 5,    // 5% of total amount
    livePotPercent: 5,      // 5% of total amount
    creatorPercent: 90,     // 90% of total amount
  },

  // Control Mode (B2B Brand Campaigns)
  B2B: {
    totalFeePercent: 30,
    scoutRakePercent: 1,    // 1% to scout (referral)
    devWalletPercent: 19,   // 19% to dev wallet
    livePotPercent: 10,     // 10% to live pot
    creatorPercent: 70,     // 70% to creator
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
  devWalletAmount: number;
  livePotAmount: number;
  referrerAmount: number;  // Optional 1% referrer
}

export interface B2BSettlement {
  totalAmount: number;
  creatorPayout: number;
  scoutRake: number;
  devWalletAmount: number;
  livePotAmount: number;
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
 * Total Fee: 10% (5% Dev, 5% Pot)
 * Creator: 90%
 */
export function calculateP2PSettlement(
  totalAmount: number,
  hasReferrer: boolean = false
): P2PSettlement {
  const { devWalletPercent, livePotPercent, creatorPercent } = FEE_CONFIG.P2P;

  // If referrer exists, they get 1% from the creator's share
  const referrerPercent = hasReferrer ? 1 : 0;
  const adjustedCreatorPercent = creatorPercent - referrerPercent;

  return {
    totalAmount,
    creatorPayout: totalAmount * (adjustedCreatorPercent / 100),
    devWalletAmount: totalAmount * (devWalletPercent / 100),
    livePotAmount: totalAmount * (livePotPercent / 100),
    referrerAmount: totalAmount * (referrerPercent / 100),
  };
}

/**
 * Calculate B2B Campaign Settlement
 * Total Fee: 30% (1% Scout, 19% Dev, 10% Pot)
 * Creator: 70%
 */
export function calculateB2BSettlement(
  totalAmount: number,
  hasScout: boolean = true
): B2BSettlement {
  const { scoutRakePercent, devWalletPercent, livePotPercent, creatorPercent } = FEE_CONFIG.B2B;

  // If no scout, their 1% goes to dev wallet
  const actualScoutRake = hasScout ? scoutRakePercent : 0;
  const actualDevPercent = hasScout ? devWalletPercent : devWalletPercent + scoutRakePercent;

  return {
    totalAmount,
    creatorPayout: totalAmount * (creatorPercent / 100),
    scoutRake: totalAmount * (actualScoutRake / 100),
    devWalletAmount: totalAmount * (actualDevPercent / 100),
    livePotAmount: totalAmount * (livePotPercent / 100),
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
    settlement.devWalletAmount +
    settlement.livePotAmount +
    settlement.referrerAmount;

  // Allow for small floating point differences
  return Math.abs(sum - settlement.totalAmount) < 0.01;
}

/**
 * Validate B2B settlement amounts
 */
export function validateB2BSettlement(settlement: B2BSettlement): boolean {
  const sum =
    settlement.creatorPayout +
    settlement.scoutRake +
    settlement.devWalletAmount +
    settlement.livePotAmount;

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
  Creator:    $${settlement.creatorPayout.toFixed(2)} (90%)
  Dev Wallet: $${settlement.devWalletAmount.toFixed(2)} (5%)
  Live Pot:   $${settlement.livePotAmount.toFixed(2)} (5%)
  Referrer:   $${settlement.referrerAmount.toFixed(2)} (${settlement.referrerAmount > 0 ? '1%' : '0%'})
`.trim();
}

/**
 * Format B2B settlement for logging/display
 */
export function formatB2BSettlement(settlement: B2BSettlement): string {
  return `
B2B Settlement ($${settlement.totalAmount.toFixed(2)}):
  Creator:    $${settlement.creatorPayout.toFixed(2)} (70%)
  Scout Rake: $${settlement.scoutRake.toFixed(2)} (1%)
  Dev Wallet: $${settlement.devWalletAmount.toFixed(2)} (19%)
  Live Pot:   $${settlement.livePotAmount.toFixed(2)} (10%)
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
      totalFee: '10%',
      breakdown: [
        { label: 'Creator', percent: 90, description: 'Direct to performer' },
        { label: 'Dev Ops', percent: 5, description: 'Platform operations' },
        { label: 'Live Pot', percent: 5, description: 'Community treasury' },
      ],
    };
  }

  return {
    totalFee: '30%',
    breakdown: [
      { label: 'Creator', percent: 70, description: 'Direct to performer' },
      { label: 'Dev Ops', percent: 19, description: 'Platform operations' },
      { label: 'Live Pot', percent: 10, description: 'Community treasury' },
      { label: 'Scout', percent: 1, description: 'Referral rake' },
    ],
  };
}
