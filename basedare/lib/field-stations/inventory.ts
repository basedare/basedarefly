import 'server-only';

import { calculateDistance, isValidCoordinates } from '@/lib/geo';
import {
  normalizeDensityRadiusKm,
  normalizeMinimumDensity,
  type FieldStationAttentionMode,
} from '@/lib/field-station-policy';
import {
  localSignalIsCurrentlyRelevant,
  serializeLocalSignal,
} from '@/lib/local-signals';
import { prisma } from '@/lib/prisma';
import {
  getSiargaoNightGuide,
  isSiargaoVenueFeaturedTonight,
  isSiargaoVenueWarmUpTonight,
  SIARGAO_TIME_ZONE,
} from '@/lib/siargao-nightlife';
import { GRACE_STARTED_MS, isMeetupTonight, tonightWindow } from '@/lib/tonight';
import {
  selectFieldStationInventory,
  type FieldStationInventoryCandidate,
} from './inventory-policy';

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_RECOMMENDATIONS = 3;
const RECENT_SIGNAL_MS = 90 * 24 * 60 * 60 * 1000;

const TEST_DARE_PATTERNS = [
  /smoke/i,
  /autocreate/i,
  /acceptance\s+(flow|place)/i,
  /\bplace\s+\d{5,}\b/i,
  /\bmap test\b/i,
  /\bphase\s?\d/i,
  /\btest dare\b/i,
  /\bqa\b/i,
];

type CacheEntry = {
  expiresAt: number;
  value: Promise<FieldStationInventoryResult>;
};

type InventoryGlobal = typeof globalThis & {
  __basedareFieldStationInventoryCache?: Map<string, CacheEntry>;
};

const inventoryGlobal = globalThis as InventoryGlobal;
const inventoryCache =
  inventoryGlobal.__basedareFieldStationInventoryCache ?? new Map<string, CacheEntry>();
inventoryGlobal.__basedareFieldStationInventoryCache = inventoryCache;

export type FieldStationInventoryResult = {
  requestedAttention: FieldStationAttentionMode;
  items: FieldStationInventoryCandidate[];
  qualifyingCount: number;
  minimumDensity: number;
  radiusKm: number;
  isLowDensity: boolean;
  fallbackReason: 'BELOW_MINIMUM_QUALITY_DENSITY' | null;
  evaluatedAt: string;
  cacheTtlSeconds: number;
};

export type EvaluateStationInventoryInput = {
  attention: FieldStationAttentionMode;
  latitude: number;
  longitude: number;
  radiusKm?: number | null;
  minimumDensity?: number | null;
  now?: Date;
  bypassCache?: boolean;
};

function boundingBox(latitude: number, longitude: number, radiusKm: number) {
  const latDelta = radiusKm / 110.574;
  const lngDelta =
    radiusKm / (111.32 * Math.max(0.2, Math.cos((latitude * Math.PI) / 180)));
  return {
    latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
    longitude: { gte: longitude - lngDelta, lte: longitude + lngDelta },
  };
}

function distanceKm(
  origin: { latitude: number; longitude: number },
  point: { latitude: number; longitude: number }
) {
  return Math.round(
    calculateDistance(
      origin.latitude,
      origin.longitude,
      point.latitude,
      point.longitude
    ) * 100
  ) / 100;
}

function formatDistance(value: number) {
  if (value < 1) return `${Math.max(1, Math.round(value * 1000))}m away`;
  return `${value.toFixed(value < 10 ? 1 : 0)}km away`;
}

function formatLocalTime(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: SIARGAO_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}

function isTestDare(title: string) {
  return TEST_DARE_PATTERNS.some((pattern) => pattern.test(title));
}

function safeLocalHref(value: string | null | undefined, fallback: string) {
  const candidate = value?.trim();
  return candidate?.startsWith('/') && !candidate.startsWith('//') ? candidate : fallback;
}

async function venueLookup(venueIds: string[]) {
  if (venueIds.length === 0) return new Map<string, { id: string; slug: string; name: string }>();
  const venues = await prisma.venue.findMany({
    where: { id: { in: [...new Set(venueIds)] }, status: 'ACTIVE' },
    select: { id: true, slug: true, name: true },
  });
  return new Map(venues.map((venue) => [venue.id, venue]));
}

