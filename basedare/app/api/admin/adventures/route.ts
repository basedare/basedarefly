import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authorizeAdminRequest,
  unauthorizedAdminResponse,
} from "@/lib/admin-auth";
import { socialError, sameOrigin } from "@/lib/social-request";
import { boundedRequestBytes } from "@/lib/bounded-request";
import { adventureTemplate } from "@/lib/adventure-sharing";
import { momentInclude, momentPosts } from "@/lib/moment-server";
import {
  momentCreditAllowed,
  publicMomentAllowed,
} from "@/lib/adventure-evidence";
import { momentAudit } from "@/lib/moment-events";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  try {
    const status = request.nextUrl.searchParams.get("status") ?? "PENDING";
    if (
      !["PENDING", "APPROVED", "FLAGGED", "REJECTED", "WITHDRAWN"].includes(
        status,
      )
    )
      return socialError("Unknown queue.");
    const rows = await prisma.adventureSubmission.findMany({
      where: { status },
      include: momentInclude,
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    const posts = await momentPosts(rows, true);
    return NextResponse.json(
      {
        success: true,
        data: posts.map((post) => {
          const row = rows.find((r) => r.id === post.id)!;
          return {
            ...post,
            legacyPublicMedia: Boolean(row.mediaUrl),
            spotlightConsent: row.spotlightConsent,
            creditAllowed: momentCreditAllowed(row),
          };
        }),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return socialError("Review queue unavailable. Retry.", 503);
  }
}
const decision = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9-]{8,80}$/),
    status: z.enum(["APPROVED", "REJECTED"]).optional(),
    featured: z.boolean().optional(),
    reason: z.string().trim().min(3).max(300),
  })
  .refine((v) => (v.status !== undefined) !== (v.featured !== undefined));
export async function PUT(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  if (!sameOrigin(request)) return socialError("Invalid origin.", 403);
  try {
    const parsed = decision.safeParse(
      JSON.parse(
        new TextDecoder().decode(await boundedRequestBytes(request, 4096)),
      ),
    );
    if (!parsed.success)
      return socialError("Choose one decision and explain it.");
    const { id, status, featured, reason } = parsed.data;
    const changed = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "AdventureSubmission" WHERE id = ${id} FOR UPDATE`;
      const post = await tx.adventureSubmission.findUnique({
        where: { id },
        include: momentInclude,
      });
      if (!post || post.status === "WITHDRAWN") return false;
      if (featured !== undefined) {
        const creator =
          momentCreditAllowed(post) &&
          (await tx.streamerTag.findFirst({
            where: {
              walletAddress: { equals: post.wallet, mode: "insensitive" },
              status: { in: ["ACTIVE", "VERIFIED"] },
              revokedAt: null,
            },
          }));
        if (
          !publicMomentAllowed(post) ||
          (featured && (!post.spotlightConsent || !creator))
        )
          return false;
        await tx.adventureSubmission.update({
          where: { id },
          data: {
            featuredAt: featured ? new Date() : null,
            featuredBy: featured ? auth.walletAddress : null,
          },
        });
      } else {
        if (
          !(
            status === "APPROVED"
              ? ["PENDING", "FLAGGED"]
              : ["PENDING", "FLAGGED", "APPROVED"]
          ).includes(post.status)
        )
          return false;
        if (
          status === "APPROVED" &&
          (!adventureTemplate(post.activityId) ||
            !publicMomentAllowed({ ...post, status: "APPROVED" }) ||
            !(await momentPosts([{ ...post, status: "APPROVED" }])).length)
        )
          return false;
        await tx.adventureSubmission.update({
          where: { id },
          data: {
            status,
            reviewReason: reason,
            reviewedBy: auth.walletAddress,
            reviewedAt: new Date(),
            featuredAt: null,
            featuredBy: null,
          },
        });
        await tx.founderEvent.updateMany({ where: { eventType: 'ADVENTURE_REPORT', status: 'NEEDS_REVIEW', metadataJson: { path: ['momentId'], equals: id } }, data: { status: status === 'APPROVED' ? 'RESOLVED' : 'REMOVED' } });
        await tx.notification.create({
          data: {
            wallet: post.wallet,
            type: "ADVENTURE_REVIEW",
            title:
              status === "APPROVED"
                ? "Your Moment is ready to share"
                : "Your Moment review update",
            message: reason,
            link:
              status === "APPROVED"
                ? "/moments/" + id
                : "/adventures?shared=mine",
          },
        });
        await momentAudit(tx, {
          type: status === "APPROVED" ? "MOMENT_APPROVED" : "MOMENT_REJECTED",
          id,
          activityId: post.activityId,
          wallet: post.wallet,
          parentId: post.parentMomentId,
        });
      }
      await tx.founderEvent.create({
        data: {
          dedupeKey: `moment-review:${id}:${post.updatedAt.getTime()}:${featured ?? status}`,
          eventType: "MOMENT_REVIEW",
          source: "admin",
          title:
            featured !== undefined
              ? featured
                ? "Spotlight selected"
                : "Spotlight removed"
              : "Contribution " + status,
          actor: auth.walletAddress,
          metadataJson: {
            momentId: id,
            previousStatus: post.status,
            decision: status ?? (featured ? "FEATURE" : "UNFEATURE"),
            reason,
            evidence: "display_review_only",
          },
        },
      });
      return true;
    });
    return changed
      ? NextResponse.json({ success: true })
      : socialError(
          "Submission changed or isn’t eligible. Refresh the queue.",
          409,
        );
  } catch {
    return socialError(
      "Could not save this review. Refresh before retrying.",
      503,
    );
  }
}
