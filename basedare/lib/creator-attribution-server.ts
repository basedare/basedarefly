import 'server-only';

import type { Dare, Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import {
  INTENT_TTL_MS,
  JOURNEY_TTL_MS,
  MISSION_PASS_TTL_MS,
  isUnexpired,
  normalizeEmail,
  normalizeMissionTitle,
  normalizeTargetHref,
  normalizeTargetId,
  normalizeTargetType,
  participantKeyForEmailHmac,
  verifiedCompletionEventType,
} from '@/lib/creator-attribution-policy';
import {
  JOURNEY_COOKIE_NAME,
  PARTICIPANT_COOKIE_NAME,
  PARTICIPANT_SESSION_TTL_SECONDS,
  createOpaqueToken,
  createParticipantCookieValue,
  getMissionPassSecret,
  hashOpaqueToken,
  hmacEmail,
  verifyParticipantCookieValue,
} from '@/lib/mission-pass-crypto';
import { prisma } from '@/lib/prisma';
import { classifySocialWebview } from '@/lib/social-webview';
import { resolveDestinationVenueId } from '@/lib/field-station-server';

const ACTIVE_INTENT_STATES = ['LOCKED', 'BOUND'] as const;

export type AttributionTargetInput = {
  targetType: string;
  targetId: string;
  targetHref: string;
  title?: string | null;
};

type JourneyResolution = {
  journey: {
    id: string;
    participantKey: string | null;
    expiresAt: Date;
  };
  rawToken: string;
  isNew: boolean;
};

function publicAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://www.basedare.xyz').replace(/\/$/, '');
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

function readParticipantKey(request: NextRequest): string | null {
  try {
    return verifyParticipantCookieValue(
      request.cookies.get(PARTICIPANT_COOKIE_NAME)?.value,
      getMissionPassSecret()
    );
  } catch {
    return null;
  }
}

export function applyJourneyCookie(response: NextResponse, rawToken: string) {
  response.cookies.set(JOURNEY_COOKIE_NAME, rawToken, cookieOptions(Math.floor(JOURNEY_TTL_MS / 1000)));
}

export function applyParticipantCookie(response: NextResponse, participantKey: string) {
  response.cookies.set(
    PARTICIPANT_COOKIE_NAME,
    createParticipantCookieValue(participantKey, getMissionPassSecret()),
    cookieOptions(PARTICIPANT_SESSION_TTL_SECONDS)
  );
}

export function clearAttributionCookies(response: NextResponse) {
  response.cookies.set(JOURNEY_COOKIE_NAME, '', { ...cookieOptions(0), maxAge: 0 });
  response.cookies.set(PARTICIPANT_COOKIE_NAME, '', { ...cookieOptions(0), maxAge: 0 });
}

export async function ensureAttributionJourney(request: NextRequest): Promise<JourneyResolution> {
  const now = new Date();
  const participantKey = readParticipantKey(request);
  const existingRaw = request.cookies.get(JOURNEY_COOKIE_NAME)?.value ?? null;

  if (existingRaw) {
    const existing = await prisma.attributionJourney.findUnique({
      where: { cookieHash: hashOpaqueToken(existingRaw) },
      select: { id: true, participantKey: true, expiresAt: true, status: true },
    });
    if (existing && existing.status === 'ACTIVE' && isUnexpired(existing.expiresAt, now)) {
      const nextParticipant = participantKey ?? existing.participantKey;
      const journey = await prisma.attributionJourney.update({
        where: { id: existing.id },
        data: { lastSeenAt: now, participantKey: nextParticipant },
        select: { id: true, participantKey: true, expiresAt: true },
      });
      return { journey, rawToken: existingRaw, isNew: false };
    }
  }

  const rawToken = createOpaqueToken();
  const journey = await prisma.attributionJourney.create({
    data: {
      cookieHash: hashOpaqueToken(rawToken),
      participantKey,
      firstReferrer: request.headers.get('referer')?.slice(0, 1024) ?? null,
      userAgentClass: classifySocialWebview(request.headers.get('user-agent')),
      expiresAt: new Date(now.getTime() + JOURNEY_TTL_MS),
    },
    select: { id: true, participantKey: true, expiresAt: true },
  });
  return { journey, rawToken, isNew: true };
}

export async function recordAttributionRedirect(
  request: NextRequest,
  link: {
    id: string;
    creatorCode: string;
    contentCode: string;
    campaignCode: string | null;
    targetType: string;
    targetId: string;
    targetHref: string;
    stationCode?: string | null;
    stationHostVenueId?: string | null;
    requestedAttentionMode?: string | null;
    attentionMode?: string | null;
    densityCount?: number | null;
    fallbackApplied?: boolean;
    fallbackReason?: string | null;
  }
) {
  const resolved = await ensureAttributionJourney(request);
  await prisma.$transaction(async (tx) => {
    const touch = await tx.attributionTouch.create({
      data: {
        journeyId: resolved.journey.id,
        linkId: link.id,
        creatorCode: link.creatorCode,
        contentCode: link.contentCode,
        campaignCode: link.campaignCode,
        targetType: link.targetType,
        targetId: link.targetId,
        targetHref: link.targetHref,
        referrer: request.headers.get('referer')?.slice(0, 1024) ?? null,
        stationCode: link.stationCode ?? null,
        stationHostVenueId: link.stationHostVenueId ?? null,
        requestedAttentionMode: link.requestedAttentionMode ?? null,
        attentionMode: link.attentionMode ?? null,
        densityCount: link.densityCount ?? null,
        fallbackApplied: link.fallbackApplied ?? null,
      },
    });
    const sharedEvent = {
      journeyId: resolved.journey.id,
      touchId: touch.id,
      creatorCode: link.creatorCode,
      contentCode: link.contentCode,
      campaignCode: link.campaignCode,
      stationCode: link.stationCode ?? null,
      stationHostVenueId: link.stationHostVenueId ?? null,
      attentionMode: link.attentionMode ?? null,
      participantKey: resolved.journey.participantKey,
      targetType: link.targetType,
      targetId: link.targetId,
    };
    await tx.attributionEvent.create({
      data: {
        eventType: 'TOUCH_RECORDED',
        dedupeKey: `touch:${touch.id}`,
        ...sharedEvent,
        metadataJson: {
          referrer: touch.referrer,
          densityCount: link.densityCount ?? null,
          fallbackApplied: link.fallbackApplied ?? false,
          fallbackReason: link.fallbackReason ?? null,
        },
      },
    });
    if (link.stationCode) {
      await tx.attributionEvent.create({
        data: {
          eventType: 'STATION_SCAN',
          dedupeKey: `station-scan:${touch.id}`,
          ...sharedEvent,
          metadataJson: {
            requestedAttentionMode: link.requestedAttentionMode ?? null,
            densityCount: link.densityCount ?? null,
            fallbackApplied: link.fallbackApplied ?? false,
            fallbackReason: link.fallbackReason ?? null,
          },
        },
      });
    }
  });
  return resolved;
}

async function assertEmailDeliveryAllowed(emailHmac: string) {
  const recent = await prisma.missionPass.count({
    where: {
      emailHmac,
      issuedAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
    },
  });
  if (recent >= 3) {
    throw new Error('Too many Mission Pass emails were requested. Try again later.');
  }
}

function normalizeTarget(input: AttributionTargetInput) {
  return {
    targetType: normalizeTargetType(input.targetType),
    targetId: normalizeTargetId(input.targetId),
    targetHref: normalizeTargetHref(input.targetHref),
    titleSnapshot: normalizeMissionTitle(input.title),
  };
}

export async function lockActionIntent(request: NextRequest, input: AttributionTargetInput) {
  const target = normalizeTarget(input);
  const resolved = await ensureAttributionJourney(request);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.actionIntent.findUnique({
      where: {
        journeyId_targetType_targetId: {
          journeyId: resolved.journey.id,
          targetType: target.targetType,
          targetId: target.targetId,
        },
      },
      include: { primaryTouch: true, stationTouch: true },
    });

    if (existing && ['LOCKED', 'BOUND', 'COMPLETED'].includes(existing.state) && isUnexpired(existing.expiresAt, now)) {
      return existing;
    }

    const primaryTouch = await tx.attributionTouch.findFirst({
      where: {
        journeyId: resolved.journey.id,
        targetType: target.targetType,
        targetId: target.targetId,
      },
      orderBy: { occurredAt: 'desc' },
    });
    const stationTouch = await tx.attributionTouch.findFirst({
      where: {
        journeyId: resolved.journey.id,
        stationCode: { not: null },
        occurredAt: { lte: now },
      },
      orderBy: { occurredAt: 'desc' },
    });
    const destinationVenueId = await resolveDestinationVenueId(tx, target);
    const expiresAt = new Date(now.getTime() + INTENT_TTL_MS);
    const intent = existing
      ? await tx.actionIntent.update({
          where: { id: existing.id },
          data: {
            primaryTouchId: primaryTouch?.id ?? existing.primaryTouchId,
            stationTouchId: stationTouch?.id ?? existing.stationTouchId,
            destinationVenueId: destinationVenueId ?? existing.destinationVenueId,
            targetHref: target.targetHref,
            titleSnapshot: target.titleSnapshot ?? existing.titleSnapshot,
            state: 'LOCKED',
            canonicalIntentId: null,
            lockedAt: now,
            expiresAt,
            boundAt: null,
            completedAt: null,
          },
          include: { primaryTouch: true, stationTouch: true },
        })
      : await tx.actionIntent.create({
          data: {
            journeyId: resolved.journey.id,
            primaryTouchId: primaryTouch?.id ?? null,
            stationTouchId: stationTouch?.id ?? null,
            destinationVenueId,
            participantKey: resolved.journey.participantKey,
            ...target,
            expiresAt,
          },
          include: { primaryTouch: true, stationTouch: true },
        });

    await tx.attributionEvent.create({
      data: {
        eventType: 'INTENT_LOCKED',
        dedupeKey: `intent-locked:${intent.id}:${intent.lockedAt.getTime()}`,
        journeyId: resolved.journey.id,
        touchId: intent.primaryTouchId,
        actionIntentId: intent.id,
        creatorCode: intent.primaryTouch?.creatorCode ?? null,
        contentCode: intent.primaryTouch?.contentCode ?? null,
        campaignCode: intent.primaryTouch?.campaignCode ?? null,
        stationCode: intent.stationTouch?.stationCode ?? null,
        stationHostVenueId: intent.stationTouch?.stationHostVenueId ?? null,
        attentionMode: intent.stationTouch?.attentionMode ?? null,
        destinationVenueId: intent.destinationVenueId,
        participantKey: intent.participantKey,
        targetType: intent.targetType,
        targetId: intent.targetId,
      },
    });
    return intent;
  });

  return { intent: result, journeyToken: resolved.rawToken };
}

