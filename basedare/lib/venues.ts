import 'server-only';

import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import {
  calculateDistance,
  encodeGeohash,
  formatDistance,
  isValidCoordinates,
} from '@/lib/geo';
import {
  getApprovedTagSummaryMap,
  getRecentApprovedPlaceTagsByVenueId,
  getVenueTagSummary,
} from '@/lib/place-tags';
import { findPrimaryCreatorTagForWallet } from '@/lib/creator-tag-resolver';
import type {
  NearbyVenueItem,
  VenueCommandCenterSummary,
  VenueDetail,
  VenueCreatorContribution,
  VenueExperienceMode,
  VenueMemorySummary,
  VenueQrPayload,
  VenueSessionSummary,
} from '@/lib/venue-types';

const LIVE_SESSION_STATUSES = ['LIVE', 'PAUSED'] as const;
const TERMINAL_DARE_STATUSES = ['EXPIRED', 'FAILED', 'VERIFIED'] as const;
const DEFAULT_VENUE_MAP_MODES: VenueExperienceMode[] = [
  {
    id: 'classic',
    status: 'live',
    label: 'Classic',
    description: 'Primary tactical venue map mode.',
  },
  {
    id: 'noir',
    status: 'live',
    label: 'Noir',
    description: 'Lower-noise venue reconnaissance mode.',
  },
  {
    id: 'ar',
    status: 'planned',
    label: 'AR',
    description: 'LocAR-powered venue twins and floating bounty overlays are planned next.',
  },
];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function subHours(date: Date, hours: number) {
  return new Date(date.getTime() - hours * 60 * 60 * 1000);
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

function normalizeWalletAddress(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? null;
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
} | null): VenueMemorySummary | null {
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
} | null): VenueSessionSummary | null {
  if (!session) return null;

  return {
    id: session.id,
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

function buildVenueCommandCenterSummary(input: {
  slug: string;
  isPartner: boolean;
  activeCampaignCount: number;
  hasLiveSession: boolean;
  paidActivationCount: number;
}): VenueCommandCenterSummary {
  const live =
    input.isPartner ||
    input.hasLiveSession ||
    input.activeCampaignCount > 0 ||
    input.paidActivationCount > 0;

  if (live) {
    return {
      status: 'live',
      label: 'Command center live',
      summary: 'This venue already has the rails for sponsored dares, QR operations, and verified foot-traffic tracking.',
      sponsorReady: true,
      activeCampaignCount: input.activeCampaignCount,
      consoleUrl: `/venues/${input.slug}/console`,
    };
  }

  return {
    status: 'claimable',
    label: 'Claimable venue',
    summary: 'This pin can graduate into a managed venue with sponsored dares, venue budgets, and command-center analytics.',
    sponsorReady: false,
    activeCampaignCount: 0,
    consoleUrl: null,
  };
}

function buildVenueExperienceModes() {
  return DEFAULT_VENUE_MAP_MODES.map((mode) => ({ ...mode }));
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
  requireSentinel: boolean;
  sentinelVerified: boolean;
  targetWalletAddress: string | null;
  claimedBy: string | null;
  claimRequestTag: string | null;
  claimRequestedAt: Date | null;
  claimRequestStatus: string | null;
  linkedCampaign: {
    title: string;
    brand: {
      name: string;
    };
  } | null;
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
    requireSentinel: dare.requireSentinel,
    sentinelVerified: dare.sentinelVerified,
    campaignTitle: dare.linkedCampaign?.title ?? null,
    brandName: dare.linkedCampaign?.brand.name ?? null,
    targetWalletAddress: dare.targetWalletAddress,
    claimedBy: dare.claimedBy,
    claimRequestTag: dare.claimRequestTag,
    claimRequestedAt: dare.claimRequestedAt?.toISOString() ?? null,
    claimRequestStatus: dare.claimRequestStatus,
  };
}

function getFeaturedPaidActivation<
  T extends {
    brandName: string | null;
    bounty: number;
    createdAt: string;
  },
>(activeDares: T[]): T | null {
  const paidActivations = activeDares.filter((dare) => Boolean(dare.brandName));

  if (paidActivations.length === 0) {
    return null;
  }

  return paidActivations.sort((left, right) => {
    if (right.bounty !== left.bounty) {
      return right.bounty - left.bounty;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  })[0] ?? null;
}

type VenueQrSessionRecord = {
  id: string;
  venueId: string;
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
};

function getHandshakeSecret() {
  return (
    process.env.INTERNAL_API_SECRET ||
    process.env.ADMIN_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.CRON_SECRET ||
    null
  );
}

function getRotationWindow(
  session: Pick<VenueQrSessionRecord, 'rotationSeconds' | 'lastRotatedAt'>,
  at: Date
) {
  const anchor = session.lastRotatedAt;
  const rotationMs = Math.max(15, session.rotationSeconds) * 1000;
  const diffMs = Math.max(0, at.getTime() - anchor.getTime());
  const windowIndex = Math.floor(diffMs / rotationMs);
  const windowStartedAt = new Date(anchor.getTime() + windowIndex * rotationMs);
  const expiresAt = new Date(windowStartedAt.getTime() + rotationMs);

  return {
    windowIndex,
    windowStartedAt,
    expiresAt,
  };
}

function createVenueHandshakeToken(input: {
  venueId: string;
  sessionId: string;
  sessionKey: string;
  scope: string;
  windowStartedAt: Date;
}) {
  const secret = getHandshakeSecret();
  if (!secret) {
    throw new Error('Handshake secret is not configured');
  }

  return createHash('sha256')
    .update(
      [
        secret,
        input.venueId,
        input.sessionId,
        input.sessionKey,
        input.scope,
        input.windowStartedAt.toISOString(),
      ].join(':')
    )
    .digest('hex');
}

export function hashHandshakeToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function createVenueSessionKey() {
  return randomBytes(18).toString('hex');
}

export function buildVenueHandshakeValue(input: {
  venueSlug: string;
  venueId: string;
  sessionId: string;
  token: string;
  scope?: string;
  expiresAt: Date;
}) {
  const scope = input.scope ?? 'VENUE_CHECKIN';
  return `basedare://handshake?scope=${encodeURIComponent(scope)}&venue=${encodeURIComponent(input.venueSlug)}&venueId=${encodeURIComponent(input.venueId)}&session=${encodeURIComponent(input.sessionId)}&token=${encodeURIComponent(input.token)}&exp=${input.expiresAt.getTime()}`;
}

export async function getVenueById(id: string) {
  return prisma.venue.findUnique({
    where: { id },
  });
}

export async function getActiveVenueSessionByVenueId(venueId: string) {
  return prisma.venueQrSession.findFirst({
    where: {
      venueId,
      status: { in: [...LIVE_SESSION_STATUSES] },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getVenueQrPayloadByVenueId(
  venueId: string,
  at: Date = new Date()
): Promise<VenueQrPayload | null> {
  const [venue, session] = await Promise.all([
    prisma.venue.findUnique({
      where: { id: venueId },
      select: {
        id: true,
        slug: true,
        status: true,
      },
    }),
    getActiveVenueSessionByVenueId(venueId),
  ]);

  if (!venue || venue.status !== 'ACTIVE' || !session || session.status !== 'LIVE') {
    return null;
  }

  if (session.endsAt && session.endsAt <= at) {
    return null;
  }

  const rotation = getRotationWindow(session, at);
  const token = createVenueHandshakeToken({
    venueId: venue.id,
    sessionId: session.id,
    sessionKey: session.sessionKey,
    scope: session.scope,
    windowStartedAt: rotation.windowStartedAt,
  });

  return {
    token,
    scope: session.scope,
    venueId: venue.id,
    sessionId: session.id,
    venueSlug: venue.slug,
    windowStartedAt: rotation.windowStartedAt.toISOString(),
    expiresAt: rotation.expiresAt.toISOString(),
    qrValue: buildVenueHandshakeValue({
      venueSlug: venue.slug,
      venueId: venue.id,
      sessionId: session.id,
      token,
      scope: session.scope,
      expiresAt: rotation.expiresAt,
    }),
  };
}

export async function validateVenueHandshakeToken(input: {
  venueId: string;
  sessionId: string;
  token: string;
  at?: Date;
}) {
  const at = input.at ?? new Date();
  const session = await prisma.venueQrSession.findFirst({
    where: {
      id: input.sessionId,
      venueId: input.venueId,
    },
    select: {
      id: true,
      venueId: true,
      sessionKey: true,
      scope: true,
      status: true,
      rotationSeconds: true,
      lastRotatedAt: true,
      endsAt: true,
    },
  });

  if (!session || session.status !== 'LIVE') {
    return { ok: false as const, reason: 'SESSION_NOT_LIVE' };
  }

  if (session.endsAt && session.endsAt <= at) {
    return { ok: false as const, reason: 'SESSION_EXPIRED' };
  }

  const currentWindow = getRotationWindow(session, at);
  const previousWindowStartedAt = new Date(
    currentWindow.windowStartedAt.getTime() - Math.max(15, session.rotationSeconds) * 1000
  );

  const candidateWindows = [
    currentWindow.windowStartedAt,
    previousWindowStartedAt,
  ];

  for (const windowStartedAt of candidateWindows) {
    const expected = createVenueHandshakeToken({
      venueId: session.venueId,
      sessionId: session.id,
      sessionKey: session.sessionKey,
      scope: session.scope,
      windowStartedAt,
    });

    if (expected === input.token) {
      const expiresAt = new Date(windowStartedAt.getTime() + Math.max(15, session.rotationSeconds) * 1000);
      return {
        ok: true as const,
        session,
        windowStartedAt,
        expiresAt,
      };
    }
  }

  return { ok: false as const, reason: 'INVALID_TOKEN' };
}

export async function getFeaturedVenues(limit = 4) {
  const venues = await prisma.venue.findMany({
    where: {
      status: 'ACTIVE',
    },
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
      categories: true,
      isPartner: true,
      partnerTier: true,
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
    },
    orderBy: [
      { isPartner: 'desc' },
      { updatedAt: 'desc' },
    ],
    take: limit,
  });

  const tagSummaryMap = await getApprovedTagSummaryMap(venues.map((venue) => venue.id));

  return venues.map((venue) => ({
    id: venue.id,
    slug: venue.slug,
    name: venue.name,
    city: venue.city,
    country: venue.country,
    latitude: venue.latitude,
    longitude: venue.longitude,
    categories: venue.categories,
    isPartner: venue.isPartner,
    partnerTier: venue.partnerTier,
    memorySummary: mapMemorySummary(venue.memories[0] ?? null),
    tagSummary: getVenueTagSummary(tagSummaryMap, venue.id),
    liveSession: mapSessionSummary(venue.qrSessions[0] ?? null),
  }));
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
  const radiusKm = radiusMeters / 1000;
  const bounds = getBoundingBox(lat, lng, radiusKm);

  const venues = await prisma.venue.findMany({
    where: {
      status: 'ACTIVE',
      latitude: {
        gte: bounds.minLat,
        lte: bounds.maxLat,
      },
      longitude: {
        gte: bounds.minLng,
        lte: bounds.maxLng,
      },
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
      campaigns: {
        select: {
          id: true,
        },
      },
      dares: {
        where: {
          NOT: {
            OR: [
              { status: { in: [...TERMINAL_DARE_STATUSES] } },
              { expiresAt: { lt: new Date() } },
            ],
          },
        },
        select: {
          id: true,
        },
      },
      _count: {
        select: {
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

  const tagSummaryMap = await getApprovedTagSummaryMap(venues.map((venue) => venue.id));

  const nearbyVenues: NearbyVenueItem[] = venues
    .map((venue) => {
      const distanceKm = calculateDistance(lat, lng, venue.latitude, venue.longitude);
      if (distanceKm > radiusKm) {
        return null;
      }

      const commandCenter = buildVenueCommandCenterSummary({
        slug: venue.slug,
        isPartner: venue.isPartner,
        activeCampaignCount: venue.campaigns.length,
        hasLiveSession: Boolean(venue.qrSessions[0]),
        paidActivationCount: 0,
      });

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
        tagSummary: getVenueTagSummary(tagSummaryMap, venue.id),
        liveSession: mapSessionSummary(venue.qrSessions[0] ?? null),
        commandCenter,
        mapModes: buildVenueExperienceModes(),
        activeDareCount: venue.dares.length,
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

export async function getVenueDetailBySlug(
  slug: string,
  creatorWalletAddress?: string | null
): Promise<VenueDetail | null> {
  const now = new Date();
  const normalizedCreatorWallet = normalizeWalletAddress(creatorWalletAddress);
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
      campaigns: {
        select: {
          id: true,
        },
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
          requireSentinel: true,
          sentinelVerified: true,
          targetWalletAddress: true,
          claimedBy: true,
          claimRequestTag: true,
          claimRequestedAt: true,
          claimRequestStatus: true,
          linkedCampaign: {
            select: {
              title: true,
              brand: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!venue) {
    return null;
  }

  const [scansLastHour, uniqueVisitorRows, recentCheckIns, recentTags] = await Promise.all([
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
    getRecentApprovedPlaceTagsByVenueId(venue.id, 12),
  ]);

  const tagSummaryMap = await getApprovedTagSummaryMap([venue.id]);
  const tagSummary = getVenueTagSummary(tagSummaryMap, venue.id);
  const activeDares = venue.dares.map(mapActiveDare);
  const paidActivationCount = venue.dares.filter((dare) => Boolean(dare.linkedCampaign?.brand.name)).length;
  const commandCenter = buildVenueCommandCenterSummary({
    slug: venue.slug,
    isPartner: venue.isPartner,
    activeCampaignCount: venue.campaigns.length,
    hasLiveSession: Boolean(venue.qrSessions[0]),
    paidActivationCount,
  });
  const creatorContribution: VenueCreatorContribution | null = normalizedCreatorWallet
    ? await (async () => {
        const [creatorTags, tagLeaderboard, primaryCreatorTag] = await Promise.all([
          prisma.placeTag.findMany({
            where: {
              venueId: venue.id,
              walletAddress: normalizedCreatorWallet,
              status: 'APPROVED',
            },
            orderBy: { submittedAt: 'asc' },
            select: {
              source: true,
              firstMark: true,
              heatContribution: true,
              submittedAt: true,
            },
          }),
          prisma.placeTag.groupBy({
            by: ['walletAddress'],
            where: {
              venueId: venue.id,
              status: 'APPROVED',
            },
            _count: { _all: true },
          }),
          findPrimaryCreatorTagForWallet(normalizedCreatorWallet),
        ]);

        if (creatorTags.length === 0) {
          return null;
        }

        const totalMarksHere = creatorTags.length;
        const totalWinsHere = creatorTags.filter((tag) => tag.source === 'DARE_COMPLETION').length;
        const firstMarksHere = creatorTags.filter((tag) => tag.firstMark).length;
        const pulseContribution = creatorTags.reduce((sum, tag) => sum + (tag.heatContribution ?? 0), 0);
        const topLocalCount = tagLeaderboard.reduce(
          (max, row) => Math.max(max, row._count._all),
          0
        );

        return {
          walletAddress: normalizedCreatorWallet,
          creatorTag: primaryCreatorTag?.tag ?? null,
          totalMarksHere,
          totalWinsHere,
          firstMarksHere,
          pulseContribution,
          shareOfVenuePulse: tagSummary.heatScore
            ? pulseContribution / Math.max(1, tagSummary.heatScore)
            : 0,
          lastMarkedAt: creatorTags.at(-1)?.submittedAt.toISOString() ?? null,
          isTopLocalSignal: totalMarksHere > 0 && totalMarksHere === topLocalCount,
        };
      })()
    : null;
  const recentTagsWithOwnership = recentTags.map((tag) => ({
    ...tag,
    isOwn: normalizedCreatorWallet ? tag.walletAddress.toLowerCase() === normalizedCreatorWallet : false,
  }));

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
    tagSummary,
    liveSession: mapSessionSummary(venue.qrSessions[0] ?? null),
    commandCenter,
    mapModes: buildVenueExperienceModes(),
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
    recentTags: recentTagsWithOwnership,
    creatorContribution,
    activeDares,
    paidActivationCount,
    featuredPaidActivation: getFeaturedPaidActivation(activeDares),
    consoleUrl: `/venues/${venue.slug}/console`,
  };
}
