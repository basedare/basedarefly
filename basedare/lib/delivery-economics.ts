import { MANAGED_FIELD_SPRINT } from './financial-canon';

export const DELIVERY_ENTRY_KINDS = ['DELIVERY_COST', 'ACQUISITION_COST', 'REVISION', 'SERVICE_REFUND', 'REWARD_REFUND', 'SUPPLEMENTAL_REWARD_FUNDS', 'RECONCILED'] as const;
export type DeliveryEntryKind = typeof DELIVERY_ENTRY_KINDS[number];
export type DeliveryEntry = { kind: DeliveryEntryKind; amountUsd: number; minutes: number; note: string };
const cents = (amount: number) => Math.round(amount * 100);

export function summarizeDeliveryEconomics(input: {
  complete: boolean; serviceCollectedUsd: number | null; rewardCollectedUsd: number | null;
  contributorPayoutUsd: number; settlementRevenueUsd: number;
  reviewCostUsd: number; reviewMinutes: number; entries: DeliveryEntry[]; repeatRequests: number;
}) {
  const total = (kinds: DeliveryEntryKind[]) => input.entries.filter((e) => kinds.includes(e.kind)).reduce((sum, e) => sum + cents(e.amountUsd), 0);
  const serviceRefund = total(['SERVICE_REFUND']);
  const rewardRefund = total(['REWARD_REFUND']);
  const service = cents(input.serviceCollectedUsd ?? 0);
  const rewards = cents(input.rewardCollectedUsd ?? 0) + total(['SUPPLEMENTAL_REWARD_FUNDS']);
  const payouts = cents(input.contributorPayoutUsd);
  const fees = cents(input.settlementRevenueUsd);
  const costs = cents(input.reviewCostUsd) + total(['DELIVERY_COST', 'ACQUISITION_COST', 'REVISION']);
  const revenue = (input.complete ? service - serviceRefund : 0) + fees;
  const reconciled = input.entries.at(-1)?.kind === 'RECONCILED';
  return {
    cashCollectedUsd: (service + rewards) / 100,
    refundsUsd: (serviceRefund + rewardRefund) / 100,
    contributorPayoutUsd: payouts / 100,
    rewardLiabilityUsd: (rewards - payouts - fees - rewardRefund) / 100,
    earnedRevenueUsd: revenue / 100,
    recordedCostUsd: costs / 100,
    operatorMinutes: input.reviewMinutes + input.entries.reduce((sum, entry) => sum + entry.minutes, 0),
    revisionRounds: input.entries.filter((entry) => entry.kind === 'REVISION').length,
    repeatRequests: input.repeatRequests,
    // Never turn an empty cost ledger into a claim of profit.
    contributionUsd: input.complete && reconciled ? (revenue - costs) / 100 : null,
    reconciled,
    costCeilingExceeded: costs > cents(MANAGED_FIELD_SPRINT.directDeliveryCostCeilingUsd),
    fundingRecorded: input.serviceCollectedUsd !== null && input.rewardCollectedUsd !== null,
  };
}
