import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';
import { MEETUP_TYPES, MEETUP_LIVE_WINDOW_MS, isHappeningNow, isStartTimeInBounds, roundCoord } from '@/lib/meetups';
import { isAddress } from 'viem';
import { resolveHostBaretag, resolveViewerBaretag, getBlockedBaretagIds } from '@/lib/meetups-server';

// ============================================================================
// FREE MEETUP LAYER — read + create. No settlement, payouts, or value, ever.
// Viewing is open; posting requires a session-owned claimed Baretag.
// ============================================================================

// GET /api/meetups — read-only feed of live meetups (read-time expiry from startTime).
export async function GET() {
  try {
    // Optional viewer: if signed in, hide meetups from creators they've blocked.
    // Read-only resolver (no bearer needed) so a normal signed-in map fetch is recognized.
    const viewer = await resolveViewerBaretag();
    const blocked = await getBlockedBaretagIds(viewer?.id ?? null);

    const now = Date.now();
    const cutoff = new Date(now - MEETUP_LIVE_WINDOW_MS); // exclude expired at read time

    const meetups = await prisma.meetup.findMany({
      where: {
        status: 'active',
        startTime: { gte: cutoff },
        ...(blocked.length ? { creatorBaretagId: { notIn: blocked } } : {}),
      },
      orderBy: { startTime: 'asc' },
      take: 200,
    });

    // Join creator Baretag display fields (tag/pfp) by id — plain-string join.
    const creatorIds = [...new Set(meetups.map((m) => m.creatorBaretagId))];
    const creators = creatorIds.length
      ? await prisma.streamerTag.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, tag: true, pfpUrl: true },
        })
      : [];
    const creatorById = new Map(creators.map((c) => [c.id, c]));

    const data = meetups.map((m) => {
      const creator = creatorById.get(m.creatorBaretagId);
      return {
        id: m.id,
        title: m.title,
        type: m.type,
        placeLabel: m.placeLabel,
        venueId: m.venueId,
        approxLat: m.approxLat, // rounded at write time — never exact/raw GPS
        approxLng: m.approxLng,
        startTime: m.startTime.toISOString(),
        note: m.note,
        happeningNow: isHappeningNow(m.startTime, now),
        creator: creator ? { tag: creator.tag, pfpUrl: creator.pfpUrl } : null,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MEETUPS] GET failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to load meetups' }, { status: 500 });
  }
}

// POST /api/meetups — create a meetup (Baretag-gated, rate-limited, coords rounded).
const CreateMeetupSchema = z.object({
  title: z.string().min(2).max(120),
  type: z.enum(MEETUP_TYPES),
  placeLabel: z.string().min(2).max(140),
  venueId: z.string().max(60).optional(),
  venueSlug: z.string().max(80).optional(),
  walletAddress: z
    .string()
    .refine((value) => isAddress(value), 'Valid walletAddress required')
    .optional(),
  approxLat: z.number().min(-90).max(90),
  approxLng: z.number().min(-180).max(180),
  startTime: z.string().datetime(),
  note: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'meetup-create',
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many meetups created. Try again later.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const parsed = CreateMeetupSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid meetup' },
        { status: 400 }
      );
    }
    const input = parsed.data;

    // Ownership gate: session OR signed wallet-action (same auth as proofs
    // and verdicts) — either way the Baretag is derived server-side, never
    // trusted from the client.
    const baretag = await resolveHostBaretag(request, input.walletAddress ?? null);
    if (!baretag) {
      return NextResponse.json(
        { success: false, error: 'No claimed Baretag on this wallet yet — claim your @tag to host meetups.' },
        { status: 401 }
      );
    }

    const startTime = new Date(input.startTime);
    if (!isStartTimeInBounds(startTime)) {
      return NextResponse.json(
        { success: false, error: 'Start time must be within the next 72 hours and not in the past.' },
        { status: 400 }
      );
    }

    // Place binding: prefer a real venue's public coords; else round the picked area.
    let approxLat = roundCoord(input.approxLat);
    let approxLng = roundCoord(input.approxLng);
    let placeLabel = input.placeLabel.trim();
    let venueId: string | null = null;
    if (input.venueId || input.venueSlug) {
      // Clients may know the venue by slug only (the map panel does) — both
      // resolve to the same public binding.
      const venue = await prisma.venue.findUnique({
        where: input.venueId ? { id: input.venueId } : { slug: input.venueSlug as string },
        select: { id: true, name: true, latitude: true, longitude: true },
      });
      if (venue) {
        venueId = venue.id;
        approxLat = roundCoord(venue.latitude);
        approxLng = roundCoord(venue.longitude);
        placeLabel = placeLabel || venue.name;
      }
    }

    const meetup = await prisma.meetup.create({
      data: {
        creatorBaretagId: baretag.id, // SERVER-DERIVED
        title: input.title.trim(),
        type: input.type,
        venueId,
        placeLabel,
        approxLat,
        approxLng,
        startTime,
        note: input.note?.trim() || null,
        status: 'active',
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, data: { id: meetup.id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MEETUPS] POST failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to create meetup' }, { status: 500 });
  }
}
