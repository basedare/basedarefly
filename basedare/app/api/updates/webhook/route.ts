import { NextRequest, NextResponse } from 'next/server';
import { boundedRequestBytes } from '@/lib/bounded-request';
import { verifyResendWebhook } from '@/lib/retention-crypto';
import { prisma } from '@/lib/prisma';
import { meta, reconcileDelivery, SEND, WEBHOOK } from '@/lib/retention';
export async function POST(request: NextRequest) {
  try {
    const raw = new TextDecoder().decode(await boundedRequestBytes(request, 32768));
    if (!verifyResendWebhook(raw, request.headers)) return new NextResponse('Invalid signature.', { status: 401 });
    const body = JSON.parse(raw), providerId = meta(body.data).email_id;
    if (!['email.delivered', 'email.bounced', 'email.complained', 'email.suppressed'].includes(body.type) || typeof providerId !== 'string' || providerId.length > 200) return NextResponse.json({ received: true });
    // Store only the signed provider ID/type. Recipient addresses never enter the webhook ledger.
    await prisma.founderEvent.upsert({ where: { dedupeKey: 'retention-webhook:' + request.headers.get('svix-id') }, update: {}, create: { eventType: WEBHOOK, dedupeKey: 'retention-webhook:' + request.headers.get('svix-id'), subjectType: 'email-provider', subjectId: providerId, status: body.type } });
    const sends = await prisma.founderEvent.findMany({ where: { eventType: SEND, metadataJson: { path: ['providerId'], equals: providerId } }, select: { id: true }, take: 10 });
    for (const send of sends) await reconcileDelivery(send.id);
    return NextResponse.json({ received: true });
  } catch { return new NextResponse('Receipt unavailable. Retry.', { status: 503 }); }
}
