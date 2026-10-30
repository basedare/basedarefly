import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { boundedRequestBytes } from "@/lib/bounded-request";
import { adventureTemplate } from "@/lib/adventure-sharing";
import { adventureHref } from "@/lib/adventure-progress";
import {
  lockActionIntent,
  applyJourneyCookie,
} from "@/lib/creator-attribution-server";
import { currentAdventureIntent } from "@/lib/moment-events";
import { sameOrigin, socialError } from "@/lib/social-request";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return socialError("Invalid origin.", 403);
  if (
    !checkRateLimit(getClientIp(request), {
      limit: 30,
      windowMs: 60000,
      keyPrefix: "adventure-funnel",
    }).allowed
  )
    return socialError("Try later.", 429);
  try {
    const body = JSON.parse(
      new TextDecoder().decode(await boundedRequestBytes(request, 2048)),
    );
    const activity =
      typeof body.activityId === "string"
        ? adventureTemplate(body.activityId)
        : null;
    if (
      !activity ||
      typeof body.runId !== "string" ||
      !/^[a-zA-Z0-9-]{10,80}$/.test(body.runId) ||
      !["STARTED", "COMPLETED_SELF_REPORTED"].includes(body.event)
    )
      return socialError("Unknown activity event.");
    // An old local completion without a matching server-recorded start is not a new conversion.
    const resolved =
      body.event === "STARTED"
        ? await lockActionIntent(request, {
            targetType: "PAGE",
            targetId: activity.id,
            targetHref: adventureHref(activity.id),
            title: activity.title,
          })
        : null;
    const intent =
      resolved?.intent ?? (await currentAdventureIntent(request, activity.id));
    if (!intent) return NextResponse.json({ success: true, recorded: false });
    const run = createHash("sha256").update(body.runId).digest("hex");
    const startKey = `adventure:STARTED:${intent.id}:${run}`;
    if (
      body.event !== "STARTED" &&
      !(await prisma.attributionEvent.findUnique({
        where: { dedupeKey: startKey },
        select: { id: true },
      }))
    )
      return NextResponse.json({ success: true, recorded: false });
    const touchEvent = intent.primaryTouchId
      ? await prisma.attributionEvent.findFirst({
          where: { touchId: intent.primaryTouchId, eventType: "MOMENT_TRY" },
          select: { metadataJson: true },
        })
      : null;
    await prisma.attributionEvent.upsert({
      where: { dedupeKey: `adventure:${body.event}:${intent.id}:${run}` },
      update: {},
      create: {
        dedupeKey: `adventure:${body.event}:${intent.id}:${run}`,
        eventType: "ADVENTURE_" + body.event,
        journeyId: intent.journeyId,
        touchId: intent.primaryTouchId,
        actionIntentId: intent.id,
        creatorCode: intent.primaryTouch?.creatorCode,
        contentCode: intent.primaryTouch?.contentCode,
        campaignCode: intent.primaryTouch?.campaignCode,
        targetType: "PAGE",
        targetId: activity.id,
        metadataJson: {
          evidence: "client_self_report",
          referral: touchEvent?.metadataJson ?? null,
        },
      },
    });
    const response = NextResponse.json(
      { success: true, recorded: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
    if (resolved) applyJourneyCookie(response, resolved.journeyToken);
    return response;
  } catch {
    return socialError(
      "Activity recording unavailable. Playing still works.",
      503,
    );
  }
}
