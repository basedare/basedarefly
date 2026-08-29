import 'server-only';

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import {
  CREW_ROOM_COORDINATION_KINDS,
  getCrewRoomHref,
  getCrewRoomThreadId,
  type CrewRoomPlanType,
} from '@/lib/live-plan-room';
import { getBoatLaunch, getBoatCrewExpiry, getOptionLabel, BOAT_DESTINATIONS, BOAT_TIME_WINDOWS } from '@/lib/surf-boat-board';

const ROOM_GRACE_MS = 12 * 60 * 60 * 1000;

type CrewRoomContext = {
  planType: CrewRoomPlanType;
  planId: string;
  title: string;
  placeLabel: string;
  startsAt: Date;
  expiresAt: Date;
  venueId: string | null;
  participantBaretagIds: string[];
  participantWallets: string[];
  participantTags: Array<{ id: string; tag: string; walletAddress: string }>;
  createdByWallet: string;
};

function normalizeWallet(value: string) {
  return value.toLowerCase();
}

async function walletsForBaretagIds(ids: string[]) {
  if (!ids.length) return [];
  const tags = await prisma.streamerTag.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, tag: true, walletAddress: true },
  });
  return tags;
}

export async function getCrewRoomContext(
  planType: CrewRoomPlanType,
  planId: string,
): Promise<CrewRoomContext | null> {
  if (planType === 'meetup') {
    const meetup = await prisma.meetup.findUnique({
      where: { id: planId },
      select: {
        id: true,
        title: true,
        placeLabel: true,
        startTime: true,
        venueId: true,
        creatorBaretagId: true,
        rsvps: { select: { baretagId: true } },
      },
    });
    if (!meetup) return null;
    const participantBaretagIds = [...new Set([
      meetup.creatorBaretagId,
      ...meetup.rsvps.map((rsvp) => rsvp.baretagId),
    ])];
    const tags = await walletsForBaretagIds(participantBaretagIds);
    const creator = tags.find((tag) => tag.id === meetup.creatorBaretagId);
    if (!creator) return null;
    return {
      planType,
      planId,
      title: meetup.title,
      placeLabel: meetup.placeLabel,
      startsAt: meetup.startTime,
      expiresAt: new Date(meetup.startTime.getTime() + ROOM_GRACE_MS),
      venueId: meetup.venueId,
      participantBaretagIds,
      participantWallets: [...new Set(tags.map((tag) => normalizeWallet(tag.walletAddress)))].sort(),
      participantTags: tags,
      createdByWallet: normalizeWallet(creator.walletAddress),
    };
  }

  const crew = await prisma.surfBoatCrew.findUnique({
    where: { id: planId },
    select: {
      id: true,
      venueId: true,
      creatorBaretagId: true,
      departureDay: true,
      timeWindow: true,
      destination: true,
      expiresAt: true,
      operatorConfirmedDepartureAt: true,
      venue: { select: { slug: true } },
      members: {
        where: { commitment: 'CONFIRMED' },
        select: { baretagId: true },
      },
    },
  });
  if (!crew) return null;
  const participantBaretagIds = [...new Set([
    crew.creatorBaretagId,
    ...crew.members.map((member) => member.baretagId),
  ])];
  const tags = await walletsForBaretagIds(participantBaretagIds);
  const creator = tags.find((tag) => tag.id === crew.creatorBaretagId);
  if (!creator) return null;
  const launch = getBoatLaunch(crew.venue.slug);
  const destination = getOptionLabel(BOAT_DESTINATIONS, crew.destination as never);
  const fallbackStart = getBoatCrewExpiry(crew.departureDay, crew.timeWindow as never);
  const startsAt = crew.operatorConfirmedDepartureAt ?? fallbackStart;
  const end = crew.operatorConfirmedDepartureAt ?? crew.expiresAt;
  return {
    planType,
    planId,
    title: `${destination} surf boat`,
    placeLabel: `${launch.label} launch · ${getOptionLabel(BOAT_TIME_WINDOWS, crew.timeWindow as never)}`,
    startsAt,
    expiresAt: new Date(end.getTime() + ROOM_GRACE_MS),
    venueId: crew.venueId,
    participantBaretagIds,
    participantWallets: [...new Set(tags.map((tag) => normalizeWallet(tag.walletAddress)))].sort(),
    participantTags: tags,
    createdByWallet: normalizeWallet(creator.walletAddress),
  };
}

function metadataForContext(context: CrewRoomContext): Prisma.InputJsonObject {
  return {
    planType: context.planType,
    planId: context.planId,
    planHref: getCrewRoomHref(context.planType, context.planId).replace('#crew-room', ''),
    planTitle: context.title,
    placeLabel: context.placeLabel,
    startsAt: context.startsAt.toISOString(),
    expiresAt: context.expiresAt.toISOString(),
    notificationPolicy: 'important_coordination_only_v1',
  };
}

