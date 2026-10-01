import { NextRequest, NextResponse } from "next/server";
import { calculateDistance } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { socialWallet, socialError, sameOrigin } from "@/lib/social-request";
import {
  adventureHashtag,
  adventureTemplate,
  ADVENTURE_DISPLAY_CONSENT,
  ADVENTURE_MEDIA_LIMIT,
} from "@/lib/adventure-sharing";
import {
  uploadPublicMediaFile,
  validateSupportedMediaFile,
} from "@/lib/media-upload";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const mine = q.get("mine") === "1";
    const wallet = mine
      ? await socialWallet(req, q.get("wallet"), "adventure:read")
      : null;
    if (mine && !wallet)
      return socialError("Sign in to see your submissions.", 401);
    const tag = (q.get("tag") ?? "")
      .replace(/^#/, "")
      .toLowerCase()
      .slice(0, 100);
    const lat = Number(q.get("lat")),
      lng = Number(q.get("lng")),
      radius = Math.min(100, Math.max(1, Number(q.get("radiusKm")) || 25));
    const nearby =
      !mine &&
      q.has("lat") &&
      q.has("lng") &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180;
    const posts = await prisma.adventureSubmission.findMany({
      where: {
        ...(mine ? { wallet: wallet! } : { status: "APPROVED" }),
        ...(q.get("id") ? { id: q.get("id")! } : {}),
        ...(tag ? { hashtag: tag } : {}),
        ...(q.get("place") ? { venueSlug: q.get("place")! } : {}),
        ...(nearby
          ? {
              venue: {
                latitude: { gte: lat - radius / 110, lte: lat + radius / 110 },
                longitude: {
                  gte:
                    lng -
                    radius /
                      (110 * Math.max(0.01, Math.cos((lat * Math.PI) / 180))),
                  lte:
                    lng +
                    radius /
                      (110 * Math.max(0.01, Math.cos((lat * Math.PI) / 180))),
                },
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    const [venues, creators] = await Promise.all([
      prisma.venue.findMany({
        where: {
          slug: { in: posts.map((p) => p.venueSlug) },
          status: "ACTIVE",
        },
        select: { slug: true, name: true, latitude: true, longitude: true },
      }),
      prisma.streamerTag.findMany({
        where: {
          walletAddress: { in: posts.map((p) => p.wallet) },
          status: { in: ["ACTIVE", "VERIFIED"] },
        },
        select: { walletAddress: true, tag: true },
      }),
    ]);
    const data = posts.flatMap((p) => {
      const venue = venues.find((v) => v.slug === p.venueSlug);
      return venue &&
        (!nearby ||
          calculateDistance(lat, lng, venue.latitude, venue.longitude) <=
            radius)
        ? [
            {
              id: p.id,
              activityId: p.activityId,
              caption: p.caption,
              hashtag: p.hashtag,
              mediaUrl: p.mediaUrl,
              mediaType: p.mediaType,
              status: p.status,
              reviewReason: mine ? p.reviewReason : undefined,
              createdAt: p.createdAt,
              creatorTag:
                creators.find((c) => c.walletAddress === p.wallet)?.tag ?? null,
              venue,
            },
          ]
        : [];
    });
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return socialError("Adventures could not be loaded. Please retry.", 503);
  }
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return socialError("Invalid origin.", 403);
  if (Number(req.headers.get("content-length")) > ADVENTURE_MEDIA_LIMIT + 65536)
    return socialError("Choose a photo or short clip under 4 MB.", 413);
  try {
    const form = await req.formData();
    const wallet = await socialWallet(
      req,
      form.get("wallet"),
      "adventure:submit",
    );
    if (!wallet) return socialError("Sign in to share an adventure.", 401);
    const activityId = String(form.get("activityId") ?? "");
    const runId = String(form.get("runId") ?? "");
    const caption = String(form.get("caption") ?? "").trim();
    const venueSlug = String(form.get("venueSlug") ?? "");
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
    const file = form.get("file");
    if (!(file instanceof File) || file.size > ADVENTURE_MEDIA_LIMIT)
      return socialError("Choose a photo or short clip under 4 MB.", 413);
    const invalid = validateSupportedMediaFile(file);
    if (invalid) return socialError(invalid);
    const venue = await prisma.venue.findFirst({
      where: { slug: venueSlug, status: "ACTIVE" },
      select: { id: true },
    });
    if (!venue) return socialError("Choose an existing public place.");
    const previous = await prisma.adventureSubmission.findUnique({
      where: { wallet_runId: { wallet, runId } },
    });
    if (previous)
      return NextResponse.json({
        success: true,
        data: { id: previous.id, status: previous.status },
      });
    const count = await prisma.adventureSubmission.count({
      where: { wallet, createdAt: { gte: new Date(Date.now() - 86400000) } },
    });
    if (count >= 3)
      return socialError(
        "You can share three adventures per day. Try again tomorrow.",
        429,
      );
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${wallet}))`;
      const existing = await tx.adventureSubmission.findUnique({
        where: { wallet_runId: { wallet, runId } },
      });
      if (existing) return existing;
      if (
        (await tx.adventureSubmission.count({
          where: {
            wallet,
            createdAt: { gte: new Date(Date.now() - 86400000) },
          },
        })) >= 3
      )
        throw new Error("Daily limit reached.");
    const media = await uploadPublicMediaFile({
      file,
      name: "BaseDare_Adventure",
      keyvalues: { kind: "adventure", wallet },
    });
      return tx.adventureSubmission.create({
        data: {
          wallet,
          runId,
          activityId,
          venueSlug,
          caption,
          hashtag: adventureHashtag(activityId),
          mediaUrl: media.url,
          mediaType: media.proofType,
          publicConsentVersion: ADVENTURE_DISPLAY_CONSENT,
          promotionContact: form.get("promotionContact") === "true",
        },
      });
    }, { maxWait: 2000, timeout: 30000 });
    return NextResponse.json({
      success: true,
      data: { id: result.id, status: result.status },
    });
  } catch {
    return socialError(
      "Submission failed. Your journal is safe; retry the same adventure.",
      503,
    );
  }
}
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return socialError("Invalid origin.", 403);
  try {
    const body = await req.json();
    const wallet = await socialWallet(req, body.wallet, "adventure:withdraw");
    if (!wallet) return socialError("Sign in first.", 401);
    await prisma.adventureSubmission.updateMany({
      where: { id: String(body.id), wallet },
      data: { status: "WITHDRAWN", promotionContact: false },
    });
    return NextResponse.json({ success: true });
  } catch {
    return socialError("Could not withdraw this submission.", 503);
  }
}
