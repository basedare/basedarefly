import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  authorizeAdminRequest,
  unauthorizedAdminResponse,
} from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  getVenueEventSourceLabel,
  inferVenueEventDraft,
  normalizeVenueEventSourceUrl,
  parseVenueLocalDateTime,
  resolveVenueEventExpiry,
  slugifyVenueEvent,
  validateVenueEventWindow,
  VENUE_EVENT_CATEGORIES,
  VENUE_EVENT_SOURCE_KINDS,
  VENUE_EVENT_TRUST_LEVELS,
} from "@/lib/venue-events";

const CreateSignalSchema = z.object({
  sourceKind: z.enum(VENUE_EVENT_SOURCE_KINDS),
  sourceUrl: z.string().max(2000).optional().nullable(),
  sourceAccount: z.string().trim().max(80).optional().nullable(),
  sourcePublishedAt: z.string().datetime().optional().nullable(),
  rawText: z.string().trim().min(5).max(10_000),
  venueSlug: z.string().trim().max(120).optional().nullable(),
});

const PublishSchema = z.object({
  action: z.literal("publish"),
  signalId: z.string().min(1),
  venueSlug: z.string().trim().min(1).max(120),
  title: z.string().trim().min(3).max(140),
  summary: z.string().trim().max(600).optional().nullable(),
  category: z.enum(VENUE_EVENT_CATEGORIES),
  startsAt: z.string().trim().max(40),
  endsAt: z.string().trim().max(40).optional().nullable(),
  priceLabel: z.string().trim().max(80).optional().nullable(),
  trustLevel: z.enum(VENUE_EVENT_TRUST_LEVELS).default("SOURCE_CHECKED"),
});

const DecisionSchema = z.discriminatedUnion("action", [
  PublishSchema,
  z.object({ action: z.literal("reject"), signalId: z.string().min(1) }),
  z.object({ action: z.literal("cancel"), eventId: z.string().min(1) }),
]);

