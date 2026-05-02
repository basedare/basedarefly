import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import {
  LOCAL_SIGNAL_EVENT_TYPE,
  localSignalIsCurrentlyRelevant,
  serializeLocalSignal,
} from '@/lib/local-signals';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';
import { alertLocalSignalSubmission } from '@/lib/telegram';

const LocalSignalQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.2).max(100).default(15),
  limit: z.coerce.number().min(1).max(25).default(10),
});

const LocalSignalPostSchema = z.object({
  title: z.string().min(3).max(140),
  category: z.enum(['surf', 'food', 'music', 'nightlife', 'market', 'wellness', 'tour', 'community', 'other']).default('other'),
  venueName: z.string().max(140).optional().default(''),
  city: z.string().max(120).optional().default(''),
  notes: z.string().max(700).optional().default(''),
  sourceUrl: z.union([z.string().url().max(300), z.literal('')]).optional().default(''),
  startsAt: z.union([z.string().datetime(), z.literal('')]).optional().default(''),
  endsAt: z.union([z.string().datetime(), z.literal('')]).optional().default(''),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  submittedBy: z.string().max(160).optional().default(''),
  companyWebsite: z.string().max(240).optional().default(''),
});

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = LocalSignalQuerySchema.safeParse({
      lat: searchParams.get('lat') ?? undefined,
      lng: searchParams.get('lng') ?? undefined,
      radiusKm: searchParams.get('radiusKm') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
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

    const events = await prisma.founderEvent.findMany({
      where: {
        eventType: LOCAL_SIGNAL_EVENT_TYPE,
        status: 'APPROVED',
      },
      orderBy: [{ occurredAt: 'desc' }],
      take: 100,
    });

    const signals = events
      .map((event) => serializeLocalSignal(event, origin))
      .filter((signal) => localSignalIsCurrentlyRelevant(signal))
      .filter((signal) => signal.distanceKm === null || signal.distanceKm <= parsed.data.radiusKm)
      .sort((a, b) => {
        const aStart = a.startsAt ? new Date(a.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bStart = b.startsAt ? new Date(b.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
        if (aStart !== bStart) return aStart - bStart;
        return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
      })
      .slice(0, parsed.data.limit);

    return NextResponse.json({
      success: true,
      data: {
        signals,
        count: signals.length,
      },
    });
  } catch (error) {
    console.error('[LOCAL_SIGNALS] Failed to load public signals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load local signals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const body = await request.json();
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
    const venueName = cleanText(input.venueName);
    const city = cleanText(input.city);
    const notes = input.notes.trim();
    const sourceUrl = cleanText(input.sourceUrl);
    const submittedBy = cleanText(input.submittedBy);
    const latitude = input.latitude ?? null;
    const longitude = input.longitude ?? null;

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
        metadataJson: {
          title,
          category: input.category,
          venueName,
          city,
          notes,
          sourceUrl,
          startsAt: input.startsAt || null,
          endsAt: input.endsAt || null,
          latitude,
          longitude,
          submittedBy,
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
      startsAt: input.startsAt || null,
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
      { success: false, error: 'Failed to submit local signal' },
      { status: 500, headers: createRateLimitHeaders(rateLimit) }
    );
  }
}
