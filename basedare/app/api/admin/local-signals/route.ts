import { isStory, record, STORY_CONSENT } from '@/lib/community-stories';
import { boundedRequestBytes } from '@/lib/bounded-request';
import { sameOrigin } from '@/lib/social-request';
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import {
  LOCAL_SIGNAL_EVENT_TYPE,
  LOCAL_SIGNAL_STATUSES,
  serializeLocalSignal,
  type LocalSignalStatus,
} from '@/lib/local-signals';
import { prisma } from '@/lib/prisma';
import { alertSignalRoomLocalSignal } from '@/lib/telegram';

const LocalSignalStatusSchema = z.enum(LOCAL_SIGNAL_STATUSES);

const LocalSignalPatchSchema = z.object({
  id: z.string().min(1),
  status: LocalSignalStatusSchema,
  operatorNote: z.string().max(700).optional().default(''),
  broadcast: z.boolean().optional().default(false),
});

type MetadataRecord = Record<string, unknown>;

function isRecord(value: unknown): value is MetadataRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asRecord(value: unknown): MetadataRecord {
  return isRecord(value) ? value : {};
}

function statusFilter(value: string | null): LocalSignalStatus | 'ALL' {
  if (!value || value === 'ALL') return 'ALL';
  return LOCAL_SIGNAL_STATUSES.includes(value as LocalSignalStatus) ? (value as LocalSignalStatus) : 'ALL';
}

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = statusFilter(searchParams.get('status'));

    const events = await prisma.founderEvent.findMany({
      where: {
        eventType: LOCAL_SIGNAL_EVENT_TYPE,
        ...(status === 'ALL' ? {} : { status }),
      },
      orderBy: [{ occurredAt: 'desc' }],
      take: 80,
    });

    const reports = await prisma.founderEvent.findMany({ where: { eventType: 'LOCAL_SIGNAL_REPORT', subjectId: { in: events.map(e => e.id) }, status: 'NEEDS_REVIEW' }, orderBy: { createdAt: 'desc' }, take: 401 });
    const signals = events.map((event) => ({ ...serializeLocalSignal(event, null), reports: reports.slice(0, 400).filter(r => r.subjectId === event.id).map(r => String(record(r.metadataJson).reason ?? 'Report received')) }));
    const summary = {
      total: signals.length,
      new: signals.filter((signal) => signal.status === 'NEW').length,
      approved: signals.filter((signal) => signal.status === 'APPROVED').length,
      rejected: signals.filter((signal) => signal.status === 'REJECTED').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        signals,
        summary,
        reportsLimited: reports.length > 400,
      },
    });
  } catch (error) {
    console.error('[ADMIN_LOCAL_SIGNALS] Failed to load signals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load local signals' },
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
    if (!sameOrigin(request)) return NextResponse.json({ success: false }, { status: 403 });
    const body = JSON.parse(new TextDecoder().decode(await boundedRequestBytes(request, 2048)));
    const parsed = LocalSignalPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await prisma.founderEvent.findFirst({
      where: {
        id: parsed.data.id,
        eventType: LOCAL_SIGNAL_EVENT_TYPE,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Local signal not found' },
        { status: 404 }
      );
    }

    const metadata = {
      ...asRecord(existing.metadataJson),
      operatorNote: parsed.data.operatorNote.trim(),
      reviewedBy: auth.walletAddress,
      reviewedAt: new Date().toISOString(),
      ...(parsed.data.status === 'APPROVED' && parsed.data.broadcast
        ? { broadcastAt: new Date().toISOString() }
        : {}),
    };

    const updated = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`local-signal:${existing.id}`}))::text`;
      const current = await tx.founderEvent.findUniqueOrThrow({ where: { id: existing.id } });
      if (current.status === 'WITHDRAWN') throw Error('POST_WITHDRAWN');
      if (isStory(current) && parsed.data.status === 'APPROVED') {
        const data = record(current.metadataJson);
        const author = await tx.streamerTag.findFirst({ where: { id: String(data.authorTagId), status: { in: ['ACTIVE', 'VERIFIED'] }, revokedAt: null } });
        if (!author || author.walletAddress.toLowerCase() !== data.authorWallet || data.publicConsentVersion !== STORY_CONSENT) throw Error('POST_NOT_ELIGIBLE');
        if (current.venueId && !await tx.venue.findFirst({ where: { id: current.venueId, status: 'ACTIVE' } })) throw Error('POST_NOT_ELIGIBLE');
      }
      if (parsed.data.status !== 'NEW') await tx.founderEvent.updateMany({ where: { eventType: 'LOCAL_SIGNAL_REPORT', subjectId: current.id, status: 'NEEDS_REVIEW' }, data: { status: 'RESOLVED' } });
      return tx.founderEvent.update({ where: { id: current.id }, data: { status: parsed.data.status, metadataJson: { ...record(current.metadataJson), operatorNote: metadata.operatorNote, reviewedBy: metadata.reviewedBy, reviewedAt: metadata.reviewedAt } as Prisma.InputJsonValue } });
    });

    const signal = serializeLocalSignal(updated, null);
    let broadcastSent = false;

    if (parsed.data.status === 'APPROVED' && parsed.data.broadcast && !isStory(updated)) {
      broadcastSent = await alertSignalRoomLocalSignal(signal);
    }

    return NextResponse.json({
      success: true,
      data: {
        signal,
        broadcastSent,
      },
    });
  } catch (error) {
    if (error instanceof Error && ['POST_WITHDRAWN', 'POST_NOT_ELIGIBLE'].includes(error.message)) return NextResponse.json({ success: false, error: 'This post is withdrawn or no longer eligible for public display.' }, { status: 409 });
    console.error('[ADMIN_LOCAL_SIGNALS] Failed to update signal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update local signal' },
      { status: 500 }
    );
  }
}
