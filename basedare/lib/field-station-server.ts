import 'server-only';

import type { Prisma } from '@prisma/client';
import type { NextRequest } from 'next/server';

import {
  normalizeTargetHref,
  normalizeTargetId,
  normalizeTargetType,
} from '@/lib/creator-attribution-policy';

import {
  appendFieldStationContextToHref,
  aggregateFieldStationReceiptCounts,
  computeFieldStationTimeToAction,
  formatFieldStationSerial,
  normalizeDensityRadiusKm,
  normalizeFieldStationAttention,
  normalizeFieldStationFallback,
  normalizeMinimumDensity,
  resolveFieldStationAttention,
  type FieldStationAttentionMode,
} from '@/lib/field-station-policy';
import { calculateDistance } from '@/lib/geo';
import { localSignalIsCurrentlyRelevant, serializeLocalSignal } from '@/lib/local-signals';
import {
  JOURNEY_COOKIE_NAME,
  hashOpaqueToken,
} from '@/lib/mission-pass-crypto';
import { prisma } from '@/lib/prisma';

type FieldStationLink = {
  id: string;
  serialNumber: number;
  stationCode: string | null;
  stationHostVenueId: string | null;
  attentionMode: string | null;
  fallbackAttentionMode: string | null;
  minimumDensity: number | null;
  densityRadiusKm: number | null;
  targetHref: string;
  stationHostVenue?: {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    latitude: number;
    longitude: number;
  } | null;
};

export type ResolvedFieldStationRedirect = {
  isFieldStation: boolean;
  targetHref: string;
  stationCode: string | null;
  stationHostVenueId: string | null;
  requestedAttentionMode: FieldStationAttentionMode | null;
  attentionMode: FieldStationAttentionMode | null;
  densityCount: number | null;
  fallbackApplied: boolean;
  fallbackReason: string | null;
};

const FIELD_STATION_EVENT_TYPES = new Set([
  'STATION_ENTRY_RENDERED',
  'STATION_ATTENTION_SELECTED',
  'STATION_TARGET_OPENED',
]);

function boundingBox(latitude: number, longitude: number, radiusKm: number) {
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / (111.32 * Math.max(0.2, Math.cos((latitude * Math.PI) / 180)));
  return {
    latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
    longitude: { gte: longitude - lngDelta, lte: longitude + lngDelta },
  };
}

function insideRadius(
  origin: { latitude: number; longitude: number },
  point: { latitude: number; longitude: number },
  radiusKm: number
) {
  return calculateDistance(
    origin.latitude,
    origin.longitude,
    point.latitude,
    point.longitude
  ) <= radiusKm;
}

