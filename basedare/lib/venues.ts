import { prisma } from '@/lib/prisma';
import {
  calculateDistance,
  encodeGeohash,
  formatDistance,
  getNeighborGeohashes,
  isValidCoordinates,
} from '@/lib/geo';

const LIVE_SESSION_STATUSES = ['LIVE', 'PAUSED'] as const;
const TERMINAL_DARE_STATUSES = ['EXPIRED', 'FAILED', 'VERIFIED'] as const;

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function subHours(date: Date, hours: number) {
  return new Date(date.getTime() - hours * 60 * 60 * 1000);
}

function mapMemorySummary(memory: {
  bucketType: string;
  bucketStartAt: Date;
  bucketEndAt: Date;
  checkInCount: number;
  uniqueVisitorCount: number;
  dareCount: number;
  completedDareCount: number;
  proofCount: number;
  perkRedemptionCount: number;
  topCreatorTag: string | null;
} | null) {
  if (!memory) return null;

  return {
    bucketType: memory.bucketType,
    bucketStartAt: memory.bucketStartAt.toISOString(),
    bucketEndAt: memory.bucketEndAt.toISOString(),
    checkInCount: memory.checkInCount,
    uniqueVisitorCount: memory.uniqueVisitorCount,
    dareCount: memory.dareCount,
    completedDareCount: memory.completedDareCount,
    proofCount: memory.proofCount,
    perkRedemptionCount: memory.perkRedemptionCount,
    topCreatorTag: memory.topCreatorTag,
  };
}

function mapSessionSummary(session: {
  id: string;
  sessionKey: string;
  scope: string;
  status: string;
  label: string | null;
  campaignLabel: string | null;
  rotationSeconds: number;
  startedAt: Date;
  endsAt: Date | null;
  lastRotatedAt: Date;
  pausedAt: Date | null;
  lastCheckInAt: Date | null;
} | null) {
  if (!session) return null;

  return {
    id: session.id,
    sessionKey: session.sessionKey,
    scope: session.scope,
    status: session.status,
    label: session.label,
    campaignLabel: session.campaignLabel,
    rotationSeconds: session.rotationSeconds,
    startedAt: session.startedAt.toISOString(),
    endsAt: session.endsAt?.toISOString() ?? null,
    lastRotatedAt: session.lastRotatedAt.toISOString(),
    pausedAt: session.pausedAt?.toISOString() ?? null,
    lastCheckInAt: session.lastCheckInAt?.toISOString() ?? null,
  };
}

function mapActiveDare(dare: {
  id: string;
  shortId: string | null;
  title: string;
  missionMode: string | null;
  bounty: number;
  status: string;
  streamerHandle: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: dare.id,
    shortId: dare.shortId ?? dare.id.slice(0, 8),
    title: dare.title,
    missionMode: dare.missionMode ?? 'IRL',
    bounty: dare.bounty,
    status: dare.status,
    streamerHandle: dare.streamerHandle,
    expiresAt: dare.expiresAt?.toISOString() ?? null,
    createdAt: dare.createdAt.toISOString(),
  };
}

export type NearbyVenueItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  categories: string[];
  status: string;
  isPartner: boolean;
  partnerTier: string | null;
  checkInRadiusMeters: number;
  qrRotationSeconds: number;
  distanceKm: number;
  distanceDisplay: string;
  memorySummary: ReturnType<typeof mapMemorySummary>;
  liveSession: ReturnType<typeof mapSessionSummary>;
  activeDareCount: number;
  checkInCount: number;
};

export type VenueDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  categories: string[];
  status: string;
  isPartner: boolean;
  partnerTier: string | null;
  qrMode: string;
  qrRotationSeconds: number;
  checkInRadiusMeters: number;
  memorySummary: ReturnType<typeof mapMemorySummary>;
  memoryHistory: Array<ReturnType<typeof mapMemorySummary>>;
  liveSession: ReturnType<typeof mapSessionSummary>;
  liveStats: {
    scansLastHour: number;
    uniqueVisitorsToday: number;
    activeDares: number;
  };
  recentCheckIns: Array<{
    tag: string | null;
    walletAddress: string;
    proofLevel: string;
    scannedAt: string;
  }>;
  activeDares: Array<ReturnType<typeof mapActiveDare>>;
  consoleUrl: string;
};

export function buildVenueHandshakeValue(input: {
  slug: string;
  sessionKey: string;
  scope?: string;
}) {
  const scope = input.scope ?? 'VENUE_CHECKIN';
  return `basedare://handshake?scope=${encodeURIComponent(scope)}&venue=${encodeURIComponent(input.slug)}&session=${encodeURIComponent(input.sessionKey)}`;
}

