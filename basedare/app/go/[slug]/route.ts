import { NextRequest, NextResponse } from 'next/server';

import { applyJourneyCookie, recordAttributionRedirect } from '@/lib/creator-attribution-server';
import { normalizeTargetHref } from '@/lib/creator-attribution-policy';
import { resolveFieldStationRedirect } from '@/lib/field-station-server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const link = await prisma.creatorAttributionLink.findUnique({
    where: { slug },
    include: {
      stationHostVenue: {
        select: {
          id: true,
          slug: true,
          name: true,
          city: true,
          latitude: true,
          longitude: true,
        },
      },
    },
  });
  if (!link || !link.active) {
    return NextResponse.redirect(new URL('/map?notice=link-unavailable', request.url), 302);
  }

  let targetHref: string;
  let fieldResolution: Awaited<ReturnType<typeof resolveFieldStationRedirect>> | null = null;
  try {
    const baseTargetHref = normalizeTargetHref(link.targetHref);
    fieldResolution = await resolveFieldStationRedirect({ ...link, targetHref: baseTargetHref });
    targetHref = fieldResolution.targetHref;
  } catch (error) {
    console.error('[FIELD_STATION] Redirect resolution failed:', error);
    try {
      targetHref = normalizeTargetHref(link.targetHref);
    } catch {
      targetHref = '/map?notice=link-unavailable';
    }
  }

  try {
    const throttle = checkRateLimit(`attribution:redirect:${getClientIp(request)}`, {
      limit: 120,
      windowMs: 60_000,
    });
    if (!throttle.allowed) {
      // Never block discovery because attribution logging is being load-shed.
      return NextResponse.redirect(new URL(targetHref, request.url), 302);
    }
    const resolved = await recordAttributionRedirect(request, {
      ...link,
      targetHref,
      stationCode: fieldResolution?.stationCode ?? null,
      stationHostVenueId: fieldResolution?.stationHostVenueId ?? null,
      requestedAttentionMode: fieldResolution?.requestedAttentionMode ?? null,
      attentionMode: fieldResolution?.attentionMode ?? null,
      densityCount: fieldResolution?.densityCount ?? null,
      fallbackApplied: fieldResolution?.fallbackApplied ?? false,
      fallbackReason: fieldResolution?.fallbackReason ?? null,
    });
    const response = NextResponse.redirect(new URL(targetHref, request.url), 302);
    applyJourneyCookie(response, resolved.rawToken);
    return response;
  } catch (error: unknown) {
    console.error('[ATTRIBUTION] Tracked redirect failed:', error instanceof Error ? error.message : error);
    // Discovery still works through a safe local target if analytics storage is
    // temporarily unavailable. A malformed stored target fails closed to map.
    try {
      return NextResponse.redirect(new URL(targetHref, request.url), 302);
    } catch {
      return NextResponse.redirect(new URL('/map?notice=link-unavailable', request.url), 302);
    }
  }
}