async function countFieldStationDensity(input: {
  attention: FieldStationAttentionMode;
  latitude: number;
  longitude: number;
  radiusKm: number;
}) {
  if (input.attention === 'ASK' || input.attention === 'NEARBY') return 0;
  const now = new Date();
  const box = boundingBox(input.latitude, input.longitude, input.radiusKm);
  const origin = { latitude: input.latitude, longitude: input.longitude };
  const soon = new Date(now.getTime() + 18 * 60 * 60 * 1000);

  if (input.attention === 'SOCIAL') {
    const meetups = await prisma.meetup.findMany({
      where: {
        status: 'active',
        startTime: { gte: new Date(now.getTime() - 2 * 60 * 60 * 1000), lte: soon },
        approxLat: box.latitude,
        approxLng: box.longitude,
      },
      select: { approxLat: true, approxLng: true },
      take: 100,
    });
    return meetups.filter((item) => insideRadius(origin, {
      latitude: item.approxLat,
      longitude: item.approxLng,
    }, input.radiusKm)).length;
  }

  if (input.attention === 'REWARD') {
    const dares = await prisma.dare.findMany({
      where: {
        status: 'PENDING',
        bounty: { gt: 0 },
        latitude: box.latitude,
        longitude: box.longitude,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { latitude: true, longitude: true },
      take: 100,
    });
    return dares.filter((item) =>
      item.latitude !== null && item.longitude !== null && insideRadius(origin, {
        latitude: item.latitude,
        longitude: item.longitude,
      }, input.radiusKm)
    ).length;
  }

  if (input.attention === 'MYSTERY') {
    const signals = await prisma.founderEvent.findMany({
      where: {
        eventType: 'LOCAL_SIGNAL',
        status: 'APPROVED',
        occurredAt: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });
    return signals.filter((signal) => {
      const item = serializeLocalSignal(signal, origin);
      return localSignalIsCurrentlyRelevant(item, now) &&
        item.distanceKm !== null && item.distanceKm <= input.radiusKm;
    }).length;
  }

  const [meetups, dares] = await Promise.all([
    prisma.meetup.findMany({
      where: {
        status: 'active',
        startTime: { gte: new Date(now.getTime() - 2 * 60 * 60 * 1000), lte: soon },
        approxLat: box.latitude,
        approxLng: box.longitude,
      },
      select: { approxLat: true, approxLng: true },
      take: 100,
    }),
    prisma.dare.findMany({
      where: {
        status: 'PENDING',
        latitude: box.latitude,
        longitude: box.longitude,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { latitude: true, longitude: true },
      take: 100,
    }),
  ]);
  return meetups.filter((item) => insideRadius(origin, {
    latitude: item.approxLat,
    longitude: item.approxLng,
  }, input.radiusKm)).length + dares.filter((item) =>
    item.latitude !== null && item.longitude !== null && insideRadius(origin, {
      latitude: item.latitude,
      longitude: item.longitude,
    }, input.radiusKm)
  ).length;
}

export async function resolveFieldStationRedirect(
  link: FieldStationLink
): Promise<ResolvedFieldStationRedirect> {
  if (!link.stationCode || !link.stationHostVenueId || !link.stationHostVenue) {
    return {
      isFieldStation: false,
      targetHref: link.targetHref,
      stationCode: null,
      stationHostVenueId: null,
      requestedAttentionMode: null,
      attentionMode: null,
      densityCount: null,
      fallbackApplied: false,
      fallbackReason: null,
    };
  }

  const requested = normalizeFieldStationAttention(link.attentionMode, 'ASK');
  const fallback = normalizeFieldStationFallback(link.fallbackAttentionMode);
  const minimumDensity = normalizeMinimumDensity(link.minimumDensity);
  const radiusKm = normalizeDensityRadiusKm(link.densityRadiusKm);
  let densityCount = 0;
  let densityAvailable = true;
  try {
    densityCount = await countFieldStationDensity({
      attention: requested,
      latitude: link.stationHostVenue.latitude,
      longitude: link.stationHostVenue.longitude,
      radiusKm,
    });
  } catch (error) {
    densityAvailable = false;
    console.error('[FIELD_STATION] Density resolution failed:', error);
  }
  const resolution = resolveFieldStationAttention({
    requested,
    fallback,
    densityCount,
    minimumDensity,
    densityAvailable,
  });
  const targetHref = appendFieldStationContextToHref({
    targetHref: link.targetHref,
    stationCode: link.stationCode,
    stationSerial: formatFieldStationSerial(link.serialNumber),
    stationLabel: link.stationHostVenue.name,
    city: link.stationHostVenue.city,
    latitude: link.stationHostVenue.latitude,
    longitude: link.stationHostVenue.longitude,
    requestedAttention: resolution.requestedAttention,
    resolvedAttention: resolution.resolvedAttention,
    fallbackApplied: resolution.fallbackApplied,
  });
  return {
    isFieldStation: true,
    targetHref,
    stationCode: link.stationCode,
    stationHostVenueId: link.stationHostVenueId,
    requestedAttentionMode: resolution.requestedAttention,
    attentionMode: resolution.resolvedAttention,
    densityCount: resolution.densityCount,
    fallbackApplied: resolution.fallbackApplied,
    fallbackReason: resolution.fallbackReason,
  };
}

export async function resolveDestinationVenueId(
  tx: Prisma.TransactionClient | typeof prisma,
  input: { targetType: string; targetId: string; targetHref: string }
): Promise<string | null> {
  if (input.targetType === 'DARE') {
    return (await tx.dare.findUnique({ where: { id: input.targetId }, select: { venueId: true } }))?.venueId ?? null;
  }
  if (input.targetType === 'MEETUP') {
    return (await tx.meetup.findUnique({ where: { id: input.targetId }, select: { venueId: true } }))?.venueId ?? null;
  }
  let slug: string | null = null;
  try {
    const url = new URL(input.targetHref, 'https://basedare.local');
    slug = url.searchParams.get('place');
    const venueMatch = url.pathname.match(/^\/venues\/([^/]+)$/);
    if (!slug && venueMatch) slug = decodeURIComponent(venueMatch[1]);
  } catch {
    return null;
  }
  if (!slug) return null;
  return (await tx.venue.findUnique({ where: { slug }, select: { id: true } }))?.id ?? null;
}

async function currentJourneyAndStationTouch(request: NextRequest) {
  const raw = request.cookies.get(JOURNEY_COOKIE_NAME)?.value ?? null;
  if (!raw) return null;
  const journey = await prisma.attributionJourney.findUnique({
    where: { cookieHash: hashOpaqueToken(raw) },
    select: { id: true, participantKey: true },
  });
  if (!journey) return null;
  const touch = await prisma.attributionTouch.findFirst({
    where: { journeyId: journey.id, stationCode: { not: null } },
    orderBy: { occurredAt: 'desc' },
  });
  return touch ? { journey, touch } : null;
}

export async function recordStationFunnelEvent(
  request: NextRequest,
  input: {
    eventType: string;
    attentionMode?: string | null;
    targetType?: string | null;
    targetId?: string | null;
    targetHref?: string | null;
  }
) {
  if (!FIELD_STATION_EVENT_TYPES.has(input.eventType)) {
    throw new Error('Unsupported Field Station event.');
  }
  const context = await currentJourneyAndStationTouch(request);
  if (!context) return { recorded: false as const };
  const targetType = normalizeTargetType(input.targetType || context.touch.targetType);
  const targetId = normalizeTargetId(input.targetId || context.touch.targetId);
  const targetHref = normalizeTargetHref(input.targetHref || context.touch.targetHref);
  const destinationVenueId = input.eventType === 'STATION_TARGET_OPENED'
    ? await resolveDestinationVenueId(prisma, { targetType, targetId, targetHref })
    : null;
  const attentionMode = input.attentionMode
    ? normalizeFieldStationAttention(input.attentionMode)
    : context.touch.attentionMode;
  const dedupeSuffix = input.eventType === 'STATION_TARGET_OPENED'
    ? `${targetType}:${targetId}`
    : input.eventType === 'STATION_ATTENTION_SELECTED'
      ? attentionMode ?? 'ask'
      : 'entry';
  await prisma.attributionEvent.createMany({
    data: [{
      eventType: input.eventType,
      dedupeKey: `${input.eventType.toLowerCase()}:${context.touch.id}:${dedupeSuffix}`,
      journeyId: context.journey.id,
      touchId: context.touch.id,
      creatorCode: context.touch.creatorCode,
      contentCode: context.touch.contentCode,
      campaignCode: context.touch.campaignCode,
      stationCode: context.touch.stationCode,
      stationHostVenueId: context.touch.stationHostVenueId,
      attentionMode,
      destinationVenueId,
      participantKey: context.journey.participantKey,
      targetType,
      targetId,
      metadataJson: { targetHref },
    }],
    skipDuplicates: true,
  });
  return { recorded: true as const };
}

export async function recordStationVerifiedVenueArrival(
  request: NextRequest,
  input: { venueId: string; checkInId: string; occurredAt: Date; participantKey?: string | null }
) {
  const context = await currentJourneyAndStationTouch(request);
  if (!context) return { recorded: false as const };
  await prisma.attributionEvent.createMany({
    data: [{
      eventType: 'STATION_VERIFIED_ARRIVAL',
      dedupeKey: `station-arrival:${input.checkInId}`,
      journeyId: context.journey.id,
      touchId: context.touch.id,
      creatorCode: context.touch.creatorCode,
      contentCode: context.touch.contentCode,
      campaignCode: context.touch.campaignCode,
      stationCode: context.touch.stationCode,
      stationHostVenueId: context.touch.stationHostVenueId,
      attentionMode: context.touch.attentionMode,
      destinationVenueId: input.venueId,
      participantKey: input.participantKey ?? context.journey.participantKey,
      targetType: 'VENUE',
      targetId: input.venueId,
      occurredAt: input.occurredAt,
      metadataJson: { checkInId: input.checkInId },
    }],
    skipDuplicates: true,
  });
  return { recorded: true as const };
}

export async function buildFieldStationReport(periodDays: number) {
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const [links, events] = await Promise.all([
    prisma.creatorAttributionLink.findMany({
      where: { stationCode: { not: null }, active: true },
      include: { stationHostVenue: { select: { id: true, slug: true, name: true, city: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.attributionEvent.findMany({
      where: { stationCode: { not: null }, occurredAt: { gte: since } },
      select: {
        id: true,
        eventType: true,
        stationCode: true,
        stationHostVenueId: true,
        destinationVenueId: true,
        contentCode: true,
        campaignCode: true,
        attentionMode: true,
        journeyId: true,
        occurredAt: true,
        metadataJson: true,
      },
      orderBy: { occurredAt: 'desc' },
      take: 10_000,
    }),
  ]);
  const venueIds = Array.from(new Set(events.flatMap((event) =>
    [event.stationHostVenueId, event.destinationVenueId].filter((id): id is string => Boolean(id))
  )));
  const venues = venueIds.length ? await prisma.venue.findMany({
    where: { id: { in: venueIds } },
    select: { id: true, slug: true, name: true },
  }) : [];
  const venueById = new Map(venues.map((venue) => [venue.id, venue]));
  const receipts = aggregateFieldStationReceiptCounts(events);
  const timeToAction = computeFieldStationTimeToAction(events);
  return {
    generatedAt: new Date().toISOString(),
    periodDays,
    links: links.map((link) => ({
      ...link,
      serial: formatFieldStationSerial(link.serialNumber),
      publicPath: `/go/${link.slug}`,
    })),
    stationHostReceipts: Object.entries(receipts.stationHosts).map(([stationCode, counts]) => {
      const link = links.find((item) => item.stationCode === stationCode);
      return {
        stationCode,
        stationHostVenue: link?.stationHostVenue ?? null,
        contentCode: link?.contentCode ?? null,
        counts,
        timeToAction: timeToAction[stationCode] ?? null,
        receiptMeaning: 'Acquisition outcomes from this host placement; not arrivals at the host.',
      };
    }),
    creativeReceipts: Object.entries(receipts.creatives).map(([contentCode, counts]) => ({ contentCode, counts })),
    destinationVenueReceipts: Object.entries(receipts.destinations).map(([venueId, counts]) => ({
      venue: venueById.get(venueId) ?? { id: venueId, slug: null, name: 'Unknown venue' },
      counts,
      receiptMeaning: 'Actions and verified arrivals whose destination resolved to this venue.',
    })),
    recentEvents: events.slice(0, 200),
  };
}
