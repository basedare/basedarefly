import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAddress } from 'viem';

import { resolveHostBaretag, resolveViewerBaretag } from '@/lib/meetups-server';
import { findPrimaryCreatorTagForWallet } from '@/lib/creator-tag-resolver';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';
import {
  BOAT_DESTINATIONS,
  BOAT_TIME_WINDOWS,
  KANAWAY_BOAT_VENUE_SLUG,
  SURF_ABILITY_LANES,
  getBoatCrewExpiry,
  isAllowedBoatDay,
} from '@/lib/surf-boat-board';
import { serializeBoatCrew } from '@/lib/surf-boat-board-server';

const CreateBoatCrewSchema = z.object({
  walletAddress: z.string().refine((value) => isAddress(value), 'Valid wallet required').optional(),
  departureDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeWindow: z.enum(BOAT_TIME_WINDOWS.map((option) => option.value) as [string, ...string[]]),
  destination: z.enum(BOAT_DESTINATIONS.map((option) => option.value) as [string, ...string[]]),
  abilityLane: z.enum(SURF_ABILITY_LANES.map((option) => option.value) as [string, ...string[]]),
  needsBoard: z.boolean().default(false),
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
    const now = new Date();
    const crews = await prisma.surfBoatCrew.findMany({
      where: {
        ...(crewId ? { id: crewId } : { venue: { slug: KANAWAY_BOAT_VENUE_SLUG } }),
        status: { not: 'CANCELLED' },
        expiresAt: { gt: now },
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
    if (!isAllowedBoatDay(input.departureDay)) {
      return NextResponse.json({ success: false, error: 'Choose today or tomorrow.' }, { status: 400 });
    }
    const baretag = await resolveHostBaretag(request, input.walletAddress ?? null, {
      action: 'boat-crew:create',
      resource: `venue:${KANAWAY_BOAT_VENUE_SLUG}`,
    });
    if (!baretag) {
      return NextResponse.json(
        { success: false, error: 'Claim a Baretag before starting a boat crew.' },
        { status: 401 },
      );
    }
    const venue = await prisma.venue.findUnique({
      where: { slug: KANAWAY_BOAT_VENUE_SLUG },
      select: { id: true },
    });
    if (!venue) {
      return NextResponse.json({ success: false, error: 'Kanaway is not available on the map yet.' }, { status: 503 });
    }
    const existingSeat = await prisma.surfBoatCrewMember.findFirst({
      where: {
        baretagId: baretag.id,
        commitment: 'CONFIRMED',
        crew: {
          departureDay: input.departureDay,
          status: { not: 'CANCELLED' },
          expiresAt: { gt: new Date() },
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

    const crew = await prisma.surfBoatCrew.create({
      data: {
        venueId: venue.id,
        creatorBaretagId: baretag.id,
        departureDay: input.departureDay,
        timeWindow: input.timeWindow,
        destination: input.destination,
        abilityLane: input.abilityLane,
        expiresAt: getBoatCrewExpiry(input.departureDay),
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

    return NextResponse.json({ success: true, data: { id: crew.id } }, { status: 201 });
  } catch (error) {
    console.error('[BOAT_CREWS] POST failed:', error);
    return NextResponse.json({ success: false, error: 'Could not start this crew.' }, { status: 500 });
  }
}
