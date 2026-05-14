import { NextResponse } from 'next/server';

import {
  cloneActiveVenueFallbacks,
  type ActiveVenueCard,
  type ActiveVenueTone,
} from '@/lib/home-active-venues';
import { prisma } from '@/lib/prisma';
import { buildVenueGuestMission, buildVenueGuestMissionActivationHref } from '@/lib/venue-guest-missions';
import { getActiveVenuePerk } from '@/lib/venue-perks';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ACTIVE_VENUE_QUERY_TIMEOUT_MS = 700;
const ACTIVE_VENUE_FALLBACK_COOLDOWN_MS = 30_000;
const LIVE_SESSION_STATUSES = ['LIVE', 'PAUSED'] as const;
const TERMINAL_DARE_STATUSES = ['EXPIRED', 'FAILED', 'VERIFIED', 'PAID', 'COMPLETED'] as const;
let activeVenueFallbackUntil = 0;

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Active venue query timed out')), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function getVenueTone(categories: string[], index: number): ActiveVenueTone {
  const normalized = categories.map((category) => category.toLowerCase());
  if (normalized.some((category) => category.includes('night') || category.includes('bar'))) return 'gold';
  if (normalized.some((category) => category.includes('surf') || category.includes('beach'))) return 'cyan';
  if (normalized.some((category) => category.includes('food') || category.includes('cafe') || category.includes('coffee'))) {
    return 'emerald';
  }
  return index % 2 === 0 ? 'purple' : 'cyan';
}

function buildMissionHref(input: {
  slug: string;
  name: string;
  area: string;
  mission: ReturnType<typeof buildVenueGuestMission>;
}) {
  return buildVenueGuestMissionActivationHref({
    source: 'active-venues',
    venueSlug: input.slug,
    venueName: input.name,
    city: input.area,
    mission: input.mission,
  });
}

async function fetchActiveVenues(): Promise<ActiveVenueCard[]> {
  const now = new Date();
  const today = startOfDay(now);

  const venues = await prisma.venue.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: [{ isPartner: 'desc' }, { updatedAt: 'desc' }],
    take: 12,
    select: {
      slug: true,
      name: true,
      city: true,
      country: true,
      categories: true,
      isPartner: true,
      metadataJson: true,
      memories: {
        orderBy: { bucketStartAt: 'desc' },
        take: 1,
        select: {
          checkInCount: true,
          proofCount: true,
          perkRedemptionCount: true,
          uniqueVisitorCount: true,
        },
      },
      qrSessions: {
        where: {
          status: { in: [...LIVE_SESSION_STATUSES] },
        },
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: {
          id: true,
          status: true,
          lastCheckInAt: true,
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
        take: 2,
        select: {
          id: true,
          title: true,
        },
      },
      checkIns: {
        where: {
          status: 'CONFIRMED',
          scannedAt: { gte: today },
        },
        take: 20,
        select: {
          id: true,
        },
      },
      placeTags: {
        where: {
          status: 'APPROVED',
        },
        orderBy: { submittedAt: 'desc' },
        take: 20,
        select: {
          id: true,
        },
      },
    },
  });

  return venues.slice(0, 4).map((venue, index) => {
    const memory = venue.memories[0] ?? null;
    const activePerk = getActiveVenuePerk(venue.metadataJson);
    const checkInsToday = Math.max(memory?.checkInCount ?? 0, venue.checkIns.length);
    const proofCount = Math.max(memory?.proofCount ?? 0, venue.placeTags.length);
    const liveMission = venue.dares[0] ?? null;
    const hasLiveSession = venue.qrSessions.length > 0;
    const hasPerk = Boolean(activePerk);
    const guestMission = buildVenueGuestMission({
      venueName: venue.name,
      categories: venue.categories,
      activePerk,
      liveSession: venue.qrSessions[0] ?? null,
      hasActiveDrops: venue.dares.length > 0,
    });
    const statusLabel = liveMission
      ? 'Live mission'
      : hasPerk
        ? 'Perk active'
        : hasLiveSession
          ? 'Live check-in'
          : checkInsToday + proofCount > 0
            ? 'Proof trail'
            : venue.isPartner
              ? 'Partner ready'
              : 'Pilot-ready';

    const area = [venue.city, venue.country].filter(Boolean).join(', ') || 'Local venue';
    const missionTitle = liveMission?.title ?? guestMission.missionTitle;
    const perkLabel = activePerk?.title ?? guestMission.perkLabel;

    return {
      slug: venue.slug,
      name: venue.name,
      area,
      tone: getVenueTone(venue.categories, index),
      statusLabel,
      missionTitle,
      guestMission: guestMission.guestMission,
      perkLabel,
      checkInsToday,
      proofCount,
      activityLabel: hasLiveSession ? 'QR rail live' : hasPerk ? 'Perk rail live' : 'Guest loop ready',
      primaryHref: `/map?place=${encodeURIComponent(venue.slug)}&source=active-venues`,
      missionHref: buildMissionHref({
        slug: venue.slug,
        name: venue.name,
        area,
        mission: {
          ...guestMission,
          missionTitle,
          perkLabel,
          goal: hasLiveSession || hasPerk ? 'foot_traffic' : proofCount > 0 ? 'ugc' : guestMission.goal,
        },
      }),
    };
  });
}

export async function GET() {
  if (Date.now() < activeVenueFallbackUntil) {
    const response = NextResponse.json({
      success: true,
      data: {
        venues: cloneActiveVenueFallbacks(),
        source: 'fallback',
      },
    });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  }

  try {
    const venues = await withTimeout(fetchActiveVenues(), ACTIVE_VENUE_QUERY_TIMEOUT_MS);
    const response = NextResponse.json({
      success: true,
      data: {
        venues: venues.length > 0 ? venues : cloneActiveVenueFallbacks(),
        source: venues.length > 0 ? 'database' : 'fallback',
      },
    });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error) {
    console.error('[ACTIVE_VENUES] Falling back:', error instanceof Error ? error.message : error);
    activeVenueFallbackUntil = Date.now() + ACTIVE_VENUE_FALLBACK_COOLDOWN_MS;
    const response = NextResponse.json({
      success: true,
      data: {
        venues: cloneActiveVenueFallbacks(),
        source: 'fallback',
      },
    });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  }
}
