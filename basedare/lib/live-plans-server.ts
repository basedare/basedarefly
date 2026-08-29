import 'server-only';

import { calculateDistance, isValidCoordinates } from '@/lib/geo';
import {
  LIVE_PLAN_HORIZON_HOURS,
  computeLivePlanTotals,
  dedupeLivePlans,
  roundLivePlanCoord,
  shapeLiveBoatPlan,
  shapeLiveDarePlan,
  shapeLiveMeetupPlan,
  shapeLiveVenueEventPlan,
  shouldIncludeLiveDare,
  sortLivePlans,
  type LivePlan,
  type LivePlanSnapshot,
} from '@/lib/live-plans';
import { getBlockedBaretagIds, getViewerWallet, resolveViewerBaretag } from '@/lib/meetups-server';
import { getCompletedTogetherPlans7d } from '@/lib/live-plan-retention-server';
import { MEETUP_LIVE_WINDOW_MS } from '@/lib/meetups';
import { prisma } from '@/lib/prisma';
import {
  BOAT_DESTINATIONS,
  BOAT_TIME_WINDOWS,
  getBoatCrewExpiry,
  getBoatCrewInvitePath,
  getBoatCrewShareText,
  getBoatCrewStatusCopy,
  getBoatLaunch,
  getOptionLabel,
  type BoatTimeWindow,
} from '@/lib/surf-boat-board';
import { serializeBoatCrew } from '@/lib/surf-boat-board-server';
import { getVenueEventTrustLabel, type VenueEventRsvpStatus, type VenueEventTrustLevel } from '@/lib/venue-events';

const MAX_SOURCE_ROWS = 200;
const LIVE_EVENT_GRACE_MS = 4 * 60 * 60 * 1000;

const BOAT_WINDOW_START_HOUR: Record<BoatTimeWindow, number> = {
  dawn: 5,
  early: 7,
  later: 9,
  flexible: 5,
};

function getBoatStart(day: string, timeWindow: BoatTimeWindow) {
  const hour = BOAT_WINDOW_START_HOUR[timeWindow];
  return new Date(`${day}T${String(hour).padStart(2, '0')}:00:00+08:00`);
}

function roundedDistance(
  origin: { latitude: number; longitude: number },
  target: { latitude: number; longitude: number },
) {
  const distance = calculateDistance(
    origin.latitude,
    origin.longitude,
    target.latitude,
    target.longitude,
  );
  return { raw: distance, rounded: Math.round(distance * 100) / 100 };
}

function destinationTimeZone(timezone: string | null | undefined) {
  if (!timezone) return 'UTC';
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
    return timezone;
  } catch {
    return 'UTC';
  }
}

export type LivePlanQuery = {
  latitude: number;
  longitude: number;
  radiusKm: number;
  horizonHours?: number;
  limit?: number;
  now?: Date;
};

