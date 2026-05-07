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
  CREATOR_CAPTAIN_PLATFORMS,
  CREATOR_CAPTAIN_PAYOUTS,
  normalizeCreatorHandle,
  normalizeText,
  scoreCreatorCaptain,
} from '@/lib/creator-captains';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';
import { alertCreatorCaptainApplication } from '@/lib/telegram';

const CreatorCaptainApplicationSchema = z.object({
  creatorName: z.string().min(2).max(120),
  email: z.string().email().max(180),
  city: z.string().min(2).max(140),
  primaryHandle: z.string().min(2).max(140),
  primaryPlatform: z.enum(CREATOR_CAPTAIN_PLATFORMS),
  socialLinks: z.string().max(700).optional().default(''),
  categories: z.array(z.enum(CREATOR_CAPTAIN_CATEGORIES)).min(1).max(4),
  audienceSize: z.enum(CREATOR_CAPTAIN_AUDIENCE_SIZES),
  contentStyle: z.string().min(12).max(1200),
  dareIdeas: z.string().min(12).max(1200),
  availability: z.enum(CREATOR_CAPTAIN_AVAILABILITY),
  expectedPayout: z.enum(CREATOR_CAPTAIN_PAYOUTS),
  walletAddress: z.string().max(80).optional().default(''),
  venueLead: z.string().max(600).optional().default(''),
  referralSource: z.string().max(180).optional().default(''),
  companyWebsite: z.string().max(240).optional().default(''),
});

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

    if (walletAddress && !isAddress(walletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Wallet address must be a valid EVM address.' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const priority = scoreCreatorCaptain({
      audienceSize: input.audienceSize,
      categories: input.categories,
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
          audienceSize: input.audienceSize,
          contentStyle,
          dareIdeas,
          availability: input.availability,
          expectedPayout: input.expectedPayout,
          walletAddress: walletAddress || null,
          venueLead,
          referralSource,
          priority,
          clientIp,
        } satisfies Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    void alertCreatorCaptainApplication({
      applicationId: event.id,
      creatorName,
      email,
      city,
      primaryHandle,
      primaryPlatform: input.primaryPlatform,
      categories: input.categories,
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

