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

    const signals = events.map((event) => serializeLocalSignal(event, null));
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
    const body = await request.json();
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

    const updated = await prisma.founderEvent.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status,
        metadataJson: metadata as Prisma.InputJsonValue,
      },
    });

    const signal = serializeLocalSignal(updated, null);
    let broadcastSent = false;

    if (parsed.data.status === 'APPROVED' && parsed.data.broadcast) {
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
    console.error('[ADMIN_LOCAL_SIGNALS] Failed to update signal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update local signal' },
      { status: 500 }
    );
  }
}
