import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicMoment } from "@/lib/moment-server";
import { adventureHref } from "@/lib/adventure-progress";
import {
  ensureAttributionJourney,
  applyJourneyCookie,
} from "@/lib/creator-attribution-server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const post = await getPublicMoment((await params).id);
  if (!post)
    return new Response("This Moment is unavailable.", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  const href = adventureHref(post.activityId, post.venue?.slug);
  const target = new URL(href, request.url);
  target.searchParams.set("from", "moment");
  target.searchParams.set("moment", post.id);
  const response = NextResponse.redirect(target, 303);
  response.headers.set("Cache-Control", "private, no-store");
  if (
    !checkRateLimit(getClientIp(request), {
      limit: 20,
      windowMs: 60000,
      keyPrefix: "moment-try",
    }).allowed
  )
    return response;
  try {
    const resolved = await ensureAttributionJourney(request);
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${resolved.journey.id}))::text`;
      const dedupeKey = `moment-try:${resolved.journey.id}:${post.id}`;
      if (await tx.attributionEvent.findUnique({ where: { dedupeKey } }))
        return;
      // Retain a real acquisition link if present; a Moment must not fabricate a creator code.
      const source = await tx.attributionTouch.findFirst({
        where: {
          journeyId: resolved.journey.id,
          targetType: "PAGE",
          targetId: post.activityId,
          linkId: { not: null },
        },
        orderBy: { occurredAt: "desc" },
      });
      const touch = await tx.attributionTouch.create({
        data: {
          journeyId: resolved.journey.id,
          targetType: "PAGE",
          targetId: post.activityId,
          targetHref: href,
          linkId: source?.linkId,
          creatorCode: source?.creatorCode,
          contentCode: source?.contentCode,
          campaignCode: source?.campaignCode,
        },
      });
      await tx.attributionEvent.create({
        data: {
          dedupeKey,
          eventType: "MOMENT_TRY",
          journeyId: resolved.journey.id,
          touchId: touch.id,
          targetType: "PAGE",
          targetId: post.activityId,
          metadataJson: {
            momentId: post.id,
            measurement: "journey_try_request",
          },
        },
      });
    });
    applyJourneyCookie(response, resolved.rawToken);
  } catch {
    /* A recording failure never blocks a free adventure. */
  }
  return response;
}
