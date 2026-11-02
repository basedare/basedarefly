import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { boundedRequestBytes } from '@/lib/bounded-request';
import { sameOrigin, socialError } from '@/lib/social-request';
import { currentAdventureIntent } from '@/lib/moment-events';
import { prisma } from '@/lib/prisma';
import { requestUpdates } from '@/lib/retention';
import { retentionAvailable } from '@/lib/retention-email';
import { RETENTION_CONSENT } from '@/lib/retention-policy';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
const Body = z.object({ email: z.string().trim().toLowerCase().email().max(254), topics: z.array(z.enum(['challenges', 'community', 'creators'])).min(1).max(3).transform(a => [...new Set(a)]), consent: z.literal(true), version: z.literal(RETENTION_CONSENT), activityId: z.string().max(80), runId: z.string().regex(/^[a-zA-Z0-9-]{10,80}$/) });
export function GET() { return NextResponse.json({ available: retentionAvailable() }, { headers: { 'Cache-Control': 'no-store' } }); }
export async function POST(request: NextRequest) {
  if (!sameOrigin(request) || !request.headers.get('origin')) return socialError('Invalid origin.', 403);
  if (!retentionAvailable()) return socialError('Email updates are not available yet. Your adventure is still saved.', 503);
  if (!checkRateLimit(getClientIp(request), { keyPrefix: 'retention', limit: 5, windowMs: 3600000 }).allowed) return socialError('Please try later.', 429);
  try {
    const body = Body.parse(JSON.parse(new TextDecoder().decode(await boundedRequestBytes(request, 4096))));
    const intent = await currentAdventureIntent(request, body.activityId);
    if (!intent || !await prisma.attributionEvent.findUnique({ where: { dedupeKey: `adventure:COMPLETED_SELF_REPORTED:${intent.id}:${createHash('sha256').update(body.runId).digest('hex')}` }, select: { id: true } })) return socialError('Finish your adventure first. No account is needed.', 409);
    await requestUpdates({ ...body, ip: getClientIp(request) });
    return NextResponse.json({ success: true, message: 'If this address can receive updates, check for a confirmation email. You are only subscribed after confirming.' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) { return socialError(e instanceof z.ZodError ? 'Enter an email, choose your topics and give permission.' : 'Could not request confirmation. Try later.', e instanceof z.ZodError ? 400 : 503); }
}
