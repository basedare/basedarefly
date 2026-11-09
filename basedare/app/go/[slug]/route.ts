import { NextRequest, NextResponse } from 'next/server';

import { applyJourneyCookie, recordAttributionRedirect } from '@/lib/creator-attribution-server';
import { normalizeTargetHref } from '@/lib/creator-attribution-policy';
import { resolveFieldStationRedirect } from '@/lib/field-station-server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isDiscoveryQr, parseDiscoveryQr } from '@/lib/discovery-qr';
import { resolveDiscoveryQr } from '@/lib/discovery-qr-server';

const redirect = (url: URL) => {
  const response = NextResponse.redirect(url, 302);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
};

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
  }).catch(() => null);
  if (!link || !link.active) {
    return redirect(new URL('/qr/unavailable?reason=' + (link ? 'paused' : 'unavailable'), request.url));
  }

  if (isDiscoveryQr(link.metadataJson)) {
    try {
      const resolved = await resolveDiscoveryQr(link);
      // Never trust an editable URL snapshot over a current canonical destination.
      link.targetHref = resolved.href;
    } catch {
      const expired = Date.parse(parseDiscoveryQr(link.metadataJson)?.expiresAt ?? '') <= Date.now();
      const fallback = new URL('/qr/unavailable', request.url);
      fallback.searchParams.set('reason', expired ? 'expired' : 'unavailable');
      if (link.stationHostVenue?.slug) fallback.searchParams.set('place', link.stationHostVenue.slug);
      return redirect(fallback);
    }
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
      return redirect(new URL(targetHref, request.url));
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
    const response = redirect(new URL(targetHref, request.url));
    applyJourneyCookie(response, resolved.rawToken);
    return response;
  } catch (error: unknown) {
    console.error('[ATTRIBUTION] Tracked redirect failed:', error instanceof Error ? error.message : error);
    // Discovery still works through a safe local target if analytics storage is
    // temporarily unavailable. A malformed stored target fails closed to map.
    try {
      return redirect(new URL(targetHref, request.url));
    } catch {
      return redirect(new URL('/map?notice=link-unavailable', request.url));
    }
  }
}
