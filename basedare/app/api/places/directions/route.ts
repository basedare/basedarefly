import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { applyJourneyCookie } from '@/lib/creator-attribution-server';
import { recordPlaceDirectionsOpened } from '@/lib/place-directions-server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';

const DirectionsEventSchema = z.object({
  clientEventId: z.string().uuid(),
  placeId: z.string().trim().min(1).max(191),
  destinationVenueId: z.string().trim().min(1).max(191).optional().nullable(),
  placeSlug: z.string().trim().min(1).max(191).optional().nullable(),
  activeDareId: z.string().trim().min(1).max(191).optional().nullable(),
  sourceSurface: z.enum([
    'map_place_sheet',
    'map_live_dare_sheet',
    'map_claimed_mission_sheet',
  ]),
});

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`place-directions:${getClientIp(request)}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many direction events.' },
      { status: 429, headers: createRateLimitHeaders(rate) }
    );
  }

  try {
    const input = DirectionsEventSchema.parse(await request.json());
    const venue = input.destinationVenueId || input.placeSlug
      ? await prisma.venue.findFirst({
          where: {
            status: 'ACTIVE',
            OR: [
              ...(input.destinationVenueId ? [{ id: input.destinationVenueId }] : []),
              ...(input.placeSlug ? [{ slug: input.placeSlug }] : []),
            ],
          },
          select: { id: true },
        })
      : null;
    const dare = input.activeDareId
      ? await prisma.dare.findFirst({
          where: {
            id: input.activeDareId,
            ...(venue ? { venueId: venue.id } : {}),
          },
          select: { id: true },
        })
      : null;

    const result = await recordPlaceDirectionsOpened(request, {
      clientEventId: input.clientEventId,
      placeId: venue?.id ?? input.placeId,
      destinationVenueId: venue?.id ?? null,
      activeDareId: dare?.id ?? null,
      sourceSurface: input.sourceSurface,
    });
    const response = NextResponse.json(
      {
        success: true,
        data: {
          recorded: result.recorded,
          creatorAttributionLocked: result.creatorAttributionLocked,
        },
      },
      {
        headers: {
          ...createRateLimitHeaders(rate),
          'Cache-Control': 'no-store',
        },
      }
    );
    applyJourneyCookie(response, result.journeyToken);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to record directions.';
    return NextResponse.json(
      { success: false, error: message },
      { status: 400, headers: createRateLimitHeaders(rate) }
    );
  }
}
