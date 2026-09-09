import type { LivePlan } from './live-plans';

export const PARTICIPATION_FILTERS = [
  { id: 'all', label: 'Everything' },
  { id: 'play', label: 'Free challenges' },
  { id: 'meet', label: 'Meet people' },
  { id: 'earn', label: 'Paid dares' },
] as const;
export type ParticipationFilter = typeof PARTICIPATION_FILTERS[number]['id'];

export function parseParticipationFilter(value: unknown): ParticipationFilter {
  return PARTICIPATION_FILTERS.find((filter) => filter.id === value)?.id ?? 'all';
}

export function filterParticipation(plans: LivePlan[], filter: ParticipationFilter) {
  return plans.filter((plan) => filter === 'all'
    || (filter === 'play' && plan.type === 'community_spark')
    || (filter === 'meet' && ['meetup', 'boat', 'venue_event'].includes(plan.type))
    || (filter === 'earn' && plan.type === 'paid_dare' && (plan.value?.rewardUsdc ?? 0) > 0));
}
