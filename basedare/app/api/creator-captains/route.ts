import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { isAddress } from 'viem';

import {
  CREATOR_CAPTAIN_AUDIENCE_SIZES,
  CREATOR_CAPTAIN_AVAILABILITY,
  CREATOR_CAPTAIN_CATEGORIES,
  CREATOR_CAPTAIN_EVENT_TYPE,
  CREATOR_CAPTAIN_HELP_MODES,
  CREATOR_CAPTAIN_PLATFORMS,
  CREATOR_CAPTAIN_PAYOUTS,
  normalizeCreatorHandle,
  normalizeText,
  scoreCreatorCaptain,
} from '@/lib/creator-captains';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';
import {
  SCOUT_CREATOR_LEAD_EVENT_TYPE,
  isRecord as isScoutRecord,
  normalizeScoutCode,
  stringValue as scoutStringValue,
} from '@/lib/scout-creator-leads';
import { alertCreatorCaptainApplication } from '@/lib/telegram';

const CreatorCaptainApplicationSchema = z.object({
  creatorName: z.string().min(2).max(120),
  email: z.string().email().max(180),
  city: z.string().min(2).max(140),
  primaryHandle: z.string().min(2).max(140),
  primaryPlatform: z.enum(CREATOR_CAPTAIN_PLATFORMS),
  socialLinks: z.string().max(700).optional().default(''),
  categories: z.array(z.enum(CREATOR_CAPTAIN_CATEGORIES)).min(1).max(4),
  helpModes: z.array(z.enum(CREATOR_CAPTAIN_HELP_MODES)).min(1).max(4).optional().default(['venue_scout']),
  audienceSize: z.enum(CREATOR_CAPTAIN_AUDIENCE_SIZES),
  contentStyle: z.string().min(12).max(1200),
  dareIdeas: z.string().min(12).max(1200),
  availability: z.enum(CREATOR_CAPTAIN_AVAILABILITY),
  expectedPayout: z.enum(CREATOR_CAPTAIN_PAYOUTS),
  walletAddress: z.string().max(80).optional().default(''),
  venueLead: z.string().max(600).optional().default(''),
  referralSource: z.string().max(180).optional().default(''),
  scoutCode: z.string().max(80).optional().default(''),
  referredCreatorHandle: z.string().max(140).optional().default(''),
  companyWebsite: z.string().max(240).optional().default(''),
});

