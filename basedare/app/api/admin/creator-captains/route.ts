import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import {
  CREATOR_CAPTAIN_AUDIENCE_LABELS,
  CREATOR_CAPTAIN_AVAILABILITY_LABELS,
  CREATOR_CAPTAIN_CATEGORY_LABELS,
  CREATOR_CAPTAIN_EVENT_TYPE,
  CREATOR_CAPTAIN_PLATFORM_LABELS,
  CREATOR_CAPTAIN_PAYOUT_LABELS,
  CREATOR_CAPTAIN_STATUS_LABELS,
  CREATOR_CAPTAIN_STATUSES,
  isRecord,
  normalizeCaptainStatus,
  stringArrayValue,
  stringValue,
  type CreatorCaptainStatus,
} from '@/lib/creator-captains';
import { prisma } from '@/lib/prisma';
import { alertCreatorCaptainStatusUpdate } from '@/lib/telegram';

const CaptainStatusSchema = z.enum(CREATOR_CAPTAIN_STATUSES);
const CaptainUpdateSchema = z.object({
  id: z.string().min(1),
  status: CaptainStatusSchema.optional(),
  operatorNote: z.string().max(1200).nullable().optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
  suggestedVenue: z.string().max(180).nullable().optional(),
  firstMission: z.string().max(360).nullable().optional(),
});

type MetadataRecord = Record<string, unknown>;

function asRecord(value: unknown): MetadataRecord {
  return isRecord(value) ? value : {};
}

function cleanOptional(value: string | null | undefined) {
  const clean = value?.replace(/\s+/g, ' ').trim() || '';
  return clean || null;
}

function hoursSince(value: Date) {
  return Math.max(0, Math.round((Date.now() - value.getTime()) / (1000 * 60 * 60)));
}

function formatLabel<T extends string>(labels: Record<T, string>, value: string) {
  return labels[value as T] || value || 'Unknown';
}

function buildReplyDraft(input: {
  creatorName: string;
  primaryHandle: string;
  city: string;
  categoriesLabel: string;
  availabilityLabel: string;
}) {
  const name = input.creatorName || input.primaryHandle || 'there';
  const cityLine = input.city ? ` in ${input.city}` : '';
  return [
    `Yo ${name}, thanks for applying to be a BaseDare Founding Dare Captain.`,
    '',
    `Your lane looks like ${input.categoriesLabel}${cityLine}. The next step is a simple pilot: one real-world mission, one proof moment, and one recap we can use to pitch venues.`,
    `If you are still available ${input.availabilityLabel.toLowerCase()}, send the best handle to contact you on and one place you would actually film at this week.`,
    '',
    'BaseDare is building paid IRL missions, not generic influencer posts. We want creators who can make the map feel alive.',
  ].join('\n');
}

function buildMailtoHref(input: { email: string; subject: string; body: string }) {
  if (!input.email) return null;
  const query = new URLSearchParams({
    subject: input.subject,
    body: input.body,
  });
  return `mailto:${encodeURIComponent(input.email)}?${query.toString()}`;
}