export async function issueMissionPass(input: {
  request: NextRequest;
  actionIntentId: string;
  deliveryMethod: 'EMAIL' | 'PORTABLE_LINK';
  email?: string | null;
}) {
  const resolved = await ensureAttributionJourney(input.request);
  const intent = await prisma.actionIntent.findFirst({
    where: {
      id: input.actionIntentId,
      OR: [
        { journeyId: resolved.journey.id },
        ...(resolved.journey.participantKey ? [{ participantKey: resolved.journey.participantKey }] : []),
      ],
    },
    include: { primaryTouch: true, stationTouch: true },
  });
  if (
    !intent ||
    !ACTIVE_INTENT_STATES.includes(intent.state as (typeof ACTIVE_INTENT_STATES)[number]) ||
    (intent.state === 'LOCKED' && !isUnexpired(intent.expiresAt))
  ) {
    throw new Error('This mission is no longer available to save.');
  }

  const secret = getMissionPassSecret();
  const normalizedEmail = input.deliveryMethod === 'EMAIL' ? normalizeEmail(input.email ?? '') : null;
  const emailHmac = normalizedEmail ? hmacEmail(normalizedEmail, secret) : null;
  if (emailHmac) await assertEmailDeliveryAllowed(emailHmac);
  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + MISSION_PASS_TTL_MS);
  const missionPass = await prisma.$transaction(async (tx) => {
    const created = await tx.missionPass.create({
      data: {
        journeyId: resolved.journey.id,
        actionIntentId: intent.id,
        tokenHash: hashOpaqueToken(token),
        emailHmac,
        deliveryMethod: input.deliveryMethod,
        state: input.deliveryMethod === 'EMAIL' ? 'ISSUED' : 'READY',
        expiresAt,
      },
    });
    await tx.attributionEvent.create({
      data: {
        eventType: 'MISSION_PASS_ISSUED',
        dedupeKey: `mission-pass-issued:${created.id}`,
        journeyId: created.journeyId,
        touchId: intent.primaryTouchId,
        actionIntentId: intent.id,
        missionPassId: created.id,
        creatorCode: intent.primaryTouch?.creatorCode ?? null,
        contentCode: intent.primaryTouch?.contentCode ?? null,
        campaignCode: intent.primaryTouch?.campaignCode ?? null,
        stationCode: intent.stationTouch?.stationCode ?? null,
        stationHostVenueId: intent.stationTouch?.stationHostVenueId ?? null,
        attentionMode: intent.stationTouch?.attentionMode ?? null,
        destinationVenueId: intent.destinationVenueId,
        participantKey: intent.participantKey,
        targetType: intent.targetType,
        targetId: intent.targetId,
        metadataJson: { deliveryMethod: input.deliveryMethod, purpose: created.purpose },
      },
    });
    return created;
  });
  return {
    missionPass,
    normalizedEmail,
    title: intent.titleSnapshot ?? 'Saved mission',
    continueUrl: `${publicAppUrl()}/continue/${token}`,
    journeyToken: resolved.rawToken,
  };
}

