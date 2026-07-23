import { NextRequest, NextResponse } from 'next/server';

import { applyJourneyCookie, startPlayableRoute } from '@/lib/playable-routes';
import { checkRateLimit, createRateLimitHeaders, getClientIp, RateLimiters } from '@/lib/rate-limit';

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const rateLimit = checkRateLimit(getClientIp(request), { ...RateLimiters.standard, keyPrefix: 'playable-route-start' });
  const headers = createRateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return NextResponse.json({ success: false, error: 'Too many route starts. Try again shortly.' }, { status: 429, headers });
  }
  try {
    const { slug } = await context.params;
    const result = await startPlayableRoute(request, slug);
    const response = NextResponse.json({
      success: true,
      data: {
        runId: result.run.id,
        actionIntentId: result.run.actionIntentId,
        status: result.run.status,
        receiptCode: result.run.receiptCode,
        completedStopIds: result.run.progress.map((item) => item.stopId),
      },
    }, { headers });
    applyJourneyCookie(response, result.journeyToken);
    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to start route.' }, { status: 400, headers });
  }
}