function mapCaptainEvent(event: {
  id: string;
  title: string | null;
  status: string | null;
  actor: string | null;
  href: string | null;
  metadataJson: Prisma.JsonValue | null;
  occurredAt: Date;
  updatedAt: Date;
}) {
  const metadata = asRecord(event.metadataJson);
  const operator = asRecord(metadata.operator);
  const priority = asRecord(metadata.priority);
  const categories = stringArrayValue(metadata.categories);
  const categoriesLabel = categories
    .map((category) => formatLabel(CREATOR_CAPTAIN_CATEGORY_LABELS, category))
    .join(', ');
  const status = normalizeCaptainStatus(event.status);
  const creatorName = stringValue(metadata.creatorName);
  const email = stringValue(metadata.email || event.actor);
  const primaryHandle = stringValue(metadata.primaryHandle);
  const city = stringValue(metadata.city);
  const primaryPlatform = stringValue(metadata.primaryPlatform);
  const audienceSize = stringValue(metadata.audienceSize);
  const availability = stringValue(metadata.availability);
  const expectedPayout = stringValue(metadata.expectedPayout);
  const replyDraft = buildReplyDraft({
    creatorName,
    primaryHandle,
    city,
    categoriesLabel: categoriesLabel || 'creator missions',
    availabilityLabel: formatLabel(CREATOR_CAPTAIN_AVAILABILITY_LABELS, availability),
  });

  return {
    id: event.id,
    title: event.title || `${primaryHandle || creatorName || 'Creator'} application`,
    status,
    statusLabel: CREATOR_CAPTAIN_STATUS_LABELS[status],
    creatorName,
    email,
    city,
    primaryHandle,
    primaryPlatform,
    primaryPlatformLabel: formatLabel(CREATOR_CAPTAIN_PLATFORM_LABELS, primaryPlatform),
    socialLinks: stringValue(metadata.socialLinks),
    categories,
    categoriesLabel,
    audienceSize,
    audienceLabel: formatLabel(CREATOR_CAPTAIN_AUDIENCE_LABELS, audienceSize),
    contentStyle: stringValue(metadata.contentStyle),
    dareIdeas: stringValue(metadata.dareIdeas),
    availability,
    availabilityLabel: formatLabel(CREATOR_CAPTAIN_AVAILABILITY_LABELS, availability),
    expectedPayout,
    expectedPayoutLabel: formatLabel(CREATOR_CAPTAIN_PAYOUT_LABELS, expectedPayout),
    walletAddress: stringValue(metadata.walletAddress),
    venueLead: stringValue(metadata.venueLead),
    referralSource: stringValue(metadata.referralSource),
    priority: {
      score: typeof priority.score === 'number' ? priority.score : 0,
      reasons: stringArrayValue(priority.reasons),
    },
    operator: {
      operatorNote: stringValue(operator.operatorNote),
      nextActionAt: stringValue(operator.nextActionAt),
      suggestedVenue: stringValue(operator.suggestedVenue),
      firstMission: stringValue(operator.firstMission),
      updatedBy: stringValue(operator.updatedBy),
      updatedAt: stringValue(operator.updatedAt),
    },
    ageHours: hoursSince(event.occurredAt),
    occurredAt: event.occurredAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    links: {
      replyMailtoHref: buildMailtoHref({
        email,
        subject: `BaseDare Founding Dare Captain: ${primaryHandle || creatorName}`,
        body: replyDraft,
      }),
      creatorSearchHref: primaryHandle ? `/creators?search=${encodeURIComponent(primaryHandle.replace(/^@/, ''))}` : '/creators',
      createHref: `/create?mode=venue-activation&source=creator-captain&streamer=${encodeURIComponent(primaryHandle || creatorName)}`,
    },
    replyDraft,
  };
}

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const events = await prisma.founderEvent.findMany({
      where: {
        eventType: CREATOR_CAPTAIN_EVENT_TYPE,
      },
      orderBy: {
        occurredAt: 'desc',
      },
      take: 120,
      select: {
        id: true,
        title: true,
        status: true,
        actor: true,
        href: true,
        metadataJson: true,
        occurredAt: true,
        updatedAt: true,
      },
    });

    const captains = events.map(mapCaptainEvent);
    const byStatus = CREATOR_CAPTAIN_STATUSES.reduce(
      (acc, status) => ({
        ...acc,
        [status]: captains.filter((captain) => captain.status === status).length,
      }),
      {} as Record<CreatorCaptainStatus, number>
    );

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total: captains.length,
          active: captains.filter((captain) => !['ONBOARDED', 'REJECTED'].includes(captain.status)).length,
          shortlisted: byStatus.SHORTLISTED,
          contacted: byStatus.CONTACTED,
          onboarded: byStatus.ONBOARDED,
          byStatus,
        },
        captains,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_CREATOR_CAPTAINS] Fetch failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to load creator captain applications' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const body = await request.json();
    const validation = CaptainUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const input = validation.data;
    const event = await prisma.founderEvent.findFirst({
      where: {
        id: input.id,
        eventType: CREATOR_CAPTAIN_EVENT_TYPE,
      },
      select: {
        id: true,
        status: true,
        metadataJson: true,
      },
    });

    if (!event) {
      return NextResponse.json({ success: false, error: 'Creator captain application not found' }, { status: 404 });
    }

    const currentStatus = normalizeCaptainStatus(event.status);
    const nextStatus = input.status ?? currentStatus;
    const metadata = asRecord(event.metadataJson);
    const existingOperator = asRecord(metadata.operator);
    const nextOperator: MetadataRecord = {
      ...existingOperator,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.walletAddress,
    };

    if (input.operatorNote !== undefined) nextOperator.operatorNote = cleanOptional(input.operatorNote);
    if (input.nextActionAt !== undefined) nextOperator.nextActionAt = input.nextActionAt;
    if (input.suggestedVenue !== undefined) nextOperator.suggestedVenue = cleanOptional(input.suggestedVenue);
    if (input.firstMission !== undefined) nextOperator.firstMission = cleanOptional(input.firstMission);

    const statusHistory = Array.isArray(metadata.statusHistory) ? metadata.statusHistory : [];
    const nextMetadata = JSON.parse(
      JSON.stringify({
        ...metadata,
        operator: nextOperator,
        statusHistory:
          nextStatus !== currentStatus
            ? [
                ...statusHistory.slice(-12),
                {
                  from: currentStatus,
                  to: nextStatus,
                  at: new Date().toISOString(),
                  by: auth.walletAddress,
                },
              ]
            : statusHistory,
      })
    ) as Prisma.InputJsonValue;

    const updated = await prisma.founderEvent.update({
      where: { id: event.id },
      data: {
        status: nextStatus,
        href: '/admin/creator-captains',
        metadataJson: nextMetadata,
      },
      select: {
        id: true,
        title: true,
        status: true,
        actor: true,
        href: true,
        metadataJson: true,
        occurredAt: true,
        updatedAt: true,
      },
    });

    const mapped = mapCaptainEvent(updated);
    if (nextStatus !== currentStatus) {
      void alertCreatorCaptainStatusUpdate({
        applicationId: mapped.id,
        creatorName: mapped.creatorName,
        primaryHandle: mapped.primaryHandle,
        status: mapped.statusLabel,
        operatorNote: mapped.operator.operatorNote,
        updatedBy: auth.walletAddress,
      }).catch((error) => {
        console.error('[ADMIN_CREATOR_CAPTAINS] Telegram status alert failed:', error);
      });
    }

    return NextResponse.json({
      success: true,
      data: mapped,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_CREATOR_CAPTAINS] Update failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to update creator captain application' }, { status: 500 });
  }
}

