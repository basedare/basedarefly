import { NextResponse } from 'next/server';

import {
  cloneActiveVenueFallbacks,
  type ActiveVenueCard,
  type ActiveVenueTone,
} from '@/lib/home-active-venues';
import { prisma } from '@/lib/prisma';
import { getActiveVenuePerk } from '@/lib/venue-perks';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ACTIVE_VENUE_QUERY_TIMEOUT_MS = 900;
const LIVE_SESSION_STATUSES = ['LIVE', 'PAUSED'] as const;
const TERMINAL_DARE_STATUSES = ['EXPIRED', 'FAILED', 'VERIFIED', 'PAID', 'COMPLETED'] as const;

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

function buildGuestMission(categories: string[], venueName: string) {
  const normalized = categories.map((category) => category.toLowerCase());
  if (normalized.some((category) => category.includes('night') || category.includes('bar'))) {
    return {
      mission: 'Check in tonight and unlock the crew receipt.',
      perk: 'Entry/status perk',
      title: `${venueName} night check-in`,
    };
  }
  if (normalized.some((category) => category.includes('surf') || category.includes('beach'))) {
    return {
      mission: 'Scan the hidden QR and vote for the best proof.',
      perk: 'Local status stamp',
      title: `${venueName} surf proof loop`,
    };
  }
  if (normalized.some((category) => category.includes('food') || category.includes('cafe') || category.includes('coffee'))) {
    return {
      mission: 'Vote for the best order and share a receipt card.',
      perk: 'Secret menu signal',
      title: `${venueName} food proof`,
    };
  }
  return {
    mission: 'Check in, bring a friend, and collect the venue receipt.',
    perk: 'Crowd unlock',
    title: `${venueName} guest mission`,
  };
}

function buildMissionHref(input: { slug: string; name: string; goal: 'foot_traffic' | 'ugc' | 'repeat_visits' }) {
  const params = new URLSearchParams({
    source: 'active-venues',
    venueSlug: input.slug,
    venueName: input.name,
    goal: input.goal,
    offer: 'first-spark',
  });

  return `/activations?${params.toString()}#activation-intake`;
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
    const guestMission = buildGuestMission(venue.categories, venue.name);
    const checkInsToday = Math.max(memory?.checkInCount ?? 0, venue.checkIns.length);
    const proofCount = Math.max(memory?.proofCount ?? 0, venue.placeTags.length);
    const liveMission = venue.dares[0] ?? null;
    const hasLiveSession = venue.qrSessions.length > 0;
    const hasPerk = Boolean(activePerk);
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

    return {
      slug: venue.slug,
      name: venue.name,
      area: [venue.city, venue.country].filter(Boolean).join(', ') || 'Local venue',
      tone: getVenueTone(venue.categories, index),
      statusLabel,
      missionTitle: liveMission?.title ?? guestMission.title,
      guestMission: guestMission.mission,
      perkLabel: activePerk?.title ?? guestMission.perk,
      checkInsToday,
      proofCount,
      activityLabel: hasLiveSession ? 'QR rail live' : hasPerk ? 'Perk rail live' : 'Guest loop ready',
      primaryHref: `/map?place=${encodeURIComponent(venue.slug)}&source=active-venues`,
      missionHref: buildMissionHref({
        slug: venue.slug,
        name: venue.name,
        goal: hasLiveSession || hasPerk ? 'foot_traffic' : proofCount > 0 ? 'ugc' : 'repeat_visits',
      }),
    };
  });
}

export async function GET() {
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