export async function markMissionPassDelivery(passId: string, delivered: boolean) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const missionPass = await tx.missionPass.update({
      where: { id: passId },
      data: delivered
        ? { state: 'DELIVERED', deliveredAt: now }
        : { state: 'DELIVERY_FAILED' },
      include: {
        actionIntent: { include: { primaryTouch: true, stationTouch: true } },
      },
    });
    await tx.attributionEvent.createMany({
      data: [{
        eventType: delivered ? 'MISSION_PASS_DELIVERED' : 'MISSION_PASS_DELIVERY_FAILED',
        dedupeKey: `mission-pass-delivery:${missionPass.id}:${delivered ? 'ok' : 'failed'}`,
        journeyId: missionPass.journeyId,
        actionIntentId: missionPass.actionIntentId,
        missionPassId: missionPass.id,
        touchId: missionPass.actionIntent?.primaryTouchId ?? null,
        creatorCode: missionPass.actionIntent?.primaryTouch?.creatorCode ?? null,
        contentCode: missionPass.actionIntent?.primaryTouch?.contentCode ?? null,
        campaignCode: missionPass.actionIntent?.primaryTouch?.campaignCode ?? null,
        stationCode: missionPass.actionIntent?.stationTouch?.stationCode ?? null,
        stationHostVenueId: missionPass.actionIntent?.stationTouch?.stationHostVenueId ?? null,
        attentionMode: missionPass.actionIntent?.stationTouch?.attentionMode ?? null,
        destinationVenueId: missionPass.actionIntent?.destinationVenueId ?? null,
        metadataJson: { deliveryMethod: missionPass.deliveryMethod },
      }],
      skipDuplicates: true,
    });
  });
}