async function markMatchingScoutLeadApplied(input: {
  captainApplicationId: string;
  scoutCode: string;
  primaryHandle: string;
  referredCreatorHandle: string;
}) {
  const scoutCode = normalizeScoutCode(input.scoutCode);
  if (!scoutCode) return null;

  const candidateHandles = new Set(
    [input.primaryHandle, input.referredCreatorHandle]
      .map((handle) => normalizeCreatorHandle(handle).toLowerCase())
      .filter(Boolean)
  );

  const leadEvents = await prisma.founderEvent.findMany({
    where: {
      eventType: SCOUT_CREATOR_LEAD_EVENT_TYPE,
      status: {
        notIn: ['REJECTED', 'REWARD_PAID'],
      },
    },
    orderBy: {
      occurredAt: 'desc',
    },
    take: 150,
    select: {
      id: true,
      status: true,
      metadataJson: true,
    },
  });

  const matchingLead = leadEvents.find((lead) => {
    const metadata = isScoutRecord(lead.metadataJson) ? lead.metadataJson : {};
    const leadScoutCode = normalizeScoutCode(scoutStringValue(metadata.scoutCode));
    const leadCreatorHandle = normalizeCreatorHandle(scoutStringValue(metadata.creatorHandle)).toLowerCase();
    return leadScoutCode === scoutCode && (!candidateHandles.size || candidateHandles.has(leadCreatorHandle));
  });

  if (!matchingLead) return null;

  const metadata = isScoutRecord(matchingLead.metadataJson) ? matchingLead.metadataJson : {};
  const statusHistory = Array.isArray(metadata.statusHistory) ? metadata.statusHistory : [];
  const currentStatus = matchingLead.status || 'LEAD_SUBMITTED';
  const nextMetadata = JSON.parse(
    JSON.stringify({
      ...metadata,
      captainApplicationId: input.captainApplicationId,
      captainAppliedAt: new Date().toISOString(),
      statusHistory: [
        ...statusHistory.slice(-12),
        {
          from: currentStatus,
          to: 'CREATOR_APPLIED',
          at: new Date().toISOString(),
          by: 'creator-captain-form',
          captainApplicationId: input.captainApplicationId,
        },
      ],
    })
  ) as Prisma.InputJsonValue;

  await prisma.founderEvent.update({
    where: { id: matchingLead.id },
    data: {
      status: 'CREATOR_APPLIED',
      href: '/admin/scouts',
      metadataJson: nextMetadata,
    },
  });

  return matchingLead.id;
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, {
    limit: 6,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'creator-captain-application',
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many creator applications. Try again later.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const body = await request.json();
    const validation = CreatorCaptainApplicationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || 'Invalid creator application' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const input = validation.data;
    if (input.companyWebsite) {
      return NextResponse.json({ success: true, data: { received: true } });
    }

    const creatorName = normalizeText(input.creatorName);
    const email = input.email.toLowerCase();
    const city = normalizeText(input.city);
    const primaryHandle = normalizeCreatorHandle(input.primaryHandle);
    const socialLinks = input.socialLinks.trim();
    const contentStyle = input.contentStyle.trim();
    const dareIdeas = input.dareIdeas.trim();
    const walletAddress = normalizeText(input.walletAddress);
    const venueLead = input.venueLead.trim();
    const referralSource = normalizeText(input.referralSource);
    const scoutCode = normalizeScoutCode(input.scoutCode);
    const referredCreatorHandle = normalizeCreatorHandle(input.referredCreatorHandle || primaryHandle);

    if (walletAddress && !isAddress(walletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Wallet address must be a valid EVM address.' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const priority = scoreCreatorCaptain({
      audienceSize: input.audienceSize,
      categories: input.categories,
      helpModes: input.helpModes,
      availability: input.availability,
      city,
      primaryHandle,
      venueLead,
      contentStyle,
      dareIdeas,
    });

    const event = await prisma.founderEvent.create({
      data: {
        eventType: CREATOR_CAPTAIN_EVENT_TYPE,
        source: referralSource || 'creator-captain-form',
        subjectType: 'creator_captain',
        subjectId: null,
        dedupeKey: `creator-captain:${Date.now()}:${randomUUID()}`,
        title: `${primaryHandle} applied as a Founding Dare Captain`,
        status: 'NEW',
        actor: email,
        href: '/admin/creator-captains',
        metadataJson: {
          creatorName,
          email,
          city,
          primaryHandle,
          primaryPlatform: input.primaryPlatform,
          socialLinks,
          categories: input.categories,
          helpModes: input.helpModes,
          audienceSize: input.audienceSize,
          contentStyle,
          dareIdeas,
          availability: input.availability,
          expectedPayout: input.expectedPayout,
          walletAddress: walletAddress || null,
          venueLead,
          referralSource,
          scoutAttribution: scoutCode
            ? {
                scoutCode,
                referralSource: referralSource || 'scout-referral',
                referredCreatorHandle,
              }
            : null,
          priority,
          clientIp,
        } satisfies Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    let linkedScoutLeadId: string | null = null;
    if (scoutCode) {
      try {
        linkedScoutLeadId = await markMatchingScoutLeadApplied({
          captainApplicationId: event.id,
          scoutCode,
          primaryHandle,
          referredCreatorHandle,
        });
      } catch (linkError) {
        console.error('[CREATOR_CAPTAIN] Scout lead attribution failed:', linkError);
      }
    }

    void alertCreatorCaptainApplication({
      applicationId: event.id,
      creatorName,
      email,
      city,
      primaryHandle,
      primaryPlatform: input.primaryPlatform,
      categories: input.categories,
      helpModes: input.helpModes,
      audienceSize: input.audienceSize,
      availability: input.availability,
      expectedPayout: input.expectedPayout,
      venueLead,
      priorityScore: priority.score,
      priorityReasons: priority.reasons,
    }).catch((error) => {
      console.error('[CREATOR_CAPTAIN] Telegram alert failed:', error);
    });

    return NextResponse.json({
      success: true,
      data: {
        id: event.id,
        linkedScoutLeadId,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CREATOR_CAPTAIN] Application failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to route creator captain application' },
      { status: 500, headers: createRateLimitHeaders(rateLimit) }
    );
  }
}
