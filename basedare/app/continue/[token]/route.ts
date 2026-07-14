import { NextRequest, NextResponse } from 'next/server';

import {
  applyJourneyCookie,
  applyParticipantCookie,
  consumeMissionPass,
} from '@/lib/creator-attribution-server';
import { isSocialWebview } from '@/lib/social-webview';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const throttle = checkRateLimit(`mission-pass:open:${getClientIp(request)}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!throttle.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many Mission Pass lookups. Try again in a moment.' },
      { status: 429, headers: createRateLimitHeaders(throttle) }
    );
  }
  if (token.length < 20 || token.length > 200) {
    return NextResponse.redirect(new URL('/missions?state=invalid', request.url), 302);
  }
  const result = await consumeMissionPass(token);
  if (result.status !== 'OPENED') {
    return NextResponse.redirect(new URL(`/missions?state=${result.status.toLowerCase()}`, request.url), 302);
  }

  // Known social webviews are discovery-only. Preserve the bearer pass and
  // present an explicit OS handoff instead of walking into a fragile wallet
  // popup/deep-link flow inside Instagram or TikTok.
  if (isSocialWebview(request.headers.get('user-agent')) && request.nextUrl.searchParams.get('handoff') !== '1') {
    const handoff = NextResponse.redirect(new URL(`/mission-pass/handoff/${token}`, request.url), 302);
    applyJourneyCookie(handoff, result.journeyToken);
    if (result.participantKey) applyParticipantCookie(handoff, result.participantKey);
    return handoff;
  }

  const destination = new URL(result.targetHref, request.url);
  destination.searchParams.set('missionPass', 'resumed');
  const response = NextResponse.redirect(destination, 302);
  applyJourneyCookie(response, result.journeyToken);
  if (result.participantKey) applyParticipantCookie(response, result.participantKey);
  return response;
}
