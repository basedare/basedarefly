import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MANAGED_FIELD_SPRINT,
  SELF_SERVE_BUSINESS_MISSION,
  SETTLEMENT_SPLIT,
  calculateSuccessfulSettlement,
  getManagedFieldSprintEconomics,
  hasValidManagedFieldSprintPaymentLines,
  isCanonicalManagedFieldSprintMission,
  isEligibleManagedFieldSprintEscrow,
} from './financial-canon.ts';
import { calculateRakeBreakdown } from './campaign-payouts.ts';

test('personal dare settlement is exactly 96/4/0 with no live-pot claim', () => {
  assert.equal(
    SETTLEMENT_SPLIT.completerPercent +
      SETTLEMENT_SPLIT.platformPercent +
      SETTLEMENT_SPLIT.referralPercent,
    100,
  );
  assert.equal(SETTLEMENT_SPLIT.livePotPercent, 0);
  assert.deepEqual(calculateSuccessfulSettlement(125), {
    grossRewardUsd: 125,
    completerPayoutUsd: 120,
    platformFeeUsd: 5,
    referralFeeUsd: 0,
    livePotContributionUsd: 0,
  });
});

test('managed Field Sprint keeps service revenue separate from reward funding', () => {
  assert.equal(
    MANAGED_FIELD_SPRINT.serviceFeeUsd + MANAGED_FIELD_SPRINT.grossRewardPoolUsd,
    MANAGED_FIELD_SPRINT.invoiceTotalUsd,
  );
  assert.equal(
    MANAGED_FIELD_SPRINT.assignedContributorCount *
      MANAGED_FIELD_SPRINT.grossRewardPerContributorUsd,
    MANAGED_FIELD_SPRINT.grossRewardPoolUsd,
  );

  const economics = getManagedFieldSprintEconomics();
  assert.equal(economics.completerPayoutUsd, 480);
  assert.equal(economics.platformFeeUsd, 20);
  assert.equal(economics.companyRevenueUsd, 2_020);
  assert.equal(economics.contributionProfitAtCostCeilingUsd, 1_370);
  assert.equal(economics.contributionMarginAtCostCeilingPercent, 67.82);
});

test('self-serve business fee is parked and inclusive of settlement', () => {
  assert.equal(SELF_SERVE_BUSINESS_MISSION.status, 'PARKED');
  assert.equal(
    SELF_SERVE_BUSINESS_MISSION.settlementFeePercent +
      SELF_SERVE_BUSINESS_MISSION.productAndVerificationFeePercent,
    SELF_SERVE_BUSINESS_MISSION.allInPlatformFeePercent,
  );
});

test('managed campaigns with zero additional rake do not invent scout fees', () => {
  assert.deepEqual(calculateRakeBreakdown(125, 0), {
    creatorPayout: 125,
    discoveryRake: 0,
    activeRake: 0,
    platformRake: 0,
    grossTotal: 125,
  });
});

test('managed Sprint payment lines require the full reward pool and an explicit waiver', () => {
  assert.equal(hasValidManagedFieldSprintPaymentLines({
    serviceRevenueUsd: 2_000,
    rewardPoolUsd: 500,
    designPartnerException: false,
  }), true);
  assert.equal(hasValidManagedFieldSprintPaymentLines({
    serviceRevenueUsd: 0,
    rewardPoolUsd: 500,
    designPartnerException: true,
  }), true);
  assert.equal(hasValidManagedFieldSprintPaymentLines({
    serviceRevenueUsd: 0,
    rewardPoolUsd: 500,
    designPartnerException: false,
  }), false);
  assert.equal(hasValidManagedFieldSprintPaymentLines({
    serviceRevenueUsd: 2_000,
    rewardPoolUsd: 499,
    designPartnerException: false,
  }), false);
});

test('each Sprint registration is one canonical mission backed by real escrow', () => {
  assert.equal(isCanonicalManagedFieldSprintMission({
    type: 'PLACE',
    tier: 'SIP_MENTION',
    creatorCountTarget: 1,
    grossRewardUsd: 125,
  }), true);
  assert.equal(isCanonicalManagedFieldSprintMission({
    type: 'PLACE',
    tier: 'SIP_MENTION',
    creatorCountTarget: 4,
    grossRewardUsd: 125,
  }), false);
  assert.equal(isEligibleManagedFieldSprintEscrow({
    grossRewardUsd: 125,
    status: 'PENDING',
    isSimulated: false,
    onChainDareId: '42',
  }), true);
  assert.equal(isEligibleManagedFieldSprintEscrow({
    grossRewardUsd: 125,
    status: 'PENDING',
    isSimulated: true,
    onChainDareId: null,
  }), false);
});
