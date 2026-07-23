import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { z } from 'zod';

import { completePlayableRouteStop, applyJourneyCookie } from '@/lib/playable-routes';
import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';
import { checkRateLimit, createRateLimitHeaders, getClientIp, RateLimiters } from '@/lib/rate-limit';

const BodySchema = z.object({ walletAddress: z.string().refine(isAddress, 'Valid wallet address required') });

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string; stopId: string }> },
) {
  try {
    const { slug, stopId } = await context.params;
    const body = BodySchema.parse(await request.json());
    const wallet = await getAuthorizedWalletForRequest(request, {
      walletAddress: body.walletAddress,
      action: 'playable-route:complete-stop',
      resource: `route:${slug}:stop:${stopId}`,
    });
    if (!wallet) return NextResponse.json({ success: false, error: 'Connect and authorize this route stop.' }, { status: 401 });
    const rateLimit = checkRateLimit(`${getClientIp(request)}:${wallet}`, { ...RateLimiters.strict, keyPrefix: 'playable-route-stop' });
    const headers = createRateLimitHeaders(rateLimit);
    if (!rateLimit.allowed) return NextResponse.json({ success: false, error: 'Too many attempts. Try again shortly.' }, { status: 429, headers });
    const result = await completePlayableRouteStop({ request, routeSlug: slug, stopId, walletAddress: wallet });
    const response = NextResponse.json({
      success: true,
      data: {
        status: result.run.status,
        receiptCode: result.run.receiptCode,
        completedStopIds: result.run.progress.map((item) => item.stopId),
      },
    }, { headers });
    applyJourneyCookie(response, result.journeyToken);
    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to complete route stop.' }, { status: 400 });
  }
}
