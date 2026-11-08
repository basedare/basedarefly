import { publicLocalSignalItems } from '@/lib/community-stories';
import { publishCommunityStory } from '@/lib/community-story-publish';
import { boundedRequestBytes } from '@/lib/bounded-request';
import { sameOrigin } from '@/lib/social-request';
import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { isAddress } from 'viem';
import { z } from 'zod';

import {
  getCommunityPostSafetyError,
  getLocalPostDefaultWindow,
  localPostRequiresPlace,
  LOCAL_POST_TYPES,
} from '@/lib/community-around-policy';
import { ensureCuratedVenueRecords } from '@/lib/curated-venues';
import {
  LOCAL_SIGNAL_EVENT_TYPE,
  localSignalIsCurrentlyRelevant,
} from '@/lib/local-signals';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';
import { resolveHostBaretag } from '@/lib/meetups-server';
import { alertLocalSignalSubmission } from '@/lib/telegram';

const LocalSignalQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.2).max(100).default(15),
  postType: z.enum(['story']).optional(),
  limit: z.coerce.number().min(1).max(25).default(10),
});
const LOCAL_SIGNALS_TIMEOUT_MS = 1200;
const LOCAL_SIGNALS_CACHE_HEADER = 'private, no-store';

const LocalSignalPostSchema = z.object({
  title: z.string().min(3).max(140),
  postType: z.enum(LOCAL_POST_TYPES).default('signal'),
  category: z.enum(['surf', 'food', 'music', 'nightlife', 'market', 'wellness', 'tour', 'community', 'other']).default('other'),
  venueName: z.string().max(140).optional().default(''),
  venueSlug: z.string().max(100).optional().default(''),
  city: z.string().max(120).optional().default(''),
  notes: z.string().max(700).optional().default(''),
  sourceUrl: z.union([z.string().url().max(300), z.literal('')]).optional().default(''),
  startsAt: z.union([z.string().datetime(), z.literal('')]).optional().default(''),
  endsAt: z.union([z.string().datetime(), z.literal('')]).optional().default(''),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  submittedBy: z.string().max(160).optional().default(''),
  walletAddress: z.string().refine((value) => isAddress(value), 'Valid walletAddress required').optional(),
  companyWebsite: z.string().max(240).optional().default(''),
});

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = LocalSignalQuerySchema.safeParse({
      lat: searchParams.get('lat') ?? undefined,
      lng: searchParams.get('lng') ?? undefined,
      radiusKm: searchParams.get('radiusKm') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      postType: searchParams.get('postType') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const origin =
      typeof parsed.data.lat === 'number' && typeof parsed.data.lng === 'number'
        ? { latitude: parsed.data.lat, longitude: parsed.data.lng }
        : null;

    const events = await withTimeout(prisma.founderEvent.findMany({
      where: {
        eventType: LOCAL_SIGNAL_EVENT_TYPE,
        status: 'APPROVED',
        ...(parsed.data.postType ? { metadataJson: { path: ['postType'], equals: parsed.data.postType } } : {}),
      },
      orderBy: [{ occurredAt: 'desc' }],
      take: 100,
    }), LOCAL_SIGNALS_TIMEOUT_MS, 'Local signals query timed out');

    const signals = [
      ...await publicLocalSignalItems(events, origin),

    ]
      .filter((signal) => localSignalIsCurrentlyRelevant(signal))
      .filter((signal) => signal.distanceKm === null || signal.distanceKm <= parsed.data.radiusKm)
      .sort((a, b) => {
        if (parsed.data.postType === 'story') return Date.parse(b.createdAt) - Date.parse(a.createdAt);
        const aStart = a.startsAt ? new Date(a.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bStart = b.startsAt ? new Date(b.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
        if (aStart !== bStart) return aStart - bStart;
        return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
      })
      .slice(0, parsed.data.limit);

    const response = NextResponse.json({
      success: true,
      data: {
        signals,
        count: signals.length,
      },
    });
    response.headers.set('Cache-Control', LOCAL_SIGNALS_CACHE_HEADER);
    response.headers.set('X-BaseDare-Data-Source', 'database');
    return response;
  } catch (error) {
    console.error('[LOCAL_SIGNALS] Failed to load public signals:', error);
    return NextResponse.json({ success: false, error: 'Local posts could not load. Try again.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ success: false, error: 'Invalid origin.' }, { status: 403 });
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, {
    limit: 8,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'local-signal',
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many local signals. Try again later.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const body = JSON.parse(new TextDecoder().decode(await boundedRequestBytes(request, 8192)));
    if (body.postType === 'story') return await publishCommunityStory(request, body);
    const parsed = LocalSignalPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const input = parsed.data;
    if (input.companyWebsite) {
      return NextResponse.json({ success: true, data: { received: true } });
    }

    const title = cleanText(input.title);
    const requestedVenueSlug = cleanText(input.venueSlug).toLowerCase();
    let venueId: string | null = null;
    let venueSlug = requestedVenueSlug;
    let venueName = cleanText(input.venueName);
    let city = cleanText(input.city);
    const notes = input.notes.trim();
    let sourceUrl = cleanText(input.sourceUrl);
    let latitude = input.latitude ?? null;
    let longitude = input.longitude ?? null;
    let startsAt = input.startsAt || null;
    let endsAt = input.endsAt || null;
    let submittedBy = cleanText(input.submittedBy);

    if (localPostRequiresPlace(input.postType)) {
      if (!venueSlug) {
        return NextResponse.json(
          { success: false, error: 'Ask and Offer posts must be attached to a public place.' },
          { status: 400, headers: createRateLimitHeaders(rateLimit) }
        );
      }

      const safetyError = getCommunityPostSafetyError({ title, notes });
      if (safetyError) {
        return NextResponse.json(
          { success: false, error: safetyError },
          { status: 400, headers: createRateLimitHeaders(rateLimit) }
        );
      }

      const baretag = await resolveHostBaretag(request, input.walletAddress ?? null, {
        action: 'community-post:create',
        resource: `venue:${venueSlug}`,
      });
      if (!baretag) {
        return NextResponse.json(
          { success: false, error: 'Claim a Baretag before posting a local Ask or Offer.' },
          { status: 401, headers: createRateLimitHeaders(rateLimit) }
        );
      }

      await ensureCuratedVenueRecords([venueSlug]);
      const venue = await prisma.venue.findUnique({
        where: { slug: venueSlug },
        select: { id: true, slug: true, name: true, city: true, latitude: true, longitude: true, status: true },
      });
      if (!venue || venue.status !== 'ACTIVE') {
        return NextResponse.json(
          { success: false, error: 'Choose an active BaseDare place for this post.' },
          { status: 400, headers: createRateLimitHeaders(rateLimit) }
        );
      }

      const window = getLocalPostDefaultWindow();
      venueId = venue.id;
      venueSlug = venue.slug;
      venueName = venue.name;
      city = venue.city || city;
      latitude = venue.latitude;
      longitude = venue.longitude;
      startsAt = window.startsAt;
      endsAt = window.endsAt;
      submittedBy = `@${baretag.tag.replace(/^@/, '')}`;
      sourceUrl = '';
    }

    const event = await prisma.founderEvent.create({
      data: {
        eventType: LOCAL_SIGNAL_EVENT_TYPE,
        source: 'site',
        subjectType: 'local_signal',
        subjectId: null,
        dedupeKey: `local-signal:${Date.now()}:${randomUUID()}`,
        title,
        status: 'NEW',
        actor: submittedBy || null,
        href: '/admin/local-signals',
        venueId,
        venueSlug: venueSlug || null,
        metadataJson: {
          title,
          postType: input.postType,
          category: input.category,
          venueSlug,
          venueName,
          city,
          notes,
          sourceUrl,
          startsAt,
          endsAt,
          latitude,
          longitude,
          submittedBy,
          sourceAttribution: '',
          clientIp,
        } satisfies Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    void alertLocalSignalSubmission({
      signalId: event.id,
      title,
      category: input.category,
      venueName,
      city,
      startsAt,
      notes,
      submittedBy,
    }).catch((error) => {
      console.error('[LOCAL_SIGNALS] Telegram alert failed:', error);
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: event.id,
          status: 'NEW',
        },
      },
      { headers: createRateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    console.error('[LOCAL_SIGNALS] Failed to submit local signal:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error && error.message === 'STORY_LIMIT' ? 'You can share five experiences per day.' : 'Could not submit this post. Try again.' },
      { status: error instanceof Error && error.message === 'STORY_LIMIT' ? 429 : 503, headers: createRateLimitHeaders(rateLimit) }
    );
  }
}
