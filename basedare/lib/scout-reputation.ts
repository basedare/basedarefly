/**
 * Scout Reputation System
 *
 * Reputation determines:
 * - Auto-accept threshold (rep >= 70 = claims auto-accepted)
 * - Tier progression (BLOODHOUND → ARBITER → ARCHON)
 * - Visibility to brands in slot claims
 *
 * Score Formula:
 * - Base: 50 points (new scout)
 * - Success Rate: +40 points max (100% success = +40)
 * - Campaign Volume: +10 points max (100+ campaigns = +10)
 * - Penalties: -5 per failed slot (up to -20)
 */

export interface ScoutStats {
  successfulSlots: number;
  failedSlots: number;
  totalCampaigns: number;
  totalDiscoveryRake: number;
  totalActiveRake: number;
}

export interface ReputationResult {
  score: number;
  tier: 'BLOODHOUND' | 'ARBITER' | 'ARCHON';
  autoAccept: boolean;
  breakdown: {
    base: number;
    successRateBonus: number;
    volumeBonus: number;
    failurePenalty: number;
  };
  nextTier: {
    name: string;
    campaignsNeeded: number;
  } | null;
}

/**
 * Calculate scout reputation score
 */
export function calculateReputation(stats: ScoutStats): ReputationResult {
  const BASE_SCORE = 50;
  const MAX_SUCCESS_BONUS = 40;
  const MAX_VOLUME_BONUS = 10;
  const FAILURE_PENALTY = 5;
  const MAX_PENALTY = 20;

  // Success rate bonus (0-40 points)
  const totalSlots = stats.successfulSlots + stats.failedSlots;
  let successRateBonus = 0;
  if (totalSlots > 0) {
    const successRate = stats.successfulSlots / totalSlots;
    successRateBonus = Math.round(successRate * MAX_SUCCESS_BONUS);
  }

  // Volume bonus (0-10 points, scales with campaigns)
  // 0 campaigns = 0, 50 campaigns = 5, 100+ campaigns = 10
  const volumeBonus = Math.min(MAX_VOLUME_BONUS, Math.floor(stats.totalCampaigns / 10));

  // Failure penalty (-5 per fail, max -20)
  const failurePenalty = Math.min(MAX_PENALTY, stats.failedSlots * FAILURE_PENALTY);

  // Calculate final score (clamped 0-100)
  const rawScore = BASE_SCORE + successRateBonus + volumeBonus - failurePenalty;
  const score = Math.max(0, Math.min(100, rawScore));

  // Determine tier
  const tier = calculateTier(stats.totalCampaigns);

  // Auto-accept threshold
  const autoAccept = score >= 70;

  // Next tier info
  const nextTier = getNextTierInfo(stats.totalCampaigns, tier);

  return {
    score,
    tier,
    autoAccept,
    breakdown: {
      base: BASE_SCORE,
      successRateBonus,
      volumeBonus,
      failurePenalty: -failurePenalty,
    },
    nextTier,
  };
}

/**
 * Calculate tier based on campaign count
 */
export function calculateTier(totalCampaigns: number): 'BLOODHOUND' | 'ARBITER' | 'ARCHON' {
  if (totalCampaigns >= 100) return 'ARCHON';
  if (totalCampaigns >= 25) return 'ARBITER';
  return 'BLOODHOUND';
}

/**
 * Get info about next tier
 */
function getNextTierInfo(
  currentCampaigns: number,
  currentTier: string
): { name: string; campaignsNeeded: number } | null {
  if (currentTier === 'ARCHON') return null;

  if (currentTier === 'BLOODHOUND') {
    return {
      name: 'ARBITER',
      campaignsNeeded: 25 - currentCampaigns,
    };
  }

  return {
    name: 'ARCHON',
    campaignsNeeded: 100 - currentCampaigns,
  };
}

/**
 * Get tier badge/emoji
 */
export function getTierBadge(tier: string): string {
  switch (tier) {
    case 'ARCHON':
      return '👑';
    case 'ARBITER':
      return '⚖️';
    case 'BLOODHOUND':
    default:
      return '🐕';
  }
}

/**
 * Get tier color gradient
 */
export function getTierColor(tier: string): string {
  switch (tier) {
    case 'ARCHON':
      return 'from-purple-500 to-pink-500';
    case 'ARBITER':
      return 'from-blue-500 to-cyan-500';
    case 'BLOODHOUND':
    default:
      return 'from-zinc-500 to-zinc-600';
  }
}

/**
 * Get reputation level description
 */
export function getReputationLevel(score: number): {
  level: string;
  description: string;
  color: string;
} {
  if (score >= 90) {
    return {
      level: 'Elite',
      description: 'Top performer with exceptional track record',
      color: 'text-yellow-400',
    };
  }
  if (score >= 70) {
    return {
      level: 'Trusted',
      description: 'Claims auto-accepted by brands',
      color: 'text-green-400',
    };
  }
  if (score >= 50) {
    return {
      level: 'Established',
      description: 'Building reputation through successful campaigns',
      color: 'text-blue-400',
    };
  }
  if (score >= 30) {
    return {
      level: 'Rising',
      description: 'New scout working to prove themselves',
      color: 'text-zinc-400',
    };
  }
  return {
    level: 'Probation',
    description: 'Low reputation - focus on successful completions',
    color: 'text-red-400',
  };
}

/**
 * Check if scout binding is at risk of decay
 */
export function checkBindingDecay(
  lastActiveAt: Date,
  decayDays: number = 90,
  warningDays: number = 14
): {
  isActive: boolean;
  daysUntilDecay: number;
  warningActive: boolean;
} {
  const now = Date.now();
  const lastActive = lastActiveAt.getTime();
  const daysSinceActive = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
  const daysUntilDecay = decayDays - daysSinceActive;

  return {
    isActive: daysSinceActive < decayDays,
    daysUntilDecay: Math.max(0, daysUntilDecay),
    warningActive: daysUntilDecay <= warningDays && daysUntilDecay > 0,
  };
}

/**
 * Process binding decay - called by scheduled job
 */
export async function processBindingDecay(
  prisma: typeof import('@/lib/prisma').prisma
): Promise<{ processed: number; unbound: number }> {
  const DECAY_DAYS = 90;
  const decayCutoff = new Date(Date.now() - DECAY_DAYS * 24 * 60 * 60 * 1000);

  // Find all bindings that should decay
  const staleBindings = await prisma.scoutCreator.findMany({
    where: {
      bindingStatus: 'BOUND',
      lastActiveAt: { lt: decayCutoff },
    },
  });

  // Mark them as unbound
  if (staleBindings.length > 0) {
    await prisma.scoutCreator.updateMany({
      where: {
        id: { in: staleBindings.map((b) => b.id) },
      },
      data: {
        bindingStatus: 'UNBOUND',
        activeScoutId: null,
      },
    });
  }

  console.log(
    `[DECAY] Processed ${staleBindings.length} bindings, ${staleBindings.length} unbound`
  );

  return {
    processed: staleBindings.length,
    unbound: staleBindings.length,
  };
}
