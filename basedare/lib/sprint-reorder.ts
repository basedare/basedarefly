import { MANAGED_FIELD_SPRINT, MANAGED_FIELD_SPRINT_BUDGET_RANGE } from './financial-canon';

// A prefilled, editable invoice request, never a payment or a new mission.
// No contact details, wallet, old dates or previous consent travel in the URL.
export function buildSprintReorderHref(input: { receiptCode: string; question: string; area: string; freshnessWindowHours: number }) {
  const params = new URLSearchParams({
    source: `sprint-repeat:${input.receiptCode}`,
    missionType: 'field-mission', packageId: 'local-signal',
    missionTitle: input.question, venueName: input.area,
    budgetRange: MANAGED_FIELD_SPRINT_BUDGET_RANGE,
    creatorSlots: String(MANAGED_FIELD_SPRINT.assignedContributorCount),
    payout: `$${MANAGED_FIELD_SPRINT.netRewardPerContributorUsd} net per accepted answer`,
    timeWindow: `${MANAGED_FIELD_SPRINT.durationDaysMin}-${MANAGED_FIELD_SPRINT.durationDaysMax} days after confirmed scope and funding`,
    proofRequired: `Follow-up to receipt ${input.receiptCode}. Freshness window: ${input.freshnessWindowHours} hours. Confirm the new observation dates, exact places and evidence requirements before payment. Previous funding and media permissions do not carry over.`,
  });
  return `/activations?${params.toString()}#activation-intake`;
}
