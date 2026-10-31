import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { socialWallet, socialError, sameOrigin } from "@/lib/social-request";
import {
  adventureHashtag,
  adventureTemplate,
  ADVENTURE_DISPLAY_CONSENT,
  ADVENTURE_MEDIA_LIMIT,
} from "@/lib/adventure-sharing";
import { publicSocialPost, socialPostIdentity } from "@/lib/social-post-url";
import { boundedRequestBytes } from "@/lib/bounded-request";
import { validateMomentFile, uploadPrivateMoment } from "@/lib/moment-media";
import { momentInclude, momentPosts } from "@/lib/moment-server";
import { publicMomentAllowed } from "@/lib/adventure-evidence";
import { momentAudit } from "@/lib/moment-events";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { momentReleaseOptions, MOMENT_SHARING_PAUSED, MOMENT_FILES_PAUSED } from '@/lib/moment-release';
export const dynamic = "force-dynamic";
class SubmissionError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const reply = (id: string, status: string) =>
  NextResponse.json(
    {
      success: true,
      data: {
        id,
        status,
        momentHref: status === "APPROVED" ? "/moments/" + id : null,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams,
      mine = q.get("mine") === "1";
    const wallet = mine
      ? await socialWallet(req, q.get("wallet"), "adventure:read")
      : null;
    if (mine && !wallet)
      return socialError("Sign in to see your submissions.", 401);
    const tag = (q.get("tag") ?? "")
      .replace(/^#/, "")
      .toLowerCase()
      .slice(0, 100);
    const activityId = q.get("activityId");
    if (activityId && !adventureTemplate(activityId))
      return socialError("Unknown adventure.");
    const creator = mine ? undefined : q.get("creator")?.replace(/^@/, "");
    const identity =
      creator && /^[a-zA-Z0-9._-]{1,80}$/.test(creator)
        ? await prisma.streamerTag.findFirst({
            where: {
              OR: [
                { tag: { equals: creator, mode: "insensitive" } },
                { tag: { equals: "@" + creator, mode: "insensitive" } },
              ],
              status: { in: ["ACTIVE", "VERIFIED"] },
              revokedAt: null,
            },
            select: { walletAddress: true },
          })
        : null;
    if (creator && !identity)
      return NextResponse.json({ success: true, data: [] });
    const lat = Number(q.get("lat")),
      lng = Number(q.get("lng")),
      radius = Math.min(100, Math.max(1, Number(q.get("radiusKm")) || 25));
    const nearby =
      !mine &&
      q.has("lat") &&
      q.has("lng") &&
      Number.isFinite(lat) &&
      Math.abs(lat) <= 90 &&
      Number.isFinite(lng) &&
      Math.abs(lng) <= 180;
    const rows = await prisma.adventureSubmission.findMany({
      where: {
        ...(mine
          ? { wallet: { equals: wallet!, mode: "insensitive" } }
          : {
              status: "APPROVED",
              publicConsentVersion: {
                in: ["adventure-display-v1", ADVENTURE_DISPLAY_CONSENT],
              },
            }),
        ...(q.get("id") ? { id: q.get("id")! } : {}),
        ...(activityId ? { activityId } : {}),
        ...(tag ? { hashtag: tag } : {}),
        ...(q.get("place") ? { venueSlug: q.get("place")! } : {}),
        ...(identity
          ? {
              wallet: { equals: identity.walletAddress, mode: "insensitive" },
              OR: [
                { creatorCreditConsent: true },
                {
                  creatorCreditConsent: null,
                  publicConsentVersion: "adventure-display-v1",
                },
              ],
            }
          : {}),
        ...(nearby
          ? {
              AND: [
                {
                  OR: [
                    { venueSlug: null },
                    {
                      venue: {
                        status: "ACTIVE",
                        latitude: {
                          gte: lat - radius / 111,
                          lte: lat + radius / 111,
                        },
                        longitude: {
                          gte:
                            lng -
                            radius /
                              (111 *
                                Math.max(
                                  0.01,
                                  Math.cos((lat * Math.PI) / 180),
                                )),
                          lte:
                            lng +
                            radius /
                              (111 *
                                Math.max(
                                  0.01,
                                  Math.cos((lat * Math.PI) / 180),
                                )),
                        },
                      },
                    },
                  ],
                },
              ],
            }
          : {}),
      },
      include: momentInclude,
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    const { calculateDistance } = await import("@/lib/geo");
    const visible = rows.filter(
      (row) =>
        !nearby ||
        !row.venue ||
        calculateDistance(lat, lng, row.venue.latitude, row.venue.longitude) <=
          radius,
    );
    return NextResponse.json(
      { success: true, data: await momentPosts(visible, mine) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return socialError("Moments could not be loaded. Please retry.", 503);
  }
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return socialError("Invalid origin.", 403);
  if (!momentReleaseOptions().socialLinks) return socialError(MOMENT_SHARING_PAUSED, 503);
  if (
    !checkRateLimit(getClientIp(req), {
      limit: 12,
      windowMs: 60000,
      keyPrefix: "moment-submit",
    }).allowed
  )
    return socialError("Too many attempts. Try again shortly.", 429);
  try {
    const bytes = await boundedRequestBytes(req, ADVENTURE_MEDIA_LIMIT + 65536);
    const form = await new Response(bytes, {
      headers: { "Content-Type": req.headers.get("content-type") ?? "" },
    }).formData();
    const authorized = await socialWallet(
      req,
      form.get("wallet"),
      "adventure:submit",
    );
    if (!authorized)
      return socialError("Sign in to submit your creation.", 401);
    const wallet = authorized.toLowerCase(),
      activityId = String(form.get("activityId") ?? ""),
      runId = String(form.get("runId") ?? "");
    const caption = String(form.get("caption") ?? "").trim(),
      venueSlug = String(form.get("venueSlug") ?? "").trim() || null;
    if (
      !adventureTemplate(activityId) ||
      !/^[a-zA-Z0-9-]{10,80}$/.test(runId) ||
      !caption ||
      caption.length > 280
    )
      return socialError(
        "Choose an adventure and a caption of 1–280 characters.",
      );
    if (form.get("consent") !== ADVENTURE_DISPLAY_CONSENT)
      return socialError("Confirm permission to display your contribution.");
    const file = form.get("file"),
      hasFile = file instanceof File && file.size > 0;
    const socialInput = String(form.get("socialUrl") ?? "").trim(),
      social = socialInput ? publicSocialPost(socialInput) : null;
    if ((hasFile ? 1 : 0) + (socialInput ? 1 : 0) !== 1)
      return socialError("Choose one public post link or one original file.");
    if (socialInput && !social)
      return socialError(
        "Use a full public TikTok video, Instagram post/Reel or X post URL. Profiles, short links and embeds aren’t supported.",
      );
    if (hasFile) {
      if (!momentReleaseOptions().originalMedia) return socialError(MOMENT_FILES_PAUSED, 503);
      const invalid = await validateMomentFile(file);
      if (invalid) return socialError(invalid);
    }
    if (
      venueSlug &&
      !(await prisma.venue.findFirst({
        where: { slug: venueSlug, status: "ACTIVE" },
        select: { id: true },
      }))
    )
      return socialError(
        "Choose an existing public place or leave the place blank.",
      );
    const sourceKey = createHash("sha256")
      .update(
        social
          ? socialPostIdentity(social)
          : Buffer.from(await (file as File).arrayBuffer()),
      )
      .digest("hex");
    const parentId = String(form.get("parentMomentId") ?? "").trim() || null;
    const row = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${wallet}))::text`;
        const previous = await tx.adventureSubmission.findFirst({
          where: { wallet: { equals: wallet, mode: "insensitive" }, runId },
        });
        if (previous) {
          if (
            previous.activityId !== activityId ||
            previous.sourceKey !== sourceKey ||
            previous.caption !== caption ||
            previous.venueSlug !== venueSlug
          )
            throw new SubmissionError(
              "This attempt already has a different submission. Open My submissions to review it.",
              409,
            );
          return previous;
        }
        if (
          await tx.adventureSubmission.findFirst({
            where: {
              wallet: { equals: wallet, mode: "insensitive" },
              sourceKey,
            },
          })
        )
          throw new SubmissionError(
            "You’ve already submitted this post or file. Open My submissions for its status.",
            409,
          );
        if (
          (await tx.adventureSubmission.count({
            where: {
              wallet: { equals: wallet, mode: "insensitive" },
              createdAt: { gte: new Date(Date.now() - 86400000) },
            },
          })) >= 3
        )
          throw new SubmissionError(
            "You can submit three creations per day. Try again tomorrow.",
            429,
          );
        if (parentId) {
          const parent = await tx.adventureSubmission.findFirst({
            where: {
              id: parentId,
              activityId,
              status: "APPROVED",
              publicConsentVersion: {
                in: ["adventure-display-v1", ADVENTURE_DISPLAY_CONSENT],
              },
            },
            include: momentInclude,
          });
          if (
            !parent ||
            !publicMomentAllowed(parent) ||
            parent.wallet.toLowerCase() === wallet
          )
            throw new SubmissionError(
              "Choose a currently approved attempt by another contributor for a relay.",
            );
        }
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"moment-source:" + sourceKey}))::text`;
        if (
          await tx.adventureSubmission.findFirst({
            where: {
              sourceKey,
              status: { in: ["PENDING", "APPROVED", "FLAGGED"] },
            },
            select: { id: true },
          })
        )
          throw new SubmissionError(
            "That source is already in the review flow. Use an original contribution or contact support.",
            409,
          );
        const media = hasFile ? await uploadPrivateMoment(file as File) : null;
        const created = await tx.adventureSubmission.create({
          data: {
            wallet,
            activityId,
            runId,
            caption,
            venueSlug,
            sourceKey,
            hashtag: adventureHashtag(activityId),
            mediaUrl: null,
            mediaType: social ? "SOCIAL" : media!.mediaType,
            socialUrl: social?.url,
            socialPlatform: social?.platform,
            privateMediaCid: media?.cid,
            privateMediaMime: media?.mime,
            parentMomentId: parentId,
            publicConsentVersion: ADVENTURE_DISPLAY_CONSENT,
            creatorCreditConsent: form.get("creatorCreditConsent") === "true",
            spotlightConsent: form.get("spotlightConsent") === "true",
            promotionContact: form.get("promotionContact") === "true",
          },
        });
        await momentAudit(tx, {
          type: "MOMENT_SUBMITTED",
          id: created.id,
          activityId,
          wallet,
          parentId,
          request: req,
        });
        return created;
      },
      { maxWait: 3000, timeout: 30000 },
    );
    return reply(row.id, row.status);
  } catch (error) {
    if (error instanceof SubmissionError)
      return socialError(error.message, error.status);
    if (error instanceof Error && error.message === "BODY_TOO_LARGE")
      return socialError("Choose a file under 4 MB.", 413);
    return socialError(
      "Couldn’t save this submission. Your adventure is safe. If uploading fails, try a supported public post link.",
      503,
    );
  }
}
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return socialError("Invalid origin.", 403);
  try {
    const bytes = await boundedRequestBytes(req, 4096),
      body = JSON.parse(new TextDecoder().decode(bytes));
    const authorized = await socialWallet(
      req,
      body.wallet,
      "adventure:withdraw",
    );
    if (!authorized) return socialError("Sign in first.", 401);
    const wallet = authorized.toLowerCase();
    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ id: string; activityId: string }>
      >`SELECT id, "activityId" FROM "AdventureSubmission" WHERE id = ${String(body.id)} AND LOWER(wallet) = ${wallet} FOR UPDATE`;
      if (!rows[0]) throw new SubmissionError("Submission not found.", 404);
      await tx.adventureSubmission.update({
        where: { id: rows[0].id },
        data: {
          status: "WITHDRAWN",
          promotionContact: false,
          featuredAt: null,
          featuredBy: null,
        },
      });
      await momentAudit(tx, {
        type: "MOMENT_WITHDRAWN",
        id: rows[0].id,
        activityId: rows[0].activityId,
        wallet,
      });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return socialError(
      error instanceof SubmissionError
        ? error.message
        : "Could not withdraw this submission.",
      error instanceof SubmissionError ? error.status : 503,
    );
  }
}