async function meetupCandidates(input: {
  attention: 'SOCIAL' | 'TONIGHT';
  origin: { latitude: number; longitude: number };
  radiusKm: number;
  now: Date;
}) {
  const box = boundingBox(input.origin.latitude, input.origin.longitude, input.radiusKm);
  const end = input.attention === 'TONIGHT'
    ? tonightWindow(input.now, SIARGAO_TIME_ZONE).endUtc
    : new Date(input.now.getTime() + 18 * 60 * 60 * 1000);
  const window = tonightWindow(input.now, SIARGAO_TIME_ZONE);
  const meetups = await prisma.meetup.findMany({
    where: {
      status: 'active',
      startTime: {
        gte: new Date(input.now.getTime() - GRACE_STARTED_MS),
        lte: end,
      },
      approxLat: box.latitude,
      approxLng: box.longitude,
    },
    select: {
      id: true,
      title: true,
      placeLabel: true,
      venueId: true,
      approxLat: true,
      approxLng: true,
      startTime: true,
      createdAt: true,
      status: true,
      _count: { select: { rsvps: true } },
    },
    orderBy: { startTime: 'asc' },
    take: 100,
  });
  const venues = await venueLookup(
    meetups.flatMap((meetup) => (meetup.venueId ? [meetup.venueId] : []))
  );

  return meetups.flatMap<FieldStationInventoryCandidate>((meetup) => {
    if (input.attention === 'TONIGHT' && !isMeetupTonight(meetup, window, input.now.getTime())) {
      return [];
    }
    const distance = distanceKm(input.origin, {
      latitude: meetup.approxLat,
      longitude: meetup.approxLng,
    });
    if (distance > input.radiusKm) return [];
    const venue = meetup.venueId ? venues.get(meetup.venueId) ?? null : null;
    const href = venue
      ? `/venues/${encodeURIComponent(venue.slug)}`
      : `/map?intent=${encodeURIComponent(meetup.title)}`;
    return [{
      id: meetup.id,
      source: 'MEETUP',
      attention: input.attention,
      title: meetup.title,
      placeLabel: venue?.name ?? meetup.placeLabel,
      venueId: venue?.id ?? null,
      venueSlug: venue?.slug ?? null,
      href,
      targetType: 'MEETUP',
      targetId: meetup.id,
      distanceKm: distance,
      startsAt: meetup.startTime.toISOString(),
      endsAt: null,
      lastVerifiedAt: meetup.createdAt.toISOString(),
      trustLabel: 'Confirmed public activity',
      freshnessLabel: `${formatLocalTime(meetup.startTime)} · ${meetup._count.rsvps} going · ${formatDistance(distance)}`,
      disclaimer: null,
      qualityScore: 95 + Math.min(meetup._count.rsvps, 10),
    }];
  });
}

async function rewardCandidates(input: {
  origin: { latitude: number; longitude: number };
  radiusKm: number;
  now: Date;
}) {
  const box = boundingBox(input.origin.latitude, input.origin.longitude, input.radiusKm);
  const dares = await prisma.dare.findMany({
    where: {
      status: 'PENDING',
      bounty: { gt: 0 },
      claimedBy: null,
      targetWalletAddress: null,
      latitude: box.latitude,
      longitude: box.longitude,
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: input.now } }] },
        { OR: [
          { streamerHandle: null },
          { streamerHandle: { equals: '' } },
          { streamerHandle: { equals: '@open', mode: 'insensitive' } },
          { streamerHandle: { equals: '@everyone', mode: 'insensitive' } },
        ] },
      ],
    },
    select: {
      id: true,
      shortId: true,
      title: true,
      bounty: true,
      latitude: true,
      longitude: true,
      locationLabel: true,
      venueId: true,
      claimRequestStatus: true,
      createdAt: true,
      venue: { select: { id: true, slug: true, name: true } },
    },
    orderBy: [{ bounty: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  });

  return dares.flatMap<FieldStationInventoryCandidate>((dare) => {
    if (
      dare.latitude === null ||
      dare.longitude === null ||
      dare.claimRequestStatus === 'PENDING' ||
      isTestDare(dare.title)
    ) return [];
    const distance = distanceKm(input.origin, {
      latitude: dare.latitude,
      longitude: dare.longitude,
    });
    if (distance > input.radiusKm) return [];
    return [{
      id: dare.id,
      source: 'DARE',
      attention: 'REWARD',
      title: dare.title,
      placeLabel: dare.venue?.name ?? dare.locationLabel ?? 'Nearby mission',
      venueId: dare.venue?.id ?? dare.venueId,
      venueSlug: dare.venue?.slug ?? null,
      href: dare.shortId ? `/dare/${encodeURIComponent(dare.shortId)}` : '/map',
      targetType: 'DARE',
      targetId: dare.id,
      distanceKm: distance,
      startsAt: null,
      endsAt: null,
      lastVerifiedAt: dare.createdAt.toISOString(),
      trustLabel: 'Funded open mission',
      freshnessLabel: `${Math.round(dare.bounty)} USDC · ${formatDistance(distance)}`,
      disclaimer: 'Reward is paid only after the submitted proof passes review.',
      qualityScore: 90 + Math.min(20, Math.round(dare.bounty / 10)),
    }];
  });
}

