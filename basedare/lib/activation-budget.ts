import { MANAGED_FIELD_SPRINT } from './financial-canon';
export const ACTIVATION_BUDGETS = ['discuss', 'verified_field_sprint', '1500_5000', '5000_15000', '15000_plus'] as const;
export type ActivationBudget = typeof ACTIVATION_BUDGETS[number];
// A new enquiry must not rewrite an agreed scope or an invoice/payment record.
export function canReviseActivationEnquiry(status: string | null): boolean {
  return status !== null && ['NEW', 'QUALIFIED', 'NEEDS_INFO'].includes(status);
}
// A planning request without a budget is not a quote or committed revenue.
export function activationPlanningAmount(budget: ActivationBudget): number | null {
  if (budget === 'discuss') return null;
  return { verified_field_sprint: MANAGED_FIELD_SPRINT.invoiceTotalUsd, '1500_5000': 1500, '5000_15000': 5000, '15000_plus': 15000 }[budget];
}
