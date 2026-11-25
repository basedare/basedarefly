import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DareProofTicketSchema, DARE_PROOF_TICKET } from '@/lib/dare-proof-media';
import { dareClipPayload } from '@/lib/dare-media-export';
import { hasRecordedRewardFunding } from '@/lib/reward-funding';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

/** A separately configured local BaseClips operator polls this consented read-only queue. */
export async function GET(request: NextRequest) {
  const secret = process.env.BASEDARE_DARE_MEDIA_EXPORT_SECRET;
  const tenant = process.env.BASEDARE_MEDIA_TENANT;
  if (!secret || secret.length < 32 || !tenant || !/^[A-Za-z0-9_-]{1,100}$/.test(tenant)) return NextResponse.json({ error: 'Dare media export unavailable.' }, { status: 503, headers });
  const actual = Buffer.from(request.headers.get('authorization') ?? '');
  const wanted = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers });
  try {
    const cursor = request.nextUrl.searchParams.get('cursor');
    const ticketId = request.nextUrl.searchParams.get('ticket');
    if (ticketId && !/^[a-f0-9]{32}$/.test(ticketId)) return NextResponse.json({ error: 'Invalid ticket.' }, { status: 400, headers });
    if (cursor && !/^[A-Za-z0-9_-]{1,191}$/.test(cursor)) return NextResponse.json({ error: 'Invalid cursor.' }, { status: 400, headers });
    const records = await prisma.founderEvent.findMany({ where: { eventType: DARE_PROOF_TICKET, status: { in: ['ATTACHED', 'REVOKED'] }, ...(ticketId ? { dedupeKey: `dare-proof-upload:${ticketId}` } : {}) }, orderBy: { id: 'asc' }, take: 100, ...(!ticketId && cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    const ids = [...new Set(records.flatMap(record => record.subjectId ? [record.subjectId] : []))];
    const dares = await prisma.dare.findMany({ where: { id: { in: ids } }, select: { id: true, status: true, bounty: true, isSimulated: true, txHash: true, verifyTxHash: true, onChainDareId: true, title: true, proofCid: true, videoUrl: true, claimedBy: true, targetWalletAddress: true, stakerAddress: true, streamerHandle: true } });
    const byId = new Map(dares.map(dare => [dare.id, dare]));
    const items = records.flatMap(record => {
      const parsed = DareProofTicketSchema.safeParse(record.metadataJson);
      if (!parsed.success || !record.subjectId) return [];
      const ticket = parsed.data;
      const dare = byId.get(record.subjectId);
      const gateway = process.env.PINATA_GATEWAY || 'purple-void-gateway.pinata.cloud';
      const url = `https://${gateway}/ipfs/${ticket.cid}`;
      const wallet = dare && (dare.claimedBy || dare.targetWalletAddress || (dare.bounty === 0 ? dare.stakerAddress : null))?.toLowerCase();
      const bindingCurrent = dare && !dare.isSimulated && dare.proofCid === ticket.cid && dare.videoUrl === url && wallet && wallet === record.actor;
      const settled = dare && (dare.bounty === 0 || (hasRecordedRewardFunding(dare) && /^0x[0-9a-f]{64}$/i.test(dare.verifyTxHash ?? '')));
      const withdrawn = record.status === 'REVOKED' || !bindingCurrent || (dare && ['FAILED','EXPIRED','REFUNDED','REJECTED','CANCELLED'].includes(dare.status));
      const status = withdrawn ? 'REVOKED' : settled && dare?.status === 'VERIFIED' ? 'VERIFIED' : 'PENDING';
      const payload = dareClipPayload({ ticket, tenant, status, dareId: record.subjectId, title: ticket.clipTitle ?? 'BaseDare', credit: ticket.requiredCredit ?? 'BaseDare contributor' });
      return payload ? [{ payload, ...(payload.action === 'process' ? { sourceUrl: url, size: ticket.size } : {}) }] : [];
    });
    return NextResponse.json({ success: true, schema: 'baseclips.basedare.media.v1', items, nextCursor: records.length === 100 ? records[records.length - 1].id : null }, { headers });
  } catch { return NextResponse.json({ error: 'Dare media export unavailable.' }, { status: 503, headers }); }
}
