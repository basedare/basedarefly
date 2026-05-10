import 'server-only';

import { prisma } from '@/lib/prisma';
import { calculateDistance, formatDistance, isValidCoordinates } from '@/lib/geo';
import { publishVenueRoomReceipt } from '@/lib/venue-room';

export const VENUE_PRESENCE_DURATIONS = [30, 60, 120] as const;
export const VENUE_PRESENCE_VISIBILITIES = ['NEARBY', 'PUBLIC', 'PRIVATE'] as const;

export type VenuePresenceDuration = (typeof VENUE_PRESENCE_DURATIONS)[number];
export type VenuePresenceVisibility = (typeof VENUE_PRESENCE_VISIBILITIES)[number];

export type VenuePresenceSummary = {
  venueId: string;
  venueSlug: string;
  venueName: string;
  latitude: number;
  longitude: number;
  activeCount: number;
  nearbyCount: number;
  publicCount: number;
  latestSignalAt: string;
  expiresAt: string;
  distanceKm: number | null;
  distanceDisplay: string | null;
};

const ACTIVE_SIGNAL_SOURCE = 'SIGNAL_PRESENCE';
const SIGNAL_PROOF_LEVEL = 'GPS_ONLY';

function getUtcDayWindow(now: Date) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function getBoundingBox(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / Math.max(0.1, 111 * Math.cos((lat * Math.PI) / 180));

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

function readVisibility(metadataJson: unknown): VenuePresenceVisibility {
  if (!metadataJson || typeof metadataJson !== 'object' || Array.isArray(metadataJson)) {
    return 'NEARBY';
  }

  const value = (metadataJson as Record<string, unknown>).visibility;
  return value === 'PUBLIC' || value === 'PRIVATE' || value === 'NEARBY' ? value : 'NEARBY';
}

function normalizeDuration(minutes: number): VenuePresenceDuration {
  if (minutes <= 30) return 30;
  if (minutes <= 60) return 60;
  return 120;
}

function shortWallet(wallet: string) {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

export async function createVenuePresenceSignal(input: {
  venueId: string;
  walletAddress: string;
  latitude: number;
  longitude: number;
  durationMinutes: number;
  visibility: VenuePresenceVisibility;
  tag?: string | null;
}) {
  const now = new Date();
  const durationMinutes = normalizeDuration(input.durationMinutes);
  const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

  if (!isValidCoordinates(input.latitude, input.longitude)) {
    throw new Error('Invalid coordinates');
  }

  const venue = await prisma.venue.findUnique({
    where: { id: input.venueId },
    select: {
      id: true,
      slug: true,
      name: true,
      latitude: true,
      longitude: true,
      status: true,
      checkInRadiusMeters: true,
    },
  });

  if (!venue || venue.status !== 'ACTIVE') {
    throw new Error('Venue not found or inactive');
  }

  const distanceMeters = Math.round(
    calculateDistance(venue.latitude, venue.longitude, input.latitude, input.longitude) * 1000
  );
  const signalRadiusMeters = Math.min(1200, Math.max(500, venue.checkInRadiusMeters * 5));

  if (distanceMeters > signalRadiusMeters) {
    const error = new Error('Move closer to signal presence at this venue.');
    error.name = 'OUT_OF_RANGE';
    throw error;
  }

  const { start: dayStart, end: dayEnd } = getUtcDayWindow(now);
  const walletAddress = input.walletAddress.toLowerCase();

  const result = await prisma.$transaction(async (tx) => {
    await tx.venueCheckIn.updateMany({
      where: {
        venueId: venue.id,
        walletAddress,
        source: ACTIVE_SIGNAL_SOURCE,
        status: 'CONFIRMED',
        windowEndAt: { gt: now },
      },
      data: {
        status: 'SUPERSEDED',
        windowEndAt: now,
      },
    });

    const checkIn = await tx.venueCheckIn.create({
      data: {
        venueId: venue.id,
        walletAddress,
        tag: input.tag?.trim() || null,
        status: 'CONFIRMED',
        proofLevel: SIGNAL_PROOF_LEVEL,
        source: ACTIVE_SIGNAL_SOURCE,
        geoDistanceMeters: distanceMeters,
        scannedAt: now,
        windowStartAt: now,
        windowEndAt: expiresAt,
        metadataJson: {
          visibility: input.visibility,
          durationMinutes,
          approximate: true,
          gpsProvided: true,
          signalRadiusMeters,
        },
      },
    });

    const [checkInCount, distinctVisitors, venueDareCount, existingMemory] = await Promise.all([
      tx.venueCheckIn.count({
        where: {
          venueId: venue.id,
          status: 'CONFIRMED',
          scannedAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      }),
      tx.venueCheckIn.findMany({
        where: {
          venueId: venue.id,
          status: 'CONFIRMED',
          scannedAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
        distinct: ['walletAddress'],
        select: { walletAddress: true },
      }),
      tx.dare.count({
        where: { venueId: venue.id },
      }),
      tx.venueMemory.findUnique({
        where: {
          venueId_bucketType_bucketStartAt: {
            venueId: venue.id,
            bucketType: 'DAY',
            bucketStartAt: dayStart,
          },
        },
      }),
    ]);

    await tx.venueMemory.upsert({
      where: {
        venueId_bucketType_bucketStartAt: {
          venueId: venue.id,
          bucketType: 'DAY',
          bucketStartAt: dayStart,
        },
      },
      update: {
        bucketEndAt: dayEnd,
        checkInCount,
        uniqueVisitorCount: distinctVisitors.length,
        dareCount: venueDareCount,
        topCreatorTag: input.tag?.trim() || existingMemory?.topCreatorTag || null,
        metadataJson: existingMemory?.metadataJson ?? undefined,
      },
      create: {
        venueId: venue.id,
        bucketType: 'DAY',
        bucketStartAt: dayStart,
        bucketEndAt: dayEnd,
        checkInCount,
        uniqueVisitorCount: distinctVisitors.length,
        dareCount: venueDareCount,
        completedDareCount: 0,
        proofCount: 0,
        perkRedemptionCount: 0,
        topCreatorTag: input.tag?.trim() || null,
        metadataJson: {
          createdBy: 'signal-presence',
        },
      },
    });

    return checkIn;
  });

  const actorLabel = input.tag?.trim() || shortWallet(walletAddress);
  await publishVenueRoomReceipt({
    venueId: venue.id,
    actorWallet: walletAddress,
    actorLabel,
    receiptType: 'presence',
    sourceId: result.id,
    body: `${actorLabel} signaled presence nearby for ${durationMinutes}m.`,
    href: `/map?place=${encodeURIComponent(venue.slug)}&room=1`,
    tone: input.visibility === 'PUBLIC' ? 'emerald' : 'cyan',
    notify: false,
  }).catch((receiptError) => {
    const receiptMessage = receiptError instanceof Error ? receiptError.message : 'Unknown receipt error';
    console.error('[VENUE_PRESENCE] Room receipt failed:', receiptMessage);
    return null;
  });

  return {
    checkInId: result.id,
    venueId: venue.id,
    venueSlug: venue.slug,
    venueName: venue.name,
    visibility: input.visibility,
    durationMinutes,
    geoDistanceMeters: distanceMeters,
    scannedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export async function getActiveVenuePresence(input: {
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit?: number;
}): Promise<VenuePresenceSummary[]> {
  const now = new Date();
  const radiusKm = Math.min(Math.max(input.radiusKm, 0.5), 25);
  const limit = Math.min(Math.max(input.limit ?? 30, 1), 50);
  const box = getBoundingBox(input.latitude, input.longitude, radiusKm);

  const checkIns = await prisma.venueCheckIn.findMany({
    where: {
      status: 'CONFIRMED',
      source: ACTIVE_SIGNAL_SOURCE,
      windowEndAt: { gt: now },
      venue: {
        status: 'ACTIVE',
        latitude: { gte: box.minLat, lte: box.maxLat },
        longitude: { gte: box.minLng, lte: box.maxLng },
      },
    },
    orderBy: { scannedAt: 'desc' },
    take: 250,
    select: {
      walletAddress: true,
      scannedAt: true,
      windowEndAt: true,
      metadataJson: true,
      venue: {
        select: {
          id: true,
          slug: true,
          name: true,
          latitude: true,
          longitude: true,
        },
      },
    },
  });

  const buckets = new Map<
    string,
    {
      venueId: string;
      venueSlug: string;
      venueName: string;
      latitude: number;
      longitude: number;
      wallets: Set<string>;
      nearbyWallets: Set<string>;
      publicWallets: Set<string>;
      latestSignalAt: Date;
      expiresAt: Date;
      distanceKm: number;
    }
  >();

  for (const checkIn of checkIns) {
    const visibility = readVisibility(checkIn.metadataJson);
    if (visibility === 'PRIVATE') {
      continue;
    }

    const distanceKm = calculateDistance(
      input.latitude,
      input.longitude,
      checkIn.venue.latitude,
      checkIn.venue.longitude
    );
    if (distanceKm > radiusKm) {
      continue;
    }

    const bucket = buckets.get(checkIn.venue.id) ?? {
      venueId: checkIn.venue.id,
      venueSlug: checkIn.venue.slug,
      venueName: checkIn.venue.name,
      latitude: checkIn.venue.latitude,
      longitude: checkIn.venue.longitude,
      wallets: new Set<string>(),
      nearbyWallets: new Set<string>(),
      publicWallets: new Set<string>(),
      latestSignalAt: checkIn.scannedAt,
      expiresAt: checkIn.windowEndAt ?? now,
      distanceKm,
    };

    bucket.wallets.add(checkIn.walletAddress);
    if (visibility === 'PUBLIC') {
      bucket.publicWallets.add(checkIn.walletAddress);
    } else {
      bucket.nearbyWallets.add(checkIn.walletAddress);
    }
    if (checkIn.scannedAt > bucket.latestSignalAt) {
      bucket.latestSignalAt = checkIn.scannedAt;
    }
    if (checkIn.windowEndAt && checkIn.windowEndAt > bucket.expiresAt) {
      bucket.expiresAt = checkIn.windowEndAt;
    }

    buckets.set(checkIn.venue.id, bucket);
  }

  return Array.from(buckets.values())
    .sort((left, right) => {
      if (right.wallets.size !== left.wallets.size) {
        return right.wallets.size - left.wallets.size;
      }

      return left.distanceKm - right.distanceKm;
    })
    .slice(0, limit)
    .map((bucket) => ({
      venueId: bucket.venueId,
      venueSlug: bucket.venueSlug,
      venueName: bucket.venueName,
      latitude: bucket.latitude,
      longitude: bucket.longitude,
      activeCount: bucket.wallets.size,
      nearbyCount: bucket.nearbyWallets.size,
      publicCount: bucket.publicWallets.size,
      latestSignalAt: bucket.latestSignalAt.toISOString(),
      expiresAt: bucket.expiresAt.toISOString(),
      distanceKm: Math.round(bucket.distanceKm * 100) / 100,
      distanceDisplay: formatDistance(bucket.distanceKm),
    }));
}
