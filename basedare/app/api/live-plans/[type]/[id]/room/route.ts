import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { z } from 'zod';

import { sanitizeInboxMessageBody, isInboxMessageOnlyBlockedContact } from '@/lib/inbox-message-policy';
import {
  CREW_ROOM_COORDINATION_KINDS,
  getCrewRoomQuickCopy,
  isCrewRoomPlanType,
  shouldNotifyCrewRoomQuickAction,
  type CrewRoomCoordinationKind,
} from '@/lib/live-plan-room';
import { getCrewRoomContext, getLivePlanCrewRoomSnapshot, syncLivePlanCrewRoom } from '@/lib/live-plan-room-server';
import { resolveHostBaretag } from '@/lib/meetups-server';
import { createWalletNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';

const RoomPostSchema = z.object({
  walletAddress: z.string().refine((value) => isAddress(value), 'Valid wallet required').optional(),
  body: z.string().max(500).optional(),
  coordinationKind: z.enum(CREW_ROOM_COORDINATION_KINDS).optional(),
}).refine((value) => Boolean(value.body?.trim() || value.coordinationKind), {
  message: 'Write a message or choose a coordination update.',
});

function routePlan(input: { type: string; id: string }) {
  return isCrewRoomPlanType(input.type)
    ? { planType: input.type, planId: input.id }
    : null;
}

async function authorizeRoom(
  request: NextRequest,
  input: { planType: 'boat' | 'meetup'; planId: string; action: 'read' | 'post' },
  walletAddress: string | null,
) {
  return resolveHostBaretag(request, walletAddress, {
    action: `live-plan-room:${input.action}`,
    resource: `${input.planType}:${input.planId}`,
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ type: string; id: string }> }) {
  const route = routePlan(await context.params);
  if (!route) return NextResponse.json({ success: false, error: 'Crew room not supported.' }, { status: 404 });
  const requestedWallet = request.nextUrl.searchParams.get('walletAddress');
  const baretag = await authorizeRoom(
    request,
    { ...route, action: 'read' },
    requestedWallet && isAddress(requestedWallet) ? requestedWallet : null,
  );
  if (!baretag) {
    return NextResponse.json({ success: false, error: 'Authorize the identity that joined this plan.' }, { status: 401 });
  }
  const snapshot = await getLivePlanCrewRoomSnapshot({ ...route, viewerBaretagId: baretag.id });
  if (snapshot.state === 'NOT_FOUND') return NextResponse.json({ success: false, error: 'Plan not found.' }, { status: 404 });
  if (snapshot.state === 'LOCKED') return NextResponse.json({ success: false, error: 'Join this plan to unlock its Crew Room.' }, { status: 403 });
  if (snapshot.state === 'EXPIRED') return NextResponse.json({ success: false, error: 'This Crew Room has expired.' }, { status: 410 });
  return NextResponse.json({ success: true, data: snapshot });
}

export async function POST(request: NextRequest, context: { params: Promise<{ type: string; id: string }> }) {
  const route = routePlan(await context.params);
  if (!route) return NextResponse.json({ success: false, error: 'Crew room not supported.' }, { status: 404 });
  const rateLimit = checkRateLimit(getClientIp(request), {
    limit: 45,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'live-plan-room-post',
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many room updates. Try again shortly.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) },
    );
  }
  const parsed = RoomPostSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid update.' }, { status: 400 });
  }
  const baretag = await authorizeRoom(
    request,
    { ...route, action: 'post' },
    parsed.data.walletAddress ?? null,
  );
  if (!baretag) {
    return NextResponse.json({ success: false, error: 'Authorize the identity that joined this plan.' }, { status: 401 });
  }
  const roomContext = await getCrewRoomContext(route.planType, route.planId);
  if (!roomContext) return NextResponse.json({ success: false, error: 'Plan not found.' }, { status: 404 });
  if (!roomContext.participantBaretagIds.includes(baretag.id)) {
    return NextResponse.json({ success: false, error: 'Join this plan to use its Crew Room.' }, { status: 403 });
  }
  if (roomContext.expiresAt <= new Date()) {
    return NextResponse.json({ success: false, error: 'This Crew Room has expired.' }, { status: 410 });
  }
  const sender = await prisma.streamerTag.findUnique({
    where: { id: baretag.id },
    select: { walletAddress: true, tag: true },
  });
  if (!sender) return NextResponse.json({ success: false, error: 'Identity not found.' }, { status: 404 });
  const coordinationKind = parsed.data.coordinationKind as CrewRoomCoordinationKind | undefined;
  const rawBody = coordinationKind
    ? getCrewRoomQuickCopy(coordinationKind, route.planType)
    : parsed.data.body ?? '';
  const sanitized = sanitizeInboxMessageBody(rawBody);
  if (isInboxMessageOnlyBlockedContact(sanitized.body)) {
    return NextResponse.json({ success: false, error: 'Message cannot contain only contact details.' }, { status: 400 });
  }
  const thread = await syncLivePlanCrewRoom(route.planType, route.planId);
  if (!thread || thread.status !== 'ACTIVE') {
    return NextResponse.json({ success: false, error: 'This Crew Room is closed.' }, { status: 410 });
  }
  const senderWallet = sender.walletAddress.toLowerCase();
  const createdAt = new Date();
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.inboxMessage.create({
      data: {
        threadId: thread.id,
        senderWallet,
        body: sanitized.body,
        redacted: sanitized.redacted,
        readByWallets: [senderWallet],
        metadataJson: {
          coordinationKind: coordinationKind ?? null,
          redactionPolicy: 'contact_block_v1',
        },
      },
      select: { id: true, createdAt: true },
    });
    await tx.inboxThread.update({ where: { id: thread.id }, data: { lastMessageAt: createdAt } });
    return created;
  });
  if (coordinationKind && shouldNotifyCrewRoomQuickAction(coordinationKind)) {
    const recipients = roomContext.participantWallets.filter((wallet) => wallet !== senderWallet);
    await Promise.allSettled(recipients.map((wallet) => createWalletNotification({
      wallet,
      type: 'CREW_ROOM_COORDINATION',
      title: `${sender.tag} · ${roomContext.title}`,
      message: sanitized.body,
      link: `/chat?threadId=${encodeURIComponent(thread.id)}`,
      pushTopic: 'wallet',
    })));
  }
  return NextResponse.json({
    success: true,
    data: { id: message.id, createdAt: message.createdAt.toISOString(), threadId: thread.id },
  }, { status: 201 });
}
