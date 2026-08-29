import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { applyJourneyCookie } from '@/lib/creator-attribution-server';
import { LIVE_PLAN_INVITE_OPENED_EVENT } from '@/lib/live-plan-retention';
import { recordLivePlanJourneyEvent } from '@/lib/live-plan-retention-server';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';

const EventSchema = z.object({
  event: z.literal('INVITE_OPENED'),
  planType: z.enum(['boat', 'meetup']),
  planId: z.string().min(3).max(191),
  venueId: z.string().max(191).nullable().optional(),
  clientEventId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`live-plan-event:${getClientIp(request)}`, { limit: 60, windowMs: 60 * 60 * 1000 });
  if (!rate.allowed) {
    return NextResponse.json({ success: false, error: 'Too many activity events.' }, {
      status: 429,
      headers: createRateLimitHeaders(rate),
    });
  }
  const parsed = EventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid activity event.' }, { status: 400 });
  }
  try {
    const result = await recordLivePlanJourneyEvent(request, {
      eventType: LIVE_PLAN_INVITE_OPENED_EVENT,
      planType: parsed.data.planType,
      planId: parsed.data.planId,
      venueId: parsed.data.venueId,
      clientEventId: parsed.data.clientEventId,
      metadata: { source: 'shared_plan_link' },
    });
    const response = NextResponse.json({ success: true, data: { recorded: result.recorded } });
    applyJourneyCookie(response, result.journeyToken);
    return response;
  } catch (error) {
    console.error('[LIVE_PLAN_EVENT] failed:', error);
    return NextResponse.json({ success: false, error: 'Could not record activity event.' }, { status: 500 });
  }
}