export async function issueRecoveryMissionPass(request: NextRequest, email: string) {
  const secret = getMissionPassSecret();
  const normalizedEmail = normalizeEmail(email);
  const emailHmac = hmacEmail(normalizedEmail, secret);
  await assertEmailDeliveryAllowed(emailHmac);
  const resolved = await ensureAttributionJourney(request);

  const currentIntent = await prisma.actionIntent.findFirst({
    where: { journeyId: resolved.journey.id, state: { in: [...ACTIVE_INTENT_STATES] } },
    include: { primaryTouch: true, stationTouch: true },
    orderBy: { updatedAt: 'desc' },
  });
  const priorPass = currentIntent
    ? null
    : await prisma.missionPass.findFirst({
        where: { emailHmac, state: { not: 'REVOKED' } },
        orderBy: { issuedAt: 'desc' },
      });
  const journeyId = currentIntent?.journeyId ?? priorPass?.journeyId ?? resolved.journey.id;

  const token = createOpaqueToken();
  const missionPass = await prisma.$transaction(async (tx) => {
    const created = await tx.missionPass.create({
      data: {
        journeyId,
        actionIntentId: currentIntent?.id ?? null,
        tokenHash: hashOpaqueToken(token),
        emailHmac,
        purpose: 'RECOVERY',
        deliveryMethod: 'EMAIL',
        expiresAt: new Date(Date.now() + MISSION_PASS_TTL_MS),
      },
    });
    await tx.attributionEvent.create({
      data: {
        eventType: 'MISSION_PASS_ISSUED',
        dedupeKey: `mission-pass-issued:${created.id}`,
        journeyId,
        actionIntentId: currentIntent?.id ?? null,
        missionPassId: created.id,
        touchId: currentIntent?.primaryTouchId ?? null,
        creatorCode: currentIntent?.primaryTouch?.creatorCode ?? null,
        contentCode: currentIntent?.primaryTouch?.contentCode ?? null,
        campaignCode: currentIntent?.primaryTouch?.campaignCode ?? null,
        stationCode: currentIntent?.stationTouch?.stationCode ?? null,
        stationHostVenueId: currentIntent?.stationTouch?.stationHostVenueId ?? null,
        attentionMode: currentIntent?.stationTouch?.attentionMode ?? null,
        destinationVenueId: currentIntent?.destinationVenueId ?? null,
        targetType: currentIntent?.targetType ?? null,
        targetId: currentIntent?.targetId ?? null,
        metadataJson: { deliveryMethod: 'EMAIL', purpose: 'RECOVERY' },
      },
    });
    return created;
  });
  return {
    sent: true as const,
    missionPass,
    normalizedEmail,
    continueUrl: `${publicAppUrl()}/continue/${token}`,
    journeyToken: resolved.rawToken,
  };
}

