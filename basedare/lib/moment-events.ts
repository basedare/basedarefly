import "server-only";
import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { JOURNEY_COOKIE_NAME, hashOpaqueToken } from "./mission-pass-crypto";

/** Reuse the append-only ledger. Client/guest events never complete a paid intent. */
export async function momentAudit(
  tx: Prisma.TransactionClient,
  input: {
    type: string;
    id: string;
    activityId: string;
    wallet?: string;
    parentId?: string | null;
    request?: NextRequest;
  },
) {
  const raw = input.request?.cookies.get(JOURNEY_COOKIE_NAME)?.value;
  const journey = raw
    ? await tx.attributionJourney.findUnique({
        where: { cookieHash: hashOpaqueToken(raw) },
        select: { id: true, expiresAt: true, status: true },
      })
    : null;
  const active =
    journey?.status === "ACTIVE" && journey.expiresAt > new Date()
      ? journey
      : null;
  const intent = active
    ? await tx.actionIntent.findFirst({
        where: {
          journeyId: active.id,
          targetType: "PAGE",
          targetId: input.activityId,
          expiresAt: { gt: new Date() },
        },
        include: { primaryTouch: true },
      })
    : null;
  const original =
    !active && input.type !== "MOMENT_SUBMITTED"
      ? await tx.attributionEvent.findUnique({
          where: { dedupeKey: `moment:MOMENT_SUBMITTED:${input.id}` },
        })
      : null;
  await tx.attributionEvent.upsert({
    where: { dedupeKey: `moment:${input.type}:${input.id}` },
    update: {},
    create: {
      dedupeKey: `moment:${input.type}:${input.id}`,
      eventType: input.type,
      journeyId: active?.id ?? original?.journeyId,
      actionIntentId: intent?.id ?? original?.actionIntentId,
      touchId: intent?.primaryTouchId ?? original?.touchId,
      creatorCode: intent?.primaryTouch?.creatorCode ?? original?.creatorCode,
      contentCode: intent?.primaryTouch?.contentCode ?? original?.contentCode,
      campaignCode:
        intent?.primaryTouch?.campaignCode ?? original?.campaignCode,
      participantKey: input.wallet
        ? "wallet:" + input.wallet.toLowerCase()
        : undefined,
      targetType: "PAGE",
      targetId: input.activityId,
      metadataJson: {
        momentId: input.id,
        parentMomentId: input.parentId ?? null,
        evidence: "creative_display_review_only",
      },
    },
  });
}
export async function currentAdventureIntent(
  request: NextRequest,
  activityId: string,
) {
  const raw = request.cookies.get(JOURNEY_COOKIE_NAME)?.value;
  if (!raw) return null;
  return prisma.actionIntent.findFirst({
    where: {
      journey: {
        cookieHash: hashOpaqueToken(raw),
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
      targetType: "PAGE",
      targetId: activityId,
      expiresAt: { gt: new Date() },
    },
    include: { primaryTouch: true },
  });
}