function fingerprintSignal(
  input: z.infer<typeof CreateSignalSchema>,
  sourceUrl: string | null
) {
  return createHash("sha256")
    .update(
      `${input.sourceKind}|${sourceUrl ?? ""}|${
        input.venueSlug ?? ""
      }|${input.rawText.toLowerCase().replace(/\s+/g, " ").trim()}`
    )
    .digest("hex");
}

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);

  try {
    const [venues, signals, events] = await Promise.all([
      prisma.venue.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          slug: true,
          name: true,
          city: true,
          timezone: true,
        },
        orderBy: [{ city: "asc" }, { name: "asc" }],
        take: 300,
      }),
      prisma.venueEventSignal.findMany({
        include: {
          venue: { select: { slug: true, name: true } },
          event: { select: { id: true, slug: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.venueEvent.findMany({
        include: {
          venue: { select: { slug: true, name: true } },
          _count: { select: { rsvps: true } },
        },
        orderBy: { startsAt: "asc" },
        take: 100,
      }),
    ]);
    return NextResponse.json({
      success: true,
      data: { venues, signals, events },
    });
  } catch (error) {
    console.error("[ISLAND_PULSE_ADMIN] load failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not load Island Pulse." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  const parsed = CreateSignalSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid source.",
      },
      { status: 400 }
    );
  }

  const sourceUrl = normalizeVenueEventSourceUrl(parsed.data.sourceUrl);
  if (parsed.data.sourceUrl?.trim() && !sourceUrl) {
    return NextResponse.json(
      {
        success: false,
        error: "Source link must be a public http or https URL.",
      },
      { status: 400 }
    );
  }

  try {
    const venue = parsed.data.venueSlug
      ? await prisma.venue.findUnique({
          where: { slug: parsed.data.venueSlug },
          select: { id: true },
        })
      : null;
    if (parsed.data.venueSlug && !venue) {
      return NextResponse.json(
        { success: false, error: "Venue not found." },
        { status: 404 }
      );
    }
    const draft = inferVenueEventDraft(parsed.data.rawText);
    const fingerprint = fingerprintSignal(parsed.data, sourceUrl);
    const existing = await prisma.venueEventSignal.findUnique({
      where: { fingerprint },
    });
    if (existing) {
      return NextResponse.json({
        success: true,
        data: { signal: existing, draft, duplicate: true },
      });
    }
    const signal = await prisma.venueEventSignal.create({
      data: {
        venueId: venue?.id ?? null,
        sourceKind: parsed.data.sourceKind,
        sourceUrl,
        sourceAccount: parsed.data.sourceAccount || null,
        sourcePublishedAt: parsed.data.sourcePublishedAt
          ? new Date(parsed.data.sourcePublishedAt)
          : null,
        rawText: parsed.data.rawText,
        fingerprint,
        extractionJson: draft,
        confidence: draft.confidence,
        submittedBy: auth.walletAddress,
      },
    });
    return NextResponse.json(
      { success: true, data: { signal, draft, duplicate: false } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[ISLAND_PULSE_ADMIN] signal create failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not save this source." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  const parsed = DecisionSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid decision.",
      },
      { status: 400 }
    );
  }

  try {
    if (parsed.data.action === "reject") {
      const result = await prisma.venueEventSignal.updateMany({
        where: { id: parsed.data.signalId, status: "NEW" },
        data: {
          status: "REJECTED",
          reviewedBy: auth.walletAddress,
          reviewedAt: new Date(),
        },
      });
      if (!result.count)
        return NextResponse.json(
          { success: false, error: "Signal is no longer pending." },
          { status: 409 }
        );
      return NextResponse.json({ success: true });
    }
    if (parsed.data.action === "cancel") {
      const result = await prisma.venueEvent.updateMany({
        where: { id: parsed.data.eventId, status: "PUBLISHED" },
        data: { status: "CANCELLED" },
      });
      if (!result.count)
        return NextResponse.json(
          { success: false, error: "Event is no longer public." },
          { status: 409 }
        );
      return NextResponse.json({ success: true });
    }

    const publish = parsed.data;

    const [signal, venue] = await Promise.all([
      prisma.venueEventSignal.findUnique({
        where: { id: publish.signalId },
      }),
      prisma.venue.findUnique({
        where: { slug: publish.venueSlug },
        select: { id: true, slug: true, timezone: true },
      }),
    ]);
    if (!signal)
      return NextResponse.json(
        { success: false, error: "Source signal not found." },
        { status: 404 }
      );
    if (!venue)
      return NextResponse.json(
        { success: false, error: "Venue not found." },
        { status: 404 }
      );
    if (signal.status === "REJECTED")
      return NextResponse.json(
        { success: false, error: "Rejected sources cannot be published." },
        { status: 409 }
      );
    if (!signal.sourceUrl)
      return NextResponse.json(
        {
          success: false,
          error: "Add a public source link before publishing this event.",
        },
        { status: 400 }
      );

    const startsAt = parseVenueLocalDateTime(publish.startsAt, venue.timezone);
    const endsAt = publish.endsAt
      ? parseVenueLocalDateTime(publish.endsAt, venue.timezone)
      : null;
    if (!startsAt || (publish.endsAt && !endsAt)) {
      return NextResponse.json(
        {
          success: false,
          error: `Use a valid date and time in ${venue.timezone}.`,
        },
        { status: 400 }
      );
    }
    const windowError = validateVenueEventWindow(startsAt, endsAt);
    if (windowError)
      return NextResponse.json(
        { success: false, error: windowError },
        { status: 400 }
      );

    const now = new Date();
    const sourceLabel = getVenueEventSourceLabel(
      signal.sourceKind as (typeof VENUE_EVENT_SOURCE_KINDS)[number],
      signal.sourceAccount
    );
    const event = await prisma.$transaction(async (tx) => {
      const existingEvent = await tx.venueEvent.findUnique({
        where: { signalId: signal.id },
        select: { id: true },
      });
      if (signal.status === "PUBLISHED" && !existingEvent) {
        throw new Error("SIGNAL_CHANGED");
      }
      const eventWrite = existingEvent
        ? tx.venueEvent.update({
            where: { id: existingEvent.id },
            data: {
              venueId: venue.id,
              title: publish.title,
              summary: publish.summary || null,
              category: publish.category,
              startsAt,
              endsAt,
              timezone: venue.timezone,
              priceLabel: publish.priceLabel || null,
              sourceLabel,
              sourceUrl: signal.sourceUrl,
              trustLevel: publish.trustLevel,
              status: "PUBLISHED",
              publishedAt: now,
              lastConfirmedAt: now,
              expiresAt: resolveVenueEventExpiry(startsAt, endsAt),
            },
          })
        : tx.venueEvent.create({
            data: {
              slug: slugifyVenueEvent(
                publish.title,
                venue.slug,
                startsAt,
                signal.id
              ),
              venueId: venue.id,
              signalId: signal.id,
              title: publish.title,
              summary: publish.summary || null,
              category: publish.category,
              startsAt,
              endsAt,
              timezone: venue.timezone,
              priceLabel: publish.priceLabel || null,
              sourceLabel,
              sourceUrl: signal.sourceUrl,
              trustLevel: publish.trustLevel,
              status: "PUBLISHED",
              publishedAt: now,
              lastConfirmedAt: now,
              expiresAt: resolveVenueEventExpiry(startsAt, endsAt),
            },
          });
      const claimed = await tx.venueEventSignal.updateMany({
        where: { id: signal.id, status: existingEvent ? "PUBLISHED" : "NEW" },
        data: {
          venueId: venue.id,
          status: "PUBLISHED",
          reviewedBy: auth.walletAddress,
          reviewedAt: now,
        },
      });
      if (!claimed.count) throw new Error("SIGNAL_CHANGED");
      return eventWrite;
    });
    return NextResponse.json({ success: true, data: { event } });
  } catch (error) {
    if (error instanceof Error && error.message === "SIGNAL_CHANGED") {
      return NextResponse.json(
        {
          success: false,
          error: "Source state changed. Refresh and try again.",
        },
        { status: 409 }
      );
    }
    console.error("[ISLAND_PULSE_ADMIN] decision failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not update this event." },
      { status: 500 }
    );
  }
}
