import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeDeliveryEconomics } from './delivery-economics.ts';
const base = { complete: true, serviceCollectedUsd: 2000, rewardCollectedUsd: 500, contributorPayoutUsd: 480, settlementRevenueUsd: 20, reviewCostUsd: 50, reviewMinutes: 60, entries: [], repeatRequests: 1 };
test('reward funding is liability, and missing cost reconciliation never implies profit', () => {
  const result = summarizeDeliveryEconomics(base);
  assert.equal(result.cashCollectedUsd, 2500);
  assert.equal(result.earnedRevenueUsd, 2020);
  assert.equal(result.contributionUsd, null);
  assert.equal(result.rewardLiabilityUsd, 0);
  assert.equal(summarizeDeliveryEconomics({ ...base, complete: false, contributorPayoutUsd: 0, settlementRevenueUsd: 0 }).earnedRevenueUsd, 0);
});
test('actual overruns and loss survive reconciliation; later costs reopen it', () => {
  const cost = { kind: 'DELIVERY_COST' as const, amountUsd: 2100, minutes: 900, note: 'Actual cost' };
  const reconciled = { kind: 'RECONCILED' as const, amountUsd: 0, minutes: 0, note: 'All costs recorded' };
  const result = summarizeDeliveryEconomics({ ...base, entries: [cost, reconciled] });
  assert.equal(result.costCeilingExceeded, true);
  assert.equal(result.contributionUsd, -130);
  assert.equal(result.operatorMinutes, 960);
  assert.equal(summarizeDeliveryEconomics({ ...base, entries: [cost, reconciled, cost] }).contributionUsd, null);
});
test('service refunds reduce revenue; reward refunds reduce liability, not revenue', () => {
  const result = summarizeDeliveryEconomics({ ...base, contributorPayoutUsd: 360, settlementRevenueUsd: 15,
    entries: [{ kind: 'SERVICE_REFUND', amountUsd: 100, minutes: 0, note: 'Refund reference' }, { kind: 'REWARD_REFUND', amountUsd: 125, minutes: 0, note: 'Unused pool returned' }] });
  assert.equal(result.earnedRevenueUsd, 1915);
  assert.equal(result.rewardLiabilityUsd, 0);
  assert.equal(result.refundsUsd, 225);
});
