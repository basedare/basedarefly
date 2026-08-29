import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAddress } from 'viem';

import { resolveHostBaretag, resolveViewerBaretag } from '@/lib/meetups-server';
import { findPrimaryCreatorTagForWallet } from '@/lib/creator-tag-resolver';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';
import {
  BOAT_DESTINATIONS,
  BOAT_LAUNCHES,
  BOAT_TIME_WINDOWS,
  KANAWAY_BOAT_VENUE_SLUG,
  SURF_ABILITY_LANES,
  getBoatCrewExpiry,
  getBoatCrewInvitePath,
  getBoatLaunch,
  getOptionLabel,
  isBoatDestinationAllowed,
  isAllowedBoatDay,
  isBoatWindowOpen,
  type BoatTimeWindow,
} from '@/lib/surf-boat-board';
import { serializeBoatCrew } from '@/lib/surf-boat-board-server';
import { createWalletNotification } from '@/lib/notifications';
import { syncLivePlanCrewRoom } from '@/lib/live-plan-room-server';

const CreateBoatCrewSchema = z.object({
  walletAddress: z.string().refine((value) => isAddress(value), 'Valid wallet required').optional(),
  venueSlug: z.enum(BOAT_LAUNCHES.map((launch) => launch.value) as [string, ...string[]]).default(KANAWAY_BOAT_VENUE_SLUG),
  departureDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeWindow: z.enum(BOAT_TIME_WINDOWS.map((option) => option.value) as [string, ...string[]]),
  destination: z.enum(BOAT_DESTINATIONS.map((option) => option.value) as [string, ...string[]]),
  abilityLane: z.enum(SURF_ABILITY_LANES.map((option) => option.value) as [string, ...string[]]),
  needsBoard: z.boolean().default(false),
  repeatCrewId: z.string().max(191).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const requestedWallet = request.nextUrl.searchParams.get('walletAddress');
    const viewer =
      (await resolveViewerBaretag()) ??
      (requestedWallet && isAddress(requestedWallet)
        ? await findPrimaryCreatorTagForWallet(requestedWallet)
        : null);
    const crewId = request.nextUrl.searchParams.get('crewId')?.trim() || null;
    const requestedVenueSlug = request.nextUrl.searchParams.get('venueSlug')?.trim() || null;
    const venueSlug = BOAT_LAUNCHES.some((launch) => launch.value === requestedVenueSlug)
      ? requestedVenueSlug
      : null;
    const now = new Date();
    const crews = await prisma.surfBoatCrew.findMany({
      where: {
        ...(crewId ? { id: crewId } : venueSlug ? { venue: { slug: venueSlug } } : {}),
        status: { not: 'CANCELLED' },
        // Exact shared links remain useful after departure for attendance and
        // Same crew again. The public board still contains live calls only.
        ...(!crewId ? { expiresAt: { gt: now } } : {}),
      },
      include: { members: true, venue: { select: { slug: true } } },
      orderBy: [{ departureDay: 'asc' }, { createdAt: 'asc' }],
      take: crewId ? 1 : 24,
    });
    const creatorIds = [...new Set(crews.map((crew) => crew.creatorBaretagId))];
    const creators = creatorIds.length
      ? await prisma.streamerTag.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, tag: true },
        })
      : [];
    const creatorById = new Map(creators.map((creator) => [creator.id, creator.tag]));

    return NextResponse.json({
      success: true,
      data: {
        crews: crews.map((crew) =>
          serializeBoatCrew(crew, {
            viewerBaretagId: viewer?.id,
            creatorTag: creatorById.get(crew.creatorBaretagId) ?? null,
            now,
          }),
        ),
      },
    });
  } catch (error) {
    console.error('[BOAT_CREWS] GET failed:', error);
    return NextResponse.json({ success: false, error: 'Boat board unavailable.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(getClientIp(request), {
    limit: 6,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'boat-crew-create',
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many boat calls. Try again later.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) },
    );
  }

  try {
    const parsed = CreateBoatCrewSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid boat call.' },
        { status: 400 },
      );
    }
    const input = parsed.data;
    const timeWindow = input.timeWindow as BoatTimeWindow;
    const now = new Date();
    if (!isAllowedBoatDay(input.departureDay, now)) {
      return NextResponse.json({ success: false, error: 'Choose today or tomorrow.' }, { status: 400 });
    }
    if (!isBoatWindowOpen(input.departureDay, timeWindow, now)) {
      return NextResponse.json(
        { success: false, error: 'That departure window has passed. Choose a later time or tomorrow.' },
        { status: 400 },
      );
    }
    if (!isBoatDestinationAllowed(input.venueSlug, input.destination)) {
      return NextResponse.json(
        { success: false, error: `Choose a break served by ${getBoatLaunch(input.venueSlug).label}.` },
        { status: 400 },
      );
    }
    const baretag = await resolveHostBaretag(request, input.walletAddress ?? null, {
      action: 'boat-crew:create',
      resource: `venue:${input.venueSlug}`,
    });
    if (!baretag) {
      return NextResponse.json(
        { success: false, error: 'Claim a Baretag before starting a boat crew.' },
        { status: 401 },
      );
    }
    const venue = await prisma.venue.findUnique({
      where: { slug: input.venueSlug },
      select: { id: true },
    });
    if (!venue) {
      return NextResponse.json(
        { success: false, error: `${getBoatLaunch(input.venueSlug).name} is not available on the map yet.` },
        { status: 503 },
      );
    }
    const existingSeat = await prisma.surfBoatCrewMember.findFirst({
      where: {
        baretagId: baretag.id,
        commitment: 'CONFIRMED',
        crew: {
          departureDay: input.departureDay,
          status: { not: 'CANCELLED' },
          expiresAt: { gt: now },
        },
      },
      select: { id: true },
    });
    if (existingSeat) {
      return NextResponse.json(
        { success: false, error: 'You already confirmed a boat crew for that day.' },
        { status: 409 },
      );
    }

    const previousCrew = input.repeatCrewId
      ? await prisma.surfBoatCrew.findFirst({
          where: {
            id: input.repeatCrewId,
            members: { some: { baretagId: baretag.id, commitment: 'CONFIRMED' } },
          },
          select: {
            members: {
              where: { commitment: 'CONFIRMED', baretagId: { not: baretag.id } },
              select: { baretagId: true },
            },
          },
        })
      : null;

    const crew = await prisma.surfBoatCrew.create({
      data: {
        venueId: venue.id,
        creatorBaretagId: baretag.id,
        departureDay: input.departureDay,
        timeWindow,
        destination: input.destination,
        abilityLane: input.abilityLane,
        expiresAt: getBoatCrewExpiry(input.departureDay, timeWindow),
        members: {
          create: {
            baretagId: baretag.id,
            commitment: 'CONFIRMED',
            abilityLane: input.abilityLane,
            needsBoard: input.needsBoard,
          },
        },
      },
      select: { id: true },
    });

    const previousCrewMembers = previousCrew?.members.length
      ? await prisma.streamerTag.findMany({
          where: { id: { in: previousCrew.members.map((member) => member.baretagId) } },
          select: { walletAddress: true },
          take: 20,
        })
      : [];
    await Promise.allSettled(previousCrewMembers.map((member) => createWalletNotification({
      wallet: member.walletAddress,
      type: 'BOAT_CREW_REPEAT_INVITE',
      title: `${baretag.tag} wants the crew back`,
      message: `${getOptionLabel(BOAT_DESTINATIONS, input.destination)} · ${getOptionLabel(BOAT_TIME_WINDOWS, input.timeWindow)}`,
      link: getBoatCrewInvitePath(crew.id),
    })));
    await syncLivePlanCrewRoom('boat', crew.id).catch((error) => {
      console.error('[BOAT_CREWS] Crew Room sync failed:', error);
    });

    return NextResponse.json({ success: true, data: { id: crew.id, sameCrewInvited: previousCrewMembers.length } }, { status: 201 });
  } catch (error) {
    console.error('[BOAT_CREWS] POST failed:', error);
    return NextResponse.json({ success: false, error: 'Could not start this crew.' }, { status: 500 });
  }
}