async function localSignalCandidates(input: {
  attention: 'MYSTERY' | 'TONIGHT';
  origin: { latitude: number; longitude: number };
  radiusKm: number;
  now: Date;
}) {
  const events = await prisma.founderEvent.findMany({
    where: {
      eventType: 'LOCAL_SIGNAL',
      status: 'APPROVED',
      occurredAt: { gte: new Date(input.now.getTime() - RECENT_SIGNAL_MS) },
    },
    orderBy: { occurredAt: 'desc' },
    take: 200,
  });
  const window = tonightWindow(input.now, SIARGAO_TIME_ZONE);

  return events.flatMap<FieldStationInventoryCandidate>((event) => {
    const signal = serializeLocalSignal(event, input.origin);
    if (!localSignalIsCurrentlyRelevant(signal, input.now)) return [];
    if (signal.distanceKm === null || signal.distanceKm > input.radiusKm) return [];

    if (input.attention === 'TONIGHT') {
      const startsAt = signal.startsAt ? new Date(signal.startsAt) : null;
      const endsAt = signal.endsAt ? new Date(signal.endsAt) : null;
      const validStart = startsAt && Number.isFinite(startsAt.getTime());
      const validEnd = endsAt && Number.isFinite(endsAt.getTime());
      const overlapsTonight =
        (validStart && startsAt!.getTime() <= window.endUtc.getTime()) &&
        (!validEnd || endsAt!.getTime() >= input.now.getTime() - GRACE_STARTED_MS);
      if (!overlapsTonight) return [];
    }

    const venueHref = event.venueSlug
      ? `/venues/${encodeURIComponent(event.venueSlug)}`
      : `/map?intent=${input.attention === 'MYSTERY' ? 'discover' : 'tonight'}`;
    return [{
      id: event.id,
      source: 'LOCAL_SIGNAL',
      attention: input.attention,
      title: signal.title,
      placeLabel: signal.venueName || signal.city || 'Approximate local area',
      venueId: event.venueId,
      venueSlug: event.venueSlug,
      href: safeLocalHref(event.href, venueHref),
      targetType: event.venueId ? 'VENUE' : 'LOCAL_SIGNAL',
      targetId: event.venueId ?? event.id,
      distanceKm: signal.distanceKm,
      startsAt: signal.startsAt,
      endsAt: signal.endsAt,
      lastVerifiedAt: event.updatedAt.toISOString(),
      trustLabel: input.attention === 'MYSTERY' ? 'Reviewed local signal' : 'Confirmed one-off',
      freshnessLabel: `${formatDistance(signal.distanceKm)} · reviewed ${new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(Math.round((event.updatedAt.getTime() - input.now.getTime()) / 86_400_000), 'day')}`,
      disclaimer: input.attention === 'MYSTERY'
        ? 'Rumor zones are approximate until someone proves the place.'
        : 'One-off timing can change. Confirm before travelling.',
      qualityScore: input.attention === 'TONIGHT' ? 100 : 85,
    }];
  });
}

async function nightGuideCandidates(input: {
  origin: { latitude: number; longitude: number };
  radiusKm: number;
  now: Date;
}) {
  const box = boundingBox(input.origin.latitude, input.origin.longitude, input.radiusKm);
  const guide = getSiargaoNightGuide(input.now);
  const venues = await prisma.venue.findMany({
    where: {
      status: 'ACTIVE',
      latitude: box.latitude,
      longitude: box.longitude,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      latitude: true,
      longitude: true,
      updatedAt: true,
    },
    take: 100,
  });

  return venues.flatMap<FieldStationInventoryCandidate>((venue) => {
    if (!isSiargaoVenueFeaturedTonight({ name: venue.name, slug: venue.slug, now: input.now })) {
      return [];
    }
    const distance = distanceKm(input.origin, venue);
    if (distance > input.radiusKm) return [];
    const isLateOption = /siargao[\s-]?beach[\s-]?club|\bsbc\b/i.test(`${venue.name} ${venue.slug}`);
    const isWarmUp = isSiargaoVenueWarmUpTonight({
      name: venue.name,
      slug: venue.slug,
      now: input.now,
    });
    return [{
      id: `night-guide:${venue.id}`,
      source: 'NIGHT_GUIDE',
      attention: 'TONIGHT',
      title: isLateOption
        ? `${guide.lateVenueShort} · late option`
        : isWarmUp
          ? `${venue.name} · warm-up`
          : `${venue.name} · ${guide.weekday}`,
      placeLabel: venue.name,
      venueId: venue.id,
      venueSlug: venue.slug,
      href: `/venues/${encodeURIComponent(venue.slug)}`,
      targetType: 'VENUE',
      targetId: venue.id,
      distanceKm: distance,
      startsAt: null,
      endsAt: null,
      lastVerifiedAt: venue.updatedAt.toISOString(),
      trustLabel: 'Usual weekly rhythm',
      freshnessLabel: `${formatDistance(distance)}${isLateOption ? ` · ${guide.lateHoursLabel}` : isWarmUp ? ' · opposite Harana' : ''}`,
      disclaimer: guide.disclaimer,
      qualityScore: isLateOption ? 64 : isWarmUp ? 66 : 70,
    }];
  });
}

