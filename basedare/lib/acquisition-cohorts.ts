import 'server-only';
import { prisma } from './prisma';
import { ACQUISITION_CHANNELS } from './acquisition-policy';
const record = (v: unknown) => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
export async function acquisitionCohorts(since: Date) {
  const unavailable = { rows: null, note: 'Cohort source limit reached. Narrow the window; no truncated conversion totals are shown.' };
  const links = await prisma.creatorAttributionLink.findMany({ where: { metadataJson: { path: ['kind'], equals: 'acquisition_v1' }, OR: [{ active: true }, { touches: { some: { occurredAt: { gte: since } } } }] }, take: 201, orderBy: { createdAt: 'desc' } });
  if (links.length > 200) return unavailable;
  const touches = await prisma.attributionTouch.findMany({ where: { linkId: { in: links.map(l => l.id) }, occurredAt: { gte: since } }, select: { id: true, linkId: true, journeyId: true, occurredAt: true }, take: 5001 });
  if (touches.length > 5000) return unavailable;
  const events = await prisma.attributionEvent.findMany({ where: { touchId: { in: touches.map(t => t.id) }, occurredAt: { gte: since }, eventType: { in: ['ADVENTURE_LANDING_RENDERED', 'ADVENTURE_STARTED', 'ADVENTURE_COMPLETED_SELF_REPORTED', 'ADVENTURE_INVITATION_ACTION', 'MOMENT_APPROVED'] } }, select: { eventType: true, journeyId: true, touchId: true, targetId: true, metadataJson: true, occurredAt: true }, take: 10001 });
  if (events.length > 10000) return unavailable;
  const invitations = await prisma.creatorAttributionLink.findMany({ where: { metadataJson: { path: ['kind'], equals: 'adventure_invite_v1' }, createdAt: { gte: since } }, select: { id: true, metadataJson: true }, take: 1001 });
  if (invitations.length > 1000) return unavailable;
  const recipientTouches = await prisma.attributionTouch.findMany({ where: { linkId: { in: invitations.map(i => i.id) }, occurredAt: { gte: since } }, select: { id: true, linkId: true, journeyId: true }, take: 5001 });
  if (recipientTouches.length > 5000) return unavailable;
  const recipientStarts = await prisma.attributionEvent.findMany({ where: { eventType: 'ADVENTURE_STARTED', touchId: { in: recipientTouches.map(t => t.id) }, occurredAt: { gte: since } }, select: { journeyId: true, touchId: true }, take: 10001 });
  if (recipientStarts.length > 10000) return unavailable;
  const approvalIds = events.filter(e => e.eventType === 'MOMENT_APPROVED').flatMap(e => typeof record(e.metadataJson).momentId === 'string' ? [record(e.metadataJson).momentId as string] : []);
  const approved = new Set((await prisma.adventureSubmission.findMany({ where: { id: { in: approvalIds }, status: 'APPROVED', publicConsentVersion: { in: ['adventure-display-v1', 'adventure-display-v2'] }, OR: [{ venueSlug: null }, { venue: { status: 'ACTIVE' } }] }, select: { id: true } })).map(p => p.id));
  const touchIndex = new Map(touches.map(t => [t.id, t]));
  const recipientTouchIndex = new Map(recipientTouches.map(t => [t.id, t]));
  const invitationIndex = new Map(invitations.map(i => [i.id, i]));
  return {
    note: 'Browser-journey cohorts anchored to tracked entries in this window. Entries are redirect requests; landings are separately client-reported renders. Stages can be missing independently. Finishes are self-reported and shares are not deliveries. Different browsers do not establish different humans. Frozen attribution can leave later visits without a new conversion.',
    rows: links.map(link => {
      const source = touches.filter(t => t.linkId === link.id), ids = new Set(source.map(t => t.id));
      const scoped = events.filter(e => { const t = e.touchId ? touchIndex.get(e.touchId) : null; return t && ids.has(t.id) && t.journeyId === e.journeyId && e.occurredAt >= t.occurredAt && e.targetId === link.targetId; });
      const set = (kind: string) => new Set(scoped.filter(e => e.eventType === kind).map(e => e.journeyId).filter(Boolean));
      const starts = set('ADVENTURE_STARTED');
      const completed = new Set([...set('ADVENTURE_COMPLETED_SELF_REPORTED')].filter(id => starts.has(id)));
      const recipients = new Set(recipientStarts.filter(e => {
        const touch = e.touchId ? recipientTouchIndex.get(e.touchId) : null;
        const invite = touch?.linkId ? invitationIndex.get(touch.linkId) : null;
        const meta = record(invite?.metadataJson);
        return invite && touch?.journeyId === e.journeyId && ids.has(String(meta.sourceTouchId)) && e.journeyId && e.journeyId !== meta.parentJourneyId;
      }).map(e => e.journeyId));
      const meta = record(link.metadataJson), channel = meta.channel as keyof typeof ACQUISITION_CHANNELS;
      return { id: link.id, slug: link.slug, creatorCode: link.creatorCode, campaign: link.campaignCode, channel: ACQUISITION_CHANNELS[channel] ?? 'Operator link', activityId: link.targetId, entries: new Set(source.map(t => t.journeyId)).size, landings: set('ADVENTURE_LANDING_RENDERED').size, starts: starts.size, finishes: completed.size, invitationActions: set('ADVENTURE_INVITATION_ACTION').size, recipientStarts: recipients.size, approvedContributions: scoped.filter(e => e.eventType === 'MOMENT_APPROVED' && approved.has(String(record(e.metadataJson).momentId))).length };
    }),
  };
}
