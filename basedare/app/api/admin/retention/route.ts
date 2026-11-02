import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { boundedRequestBytes } from '@/lib/bounded-request';
import { sameOrigin, socialError } from '@/lib/social-request';
import { CONTACT, SEND, meta, sendUpdate } from '@/lib/retention';
import { retentionAvailable } from '@/lib/retention-email';
import { prisma } from '@/lib/prisma';
export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request); if (!auth.authorized) return unauthorizedAdminResponse(auth);
  try {
    const [contacts, sends, candidates] = await Promise.all([
      prisma.founderEvent.groupBy({ by: ['status'], where: { eventType: CONTACT }, _count: { _all: true } }),
      prisma.founderEvent.groupBy({ by: ['status'], where: { eventType: SEND, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } }, _count: { _all: true } }),
      prisma.founderEvent.findMany({ where: { eventType: CONTACT, status: 'CONFIRMED' }, select: { id: true, metadataJson: true }, take: 51, orderBy: { createdAt: 'asc' } }),
    ]);
    return NextResponse.json({ success: true, data: { enabled: retentionAvailable(), sendingEnabled: retentionAvailable() && process.env.RETENTION_SEND_ENABLED === 'true', contacts: Object.fromEntries(contacts.map(c => [c.status, c._count._all])), sends: Object.fromEntries(sends.map(c => [c.status, c._count._all])), candidates: candidates.slice(0, 50).map(c => ({ id: c.id, topics: meta(c.metadataJson).topics })), moreCandidates: candidates.length > 50, note: 'Counts are consent/contact and provider records, not unique people or inbox reads. ACCEPTED is provider acceptance; DELIVERED requires a signed delivery receipt. No old contacts were imported.' } }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return socialError('Update records unavailable. No totals inferred.', 503); }
}
const Body = z.object({ campaign: z.string().regex(/^[a-z0-9_-]{3,60}$/), topic: z.enum(['challenges', 'community', 'creators']), contactIds: z.array(z.string().regex(/^[a-z0-9]{20,40}$/)).min(1).max(10), subject: z.string().trim().min(3).max(140).regex(/^[^\r\n]+$/), text: z.string().trim().min(10).max(2000), href: z.string().regex(/^\/(?:adventures|island-trials|now|creators|earn)(?:\/[a-z0-9-]+)?$/), reviewed: z.literal(true) });
export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request); if (!auth.authorized) return unauthorizedAdminResponse(auth);
  if (!sameOrigin(request) || !request.headers.get('origin')) return socialError('Invalid origin.', 403);
  if (!retentionAvailable() || process.env.RETENTION_SEND_ENABLED !== 'true') return socialError('Reviewed update sending is disabled.', 503);
  try {
    const body = Body.parse(JSON.parse(new TextDecoder().decode(await boundedRequestBytes(request, 8192))));
    const results = [];
    for (const contactId of [...new Set(body.contactIds)]) results.push({ id: contactId, status: await sendUpdate({ ...body, contactId }) });
    return NextResponse.json({ success: true, data: results }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) { return socialError(e instanceof z.ZodError ? 'Review the message, topic and up to ten chosen contact records.' : 'Some requests may have been accepted. Check the ledger before retrying.', e instanceof z.ZodError ? 400 : 503); }
}
