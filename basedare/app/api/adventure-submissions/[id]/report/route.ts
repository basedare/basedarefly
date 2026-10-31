import { NextRequest, NextResponse } from "next/server";
import { removeWeeklySpotlights } from "@/lib/moment-spotlight-server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sameOrigin, socialWallet, socialError } from "@/lib/social-request";
import { boundedRequestBytes } from "@/lib/bounded-request";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(request)) return socialError("Invalid origin.", 403);
  if (
    !checkRateLimit(getClientIp(request), {
      limit: 6,
      windowMs: 60000,
      keyPrefix: "moment-report",
    }).allowed
  )
    return socialError("Please wait before reporting again.", 429);
  try {
    const body = JSON.parse(
      new TextDecoder().decode(await boundedRequestBytes(request, 4096)),
    );
    const wallet = await socialWallet(request, body.wallet, "adventure:report");
    if (!wallet) return socialError("Sign in to report a contribution.", 401);
    if (
      typeof body.reason !== "string" ||
      body.reason.trim().length < 5 ||
      body.reason.length > 300
    )
      return socialError(
        "Briefly describe the problem. Leave out private contact details.",
      );
    const { id } = await params;
    const hidden = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"moment-report:" + wallet.toLowerCase()}))::text`;
      const key = createHash("sha256").update(wallet.toLowerCase()).digest("hex");
      if (await tx.founderEvent.findUnique({ where: { dedupeKey: `moment-report:${id}:${key}` } })) {
        const current = await tx.adventureSubmission.findUnique({ where: { id }, select: { status: true } });
        return current?.status === 'FLAGGED';
      }
      if (
        (await tx.founderEvent.count({
          where: {
            eventType: "ADVENTURE_REPORT",
            actor: wallet.toLowerCase(),
            occurredAt: { gte: new Date(Date.now() - 86400000) },
          },
        })) >= 5
      )
        throw new Error("REPORT_LIMIT");
      const changed = await tx.adventureSubmission.updateMany({
        where: { id, status: "APPROVED" },
        data: { status: "FLAGGED", featuredAt: null, featuredBy: null },
      });
      if (!changed.count) return false;
      await removeWeeklySpotlights(tx, id);
      await tx.founderEvent.upsert({
        where: { dedupeKey: `moment-report:${id}:${key}` },
        update: {},
        create: {
          dedupeKey: `moment-report:${id}:${key}`,
          eventType: "ADVENTURE_REPORT",
          source: "moment",
          title: "Contribution reported",
          status: "NEEDS_REVIEW",
          actor: wallet.toLowerCase(),
          metadataJson: { momentId: id, reason: body.reason.trim() },
        },
      });
      return true;
    });
    return NextResponse.json({ success: true, hidden });
  } catch (error) {
    return error instanceof Error && error.message === "REPORT_LIMIT"
      ? socialError(
          "You can report five Moments per day. Contact support for urgent issues.",
          429,
        )
      : socialError("Could not send your report. Please retry.", 503);
  }
}
