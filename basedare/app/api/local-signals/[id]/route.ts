import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { boundedRequestBytes } from '@/lib/bounded-request';
import { prisma } from '@/lib/prisma';
import { publicStory, record, isStory } from '@/lib/community-stories';
import { sameOrigin, socialWallet, socialError } from '@/lib/social-request';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
export async function GET(_r: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const story = await publicStory((await context.params).id); return story ? NextResponse.json({ success: true, data: story }, { headers: { 'Cache-Control': 'private, no-store' } }) : socialError('Post unavailable.', 404); }
  catch { return socialError('Post could not load. Retry.', 503); }
}
const Body = z.object({ action: z.enum(['withdraw', 'report']), wallet: z.string().max(42), reason: z.string().trim().min(5).max(300).optional() });
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return socialError('Invalid origin.', 403);
  if (!checkRateLimit(getClientIp(request), { keyPrefix: 'story-action', limit: 10, windowMs: 60000 }).allowed) return socialError('Please try later.', 429);
  try {
    const body = Body.parse(JSON.parse(new TextDecoder().decode(await boundedRequestBytes(request, 2048))));
    const wallet = await socialWallet(request, body.wallet, 'community-post:manage');
    if (!wallet) return socialError('Sign in to manage or report a post.', 401);
    const { id } = await context.params;
    const outcome = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`local-signal:${id}`}))::text`;
      const row = await tx.founderEvent.findUnique({ where: { id } });
      if (!row || row.eventType !== 'LOCAL_SIGNAL' || !isStory(row)) return 404;
      if (body.action === 'withdraw') {
        if (record(row.metadataJson).authorWallet !== wallet.toLowerCase()) return 403;
        await tx.founderEvent.update({ where: { id }, data: { status: 'WITHDRAWN', metadataJson: { ...record(row.metadataJson), withdrawnAt: new Date().toISOString() } } });
        return 200;
      }
      if (!body.reason) return 400;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`story-reporter:${wallet.toLowerCase()}`}))::text`;
      const key = `story-report:${id}:${wallet.toLowerCase()}`;
      if (await tx.founderEvent.findUnique({ where: { dedupeKey: key } })) return 200;
      if (row.status !== 'APPROVED') return 404;
      if (await tx.founderEvent.count({ where: { eventType: 'LOCAL_SIGNAL_REPORT', actor: wallet.toLowerCase(), createdAt: { gte: new Date(Date.now() - 86400000) } } }) >= 5) return 429;
      // First report returns the public post to the existing private review queue.
      // A previously resolved report cannot re-hide a later approval.
      await tx.founderEvent.create({ data: { eventType: 'LOCAL_SIGNAL_REPORT', subjectType: 'local_signal', subjectId: id, dedupeKey: key, status: 'NEEDS_REVIEW', actor: wallet.toLowerCase(), metadataJson: { reason: body.reason } } });
      await tx.founderEvent.update({ where: { id }, data: { status: 'NEW' } });
      return 200;
    });
    return outcome === 200 ? NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'private, no-store' } }) : socialError(outcome === 403 ? 'This post belongs to another author.' : 'Post unavailable.', outcome);
  } catch { return socialError('Could not save this action. Retry.', 503); }
}
