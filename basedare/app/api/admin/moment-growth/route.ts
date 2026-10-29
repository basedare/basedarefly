import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authorizeAdminRequest,
  unauthorizedAdminResponse,
} from "@/lib/admin-auth";
import { socialError } from "@/lib/social-request";
export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  const days = Math.min(
    30,
    Math.max(1, Number(request.nextUrl.searchParams.get("days")) || 7),
  );
  const since = new Date(Date.now() - days * 86400000);
  try {
    const [events, published, spotlight, approvals, enquiries] =
      await Promise.all([
        prisma.attributionEvent.groupBy({
          by: ["eventType"],
          where: {
            occurredAt: { gte: since },
            eventType: {
              in: [
                "MOMENT_TRY",
                "ADVENTURE_STARTED",
                "ADVENTURE_COMPLETED_SELF_REPORTED",
                "MOMENT_SUBMITTED",
                "MOMENT_APPROVED",
              ],
            },
          },
          _count: { _all: true },
        }),
        prisma.adventureSubmission.count({
          where: {
            status: "APPROVED",
            publicConsentVersion: {
              in: ["adventure-display-v1", "adventure-display-v2"],
            },
            OR: [{ venueSlug: null }, { venue: { status: "ACTIVE" } }],
          },
        }),
        prisma.adventureSubmission.count({
          where: {
            status: "APPROVED",
            spotlightConsent: true,
            creatorCreditConsent: true,
            featuredAt: { not: null },
            OR: [{ venueSlug: null }, { venue: { status: "ACTIVE" } }],
          },
        }),
        prisma.attributionEvent.findMany({
          where: { occurredAt: { gte: since }, eventType: "MOMENT_APPROVED" },
          select: { participantKey: true, touchId: true },
          take: 10001,
        }),
        prisma.founderEvent.count({
          where: { eventType: "ACTIVATION_INTAKE", occurredAt: { gte: since } },
        }),
      ]);
    const count = (type: string) =>
      events.find((e) => e.eventType === type)?._count._all ?? 0;
    // These are records/known account identities, never claims of unique humans or causal sales.
    const rawStarts = await prisma.attributionEvent.findMany({
      where: { eventType: "ADVENTURE_STARTED", occurredAt: { gte: since } },
      select: { journeyId: true, touchId: true },
      take: 10001,
    });
    const momentTouches = await prisma.attributionEvent.findMany({
      where: {
        eventType: "MOMENT_TRY",
        touchId: {
          in: rawStarts.flatMap((e) => (e.touchId ? [e.touchId] : [])),
        },
      },
      select: { touchId: true },
      take: 10001,
    });
    const sources = new Set(momentTouches.map((e) => e.touchId));
    const data = {
      days,
      since: since.toISOString(),
      metrics: {
        "Moment try requests · distinct journey + Moment": count("MOMENT_TRY"),
        "Self-reported starts": count("ADVENTURE_STARTED"),
        "Self-reported finishes": count("ADVENTURE_COMPLETED_SELF_REPORTED"),
        "Authenticated submissions": count("MOMENT_SUBMITTED"),
        "First approval records": count("MOMENT_APPROVED"),
        "Currently approved Moments · all time": published,
        "Spotlight selections · all time": spotlight,
        "Starts linked to a Moment touch":
          rawStarts.length <= 10000
            ? rawStarts.filter((e) => e.touchId && sources.has(e.touchId))
                .length
            : null,
        "Approved contributor wallet identities":
          approvals.length <= 10000
            ? new Set(approvals.map((e) => e.participantKey).filter(Boolean))
                .size
            : null,
        "Returning journey identifiers · 2+ starts":
          rawStarts.length <= 10000
            ? [
                ...rawStarts
                  .reduce(
                    (map, e) =>
                      e.journeyId
                        ? map.set(e.journeyId, (map.get(e.journeyId) ?? 0) + 1)
                        : map,
                    new Map<string, number>(),
                  )
                  .values(),
              ].filter((n) => n > 1).length
            : null,
        "Recorded business intake submissions": enquiries,
      },
      unavailable: [
        "Moment opens from configured client analytics (not joined to this ledger)",
        "Social impressions and views",
        "Delivered invitations",
        "Unique people across devices",
        "New people attributable to a Moment",
        "Causal venue sales",
        "Qualified enquiry conversion without an operator review",
      ],
    };
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return socialError(
      "Growth records unavailable. No totals were inferred.",
      503,
    );
  }
}