export async function consumeMissionPass(token: string) {
  const now = new Date();
  const tokenHash = hashOpaqueToken(token);
  const existing = await prisma.missionPass.findUnique({
    where: { tokenHash },
    include: {
      actionIntent: { include: { primaryTouch: true, stationTouch: true } },
    },
  });
  if (!existing) return { status: 'INVALID' as const };
  if (existing.revokedAt || existing.state === 'REVOKED') return { status: 'REVOKED' as const };
  if (!isUnexpired(existing.expiresAt, now)) return { status: 'EXPIRED' as const };

  const participantKey = existing.emailHmac ? participantKeyForEmailHmac(existing.emailHmac) : null;
  const nextJourneyToken = createOpaqueToken();
  const result = await prisma.$transaction(async (tx) => {
    const missionPass = await tx.missionPass.update({
      where: { id: existing.id },
      data: { state: 'OPENED', openedAt: existing.openedAt ?? now },
      include: {
        actionIntent: { include: { primaryTouch: true, stationTouch: true } },
      },
    });
    await tx.attributionJourney.update({
      where: { id: missionPass.journeyId },
      data: {
        cookieHash: hashOpaqueToken(nextJourneyToken),
        participantKey: participantKey ?? undefined,
        lastSeenAt: now,
      },
    });

    if (participantKey && existing.emailHmac) {
      const relatedPasses = await tx.missionPass.findMany({
        where: { emailHmac: existing.emailHmac, state: { not: 'REVOKED' } },
        select: { journeyId: true },
        distinct: ['journeyId'],
      });
      const journeyIds = relatedPasses.map((pass) => pass.journeyId);
      await tx.attributionJourney.updateMany({
        where: { id: { in: journeyIds } },
        data: { participantKey, lastSeenAt: now },
      });
      await tx.actionIntent.updateMany({
        where: { journeyId: { in: journeyIds }, participantKey: null },
        data: { participantKey },
      });
    }

    if (missionPass.actionIntentId && participantKey) {
      const current = await tx.actionIntent.findUniqueOrThrow({ where: { id: missionPass.actionIntentId } });
      const siblings = await tx.actionIntent.findMany({
        where: {
          participantKey,
          targetType: current.targetType,
          targetId: current.targetId,
          state: { in: ['LOCKED', 'BOUND', 'COMPLETED'] },
        },
        orderBy: { lockedAt: 'asc' },
      });
      const canonical = siblings[0] ?? current;
      const duplicateIds = siblings.filter((intent) => intent.id !== canonical.id && intent.state !== 'COMPLETED').map((intent) => intent.id);
      if (duplicateIds.length > 0) {
        await tx.actionIntent.updateMany({
          where: { id: { in: duplicateIds } },
          data: { state: 'MERGED', canonicalIntentId: canonical.id },
        });
      }
    }

    await tx.attributionEvent.createMany({
      data: [{
        eventType: 'MISSION_PASS_OPENED',
        dedupeKey: `mission-pass-opened:${missionPass.id}`,
        journeyId: missionPass.journeyId,
        actionIntentId: missionPass.actionIntentId,
        missionPassId: missionPass.id,
        touchId: missionPass.actionIntent?.primaryTouchId ?? null,
        creatorCode: missionPass.actionIntent?.primaryTouch?.creatorCode ?? null,
        contentCode: missionPass.actionIntent?.primaryTouch?.contentCode ?? null,
        campaignCode: missionPass.actionIntent?.primaryTouch?.campaignCode ?? null,
        stationCode: missionPass.actionIntent?.stationTouch?.stationCode ?? null,
        stationHostVenueId: missionPass.actionIntent?.stationTouch?.stationHostVenueId ?? null,
        attentionMode: missionPass.actionIntent?.stationTouch?.attentionMode ?? null,
        destinationVenueId: missionPass.actionIntent?.destinationVenueId ?? null,
        participantKey,
        targetType: missionPass.actionIntent?.targetType ?? null,
        targetId: missionPass.actionIntent?.targetId ?? null,
        metadataJson: { purpose: missionPass.purpose, deliveryMethod: missionPass.deliveryMethod },
      }],
      skipDuplicates: true,
    });
    return missionPass;
  });

  return {
    status: 'OPENED' as const,
    missionPass: result,
    participantKey,
    journeyToken: nextJourneyToken,
    targetHref: result.actionIntent?.targetHref ?? '/missions',
  };
}

