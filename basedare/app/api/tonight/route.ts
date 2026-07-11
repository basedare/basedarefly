import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';
import { calculateDistance, isValidCoordinates } from '@/lib/geo';
import { resolveRadiusKm } from '@/lib/proof-proximity-policy';
import { resolveViewerBaretag, getBlockedBaretagIds } from '@/lib/meetups-server';
import {
  tonightWindow,
  isValidTimeZone,
  isMeetupTonight,
  isDareTonight,
  shapeMeetup,
  shapeDare,
  dedupeActivities,
  computeTotals,
  roundCoord3,
  GRACE_STARTED_MS,
  type TonightActivity,
} from '@/lib/tonight';

// ============================================================================
// GET /api/tonight — the "what is happening here soon" aggregation (playbook
// social-coordination-layer, task A1). Location-agnostic: the caller supplies
// the map center; "tonight" is computed in the DESTINATION's timezone (param →
// nearest venue's timezone → UTC). Returns only public, approved activity with
// approximate coordinates and HONEST counts — zeros are zeros; empty-state
// presentation and density thresholds belong to the UI, never this layer.
// ============================================================================

const TonightQuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radiusKm: z.coerce.number().optional(),
  tz: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`tonight:${getClientIp(request)}`, { limit: 60, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Try again shortly.' },
      { status: 429, headers: createRateLimitHeaders(rate) }
    );
  }

  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const validation = TonightQuerySchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { lat, lng } = validation.data;
    if (!isValidCoordinates(lat, lng)) {
      return NextResponse.json(
        { success: false, error: 'Invalid coordinates.' },
        { status: 400 }
      );
    }
    if (validation.data.tz && !isValidTimeZone(validation.data.tz)) {
      return NextResponse.json(
        { success: false, error: 'Unknown timezone.' },
        { status: 400 }
      );
    }

    const radiusKm = resolveRadiusKm(validation.data.radiusKm ?? null);
    const limit = validation.data.limit ?? 50;
    const now = new Date();

    // Bounding box prefilter (exact distance is applied after).
    const latDeg = radiusKm / 110.574;
    const lngDeg = radiusKm / (111.32 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
    const box = {
      latMin: lat - latDeg,
      latMax: lat + latDeg,
      lngMin: lng - lngDeg,
      lngMax: lng + lngDeg,
    };

    // Destination timezone: explicit param → nearest venue's timezone → UTC.
    let tz = validation.data.tz ?? null;
    if (!tz) {
      const venueTz = await prisma.venue.findFirst({
        where: {
          latitude: { gte: box.latMin, lte: box.latMax },
          longitude: { gte: box.lngMin, lte: box.lngMax },
        },
        select: { timezone: true },
      });
      tz = venueTz && isValidTimeZone(venueTz.timezone) ? venueTz.timezone : 'UTC';
    }
    const window = tonightWindow(now, tz);

    // Optional viewer (session-only, read-only): powers viewer.rsvped and the
    // meetup blocklist. Anonymous viewers simply get identified:false.
    const viewer = await resolveViewerBaretag();
    const blocked = await getBlockedBaretagIds(viewer?.id ?? null);

    const [meetups, dares] = await Promise.all([
      prisma.meetup.findMany({
        where: {
          status: 'active',
          startTime: { gte: new Date(now.getTime() - GRACE_STARTED_MS), lte: window.endUtc },
          approxLat: { gte: box.latMin, lte: box.latMax },
          approxLng: { gte: box.lngMin, lte: box.lngMax },
          ...(blocked.length ? { creatorBaretagId: { notIn: blocked } } : {}),
        },
        include: { _count: { select: { rsvps: true } } },
        orderBy: { startTime: 'asc' },
        take: 200,
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
          bounty: true,
          latitude: true,
          longitude: true,
          venueId: true,
          locationLabel: true,
          expiresAt: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    const viewerRsvpedIds = new Set<string>();
    if (viewer && meetups.length) {
      const rsvps = await prisma.meetupRsvp.findMany({
        where: { baretagId: viewer.id, meetupId: { in: meetups.map((m) => m.id) } },
        select: { meetupId: true },
      });
      for (const r of rsvps) viewerRsvpedIds.add(r.meetupId);
    }

    const identified = Boolean(viewer);
    const activities: TonightActivity[] = [];

    for (const meetup of meetups) {
      if (!isMeetupTonight(meetup, window, now.getTime())) continue;
      const distanceKm = calculateDistance(lat, lng, meetup.approxLat, meetup.approxLng);
      if (distanceKm > radiusKm) continue;
      activities.push(
        shapeMeetup(meetup, {
          goingCount: meetup._count.rsvps,
          viewerIdentified: identified,
          viewerRsvped: viewerRsvpedIds.has(meetup.id),
          distanceKm: Math.round(distanceKm * 100) / 100,
        })
      );
    }

    for (const dare of dares) {
      if (!isDareTonight(dare, now.getTime())) continue;
      const distanceKm = calculateDistance(lat, lng, dare.latitude!, dare.longitude!);
      if (distanceKm > radiusKm) continue;
      activities.push(
        shapeDare(
          { ...dare, latitude: dare.latitude!, longitude: dare.longitude! },
          { viewerIdentified: identified, distanceKm: Math.round(distanceKm * 100) / 100 }
        )
      );
    }

    const deduped = dedupeActivities(activities)
      .sort((a, b) => {
        const aStart = a.startsAt ? new Date(a.startsAt).getTime() : now.getTime();
        const bStart = b.startsAt ? new Date(b.startsAt).getTime() : now.getTime();
        if (aStart !== bStart) return aStart - bStart;
        return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
      })
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        window: {
          startUtc: window.startUtc.toISOString(),
          endUtc: window.endUtc.toISOString(),
          tz: window.tz,
        },
        center: { lat: roundCoord3(lat), lng: roundCoord3(lng), radiusKm },
        totals: computeTotals(deduped),
        activities: deduped,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TONIGHT] aggregation failed:', message);
    return NextResponse.json(
      { success: false, error: 'Could not load tonight’s activity. Try again shortly.' },
      { status: 500 }
    );
  }
}
