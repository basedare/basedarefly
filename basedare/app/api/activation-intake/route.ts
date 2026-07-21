import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { alertActivationIntake } from '@/lib/telegram';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';
import {
  buildActivationStoryBrief,
  normalizeActivationBrandMemory,
} from '@/lib/activation-brand-memory';
import { buildActivationCloseRoomHref } from '@/lib/activation-close-room';
import { MANAGED_FIELD_SPRINT } from '@/lib/financial-canon';

const ActivationBrandMemorySchema = z
  .object({
    originStory: z.string().max(900).optional().default(''),
    audience: z.string().max(220).optional().default(''),
    vibe: z.string().max(220).optional().default(''),
    avoid: z.string().max(220).optional().default(''),
    rituals: z.string().max(260).optional().default(''),
    desiredFeeling: z.string().max(260).optional().default(''),
  })
  .optional()
  .default({
    originStory: '',
    audience: '',
    vibe: '',
    avoid: '',
    rituals: '',
    desiredFeeling: '',
  });

const ActivationAttributionSchema = z
  .object({
    source: z.string().max(80).optional().nullable(),
    routedSource: z.string().max(80).optional().nullable(),
    venueSlug: z.string().max(180).optional().nullable(),
    venueId: z.string().max(120).optional().nullable(),
    venueName: z.string().max(180).optional().nullable(),
    creator: z.string().max(120).optional().nullable(),
    packageId: z.string().max(80).optional().nullable(),
    offerId: z.string().max(80).optional().nullable(),
    budgetRange: z.string().max(80).optional().nullable(),
    goal: z.string().max(80).optional().nullable(),
    buyerType: z.string().max(80).optional().nullable(),
    missionType: z.string().max(80).optional().nullable(),
    missionTitle: z.string().max(180).optional().nullable(),
    creatorSlots: z.string().max(80).optional().nullable(),
    payout: z.string().max(120).optional().nullable(),
    timeWindow: z.string().max(160).optional().nullable(),
    proofRequired: z.string().max(240).optional().nullable(),
    contentRequired: z.string().max(260).optional().nullable(),
    guestMission: z.string().max(260).optional().nullable(),
    perkLabel: z.string().max(180).optional().nullable(),
    deadWindowTime: z.string().max(180).optional().nullable(),
    deadWindowCheckInTarget: z.string().max(140).optional().nullable(),
    deadWindowPerk: z.string().max(180).optional().nullable(),
    deadWindowBaseline: z.string().max(180).optional().nullable(),
    utmSource: z.string().max(120).optional().nullable(),
    utmMedium: z.string().max(120).optional().nullable(),
    utmCampaign: z.string().max(160).optional().nullable(),
    utmContent: z.string().max(160).optional().nullable(),
    utmTerm: z.string().max(160).optional().nullable(),
    referrer: z.string().max(500).optional().nullable(),
  })
  .optional()
  .default({});

const ActivationIntakeSchema = z.object({
  company: z.string().min(2).max(140),
  contactName: z.string().min(2).max(120),
  email: z.string().email().max(180),
  buyerType: z.enum(['venue', 'brand', 'agency', 'event', 'other']),
  city: z.string().min(2).max(140),
  venue: z.string().max(180).optional().default(''),
  budgetRange: z.enum(['verified_field_sprint', '1500_5000', '5000_15000', '15000_plus']),
  timeline: z.enum(['this_week', 'this_month', 'next_90_days', 'exploring']),
  goal: z.enum(['foot_traffic', 'ugc', 'launch', 'event', 'repeat_visits', 'other']),
  packageId: z.enum(['pilot-drop', 'local-signal', 'city-takeover']).optional().default('local-signal'),
  website: z.string().max(240).optional().default(''),
  notes: z.string().max(1200).optional().default(''),
  companyWebsite: z.string().max(240).optional().default(''),
  routedCreator: z.string().max(120).optional().default(''),
  routedVenueId: z.string().max(120).optional().default(''),
  routedVenueSlug: z.string().max(180).optional().default(''),
  routedSource: z.string().max(80).optional().default(''),
  routedMissionType: z.string().max(80).optional().default(''),
  routedMissionTitle: z.string().max(180).optional().default(''),
  routedCreatorSlots: z.string().max(80).optional().default(''),
  routedPayout: z.string().max(120).optional().default(''),
  routedTimeWindow: z.string().max(160).optional().default(''),
  routedProofRequired: z.string().max(240).optional().default(''),
  routedContentRequired: z.string().max(260).optional().default(''),
  routedGuestMission: z.string().max(260).optional().default(''),
  routedPerkLabel: z.string().max(180).optional().default(''),
  deadWindowTime: z.string().max(180).optional().default(''),
  deadWindowCheckInTarget: z.string().max(140).optional().default(''),
  deadWindowPerk: z.string().max(180).optional().default(''),
  deadWindowBaseline: z.string().max(180).optional().default(''),
  offerId: z.string().max(80).optional().default(''),
  funnelSessionKey: z.string().max(200).optional().default(''),
  activationAttribution: ActivationAttributionSchema,
  brandMemory: ActivationBrandMemorySchema,
});

