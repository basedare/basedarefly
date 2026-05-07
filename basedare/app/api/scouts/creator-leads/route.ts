import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { isAddress } from 'viem';

import { prisma } from '@/lib/prisma';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';
import {
  DEFAULT_SCOUT_REWARD_SHARE_PCT,
  SCOUT_CREATOR_LEAD_EVENT_TYPE,
  SCOUT_CREATOR_PLATFORMS,
  SCOUT_RELATIONSHIP_STRENGTHS,
  buildCaptainInvitePath,
  buildScoutReferralCode,
  normalizeLeadUrl,
  normalizeScoutHandle,
  normalizeScoutText,
  scoreScoutCreatorLead,
} from '@/lib/scout-creator-leads';
import { alertScoutCreatorLead } from '@/lib/telegram';

const ScoutCreatorLeadSchema = z.object({
  scoutName: z.string().min(2).max(120),
  scoutHandle: z.string().max(120).optional().default(''),
  scoutWallet: z.string().max(80).optional().default(''),
  scoutCode: z.string().max(80).optional().default(''),
  creatorHandle: z.string().min(2).max(140),
  creatorName: z.string().max(140).optional().default(''),
  creatorPlatform: z.enum(SCOUT_CREATOR_PLATFORMS),
  creatorCity: z.string().min(2).max(140),
  creatorLink: z.string().max(500).optional().default(''),
  relationshipStrength: z.enum(SCOUT_RELATIONSHIP_STRENGTHS),
  fitReason: z.string().min(10).max(1000),
  notes: z.string().max(1000).optional().default(''),
  companyWebsite: z.string().max(240).optional().default(''),
});

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, {
    limit: 8,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'scout-creator-lead',
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many scout leads. Try again later.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const body = await request.json();
    const validation = ScoutCreatorLeadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || 'Invalid scout creator lead' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const input = validation.data;
    if (input.companyWebsite) {
      return NextResponse.json({ success: true, data: { received: true } });
    }

    const scoutName = normalizeScoutText(input.scoutName);
    const scoutHandle = normalizeScoutHandle(input.scoutHandle);
    const scoutWallet = normalizeScoutText(input.scoutWallet).toLowerCase();
    const creatorHandle = normalizeScoutHandle(input.creatorHandle);
    const creatorName = normalizeScoutText(input.creatorName);
    const creatorCity = normalizeScoutText(input.creatorCity);
    const creatorLink = normalizeLeadUrl(input.creatorLink);
    const fitReason = normalizeScoutText(input.fitReason);
    const notes = normalizeScoutText(input.notes);

    if (scoutWallet && !isAddress(scoutWallet)) {
      return NextResponse.json(
        { success: false, error: 'Scout wallet must be a valid EVM address.' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const scoutCode = buildScoutReferralCode({
      scoutCode: input.scoutCode,
      scoutHandle,
      scoutName,
      scoutWallet,
      fallbackId: randomUUID(),
    });
    const captainInvitePath = buildCaptainInvitePath({
      scoutCode,
      creatorHandle,
      source: 'scout-referral',
    });
    const score = scoreScoutCreatorLead({
      creatorHandle,
      creatorCity,
      creatorLink,
      relationshipStrength: input.relationshipStrength,
      fitReason,
      notes,
    });

    let scoutId: string | null = null;
    if (scoutWallet) {
      const scout = await prisma.scout.upsert({
        where: { walletAddress: scoutWallet },
        update: scoutHandle ? { handle: scoutHandle } : {},
        create: {
          walletAddress: scoutWallet,
          handle: scoutHandle || scoutName,
        },
        select: { id: true },
      });
      scoutId = scout.id;
    }

    const event = await prisma.founderEvent.create({
      data: {
        eventType: SCOUT_CREATOR_LEAD_EVENT_TYPE,
        source: 'scout-army-form',
        subjectType: 'scout_creator_lead',
        subjectId: scoutId,
        dedupeKey: `scout-creator-lead:${Date.now()}:${randomUUID()}`,
        title: `${scoutHandle || scoutName} referred ${creatorHandle}`,
        status: 'LEAD_SUBMITTED',
        actor: scoutWallet || scoutHandle || scoutName,
        href: '/admin/scouts',
        metadataJson: {
          scoutName,
          scoutHandle,
          scoutWallet: scoutWallet || null,
          scoutId,
          scoutCode,
          creatorHandle,
          creatorName,
          creatorPlatform: input.creatorPlatform,
          creatorCity,
          creatorLink,
          relationshipStrength: input.relationshipStrength,
          fitReason,
          notes,
          score,
          reward: {
            rewardSharePct: DEFAULT_SCOUT_REWARD_SHARE_PCT,
            creatorEarningsUsd: null,
            estimatedRewardUsd: null,
            rewardAmountUsd: null,
            rewardTxHash: null,
            rewardPaidAt: null,
            policy: 'Founding scouts earn a manually approved percentage when referred creators produce paid BaseDare earnings.',
          },
          captainInvitePath,
          captainInviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://basedare.xyz'}${captainInvitePath}`,
          clientIp,
        } satisfies Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    void alertScoutCreatorLead({
      leadId: event.id,
      scoutName,
      scoutHandle,
      scoutCode,
      creatorHandle,
      creatorName,
      creatorPlatform: input.creatorPlatform,
      creatorCity,
      relationshipStrength: input.relationshipStrength,
      score: score.score,
      scoreReasons: score.reasons,
      captainInvitePath,
    }).catch((error) => {
      console.error('[SCOUT_CREATOR_LEAD] Telegram alert failed:', error);
    });

    return NextResponse.json({
      success: true,
      data: {
        id: event.id,
        scoutCode,
        captainInvitePath,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SCOUT_CREATOR_LEAD] Submit failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to route scout creator lead' },
      { status: 500, headers: createRateLimitHeaders(rateLimit) }
    );
  }
}
