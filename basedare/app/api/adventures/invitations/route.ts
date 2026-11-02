import { NextRequest, NextResponse } from 'next/server';
import { createHash, createHmac } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { currentAdventureIntent } from '@/lib/moment-events';
import { getMissionPassSecret } from '@/lib/mission-pass-crypto';
import { independentInvitationHref } from '@/lib/acquisition-policy';
import { boundedRequestBytes } from '@/lib/bounded-request';
import { sameOrigin, socialError } from '@/lib/social-request';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
const Body = z.object({ activityId: z.string().max(80), runId: z.string().regex(/^[a-zA-Z0-9-]{10,80}$/), href: z.string().max(1200), action: z.enum(['PREPARE', 'SHARE_ACTION']), method: z.enum(['native', 'copy_link']).optional() });
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return socialError('Invalid origin.', 403);
  if (!checkRateLimit(getClientIp(request), { limit: 20, windowMs: 60000, keyPrefix: 'adventure-invite' }).allowed) return socialError('Try again later.', 429);
  try {
    const body = Body.parse(JSON.parse(new TextDecoder().decode(await boundedRequestBytes(request, 4096))));
    const targetHref = independentInvitationHref(body.activityId, body.href);
    const intent = await currentAdventureIntent(request, body.activityId);
    if (!intent) return socialError('Your adventure is still available. Share its direct link instead.', 409);
    const runHash = createHash('sha256').update(body.runId).digest('hex');
    const completion = await prisma.attributionEvent.findUnique({ where: { dedupeKey: `adventure:COMPLETED_SELF_REPORTED:${intent.id}:${runHash}` }, select: { id: true } });
    if (!completion) return socialError('A recorded self-reported finish is needed for a tracked invitation.', 409);
    const code = createHmac('sha256', getMissionPassSecret()).update(`adventure-invite:${intent.id}:${runHash}`).digest('hex').slice(0, 28);
    const slug = 'try-' + code;
    const link = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`invite:${intent.journeyId}`}))::text`;
      const existing = await tx.creatorAttributionLink.findUnique({ where: { slug } });
      if (existing) return existing;
      if (body.action !== 'PREPARE') return null;
      const count = await tx.attributionEvent.count({ where: { journeyId: intent.journeyId, eventType: 'ADVENTURE_INVITATION_PREPARED', occurredAt: { gte: new Date(Date.now() - 86400000) } } });
      if (count >= 10) return null;
      const created = await tx.creatorAttributionLink.create({ data: { slug, creatorCode: 'community', contentCode: code, campaignCode: intent.primaryTouch?.campaignCode ?? null, targetType: 'PAGE', targetId: body.activityId, targetHref, metadataJson: { kind: 'adventure_invite_v1', parentJourneyId: intent.journeyId, sourceTouchId: intent.primaryTouchId, activityId: body.activityId }, participationOwner: false } });
      await tx.attributionEvent.create({ data: { eventType: 'ADVENTURE_INVITATION_PREPARED', dedupeKey: `adventure-invite:${created.id}`, journeyId: intent.journeyId, touchId: intent.primaryTouchId, actionIntentId: intent.id, campaignCode: intent.primaryTouch?.campaignCode, targetType: 'PAGE', targetId: body.activityId, metadataJson: { linkId: created.id, evidence: 'invitation_prepared_not_delivered' } } });
      return created;
    });
    if (!link?.active) return socialError('Tracked invitation unavailable. You can still share the challenge.', 409);
    if (body.action === 'SHARE_ACTION') {
      if (!body.method) return socialError('Choose the actual share method.');
      await prisma.attributionEvent.upsert({ where: { dedupeKey: `adventure-invite-action:${link.id}:${body.method}` }, update: {}, create: { eventType: 'ADVENTURE_INVITATION_ACTION', dedupeKey: `adventure-invite-action:${link.id}:${body.method}`, journeyId: intent.journeyId, touchId: intent.primaryTouchId, actionIntentId: intent.id, campaignCode: intent.primaryTouch?.campaignCode, targetType: 'PAGE', targetId: body.activityId, metadataJson: { linkId: link.id, method: body.method, evidence: 'client_share_action_not_delivery' } } });
    }
    return NextResponse.json({ success: true, data: { href: '/go/' + link.slug } }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return socialError('Tracked invitation could not be prepared. Direct sharing still works.', 503); }
}
