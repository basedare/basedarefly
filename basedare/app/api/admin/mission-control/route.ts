import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import {
  FIRST_SPARK_RUN_SHEET_EVENT,
  buildFirstSparkMissionControlReport,
} from '@/lib/first-spark-mission-control';
import { prisma } from '@/lib/prisma';

const RunSheetUpdateSchema = z.object({
  venueId: z.string().min(1).optional(),
  venueSlug: z.string().min(1).optional(),
  stage: z.enum(['draft', 'scheduled', 'live', 'proof-review', 'recap-sent', 'repeat-ask']).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  creatorSlots: z.number().int().min(0).max(100).optional(),
  invitedCreators: z.number().int().min(0).max(500).optional(),
  acceptedCreators: z.number().int().min(0).max(500).optional(),
  showedCreators: z.number().int().min(0).max(500).optional(),
  proofsAccepted: z.number().int().min(0).max(500).optional(),
  guestCheckIns: z.number().int().min(0).max(10000).optional(),
  perkRedemptions: z.number().int().min(0).max(10000).optional(),
  opsMinutes: z.number().int().min(0).max(100000).optional(),
  recapSentAt: z.string().datetime().nullable().optional(),
  repeatOutcome: z.enum(['none', 'asked', 'interested', 'won', 'lost']).optional(),
  note: z.string().max(1000).nullable().optional(),
}).refine((value) => Boolean(value.venueId || value.venueSlug), {
  message: 'venueId or venueSlug is required',
});

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function cleanJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeStage(value: unknown) {
  if (
    value === 'draft' ||
    value === 'scheduled' ||
    value === 'live' ||
    value === 'proof-review' ||
    value === 'recap-sent' ||
    value === 'repeat-ask'
  ) {
    return value;
  }

  return 'draft';
}

function normalizeRepeatOutcome(value: unknown) {
  if (value === 'asked' || value === 'interested' || value === 'won' || value === 'lost') return value;
  return 'none';
}

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  const periodDaysParam = request.nextUrl.searchParams.get('periodDays');
  const periodDays = periodDaysParam ? Number.parseInt(periodDaysParam, 10) : undefined;

  try {
    const report = await buildFirstSparkMissionControlReport({
      periodDays: Number.isFinite(periodDays) ? Math.min(Math.max(periodDays ?? 14, 7), 30) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MISSION_CONTROL] Build failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to build mission control report' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const body = await request.json();
    const validation = RunSheetUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || 'Invalid run sheet update' },
        { status: 400 }
      );
    }

    const input = validation.data;
    const venue = await prisma.venue.findFirst({
      where: input.venueId ? { id: input.venueId } : { slug: input.venueSlug ?? '' },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    if (!venue) {
      return NextResponse.json(
        { success: false, error: 'Venue not found' },
        { status: 404 }
      );
    }

    const dedupeKey = `first-spark-run-sheet:${venue.id}`;
    const existing = await prisma.founderEvent.findUnique({
      where: { dedupeKey },
      select: {
        metadataJson: true,
      },
    });
    const existingMetadata = asRecord(existing?.metadataJson);
    const now = new Date().toISOString();
    const stage = normalizeStage(input.stage ?? existingMetadata.stage);
    const repeatOutcome = normalizeRepeatOutcome(input.repeatOutcome ?? existingMetadata.repeatOutcome);
    const metadata = cleanJson({
      ...existingMetadata,
      source: 'mission-control',
      stage,
      scheduledAt: input.scheduledAt === undefined ? existingMetadata.scheduledAt ?? null : input.scheduledAt,
      creatorSlots: input.creatorSlots ?? existingMetadata.creatorSlots ?? 3,
      invitedCreators: input.invitedCreators ?? existingMetadata.invitedCreators ?? 0,
      acceptedCreators: input.acceptedCreators ?? existingMetadata.acceptedCreators ?? 0,
      showedCreators: input.showedCreators ?? existingMetadata.showedCreators ?? 0,
      proofsAccepted: input.proofsAccepted ?? existingMetadata.proofsAccepted ?? 0,
      guestCheckIns: input.guestCheckIns ?? existingMetadata.guestCheckIns ?? 0,
      perkRedemptions: input.perkRedemptions ?? existingMetadata.perkRedemptions ?? 0,
      opsMinutes: input.opsMinutes ?? existingMetadata.opsMinutes ?? 0,
      recapSentAt: input.recapSentAt === undefined
        ? existingMetadata.recapSentAt ?? (stage === 'recap-sent' ? now : null)
        : input.recapSentAt,
      repeatOutcome: stage === 'repeat-ask' && repeatOutcome === 'none' ? 'asked' : repeatOutcome,
      note: input.note === undefined ? existingMetadata.note ?? null : input.note,
      updatedAt: now,
      updatedBy: auth.walletAddress,
    });

    const event = await prisma.founderEvent.upsert({
      where: { dedupeKey },
      create: {
        eventType: FIRST_SPARK_RUN_SHEET_EVENT,
        source: 'mission-control',
        subjectType: 'Venue',
        subjectId: venue.id,
        dedupeKey,
        title: `First Spark run sheet: ${venue.name}`,
        status: String(stage),
        actor: auth.walletAddress,
        href: `/admin/mission-control?venue=${encodeURIComponent(venue.slug)}`,
        venueId: venue.id,
        venueSlug: venue.slug,
        metadataJson: metadata,
        occurredAt: new Date(),
      },
      update: {
        source: 'mission-control',
        title: `First Spark run sheet: ${venue.name}`,
        status: String(stage),
        actor: auth.walletAddress,
        href: `/admin/mission-control?venue=${encodeURIComponent(venue.slug)}`,
        venueId: venue.id,
        venueSlug: venue.slug,
        metadataJson: metadata,
        occurredAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        metadataJson: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: event.id,
        status: event.status,
        metadata: event.metadataJson,
        updatedAt: event.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MISSION_CONTROL] Run sheet update failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to update run sheet' },
      { status: 500 }
    );
  }
}