const BUDGET_FLOORS: Record<z.infer<typeof ActivationIntakeSchema>['budgetRange'], number> = {
  verified_field_sprint: MANAGED_FIELD_SPRINT.invoiceTotalUsd,
  '1500_5000': 1500,
  '5000_15000': 5000,
  '15000_plus': 15000,
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function metadataNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function dedupeToken(value: string) {
  return (
    normalizeText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90) || 'unknown'
  );
}

function buildStableIntakeDedupeKey(input: {
  email: string;
  company: string;
  venue: string;
  routedVenueSlug: string;
  routedSource: string;
  attributionSource: string;
}) {
  const target = input.routedVenueSlug || input.venue || input.company;
  const source = input.routedSource || input.attributionSource || 'site';
  return `activation-intake:${dedupeToken(input.email)}:${dedupeToken(target)}:${dedupeToken(source)}`;
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, {
    limit: 4,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'activation-intake',
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many activation requests. Try again later.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const body = await request.json();
    const validation = ActivationIntakeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const input = validation.data;
    if (input.companyWebsite) {
      return NextResponse.json({ success: true, data: { received: true } });
    }

    const company = normalizeText(input.company);
    const contactName = normalizeText(input.contactName);
    const city = normalizeText(input.city);
    const venue = normalizeText(input.venue || '');
    const website = normalizeText(input.website || '');
    const routedCreator = normalizeText(input.routedCreator || '');
    const routedVenueId = normalizeText(input.routedVenueId || '');
    const routedVenueSlug = normalizeText(input.routedVenueSlug || '');
    const routedSource = normalizeText(input.routedSource || '');
    const routedMissionType = normalizeText(input.routedMissionType || '');
    const routedMissionTitle = normalizeText(input.routedMissionTitle || '');
    const routedCreatorSlots = normalizeText(input.routedCreatorSlots || '');
    const routedPayout = normalizeText(input.routedPayout || '');
    const routedTimeWindow = normalizeText(input.routedTimeWindow || '');
    const routedProofRequired = normalizeText(input.routedProofRequired || '');
    const routedContentRequired = normalizeText(input.routedContentRequired || '');
    const routedGuestMission = normalizeText(input.routedGuestMission || '');
    const routedPerkLabel = normalizeText(input.routedPerkLabel || '');
    const deadWindowTime = normalizeText(input.deadWindowTime || '');
    const deadWindowCheckInTarget = normalizeText(input.deadWindowCheckInTarget || '');
    const deadWindowPerk = normalizeText(input.deadWindowPerk || '');
    const deadWindowBaseline = normalizeText(input.deadWindowBaseline || '');
    const offerId = normalizeText(input.offerId || '');
    const funnelSessionKey = normalizeText(input.funnelSessionKey || '');
    const activationAttribution = {
      ...input.activationAttribution,
      source: normalizeText(input.activationAttribution.source || ''),
      routedSource: normalizeText(input.activationAttribution.routedSource || ''),
      venueSlug: normalizeText(input.activationAttribution.venueSlug || ''),
      venueId: normalizeText(input.activationAttribution.venueId || ''),
      venueName: normalizeText(input.activationAttribution.venueName || ''),
      creator: normalizeText(input.activationAttribution.creator || ''),
      offerId: normalizeText(input.activationAttribution.offerId || offerId),
      missionType: normalizeText(input.activationAttribution.missionType || routedMissionType),
      missionTitle: normalizeText(input.activationAttribution.missionTitle || routedMissionTitle),
      creatorSlots: normalizeText(input.activationAttribution.creatorSlots || routedCreatorSlots),
      payout: normalizeText(input.activationAttribution.payout || routedPayout),
      timeWindow: normalizeText(input.activationAttribution.timeWindow || routedTimeWindow),
      proofRequired: normalizeText(input.activationAttribution.proofRequired || routedProofRequired),
      contentRequired: normalizeText(input.activationAttribution.contentRequired || routedContentRequired),
      guestMission: normalizeText(input.activationAttribution.guestMission || routedGuestMission),
      perkLabel: normalizeText(input.activationAttribution.perkLabel || routedPerkLabel),
      deadWindowTime: normalizeText(input.activationAttribution.deadWindowTime || deadWindowTime),
      deadWindowCheckInTarget: normalizeText(input.activationAttribution.deadWindowCheckInTarget || deadWindowCheckInTarget),
      deadWindowPerk: normalizeText(input.activationAttribution.deadWindowPerk || deadWindowPerk),
      deadWindowBaseline: normalizeText(input.activationAttribution.deadWindowBaseline || deadWindowBaseline),
      funnelSessionKey,
    };
    const notes = input.notes.trim();
    const brandMemory = normalizeActivationBrandMemory(input.brandMemory);
    const activationBrief = buildActivationStoryBrief({
      company,
      buyerType: input.buyerType,
      city,
      venue,
      goal: input.goal,
      packageId: input.packageId,
      notes,
      brandMemory,
    });
    const amount = BUDGET_FLOORS[input.budgetRange];
    const stableDedupeKey = buildStableIntakeDedupeKey({
      email: input.email.toLowerCase(),
      company,
      venue,
      routedVenueSlug: routedVenueSlug || activationAttribution.venueSlug,
      routedSource,
      attributionSource: activationAttribution.source,
    });
    const submittedAt = new Date().toISOString();
    const metadataJson = {
      company,
      contactName,
      email: input.email.toLowerCase(),
      buyerType: input.buyerType,
      city,
      venue,
      budgetRange: input.budgetRange,
      timeline: input.timeline,
      goal: input.goal,
      packageId: input.packageId,
      website,
      notes,
      routedCreator,
      routedVenueId,
      routedVenueSlug,
      routedSource,
      routedMissionType,
      routedMissionTitle,
      routedCreatorSlots,
      routedPayout,
      routedTimeWindow,
      routedProofRequired,
      routedContentRequired,
      routedGuestMission,
      routedPerkLabel,
      deadWindowTime,
      deadWindowCheckInTarget,
      deadWindowPerk,
      deadWindowBaseline,
      offerId,
      funnelSessionKey,
      activationAttribution,
      brandMemory,
      activationBrief,
      clientIp,
      submittedAt,
      intakeDedupeKey: stableDedupeKey,
      intakeIntent:
        routedMissionType === 'dead-window' || deadWindowTime || deadWindowCheckInTarget || deadWindowPerk
          ? 'dead_window_rescue'
          : routedMissionType === 'guest' || routedGuestMission
            ? 'guest_mission'
            : offerId === 'first-spark'
              ? 'first_spark_pilot'
              : 'activation',
    } satisfies Prisma.InputJsonValue;

    const existing = await prisma.founderEvent.findUnique({
      where: { dedupeKey: stableDedupeKey },
      select: {
        id: true,
        status: true,
        metadataJson: true,
      },
    });
    const shouldMergeExisting = Boolean(existing && !['LAUNCHED', 'REJECTED'].includes(existing.status || ''));

    const event = shouldMergeExisting
      ? await prisma.founderEvent.update({
          where: { id: existing!.id },
          data: {
            source: routedSource || activationAttribution.source || 'site',
            title: `${company} wants a paid activation`,
            amount,
            actor: input.email.toLowerCase(),
            href: '/admin/activation-intakes',
            venueSlug: routedVenueSlug || activationAttribution.venueSlug || null,
            metadataJson: JSON.parse(
              JSON.stringify({
                ...asRecord(existing!.metadataJson),
                ...metadataJson,
                firstSubmittedAt: asRecord(existing!.metadataJson).firstSubmittedAt || submittedAt,
                lastSubmittedAt: submittedAt,
                duplicateCount: metadataNumber(asRecord(existing!.metadataJson).duplicateCount) + 1,
                duplicateMerged: true,
              })
            ) as Prisma.InputJsonValue,
          },
          select: {
            id: true,
          },
        })
      : await prisma.founderEvent.create({
          data: {
            eventType: 'ACTIVATION_INTAKE',
            source: routedSource || activationAttribution.source || 'site',
            subjectType: 'activation_lead',
            subjectId: null,
            dedupeKey: existing ? `${stableDedupeKey}:${Date.now()}:${randomUUID()}` : stableDedupeKey,
            title: `${company} wants a paid activation`,
            amount,
            status: 'NEW',
            actor: input.email.toLowerCase(),
            href: '/admin/activation-intakes',
            venueSlug: routedVenueSlug || activationAttribution.venueSlug || null,
            metadataJson,
          },
          select: {
            id: true,
          },
        });

    if (!shouldMergeExisting) {
      void alertActivationIntake({
        leadId: event.id,
        company,
        contactName,
        email: input.email.toLowerCase(),
        buyerType: input.buyerType,
        city,
        venue,
        budgetRange: input.budgetRange,
        timeline: input.timeline,
        goal: input.goal,
        packageId: input.packageId,
        website,
        notes,
        routedCreator,
        routedVenueSlug,
        routedSource,
        routedMissionType,
        routedMissionTitle,
        routedCreatorSlots,
        routedPayout,
        routedTimeWindow,
        routedProofRequired,
        routedContentRequired,
        routedGuestMission,
        routedPerkLabel,
        deadWindowTime,
        deadWindowCheckInTarget,
        deadWindowPerk,
        deadWindowBaseline,
        offerId,
        brandMemory,
        activationBrief,
      }).catch((error) => {
        console.error('[ACTIVATION_INTAKE] Telegram alert failed:', error);
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: event.id,
        merged: Boolean(shouldMergeExisting),
        closeRoomHref: buildActivationCloseRoomHref(event.id),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ACTIVATION_INTAKE] Failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to route activation request' },
      { status: 500, headers: createRateLimitHeaders(rateLimit) }
    );
  }
}
