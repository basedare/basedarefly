import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getLivePlanSnapshot } from '@/lib/live-plans-server';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';

const LivePlanQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(25).default(8),
  horizonHours: z.coerce.number().int().min(1).max(168).default(72),
  limit: z.coerce.number().int().min(1).max(100).default(40),
});

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`live-plans:${getClientIp(request)}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many refreshes. Try again shortly.' },
      { status: 429, headers: createRateLimitHeaders(rate) },
    );
  }

  const parsed = LivePlanQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid map area.' },
      { status: 400 },
    );
  }

  try {
    const snapshot = await getLivePlanSnapshot({
      latitude: parsed.data.lat,
      longitude: parsed.data.lng,
      radiusKm: parsed.data.radiusKm,
      horizonHours: parsed.data.horizonHours,
      limit: parsed.data.limit,
    });
    const response = NextResponse.json({ success: true, data: snapshot });
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    console.error('[LIVE_PLANS] aggregation failed:', error);
    return NextResponse.json(
      { success: false, error: 'Live plans are warming up. Try again shortly.' },
      { status: 500 },
    );
  }
}