export async function syncLivePlanCrewRoom(
  planType: CrewRoomPlanType,
  planId: string,
  resolvedContext?: CrewRoomContext,
) {
  const context = resolvedContext ?? await getCrewRoomContext(planType, planId);
  if (!context) return null;
  const now = new Date();
  return prisma.inboxThread.upsert({
    where: { id: getCrewRoomThreadId(planType, planId) },
    create: {
      id: getCrewRoomThreadId(planType, planId),
      type: 'CREW_ROOM',
      subject: context.title,
      participantWallets: context.participantWallets,
      createdByWallet: context.createdByWallet,
      venueId: context.venueId,
      status: context.expiresAt > now ? 'ACTIVE' : 'ARCHIVED',
      metadataJson: metadataForContext(context),
    },
    update: {
      subject: context.title,
      participantWallets: context.participantWallets,
      venueId: context.venueId,
      status: context.expiresAt > now ? 'ACTIVE' : 'ARCHIVED',
      metadataJson: metadataForContext(context),
    },
    select: { id: true, participantWallets: true, metadataJson: true, status: true },
  });
}

export async function getLivePlanCrewRoomSnapshot(input: {
  planType: CrewRoomPlanType;
  planId: string;
  viewerBaretagId: string;
}) {
  const context = await getCrewRoomContext(input.planType, input.planId);
  if (!context) return { state: 'NOT_FOUND' as const };
  if (!context.participantBaretagIds.includes(input.viewerBaretagId)) {
    return { state: 'LOCKED' as const };
  }
  if (context.expiresAt <= new Date()) return { state: 'EXPIRED' as const };
  const thread = await syncLivePlanCrewRoom(input.planType, input.planId, context);
  if (!thread) return { state: 'NOT_FOUND' as const };
  const viewerTag = context.participantTags.find((tag) => tag.id === input.viewerBaretagId);
  if (!viewerTag) return { state: 'LOCKED' as const };
  const viewerWallet = normalizeWallet(viewerTag.walletAddress);
  const messages = await prisma.inboxMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: 'asc' },
    take: 80,
    select: {
      id: true,
      senderWallet: true,
      body: true,
      redacted: true,
      readByWallets: true,
      metadataJson: true,
      createdAt: true,
    },
  });
  const unread = messages.filter(
    (message) => message.senderWallet !== viewerWallet && !message.readByWallets.includes(viewerWallet),
  );
  await Promise.allSettled(unread.map((message) => prisma.inboxMessage.update({
    where: { id: message.id },
    data: { readByWallets: { push: viewerWallet } },
  })));
  const tagByWallet = new Map(context.participantTags.map((participant) => [
    normalizeWallet(participant.walletAddress),
    participant.tag,
  ]));
  const coordinationKinds = new Set<string>(CREW_ROOM_COORDINATION_KINDS);
  const latestCoordinationByWallet = new Map<string, string>();
  for (const message of [...messages].reverse()) {
    const wallet = normalizeWallet(message.senderWallet);
    if (latestCoordinationByWallet.has(wallet)) continue;
    const kind =
      message.metadataJson && typeof message.metadataJson === 'object' && !Array.isArray(message.metadataJson)
        ? (message.metadataJson as Record<string, unknown>).coordinationKind
        : null;
    if (typeof kind === 'string' && coordinationKinds.has(kind)) {
      latestCoordinationByWallet.set(wallet, kind);
    }
  }
  return {
    state: 'OPEN' as const,
    threadId: thread.id,
    title: context.title,
    placeLabel: context.placeLabel,
    startsAt: context.startsAt.toISOString(),
    expiresAt: context.expiresAt.toISOString(),
    participantCount: context.participantWallets.length,
    participants: context.participantWallets.map((wallet) => ({
      tag: tagByWallet.get(wallet) ?? `${wallet.slice(0, 6)}…${wallet.slice(-4)}`,
      coordinationKind: latestCoordinationByWallet.get(wallet) ?? null,
    })),
    messages: messages.map((message) => ({
      id: message.id,
      body: message.body,
      redacted: message.redacted,
      mine: normalizeWallet(message.senderWallet) === viewerWallet,
      senderTag: tagByWallet.get(normalizeWallet(message.senderWallet)) ?? `${message.senderWallet.slice(0, 6)}…${message.senderWallet.slice(-4)}`,
      coordinationKind:
        message.metadataJson && typeof message.metadataJson === 'object' && !Array.isArray(message.metadataJson)
          ? (message.metadataJson as Record<string, unknown>).coordinationKind ?? null
          : null,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}
