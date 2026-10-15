export type NotificationCategory = 'social' | 'adventures' | 'work' | 'places' | 'updates';
export const NOTIFICATION_CATEGORIES = [
  { id: 'all', label: 'All' }, { id: 'social', label: 'Social' },
  { id: 'adventures', label: 'Adventures' }, { id: 'work', label: 'Paid work' },
  { id: 'places', label: 'Places' }, { id: 'updates', label: 'Other' },
] as const;

/** Categories describe recorded events; they confer no achievement, reward or verification. */
export function notificationCategory(type: string): NotificationCategory {
  if (/^(FRIEND_|MEETUP_|LIVE_PLAN_|CREW_|BOAT_)/.test(type)) return 'social';
  if (/^ADVENTURE_/.test(type)) return 'adventures';
  if (/^(DARE_|CAMPAIGN_|PAYOUT_|CLAIM_)/.test(type)) return 'work';
  if (/^(VENUE_|PLACE_|CHECK_IN_)/.test(type)) return 'places';
  return 'updates';
}
