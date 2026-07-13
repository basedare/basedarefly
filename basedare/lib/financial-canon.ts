/**
 * BaseDare financial canon.
 *
 * Keep settlement economics separate from managed-service economics:
 * - the bounty contract moves reward money and takes a 4% success fee;
 * - the managed Field Sprint is sold and accounted for as a separate service.
 *
 * `docs/FINANCIAL_CANON.md` is the human-readable authority. These constants
 * are the executable mirror used by product and operations surfaces.
 */

export const SETTLEMENT_SPLIT = {
  completerPercent: 96,
  platformPercent: 4,
  referralPercent: 0,
  livePotPercent: 0,
} as const;

export const MANAGED_FIELD_SPRINT = {
  name: 'Verified Field Sprint',
  invoiceTotalUsd: 2_500,
  serviceFeeUsd: 2_000,
  grossRewardPoolUsd: 500,
  assignedContributorCount: 4,
  grossRewardPerContributorUsd: 125,
  netRewardPerContributorUsd: 120,
  platformFeePerContributorUsd: 5,
  durationDaysMin: 7,
  durationDaysMax: 10,
  directDeliveryCostCeilingUsd: 650,
  targetContributionProfitUsd: 1_370,
  maxDeliveryHours: 10,
} as const;

export const MANAGED_FIELD_SPRINT_ESCROW_STATUSES = [
  'PENDING',
  'AWAITING_CLAIM',
  'CLAIMED',
  'PENDING_REVIEW',
  'PENDING_PAYOUT',
] as const;

export const SELF_SERVE_BUSINESS_MISSION = {
  status: 'PARKED' as const,
  allInPlatformFeePercent: 25,
  settlementFeePercent: SETTLEMENT_SPLIT.platformPercent,
  productAndVerificationFeePercent: 21,
} as const;

export function roundUsd(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateSuccessfulSettlement(grossRewardUsd: number) {
  if (!Number.isFinite(grossRewardUsd) || grossRewardUsd < 0) {
    throw new Error('Gross reward must be a finite, non-negative amount.');
  }

  const platformFeeUsd = roundUsd(
    grossRewardUsd * (SETTLEMENT_SPLIT.platformPercent / 100),
  );

  return {
    grossRewardUsd: roundUsd(grossRewardUsd),
    completerPayoutUsd: roundUsd(grossRewardUsd - platformFeeUsd),
    platformFeeUsd,
    referralFeeUsd: 0,
    livePotContributionUsd: 0,
  };
}

export function getManagedFieldSprintEconomics(
  successfulContributors = MANAGED_FIELD_SPRINT.assignedContributorCount,
) {
  const settledContributors = Math.min(
    MANAGED_FIELD_SPRINT.assignedContributorCount,
    Math.max(0, Math.trunc(successfulContributors)),
  );
  const settlement = calculateSuccessfulSettlement(
    settledContributors * MANAGED_FIELD_SPRINT.grossRewardPerContributorUsd,
  );
  const companyRevenueUsd = roundUsd(
    MANAGED_FIELD_SPRINT.serviceFeeUsd + settlement.platformFeeUsd,
  );
  const contributionProfitAtCostCeilingUsd = roundUsd(
    companyRevenueUsd - MANAGED_FIELD_SPRINT.directDeliveryCostCeilingUsd,
  );

  return {
    ...settlement,
    invoiceTotalUsd: MANAGED_FIELD_SPRINT.invoiceTotalUsd,
    serviceFeeUsd: MANAGED_FIELD_SPRINT.serviceFeeUsd,
    fundedRewardPoolUsd: MANAGED_FIELD_SPRINT.grossRewardPoolUsd,
    settledContributors,
    companyRevenueUsd,
    contributionProfitAtCostCeilingUsd,
    contributionMarginAtCostCeilingPercent:
      companyRevenueUsd > 0
        ? roundUsd((contributionProfitAtCostCeilingUsd / companyRevenueUsd) * 100)
        : 0,
  };
}

export function hasValidManagedFieldSprintPaymentLines(input: {
  serviceRevenueUsd: unknown;
  rewardPoolUsd: unknown;
  designPartnerException: unknown;
}) {
  if (
    typeof input.serviceRevenueUsd !== 'number' ||
    !Number.isFinite(input.serviceRevenueUsd) ||
    input.serviceRevenueUsd < 0 ||
    input.serviceRevenueUsd > MANAGED_FIELD_SPRINT.serviceFeeUsd
  ) {
    return false;
  }
  if (input.rewardPoolUsd !== MANAGED_FIELD_SPRINT.grossRewardPoolUsd) return false;
  return (
    input.serviceRevenueUsd === MANAGED_FIELD_SPRINT.serviceFeeUsd ||
    input.designPartnerException === true
  );
}

export function isCanonicalManagedFieldSprintMission(input: {
  type: string;
  tier: string;
  creatorCountTarget: number;
  grossRewardUsd: number;
}) {
  return (
    input.type === 'PLACE' &&
    input.tier === 'SIP_MENTION' &&
    input.creatorCountTarget === 1 &&
    input.grossRewardUsd === MANAGED_FIELD_SPRINT.grossRewardPerContributorUsd
  );
}

export function isEligibleManagedFieldSprintEscrow(input: {
  grossRewardUsd: number;
  status: string;
  isSimulated: boolean;
  onChainDareId: string | null;
}) {
  return (
    !input.isSimulated &&
    Boolean(input.onChainDareId) &&
    input.grossRewardUsd === MANAGED_FIELD_SPRINT.grossRewardPerContributorUsd &&
    (MANAGED_FIELD_SPRINT_ESCROW_STATUSES as readonly string[]).includes(input.status)
  );
}