async function buildInventory(input: {
  attention: FieldStationAttentionMode;
  latitude: number;
  longitude: number;
  radiusKm: number;
  minimumDensity: number;
  now: Date;
}): Promise<FieldStationInventoryResult> {
  const origin = { latitude: input.latitude, longitude: input.longitude };
  let candidates: FieldStationInventoryCandidate[] = [];

  if (input.attention === 'SOCIAL') {
    candidates = await meetupCandidates({ attention: 'SOCIAL', origin, radiusKm: input.radiusKm, now: input.now });
  } else if (input.attention === 'REWARD') {
    candidates = await rewardCandidates({ origin, radiusKm: input.radiusKm, now: input.now });
  } else if (input.attention === 'MYSTERY') {
    candidates = await localSignalCandidates({ attention: 'MYSTERY', origin, radiusKm: input.radiusKm, now: input.now });
  } else if (input.attention === 'TONIGHT') {
    const [meetups, signals, guide] = await Promise.all([
      meetupCandidates({ attention: 'TONIGHT', origin, radiusKm: input.radiusKm, now: input.now }),
      localSignalCandidates({ attention: 'TONIGHT', origin, radiusKm: input.radiusKm, now: input.now }),
      nightGuideCandidates({ origin, radiusKm: input.radiusKm, now: input.now }),
    ]);
    candidates = [...signals, ...meetups, ...guide];
  }

  const selection = selectFieldStationInventory(
    candidates,
    input.minimumDensity,
    MAX_RECOMMENDATIONS
  );
  return {
    requestedAttention: input.attention,
    ...selection,
    radiusKm: input.radiusKm,
    evaluatedAt: input.now.toISOString(),
    cacheTtlSeconds: CACHE_TTL_MS / 1000,
  };
}

/**
 * Shared, server-authoritative inventory evaluator. The five-minute cache is an
 * opportunistic warm-instance cache only; correctness never depends on it and a
 * cold serverless instance simply re-evaluates the same contract.
 */
export async function evaluateStationInventory(
  input: EvaluateStationInventoryInput
): Promise<FieldStationInventoryResult> {
  if (!isValidCoordinates(input.latitude, input.longitude)) {
    throw new Error('Field Station coordinates are invalid.');
  }
  const radiusKm = normalizeDensityRadiusKm(input.radiusKm);
  const minimumDensity = normalizeMinimumDensity(input.minimumDensity);
  const now = input.now ?? new Date();
  if (input.attention === 'ASK' || input.attention === 'NEARBY') {
    return {
      requestedAttention: input.attention,
      items: [],
      qualifyingCount: 0,
      minimumDensity,
      radiusKm,
      isLowDensity: false,
      fallbackReason: null,
      evaluatedAt: now.toISOString(),
      cacheTtlSeconds: CACHE_TTL_MS / 1000,
    };
  }

  const normalized = {
    attention: input.attention,
    latitude: Math.round(input.latitude * 10_000) / 10_000,
    longitude: Math.round(input.longitude * 10_000) / 10_000,
    radiusKm,
    minimumDensity,
    now,
  };
  const cacheKey = [
    normalized.attention,
    normalized.latitude,
    normalized.longitude,
    radiusKm,
    minimumDensity,
  ].join(':');
  const cached = inventoryCache.get(cacheKey);
  if (!input.bypassCache && cached && cached.expiresAt > Date.now()) return cached.value;

  const value = buildInventory(normalized).catch((error) => {
    inventoryCache.delete(cacheKey);
    throw error;
  });
  if (!input.bypassCache) {
    inventoryCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  }
  return value;
}
