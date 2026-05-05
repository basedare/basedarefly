import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  ACTIVATION_CLOSE_ROOM_EVENTS,
  recordActivationCloseRoomEvent,
} from '@/lib/activation-close-room';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';

const CloseRoomEventSchema = z.object({
  eventType: z.enum(ACTIVATION_CLOSE_ROOM_EVENTS),
  sessionKey: z.string().min(6).max(200).optional().nullable(),
  target: z.string().max(120).optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`${clientIp}:${token.slice(0, 32)}`, {
    limit: 80,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'activation-close-room',
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many close room events.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const parsed = CloseRoomEventSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid close room event' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const result = await recordActivationCloseRoomEvent({
      token,
      eventType: parsed.data.eventType,
      sessionKey: parsed.data.sessionKey,
      metadata: {
        target: parsed.data.target ?? null,
        clientIp,
      },
    });

    if (!result.recorded) {
      return NextResponse.json(
        { success: false, error: 'Close room not found' },
        { status: 404, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    return NextResponse.json({ success: true }, { headers: createRateLimitHeaders(rateLimit) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ACTIVATION_CLOSE_ROOM_EVENT] Failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to record close room event' },
      { status: 500, headers: createRateLimitHeaders(rateLimit) }
    );
  }
}