export async function getLivePlanSnapshot(input: LivePlanQuery): Promise<LivePlanSnapshot> {
  if (!isValidCoordinates(input.latitude, input.longitude)) {
    throw new Error('INVALID_LIVE_PLAN_CENTER');
  }
  const now = input.now ?? new Date();
  const radiusKm = Math.min(25, Math.max(0.1, input.radiusKm));
  const horizonHours = Math.min(168, Math.max(1, input.horizonHours ?? LIVE_PLAN_HORIZON_HOURS));
  const horizon = new Date(now.getTime() + horizonHours * 60 * 60 * 1000);
  const limit = Math.min(100, Math.max(1, input.limit ?? 40));
  const origin = { latitude: input.latitude, longitude: input.longitude };

  const latDegrees = radiusKm / 110.574;
  const lngDegrees = radiusKm / (111.32 * Math.max(0.2, Math.cos((input.latitude * Math.PI) / 180)));
  const box = {
    latMin: input.latitude - latDegrees,
    latMax: input.latitude + latDegrees,
    lngMin: input.longitude - lngDegrees,
    lngMax: input.longitude + lngDegrees,
  };

  const [viewer, viewerWallet] = await Promise.all([
    resolveViewerBaretag().catch(() => null),
    getViewerWallet().catch(() => null),
  ]);
  const blocked = await getBlockedBaretagIds(viewer?.id ?? null);

  const [nearestVenue, nearbyVenues, meetups, dares, events, boats, completedTogether7d] = await Promise.all([
    prisma.venue.findFirst({
      where: {
        status: 'ACTIVE',
        latitude: { gte: box.latMin, lte: box.latMax },
        longitude: { gte: box.lngMin, lte: box.lngMax },
      },
      orderBy: { updatedAt: 'desc' },
      select: { timezone: true },
    }),
    prisma.venue.findMany({
      where: {
        status: 'ACTIVE',
        latitude: { gte: box.latMin, lte: box.latMax },
        longitude: { gte: box.lngMin, lte: box.lngMax },
      },
      select: { id: true, slug: true },
      take: MAX_SOURCE_ROWS,
    }),
    prisma.meetup.findMany({
      where: {
        status: 'active',
        startTime: {
          gte: new Date(now.getTime() - MEETUP_LIVE_WINDOW_MS),
          lte: horizon,
        },
        approxLat: { gte: box.latMin, lte: box.latMax },
        approxLng: { gte: box.lngMin, lte: box.lngMax },
        ...(blocked.length ? { creatorBaretagId: { notIn: blocked } } : {}),
      },
      include: {
        rsvps: { select: { baretagId: true } },
      },
      orderBy: { startTime: 'asc' },
      take: MAX_SOURCE_ROWS,
    }),
    prisma.dare.findMany({
      where: {
        status: 'PENDING',
        latitude: { gte: box.latMin, lte: box.latMax },
        longitude: { gte: box.lngMin, lte: box.lngMax },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        id: true,
        shortId: true,
        title: true,
        streamId: true,
        tag: true,
        bounty: true,
        expiresAt: true,
        venueId: true,
        venue: { select: { slug: true } },
        locationLabel: true,
        latitude: true,
        longitude: true,
        claimedBy: true,
        claimRequestWallet: true,
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_SOURCE_ROWS,
    }),
    prisma.venueEvent.findMany({
      where: {
        status: 'PUBLISHED',
        expiresAt: { gt: now },
        startsAt: { lte: horizon },
        venue: {
          status: 'ACTIVE',
          latitude: { gte: box.latMin, lte: box.latMax },
          longitude: { gte: box.lngMin, lte: box.lngMax },
        },
        OR: [
          { endsAt: { gte: now } },
          { endsAt: null, startsAt: { gte: new Date(now.getTime() - LIVE_EVENT_GRACE_MS) } },
        ],
      },
      include: {
        venue: {
          select: {
            id: true,
            slug: true,
            name: true,
            latitude: true,
            longitude: true,
          },
        },
        rsvps: { select: { baretagId: true, status: true } },
      },
      orderBy: { startsAt: 'asc' },
      take: MAX_SOURCE_ROWS,
    }),
    prisma.surfBoatCrew.findMany({
      where: {
        status: { not: 'CANCELLED' },
        expiresAt: { gt: now },
        venue: {
          latitude: { gte: box.latMin, lte: box.latMax },
          longitude: { gte: box.lngMin, lte: box.lngMax },
        },
      },
      include: {
        members: true,
        venue: {
          select: {
            id: true,
            slug: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      orderBy: [{ departureDay: 'asc' }, { createdAt: 'asc' }],
      take: MAX_SOURCE_ROWS,
    }),
    getCompletedTogetherPlans7d(now),
  ]);

  const plans: LivePlan[] = [];
  const identified = Boolean(viewer || viewerWallet);
  const venueSlugById = new Map(nearbyVenues.map((venue) => [venue.id, venue.slug]));

  for (const meetup of meetups) {
    const distance = roundedDistance(origin, {
      latitude: meetup.approxLat,
      longitude: meetup.approxLng,
    });
    if (distance.raw > radiusKm) continue;
    plans.push(shapeLiveMeetupPlan({
      id: meetup.id,
      title: meetup.title,
      note: meetup.note,
      placeLabel: meetup.placeLabel,
      venueId: meetup.venueId,
      venueSlug: meetup.venueId ? venueSlugById.get(meetup.venueId) ?? null : null,
      approxLat: meetup.approxLat,
      approxLng: meetup.approxLng,
      startTime: meetup.startTime,
      minimumPeople: meetup.minimumPeople,
    }, {
      going: meetup.rsvps.length,
      viewerIdentified: identified,
      viewerJoined: Boolean(viewer && meetup.rsvps.some((rsvp) => rsvp.baretagId === viewer.id)),
      distanceKm: distance.rounded,
    }));
  }

  for (const event of events) {
    const distance = roundedDistance(origin, {
      latitude: event.venue.latitude,
      longitude: event.venue.longitude,
    });
    if (distance.raw > radiusKm) continue;
    const viewerRsvp = viewer
      ? event.rsvps.find((rsvp) => rsvp.baretagId === viewer.id)
      : null;
    plans.push(shapeLiveVenueEventPlan({
      id: event.id,
      slug: event.slug,
      title: event.title,
      summary: event.summary,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      priceLabel: event.priceLabel,
      trustLabel: getVenueEventTrustLabel(event.trustLevel as VenueEventTrustLevel),
      sourceLabel: event.sourceLabel,
      venue: event.venue,
    }, {
      going: event.rsvps.filter((rsvp) => rsvp.status === 'GOING').length,
      interested: event.rsvps.filter((rsvp) => rsvp.status === 'INTERESTED').length,
      viewerIdentified: identified,
      viewerStatus: (viewerRsvp?.status as VenueEventRsvpStatus | undefined) ?? null,
      distanceKm: distance.rounded,
    }));
  }

  for (const boat of boats) {
    const distance = roundedDistance(origin, {
      latitude: boat.venue.latitude,
      longitude: boat.venue.longitude,
    });
    if (distance.raw > radiusKm) continue;
    const serialized = serializeBoatCrew(boat, {
      viewerBaretagId: viewer?.id ?? null,
      now,
    });
    const timeWindow = serialized.timeWindow;
    plans.push(shapeLiveBoatPlan(serialized, {
      venueId: boat.venue.id,
      latitude: boat.venue.latitude,
      longitude: boat.venue.longitude,
      startsAt: serialized.operatorConfirmation
        ? new Date(serialized.operatorConfirmation.departureAt)
        : getBoatStart(serialized.departureDay, timeWindow),
      endsAt: getBoatCrewExpiry(serialized.departureDay, timeWindow),
      distanceKm: distance.rounded,
      viewerIdentified: identified,
      display: {
        launchLabel: getBoatLaunch(serialized.venueSlug).label,
        destinationLabel: getOptionLabel(BOAT_DESTINATIONS, serialized.destination),
        timeLabel: getOptionLabel(BOAT_TIME_WINDOWS, serialized.timeWindow),
        statusLabel: getBoatCrewStatusCopy(serialized.status),
        shareText: getBoatCrewShareText(serialized),
        href: getBoatCrewInvitePath(serialized.id),
      },
    }));
  }

  for (const dare of dares) {
    if (dare.latitude == null || dare.longitude == null) continue;
    if (!shouldIncludeLiveDare(dare)) continue;
    const distance = roundedDistance(origin, {
      latitude: dare.latitude,
      longitude: dare.longitude,
    });
    if (distance.raw > radiusKm) continue;
    const participantWallet = dare.claimedBy?.toLowerCase() ?? dare.claimRequestWallet?.toLowerCase() ?? null;
    const viewerOwnsPlan = Boolean(viewerWallet && participantWallet === viewerWallet.toLowerCase());
    const isCommunitySpark = dare.bounty <= 0 && dare.tag === 'community';
    if (!isCommunitySpark && participantWallet && !viewerOwnsPlan) continue;
    plans.push(shapeLiveDarePlan({
      ...dare,
      venueSlug: dare.venue?.slug ?? null,
      latitude: dare.latitude,
      longitude: dare.longitude,
    }, {
      viewerIdentified: identified,
      viewerWallet,
      distanceKm: distance.rounded,
    }));
  }

  const sorted = sortLivePlans(dedupeLivePlans(plans), now).slice(0, limit);
  return {
    window: {
      startUtc: now.toISOString(),
      endUtc: horizon.toISOString(),
      tz: destinationTimeZone(nearestVenue?.timezone),
    },
    center: {
      lat: roundLivePlanCoord(input.latitude),
      lng: roundLivePlanCoord(input.longitude),
      radiusKm,
    },
    totals: computeLivePlanTotals(sorted, completedTogether7d),
    plans: sorted,
    myNextMoves: sorted.filter((plan) => plan.viewer.isNextMove),
  };
}
