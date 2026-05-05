import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  ACTIVATION_PUBLIC_FUNNEL_EVENTS,
  recordActivationFunnelEvent,
} from '@/lib/activation-funnel';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';

const AttributionSchema = z.object({
  source: z.string().max(80).optional().nullable(),
  routedSource: z.string().max(80).optional().nullable(),
  venueSlug: z.string().max(180).optional().nullable(),
  venueId: z.string().max(120).optional().nullable(),
  venueName: z.string().max(180).optional().nullable(),
  creator: z.string().max(120).optional().nullable(),
  packageId: z.string().max(80).optional().nullable(),
  budgetRange: z.string().max(80).optional().nullable(),
  goal: z.string().max(80).optional().nullable(),
  buyerType: z.string().max(80).optional().nullable(),
  utmSource: z.string().max(120).optional().nullable(),
  utmMedium: z.string().max(120).optional().nullable(),
  utmCampaign: z.string().max(160).optional().nullable(),
  utmContent: z.string().max(160).optional().nullable(),
  utmTerm: z.string().max(160).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
});

const ActivationFunnelPayloadSchema = z.object({
  eventType: z.enum(ACTIVATION_PUBLIC_FUNNEL_EVENTS),
  sessionKey: z.string().min(6).max(200).optional().nullable(),
  eventId: z.string().min(6).max(120).optional().nullable(),
  pagePath: z.string().max(500).optional().nullable(),
  target: z.string().max(160).optional().nullable(),
  channel: z.string().max(80).optional().nullable(),
  attribution: AttributionSchema.optional().default({}),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().default({}),
});

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, {
    limit: 120,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'activation-funnel',
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many activation funnel events.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const validation = ActivationFunnelPayloadSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || 'Invalid funnel event' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const payload = validation.data;

    await recordActivationFunnelEvent({
      eventType: payload.eventType,
      source: payload.attribution.source || payload.attribution.routedSource || 'activation-page',
      sessionKey: payload.sessionKey,
      eventId: payload.eventId,
      href: payload.pagePath || '/activations',
      venueSlug: payload.attribution.venueSlug,
      venueId: payload.attribution.venueId,
      attribution: payload.attribution,
      metadata: {
        ...payload.metadata,
        target: payload.target ?? null,
        channel: payload.channel ?? null,
        pagePath: payload.pagePath ?? null,
      },
    });

    return NextResponse.json(
      { success: true },
      { headers: createRateLimitHeaders(rateLimit) }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ACTIVATION_FUNNEL] Track failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to record activation funnel event' },
      { status: 500, headers: createRateLimitHeaders(rateLimit) }
    );
  }
}
