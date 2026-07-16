import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { recordStationFunnelEvent } from '@/lib/field-station-server';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';

const EventSchema = z.object({
  eventType: z.enum([
    'STATION_ENTRY_RENDERED',
    'STATION_ATTENTION_SELECTED',
    'STATION_TARGET_OPENED',
  ]),
  attentionMode: z.string().max(20).optional().nullable(),
  targetType: z.string().max(20).optional().nullable(),
  targetId: z.string().max(191).optional().nullable(),
  targetHref: z.string().max(1024).optional().nullable(),
  clientRenderMs: z.number().int().min(0).max(120_000).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`field-station:event:${getClientIp(request)}`, {
    limit: 90,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests.' },
      { status: 429, headers: createRateLimitHeaders(rate) }
    );
  }
  try {
    const body = EventSchema.parse(await request.json());
    const result = await recordStationFunnelEvent(request, body);
    return NextResponse.json({ success: true, data: result }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to record event.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
