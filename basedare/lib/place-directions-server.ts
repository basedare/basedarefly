import 'server-only';

import { NextRequest } from 'next/server';

import { JOURNEY_COOKIE_NAME, hashOpaqueToken } from '@/lib/mission-pass-crypto';
import { ensureAttributionJourney } from '@/lib/creator-attribution-server';
import { prisma } from '@/lib/prisma';
import { trackServerEvent } from '@/lib/server-analytics';

const DIRECTIONS_ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type PlaceDirectionsOpenedInput = {
  clientEventId: string;
  placeId: string;
  destinationVenueId?: string | null;
  activeDareId?: string | null;
  sourceSurface: string;
};

export async function recordPlaceDirectionsOpened(
  request: NextRequest,
  input: PlaceDirectionsOpenedInput
) {
  const resolved = await ensureAttributionJourney(request);
  const now = new Date();
  const actionIntent = await prisma.actionIntent.findFirst({
    where: {
      journeyId: resolved.journey.id,
      ...(input.activeDareId
        ? { targetType: 'DARE', targetId: input.activeDareId }
        : input.destinationVenueId
          ? { targetType: 'DARE', destinationVenueId: input.destinationVenueId }
          : { id: '__no_matching_intent__' }),
      OR: [
        { state: 'BOUND' },
        { state: 'LOCKED', expiresAt: { gt: now } },
      ],
    },
    include: {
      primaryTouch: true,
      stationTouch: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  const result = await prisma.attributionEvent.createMany({
    data: [{
      eventType: 'PLACE_DIRECTIONS_OPENED',
      dedupeKey: `place-directions:${input.clientEventId}`,
      journeyId: resolved.journey.id,
      touchId: actionIntent?.primaryTouchId ?? actionIntent?.stationTouchId ?? null,
      actionIntentId: actionIntent?.id ?? null,
      creatorCode: actionIntent?.primaryTouch?.creatorCode ?? null,
      contentCode: actionIntent?.primaryTouch?.contentCode ?? null,
      campaignCode: actionIntent?.primaryTouch?.campaignCode ?? null,
      stationCode: actionIntent?.stationTouch?.stationCode ?? null,
      stationHostVenueId: actionIntent?.stationTouch?.stationHostVenueId ?? null,
      attentionMode: actionIntent?.stationTouch?.attentionMode ?? null,
      destinationVenueId: input.destinationVenueId ?? actionIntent?.destinationVenueId ?? null,
      participantKey: actionIntent?.participantKey ?? resolved.journey.participantKey,
      targetType: 'VENUE',
      targetId: input.placeId,
      occurredAt: now,
      metadataJson: {
        provider: 'GOOGLE_MAPS',
        sourceSurface: input.sourceSurface,
        activeDareId: input.activeDareId ?? null,
        attributionState: actionIntent ? actionIntent.state : 'JOURNEY_ONLY',
        countsAsArrival: false,
      },
    }],
    skipDuplicates: true,
  });

  trackServerEvent('place_directions_opened', {
    place_id: input.placeId,
    active_dare_id: input.activeDareId ?? null,
    destination_venue_id: input.destinationVenueId ?? null,
    source_surface: input.sourceSurface,
    creator_attribution_locked: Boolean(actionIntent?.primaryTouch?.creatorCode),
    recorded: result.count > 0,
  });

  return {
    recorded: result.count > 0,
    journeyToken: resolved.rawToken,
    creatorAttributionLocked: Boolean(actionIntent?.primaryTouch?.creatorCode),
  };
}

/**
 * A verified venue check-in is a real arrival boundary. This only appends an
 * arrival event when the same journey previously opened directions to the
 * destination; opening directions alone never creates presence.
 */
export async function recordDirectionsVerifiedArrival(
  request: NextRequest,
  input: { venueId: string; checkInId: string; occurredAt: Date; participantKey?: string | null }
) {
  const rawJourneyToken = request.cookies.get(JOURNEY_COOKIE_NAME)?.value;
  if (!rawJourneyToken) return { recorded: false as const };

  const journey = await prisma.attributionJourney.findFirst({
    where: {
      cookieHash: hashOpaqueToken(rawJourneyToken),
      status: 'ACTIVE',
      expiresAt: { gt: new Date() },
    },
    select: { id: true, participantKey: true },
  });
  if (!journey) return { recorded: false as const };

  const directionsEvent = await prisma.attributionEvent.findFirst({
    where: {
      journeyId: journey.id,
      eventType: 'PLACE_DIRECTIONS_OPENED',
      destinationVenueId: input.venueId,
      occurredAt: { gte: new Date(input.occurredAt.getTime() - DIRECTIONS_ATTRIBUTION_WINDOW_MS) },
    },
    orderBy: { occurredAt: 'desc' },
  });
  if (!directionsEvent) return { recorded: false as const };

  const result = await prisma.attributionEvent.createMany({
    data: [{
      eventType: 'PLACE_VERIFIED_ARRIVAL',
      dedupeKey: `place-verified-arrival:${input.checkInId}`,
      journeyId: journey.id,
      touchId: directionsEvent.touchId,
      actionIntentId: directionsEvent.actionIntentId,
      creatorCode: directionsEvent.creatorCode,
      contentCode: directionsEvent.contentCode,
      campaignCode: directionsEvent.campaignCode,
      stationCode: directionsEvent.stationCode,
      stationHostVenueId: directionsEvent.stationHostVenueId,
      attentionMode: directionsEvent.attentionMode,
      destinationVenueId: input.venueId,
      participantKey: input.participantKey ?? directionsEvent.participantKey ?? journey.participantKey,
      targetType: 'VENUE',
      targetId: input.venueId,
      occurredAt: input.occurredAt,
      metadataJson: {
        checkInId: input.checkInId,
        directionsEventId: directionsEvent.id,
        proofBoundary: 'VENUE_CHECK_IN',
      },
    }],
    skipDuplicates: true,
  });

  trackServerEvent('place_verified_arrival_after_directions', {
    venue_id: input.venueId,
    check_in_id: input.checkInId,
    recorded: result.count > 0,
  });

  return { recorded: result.count > 0 };
}
