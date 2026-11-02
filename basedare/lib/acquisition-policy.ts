import { z } from 'zod';
import { adventureTemplate } from './adventure-sharing';
import { adventureHref } from './adventure-progress';
import { ISLAND_TRIAL_ID, readTrialIsland } from './island-trials';

export const ACQUISITION_CHANNELS = {
  x: 'Organic X post',
  instagram: 'Instagram collaboration',
  tiktok: 'TikTok challenge',
  creator: 'Consenting creator invitation',
  venue_qr: 'Permitted venue QR',
} as const;
export const AcquisitionSchema = z.object({
  activityId: z.string().min(1).max(80),
  channel: z.enum(['x', 'instagram', 'tiktok', 'creator', 'venue_qr']),
  permissionConfirmed: z.literal(true),
});
export function acquisitionTarget(input: z.infer<typeof AcquisitionSchema>, now = new Date()) {
  const activity = adventureTemplate(input.activityId);
  if (!activity) throw new Error('Choose an existing free adventure.');
  return {
    targetType: 'PAGE', targetId: activity.id, targetHref: adventureHref(activity.id),
    participationOwner: false,
    metadataJson: { kind: 'acquisition_v1', activityId: activity.id, channel: input.channel, permission: 'operator_attested', permissionRecordedAt: now.toISOString() },
  };
}
export function acquisitionDropMetadata(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (data.kind !== 'acquisition_v1' || typeof data.activityId !== 'string') return null;
  const activity = adventureTemplate(data.activityId);
  if (!activity) return null;
  return {
    kind: 'creator_drop_v1' as const, title: activity.title, hook: activity.summary,
    category: 'free_play' as const, actionHref: adventureHref(activity.id), actionLabel: 'Play free',
    rewardLabel: 'Free · no cash reward',
    creatorBrief: 'Make your own interpretation. Filming and posting are optional. Invite willing friends; do not pressure anyone or promise a prize.',
  };
}

/** Only public browsing context, never a sender's run, notes, identity or result. */
export function independentInvitationHref(activityId: string, input: string) {
  if (!adventureTemplate(activityId)) throw new Error('Unknown adventure.');
  const base = adventureHref(activityId);
  const url = new URL(input, 'https://basedare.local');
  const trial = activityId === ISLAND_TRIAL_ID && url.pathname.startsWith(base + '/defend/') && readTrialIsland(url.pathname.slice((base + '/defend/').length));
  if (url.origin !== 'https://basedare.local' || (url.pathname !== base && !trial)) throw new Error('Invitation must open this challenge.');
  const q = new URLSearchParams({ invited: 'challenge' });
  const place = url.searchParams.get('place');
  if (place && /^[a-z0-9-]{1,120}$/.test(place)) q.set('place', place);
  else if (url.searchParams.has('lat') && url.searchParams.has('lng')) {
    const lat = Number(url.searchParams.get('lat')), lng = Number(url.searchParams.get('lng'));
    if (Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lng) && Math.abs(lng) <= 180) {
      q.set('lat', String(Math.round(lat * 1000) / 1000)); q.set('lng', String(Math.round(lng * 1000) / 1000));
      const label = url.searchParams.get('areaLabel')?.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 100);
      if (label) q.set('areaLabel', label);
      const zone = url.searchParams.get('timeZone');
      if (zone) { try { new Intl.DateTimeFormat('en', { timeZone: zone }); q.set('timeZone', zone); } catch { /* Do not transfer an invalid timezone. */ } }
    }
  }
  return url.pathname + '?' + q;
}
