import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifyInternalApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  fingerprintVenueEventSignal,
  inferVenueEventDraft,
  isLikelyVenueEventPost,
  normalizeVenueEventSourceUrl,
  VENUE_EVENT_SOURCE_KINDS,
} from "@/lib/venue-events";

const SignalInputSchema = z.object({
  venueSlug: z.string().trim().min(1).max(120),
  sourceKind: z.enum(VENUE_EVENT_SOURCE_KINDS),
  sourceUrl: z.string().trim().max(2000),
  sourceAccount: z.string().trim().max(80).optional().nullable(),
  sourcePublishedAt: z.string().datetime(),
  rawText: z.string().trim().min(5).max(10_000),
  externalId: z.string().trim().min(1).max(300),
  trustedVenueSource: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const authError = verifyInternalApiKey(request);
  if (authError) return authError;
  const parsed = SignalInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid signal." },
      { status: 400 }
    );
  }
  const sourceUrl = normalizeVenueEventSourceUrl(parsed.data.sourceUrl);
  if (!sourceUrl) {
    return NextResponse.json(
      { success: false, error: "A public http or https source URL is required." },
      { status: 400 }
    );
  }
  if (!isLikelyVenueEventPost({ caption: parsed.data.rawText })) {
    return NextResponse.json({
      success: true,
      data: { queued: false, reason: "NOT_EVENT_LIKE" },
    });
  }
  const venue = await prisma.venue.findUnique({
    where: { slug: parsed.data.venueSlug },
    select: { id: true },
  });
  if (!venue) {
    return NextResponse.json(
      { success: false, error: "Venue not found." },
      { status: 404 }
    );
  }
  const draft = inferVenueEventDraft(parsed.data.rawText);
  const fingerprint = createHash("sha256")
    .update(
      fingerprintVenueEventSignal({
        sourceKind: parsed.data.sourceKind,
        sourceUrl,
        venueSlug: parsed.data.venueSlug,
        rawText: parsed.data.rawText,
        externalId: parsed.data.externalId,
      })
    )
    .digest("hex");
  const write = await prisma.venueEventSignal.createMany({
    data: [
      {
        venueId: venue.id,
        sourceKind: parsed.data.sourceKind,
        sourceUrl,
        sourceAccount: parsed.data.sourceAccount || null,
        sourcePublishedAt: new Date(parsed.data.sourcePublishedAt),
        rawText: parsed.data.rawText,
        fingerprint,
        extractionJson: {
          ...draft,
          externalId: parsed.data.externalId,
          suggestedTrustLevel: parsed.data.trustedVenueSource
            ? "VENUE_POSTED"
            : "SOURCE_CHECKED",
        } satisfies Prisma.InputJsonValue,
        confidence: draft.confidence,
        submittedBy: "internal:event-adapter",
      },
    ],
    skipDuplicates: true,
  });
  return NextResponse.json(
    { success: true, data: { queued: Boolean(write.count), duplicate: !write.count } },
    { status: write.count ? 201 : 200 }
  );
}
