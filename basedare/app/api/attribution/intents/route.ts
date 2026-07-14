import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { applyJourneyCookie, lockActionIntent } from '@/lib/creator-attribution-server';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';

const IntentSchema = z.object({
  targetType: z.string().min(1).max(20),
  targetId: z.string().min(1).max(191),
  targetHref: z.string().min(1).max(1024),
  title: z.string().max(160).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const throttle = checkRateLimit(`attribution:intent:${getClientIp(request)}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!throttle.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many mission saves. Try again in a moment.' },
      { status: 429, headers: createRateLimitHeaders(throttle) }
    );
  }

  try {
    const body = IntentSchema.parse(await request.json());
    const result = await lockActionIntent(request, body);
    const response = NextResponse.json({
      success: true,
      data: {
        intentId: result.intent.id,
        state: result.intent.state,
        expiresAt: result.intent.expiresAt,
      },
    });
    applyJourneyCookie(response, result.journeyToken);
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to save this mission.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
