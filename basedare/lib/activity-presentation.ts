import type { LivePlan } from './live-plans';
import { filterParticipation, type ParticipationFilter } from './participation-filter';
import { filterWorldPulsePlans, type WorldPulseMode } from './world-pulse';

export function browsePlanInventory(plans: LivePlan[], input: {
  participation: ParticipationFilter; mode: WorldPulseMode; now: Date; timeZone?: string; needsPeople?: boolean;
}) {
  const matches = filterWorldPulsePlans(filterParticipation(plans, input.participation), input.mode, input.now, input.timeZone);
  return input.needsPeople ? matches.filter((plan) => plan.status.forming) : matches;
}

/** A schedule indicates a planned start, not an observed live crowd or attendance. */
export function activityTimeLabel(plan: Pick<LivePlan, 'startsAt' | 'endsAt' | 'type'>, now: Date, timeZone = 'UTC') {
  const start = plan.startsAt ? Date.parse(plan.startsAt) : null;
  const end = plan.endsAt ? Date.parse(plan.endsAt) : null;
  if ((start !== null && !Number.isFinite(start)) || (end !== null && !Number.isFinite(end))) return 'Time to be confirmed';
  if (end !== null && end <= now.getTime()) return 'Ended · see details';
  if (start === null) return plan.type === 'paid_dare' || plan.type === 'community_spark' ? 'Available · see brief' : 'Time to be confirmed';
  if (start <= now.getTime()) return 'Started · check details';
  let zone = timeZone;
  try { new Intl.DateTimeFormat('en', { timeZone: zone }); } catch { zone = 'UTC'; }
  return new Intl.DateTimeFormat('en', { timeZone: zone, weekday: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(start));
}
