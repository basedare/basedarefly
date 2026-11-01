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
import {
  spotlightKey,
  spotlightWeek,
  WEEKLY_SPOTLIGHT_EVENT,
} from "@/lib/moment-motivation";
import {
  getWeeklySpotlight,
  removeWeeklySpotlights,
} from "@/lib/moment-spotlight-server";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  try {
    const status = request.nextUrl.searchParams.get("status") ?? "PENDING";
    if (
      !["PENDING", "APPROVED", "FLAGGED", "REJECTED", "WITHDRAWN"].includes(
        status
      )
    )
      return socialError("Unknown queue.");
    const rows = await prisma.adventureSubmission.findMany({
      where: { status },
      include: momentInclude,
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    const [posts, selection] = await Promise.all([
      momentPosts(rows, true),
      getWeeklySpotlight(),
    ]);
    return NextResponse.json(
      {
        success: true,
        spotlight: {
          ...spotlightWeek(),
          selectedId: selection?.post.id ?? null,
        },
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
      { headers: { "Cache-Control": "private, no-store" } }
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
    spotlightWeek: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
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
        new TextDecoder().decode(await boundedRequestBytes(request, 4096))
      )
    );
    if (!parsed.success)
      return socialError("Choose one decision and explain it.");
    const { id, status, featured, reason } = parsed.data;
    const week = spotlightWeek();
    if (parsed.data.spotlightWeek && parsed.data.spotlightWeek !== week.key)
      return socialError("The editorial week changed. Refresh the queue.", 409);
    const changed = await prisma.$transaction(async (tx) => {
      // Always lock the weekly slot before a candidate row. Two editors cannot
      // select different creations for one week or deadlock on each other's rows.
      if (featured === true)
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${spotlightKey(
          week.key
        )}))::text`;
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
        const previous = featured
          ? await tx.founderEvent.findUnique({
              where: { dedupeKey: spotlightKey(week.key) },
            })
          : null;
        if (
          featured &&
          previous?.status === "SELECTED" &&
          previous.subjectId === id &&
          post.featuredAt
        )
          return true;
        await tx.adventureSubmission.update({
          where: { id },
          data: {
            featuredAt: featured ? new Date() : null,
            featuredBy: featured ? auth.walletAddress : null,
          },
        });
        if (featured) {
          const selection = {
            eventType: WEEKLY_SPOTLIGHT_EVENT,
            source: "admin",
            subjectType: "ADVENTURE_SUBMISSION",
            subjectId: id,
            title: "Weekly editorial spotlight",
            status: "SELECTED",
            actor: auth.walletAddress,
            href: week.href,
            metadataJson: {
              week: week.key,
              startsAt: week.startsAt,
              endsAt: week.endsAt,
              momentId: id,
              reason,
              evidence: "editorial_selection_only",
            },
          };
          await tx.founderEvent.upsert({
            where: { dedupeKey: spotlightKey(week.key) },
            create: { dedupeKey: spotlightKey(week.key), ...selection },
            update: selection,
          });
          await tx.notification.create({
            data: {
              wallet: post.wallet,
              type: "ADVENTURE_REVIEW",
              title: "Your creation made the Spotlight",
              message:
                "An editor selected your approved creation for " +
                week.label +
                ". This is recognition, with no prize or commercial reuse rights.",
              link: "/moments/" + id,
            },
          });
        } else {
          await removeWeeklySpotlights(tx, id);
        }
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
        await removeWeeklySpotlights(tx, id);
        await tx.founderEvent.updateMany({
          where: {
            eventType: "ADVENTURE_REPORT",
            status: "NEEDS_REVIEW",
            metadataJson: { path: ["momentId"], equals: id },
          },
          data: { status: status === "APPROVED" ? "RESOLVED" : "REMOVED" },
        });
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
          dedupeKey: `moment-review:${id}:${post.updatedAt.getTime()}:${
            featured ?? status
          }`,
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
            ...(featured === true ? { week: week.key } : {}),
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
          409
        );
  } catch {
    return socialError(
      "Could not save this review. Refresh before retrying.",
      503
    );
  }
}