export async function getNearbyVenues(input: {
  lat: number;
  lng: number;
  radiusMeters: number;
  limit: number;
}) {
  const { lat, lng, radiusMeters, limit } = input;

  if (!isValidCoordinates(lat, lng)) {
    throw new Error('Invalid coordinates');
  }

  const precision = radiusMeters > 5000 ? 5 : 6;
  const queryGeohash = encodeGeohash(lat, lng, precision);
  const neighborHashes = getNeighborGeohashes(queryGeohash);
  const radiusKm = radiusMeters / 1000;

  const venues = await prisma.venue.findMany({
    where: {
      status: 'ACTIVE',
      geohash: { in: neighborHashes },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
      categories: true,
      status: true,
      isPartner: true,
      partnerTier: true,
      checkInRadiusMeters: true,
      qrRotationSeconds: true,
      memories: {
        orderBy: { bucketStartAt: 'desc' },
        take: 1,
      },
      qrSessions: {
        where: {
          status: { in: [...LIVE_SESSION_STATUSES] },
        },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
      _count: {
        select: {
          dares: true,
          checkIns: true,
        },
      },
    },
    orderBy: [
      { isPartner: 'desc' },
      { updatedAt: 'desc' },
    ],
    take: limit * 3,
  });

  const nearbyVenues: NearbyVenueItem[] = venues
    .map((venue) => {
      const distanceKm = calculateDistance(lat, lng, venue.latitude, venue.longitude);
      if (distanceKm > radiusKm) {
        return null;
      }

      return {
        id: venue.id,
        slug: venue.slug,
        name: venue.name,
        description: venue.description,
        city: venue.city,
        country: venue.country,
        latitude: venue.latitude,
        longitude: venue.longitude,
        categories: venue.categories,
        status: venue.status,
        isPartner: venue.isPartner,
        partnerTier: venue.partnerTier,
        checkInRadiusMeters: venue.checkInRadiusMeters,
        qrRotationSeconds: venue.qrRotationSeconds,
        distanceKm: Math.round(distanceKm * 100) / 100,
        distanceDisplay: formatDistance(distanceKm),
        memorySummary: mapMemorySummary(venue.memories[0] ?? null),
        liveSession: mapSessionSummary(venue.qrSessions[0] ?? null),
        activeDareCount: venue._count.dares,
        checkInCount: venue._count.checkIns,
      };
    })
    .filter((venue): venue is NearbyVenueItem => venue !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);

  return {
    venues: nearbyVenues,
    queryGeohash,
  };
}

export async function getVenueDetailBySlug(slug: string): Promise<VenueDetail | null> {
  const now = new Date();
  const venue = await prisma.venue.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      address: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
      timezone: true,
      categories: true,
      status: true,
      isPartner: true,
      partnerTier: true,
      qrMode: true,
      qrRotationSeconds: true,
      checkInRadiusMeters: true,
      memories: {
        orderBy: { bucketStartAt: 'desc' },
        take: 7,
      },
      qrSessions: {
        where: {
          status: { in: [...LIVE_SESSION_STATUSES] },
        },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
      dares: {
        where: {
          NOT: {
            OR: [
              { status: { in: [...TERMINAL_DARE_STATUSES] } },
              { expiresAt: { lt: now } },
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          shortId: true,
          title: true,
          missionMode: true,
          bounty: true,
          status: true,
          streamerHandle: true,
          expiresAt: true,
          createdAt: true,
        },
      },
    },
  });

  if (!venue) {
    return null;
  }

  const [scansLastHour, uniqueVisitorRows, recentCheckIns] = await prisma.$transaction([
    prisma.venueCheckIn.count({
      where: {
        venueId: venue.id,
        status: 'CONFIRMED',
        scannedAt: { gte: subHours(now, 1) },
      },
    }),
    prisma.venueCheckIn.findMany({
      where: {
        venueId: venue.id,
        status: 'CONFIRMED',
        scannedAt: { gte: startOfDay(now) },
      },
      distinct: ['walletAddress'],
      select: {
        walletAddress: true,
      },
    }),
    prisma.venueCheckIn.findMany({
      where: {
        venueId: venue.id,
        status: 'CONFIRMED',
      },
      orderBy: { scannedAt: 'desc' },
      take: 5,
      select: {
        walletAddress: true,
        tag: true,
        proofLevel: true,
        scannedAt: true,
      },
    }),
  ]);

  return {
    id: venue.id,
    slug: venue.slug,
    name: venue.name,
    description: venue.description,
    address: venue.address,
    city: venue.city,
    country: venue.country,
    latitude: venue.latitude,
    longitude: venue.longitude,
    timezone: venue.timezone,
    categories: venue.categories,
    status: venue.status,
    isPartner: venue.isPartner,
    partnerTier: venue.partnerTier,
    qrMode: venue.qrMode,
    qrRotationSeconds: venue.qrRotationSeconds,
    checkInRadiusMeters: venue.checkInRadiusMeters,
    memorySummary: mapMemorySummary(venue.memories[0] ?? null),
    memoryHistory: venue.memories.map((memory) => mapMemorySummary(memory)).filter((memory): memory is NonNullable<ReturnType<typeof mapMemorySummary>> => memory !== null),
    liveSession: mapSessionSummary(venue.qrSessions[0] ?? null),
    liveStats: {
      scansLastHour,
      uniqueVisitorsToday: uniqueVisitorRows.length,
      activeDares: venue.dares.length,
    },
    recentCheckIns: recentCheckIns.map((checkIn) => ({
      walletAddress: checkIn.walletAddress,
      tag: checkIn.tag,
      proofLevel: checkIn.proofLevel,
      scannedAt: checkIn.scannedAt.toISOString(),
    })),
    activeDares: venue.dares.map(mapActiveDare),
    consoleUrl: `/venues/${venue.slug}/console`,
  };
}
