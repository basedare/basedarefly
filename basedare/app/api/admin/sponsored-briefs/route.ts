import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authorizeAdminRequest,
  unauthorizedAdminResponse,
} from "@/lib/admin-auth";
import { sameOrigin, socialError } from "@/lib/social-request";
import { boundedRequestBytes } from "@/lib/bounded-request";
import {
  SponsoredBriefSchema,
  sponsoredBriefState,
} from "@/lib/sponsored-brief";
import { adventureTemplate } from "@/lib/adventure-sharing";
export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  try {
    const drafts = await prisma.founderEvent.findMany({
      where: { eventType: "SPONSORED_BRIEF_DRAFT", status: "DRAFT" },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, title: true, metadataJson: true, createdAt: true },
    });
    return NextResponse.json(
      { success: true, data: drafts },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return socialError("Drafts unavailable.", 503);
  }
}
export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  if (!sameOrigin(request)) return socialError("Invalid origin.", 403);
  try {
    const parsed = SponsoredBriefSchema.safeParse(
      JSON.parse(
        new TextDecoder().decode(await boundedRequestBytes(request, 12000)),
      ),
    );
    if (!parsed.success)
      return socialError(
        parsed.error.issues[0]?.message ?? "Complete the brief.",
      );
    const draft = parsed.data;
    if (draft.activityId && !adventureTemplate(draft.activityId))
      return socialError("Unknown challenge.");
    if (
      draft.venueSlug &&
      !(await prisma.venue.findFirst({
        where: { slug: draft.venueSlug, status: "ACTIVE" },
        select: { id: true },
      }))
    )
      return socialError("Choose a genuine active venue.");
    if (
      draft.campaignId &&
      !(await prisma.campaign.findFirst({
        where: { id: draft.campaignId, status: "DRAFT" },
        select: { id: true },
      }))
    )
      return socialError("Existing campaign must still be a draft.");
    // Store proposed terms with existing operator records. Never create slots, balances,
    // Campaign funding state, public attribution links, rights acceptance or notifications.
    const proposalHash = createHash("sha256")
      .update(JSON.stringify(draft))
      .digest("hex");
    const row = await prisma.founderEvent.upsert({
      where: { dedupeKey: "sponsored-brief:" + draft.requestId },
      update: {},
      create: {
        dedupeKey: "sponsored-brief:" + draft.requestId,
        eventType: "SPONSORED_BRIEF_DRAFT",
        source: "admin-creator-drops",
        subjectType: "CAMPAIGN_INTAKE",
        subjectId: draft.campaignId || null,
        status: "DRAFT",
        title: draft.sponsor + " · private proposal",
        actor: auth.walletAddress,
        venueSlug: draft.venueSlug || null,
        metadataJson: { ...sponsoredBriefState(draft), proposalHash },
      },
      select: { id: true, metadataJson: true },
    });
    if (
      (row.metadataJson as { proposalHash?: string } | null)?.proposalHash !==
      proposalHash
    )
      return socialError(
        "This retry belongs to a different saved proposal. Reload and start a new draft.",
        409,
      );
    return NextResponse.json(
      { success: true, data: { id: row.id } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return socialError(
      "Could not save this draft. No campaign was launched.",
      503,
    );
  }
}