export async function listSavedMissions(request: NextRequest) {
  const participantKey = readParticipantKey(request);
  const rawJourney = request.cookies.get(JOURNEY_COOKIE_NAME)?.value ?? null;
  const journey = rawJourney
    ? await prisma.attributionJourney.findUnique({
        where: { cookieHash: hashOpaqueToken(rawJourney) },
        select: { id: true },
      })
    : null;
  if (!participantKey && !journey) return [];

  return prisma.actionIntent.findMany({
    where: {
      canonicalIntentId: null,
      AND: [
        {
          OR: [
            { state: 'COMPLETED' },
            { state: 'BOUND' },
            { state: 'LOCKED', expiresAt: { gt: new Date() } },
          ],
        },
        {
          OR: [
            ...(participantKey ? [{ participantKey }] : []),
            ...(journey ? [{ journeyId: journey.id }] : []),
          ],
        },
      ],
    },
    select: {
      id: true,
      targetType: true,
      targetId: true,
      targetHref: true,
      titleSnapshot: true,
      state: true,
      lockedAt: true,
      expiresAt: true,
      completedAt: true,
      primaryTouch: { select: { creatorCode: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
}

export async function forgetSavedMissions(request: NextRequest) {
  const participantKey = readParticipantKey(request);
  const rawJourney = request.cookies.get(JOURNEY_COOKIE_NAME)?.value ?? null;
  const journey = rawJourney
    ? await prisma.attributionJourney.findUnique({
        where: { cookieHash: hashOpaqueToken(rawJourney) },
        select: { id: true },
      })
    : null;
  if (!participantKey && !journey) return { forgotten: 0 };

  return prisma.$transaction(async (tx) => {
    const journeys = await tx.attributionJourney.findMany({
      where: {
        OR: [
          ...(participantKey ? [{ participantKey }] : []),
          ...(journey ? [{ id: journey.id }] : []),
        ],
      },
      select: { id: true },
    });
    const journeyIds = journeys.map((item) => item.id);
    if (journeyIds.length === 0) return { forgotten: 0 };

    const intents = await tx.actionIntent.findMany({
      where: { journeyId: { in: journeyIds }, state: { not: 'COMPLETED' } },
      select: { id: true },
    });
    await tx.actionIntent.updateMany({
      where: { id: { in: intents.map((intent) => intent.id) } },
      data: { state: 'FORGOTTEN' },
    });
    await tx.missionPass.updateMany({
      where: { journeyId: { in: journeyIds }, revokedAt: null },
      data: { state: 'REVOKED', revokedAt: new Date() },
    });
    await tx.attributionJourney.updateMany({
      where: { id: { in: journeyIds } },
      data: { status: 'FORGOTTEN', participantKey: null },
    });
    await tx.attributionEvent.create({
      data: {
        eventType: 'MISSIONS_FORGOTTEN',
        dedupeKey: `missions-forgotten:${journeyIds.sort().join(',')}:${Date.now()}`,
        participantKey,
        metadataJson: { journeyCount: journeyIds.length, intentCount: intents.length },
      },
    });
    return { forgotten: intents.length };
  });
}

export async function bindDareIntentToWallet(request: NextRequest, dareId: string, walletAddress: string) {
  const participantKey = readParticipantKey(request);
  const rawJourney = request.cookies.get(JOURNEY_COOKIE_NAME)?.value ?? null;
  const journey = rawJourney
    ? await prisma.attributionJourney.findUnique({
        where: { cookieHash: hashOpaqueToken(rawJourney) },
        select: { id: true },
      })
    : null;
  if (!participantKey && !journey) return null;

  const intent = await prisma.actionIntent.findFirst({
    where: {
      targetType: 'DARE',
      targetId: dareId,
      state: 'LOCKED',
      expiresAt: { gt: new Date() },
      OR: [
        ...(participantKey ? [{ participantKey }] : []),
        ...(journey ? [{ journeyId: journey.id }] : []),
      ],
    },
    include: { primaryTouch: true, stationTouch: true },
    orderBy: { lockedAt: 'asc' },
  });
  if (!intent) return null;

  const normalizedWallet = walletAddress.toLowerCase();
  const bound = await prisma.actionIntent.update({
    where: { id: intent.id },
    data: { state: 'BOUND', walletAddress: normalizedWallet, boundAt: new Date() },
  });
  await prisma.attributionEvent.createMany({
    data: [{
      eventType: 'INTENT_BOUND_TO_WALLET',
      dedupeKey: `intent-bound:${intent.id}:${normalizedWallet}`,
      journeyId: intent.journeyId,
      touchId: intent.primaryTouchId,
      actionIntentId: intent.id,
      creatorCode: intent.primaryTouch?.creatorCode ?? null,
      contentCode: intent.primaryTouch?.contentCode ?? null,
      campaignCode: intent.primaryTouch?.campaignCode ?? null,
      stationCode: intent.stationTouch?.stationCode ?? null,
      stationHostVenueId: intent.stationTouch?.stationHostVenueId ?? null,
      attentionMode: intent.stationTouch?.attentionMode ?? null,
      destinationVenueId: intent.destinationVenueId,
      participantKey: intent.participantKey,
      targetType: intent.targetType,
      targetId: intent.targetId,
      metadataJson: { walletAddress: normalizedWallet },
    }],
    skipDuplicates: true,
  });
  return bound;
}

export async function finalizeAttributionForVerifiedDare(dare: Dare, occurredAt: Date) {
  const walletAddress = (dare.claimedBy ?? dare.targetWalletAddress)?.toLowerCase() ?? null;
  await prisma.$transaction(async (tx) => {
    const pathIntent = walletAddress
      ? await tx.actionIntent.findFirst({
          where: {
            targetType: 'DARE',
            targetId: dare.id,
            walletAddress,
            state: { in: ['BOUND', 'COMPLETED'] },
          },
          include: { primaryTouch: true, stationTouch: true },
          orderBy: { lockedAt: 'asc' },
        })
      : null;

    if (pathIntent) {
      await tx.actionIntent.updateMany({
        where: { id: pathIntent.id, state: { not: 'COMPLETED' } },
        data: { state: 'COMPLETED', completedAt: occurredAt },
      });
      await tx.attributionEvent.createMany({
        data: [{
          eventType: verifiedCompletionEventType(Boolean(pathIntent.primaryTouch?.creatorCode)),
          dedupeKey: `verified-completion:${pathIntent.id}:${dare.id}`,
          journeyId: pathIntent.journeyId,
          touchId: pathIntent.primaryTouchId,
          actionIntentId: pathIntent.id,
          creatorCode: pathIntent.primaryTouch?.creatorCode ?? null,
          contentCode: pathIntent.primaryTouch?.contentCode ?? null,
          campaignCode: pathIntent.primaryTouch?.campaignCode ?? null,
          stationCode: pathIntent.stationTouch?.stationCode ?? null,
          stationHostVenueId: pathIntent.stationTouch?.stationHostVenueId ?? null,
          attentionMode: pathIntent.stationTouch?.attentionMode ?? null,
          destinationVenueId: pathIntent.destinationVenueId,
          participantKey: pathIntent.participantKey,
          targetType: 'DARE',
          targetId: dare.id,
          metadataJson: { dareShortId: dare.shortId, walletAddress, verifiedAt: occurredAt.toISOString() },
          occurredAt,
        }],
        skipDuplicates: true,
      });
    }

    const owner = await tx.creatorAttributionLink.findFirst({
      where: {
        targetType: 'DARE',
        targetId: dare.id,
        participationOwner: true,
        active: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    if (owner) {
      await tx.attributionEvent.createMany({
        data: [{
          eventType: 'CREATOR_MISSION_PARTICIPATION',
          dedupeKey: `creator-mission-participation:${owner.creatorCode}:${dare.id}:${walletAddress ?? 'unknown'}`,
          creatorCode: owner.creatorCode,
          contentCode: owner.contentCode,
          campaignCode: owner.campaignCode,
          participantKey: pathIntent?.participantKey ?? (walletAddress ? `wallet:${walletAddress}` : null),
          targetType: 'DARE',
          targetId: dare.id,
          metadataJson: { pathAttributed: Boolean(pathIntent?.primaryTouch?.creatorCode), dareShortId: dare.shortId },
          occurredAt,
        }],
        skipDuplicates: true,
      });
    }
  });
}

export async function buildCreatorAttributionReport(periodDays: number) {
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const [eventGroups, touchGroups, recentCompletions, links] = await Promise.all([
    prisma.attributionEvent.groupBy({
      by: ['creatorCode', 'eventType'],
      where: { occurredAt: { gte: since }, creatorCode: { not: null } },
      _count: { _all: true },
    }),
    prisma.attributionTouch.groupBy({
      by: ['creatorCode'],
      where: { occurredAt: { gte: since }, creatorCode: { not: null } },
      _count: { _all: true },
    }),
    prisma.attributionEvent.findMany({
      where: {
        occurredAt: { gte: since },
        eventType: { in: ['PATH_VERIFIED_COMPLETION', 'CREATOR_MISSION_PARTICIPATION'] },
      },
      select: {
        id: true,
        eventType: true,
        creatorCode: true,
        contentCode: true,
        campaignCode: true,
        targetType: true,
        targetId: true,
        occurredAt: true,
        metadataJson: true,
      },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    }),
    prisma.creatorAttributionLink.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
  ]);

  const creators = new Map<string, Record<string, number>>();
  for (const group of touchGroups) {
    if (!group.creatorCode) continue;
    creators.set(group.creatorCode, { touches: group._count._all });
  }
  for (const group of eventGroups) {
    if (!group.creatorCode) continue;
    const row = creators.get(group.creatorCode) ?? { touches: 0 };
    row[group.eventType] = group._count._all;
    creators.set(group.creatorCode, row);
  }
  return {
    generatedAt: new Date().toISOString(),
    periodDays,
    creators: Array.from(creators.entries()).map(([creatorCode, counts]) => ({ creatorCode, ...counts })),
    recentCompletions,
    links,
  };
}

export type AttributionTransactionClient = Prisma.TransactionClient;
