/**
 * Campaign Payout Calculations
 *
 * Handles sync window logic and multiplier calculations for B2B campaigns.
 *
 * Tier-based sync rules:
 * - SIP_MENTION: 7 days window, no bonus
 * - SIP_SHILL: 24 hours window, no bonus
 * - CHALLENGE: 2 hours window, 1.3x strike bonus (±10min)
 * - APEX: 1 hour window, 1.5x strike bonus (±5min)
 */

export interface SyncConfig {
  syncTime: Date | null;
  windowHours: number;
  strikeWindowMinutes: number;
  precisionMultiplier: number;
}

export interface PayoutResult {
  basePayout: number;
  precisionBonus: number;
  totalPayout: number;
  withinBroadWindow: boolean;
  withinStrikeWindow: boolean;
  minutesFromTarget: number | null;
  status: 'ON_TIME' | 'STRIKE_BONUS' | 'LATE' | 'FORFEITED';
}

export interface RakeBreakdown {
  creatorPayout: number;
  discoveryRake: number;  // 0.5% to discovery scout
  activeRake: number;     // 0.5% to active scout
  platformRake: number;   // Campaign rake %
  grossTotal: number;
}

/**
 * Calculate payout based on submission time relative to sync target
 */
export function calculatePayout(
  submittedAt: Date,
  basePayoutAmount: number,
  config: SyncConfig
): PayoutResult {
  // No sync time = no timing requirements, full base payout
  if (!config.syncTime) {
    return {
      basePayout: basePayoutAmount,
      precisionBonus: 0,
      totalPayout: basePayoutAmount,
      withinBroadWindow: true,
      withinStrikeWindow: false,
      minutesFromTarget: null,
      status: 'ON_TIME',
    };
  }

  const targetTime = config.syncTime.getTime();
  const submissionTime = submittedAt.getTime();

  // Calculate time difference in minutes
  const diffMs = submissionTime - targetTime;
  const diffMinutes = Math.abs(diffMs) / (1000 * 60);

  // Calculate window boundaries
  const broadWindowMs = config.windowHours * 60 * 60 * 1000;
  const strikeWindowMs = config.strikeWindowMinutes * 60 * 1000;

  // Broad window: submission must be within windowHours of target
  // For a 2-hour window centered on target: ±1 hour
  const halfBroadWindow = broadWindowMs / 2;
  const withinBroadWindow = Math.abs(diffMs) <= halfBroadWindow;

  // Strike window: submission must be within strikeWindowMinutes of target
  const withinStrikeWindow = Math.abs(diffMs) <= strikeWindowMs;

  // If outside broad window, forfeit
  if (!withinBroadWindow) {
    return {
      basePayout: 0,
      precisionBonus: 0,
      totalPayout: 0,
      withinBroadWindow: false,
      withinStrikeWindow: false,
      minutesFromTarget: Math.round(diffMinutes),
      status: 'FORFEITED',
    };
  }

  // Within broad window, calculate payout
  let precisionBonus = 0;
  let status: PayoutResult['status'] = 'ON_TIME';

  if (withinStrikeWindow && config.precisionMultiplier > 1) {
    // Strike bonus: (multiplier - 1) * base
    // e.g., 1.3x multiplier = 0.3 * base bonus
    precisionBonus = basePayoutAmount * (config.precisionMultiplier - 1);
    status = 'STRIKE_BONUS';
  } else if (!withinStrikeWindow && config.strikeWindowMinutes > 0) {
    // Within broad but outside strike - still gets base, marked as late
    status = 'LATE';
  }

  return {
    basePayout: basePayoutAmount,
    precisionBonus,
    totalPayout: basePayoutAmount + precisionBonus,
    withinBroadWindow,
    withinStrikeWindow,
    minutesFromTarget: Math.round(diffMinutes),
    status,
  };
}

/**
 * Calculate rake breakdown for a payout
 *
 * Split rake model:
 * - Discovery Scout: 0.5% permanent
 * - Active Scout: 0.5% for placement
 * - Platform: Campaign rake % (25-35%)
 */
export function calculateRakeBreakdown(
  totalPayout: number,
  platformRakePercent: number
): RakeBreakdown {
  const DISCOVERY_RAKE_PERCENT = 0.5;
  const ACTIVE_RAKE_PERCENT = 0.5;

  // Scout rakes are on top of creator payout
  const discoveryRake = totalPayout * (DISCOVERY_RAKE_PERCENT / 100);
  const activeRake = totalPayout * (ACTIVE_RAKE_PERCENT / 100);

  // Platform rake is on the gross (payout + scout rakes)
  const payoutPlusScoutRakes = totalPayout + discoveryRake + activeRake;
  const platformRake = payoutPlusScoutRakes * (platformRakePercent / 100);

  return {
    creatorPayout: totalPayout,
    discoveryRake,
    activeRake,
    platformRake,
    grossTotal: payoutPlusScoutRakes + platformRake,
  };
}

/**
 * Get sync status description for UI
 */
export function getSyncStatusMessage(result: PayoutResult): string {
  switch (result.status) {
    case 'STRIKE_BONUS':
      return `🎯 Strike Bonus! Posted within ${result.minutesFromTarget} minutes of target`;
    case 'ON_TIME':
      return result.minutesFromTarget !== null
        ? `✓ On time (${result.minutesFromTarget} min from target)`
        : '✓ Submitted successfully';
    case 'LATE':
      return `⏰ Late submission (${result.minutesFromTarget} min from target) - base payout only`;
    case 'FORFEITED':
      return `❌ Outside submission window (${result.minutesFromTarget} min late) - forfeited`;
    default:
      return 'Unknown status';
  }
}

/**
 * Check if a campaign slot can still be submitted
 */
export function canSubmitSlot(
  syncTime: Date | null,
  windowHours: number,
  now: Date = new Date()
): { canSubmit: boolean; reason?: string; timeRemaining?: number } {
  if (!syncTime) {
    return { canSubmit: true };
  }

  const targetTime = syncTime.getTime();
  const currentTime = now.getTime();
  const halfWindow = (windowHours * 60 * 60 * 1000) / 2;

  // Window hasn't opened yet
  if (currentTime < targetTime - halfWindow) {
    const msUntilOpen = (targetTime - halfWindow) - currentTime;
    return {
      canSubmit: false,
      reason: 'Submission window not yet open',
      timeRemaining: msUntilOpen,
    };
  }

  // Window has closed
  if (currentTime > targetTime + halfWindow) {
    return {
      canSubmit: false,
      reason: 'Submission window has closed',
    };
  }

  // Within window
  const msRemaining = (targetTime + halfWindow) - currentTime;
  return {
    canSubmit: true,
    timeRemaining: msRemaining,
  };
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Closed';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}
