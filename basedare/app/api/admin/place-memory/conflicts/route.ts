import { NextRequest, NextResponse } from 'next/server';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { conflictActionSchema } from '@/lib/place-memory/conflict-policy';
import { resolveAssertionConflict } from '@/lib/place-memory/conflicts';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);

  const conflicts = await prisma.assertionConflict.findMany({
    where: { status: { in: ['OPEN', 'NEEDS_CORROBORATION'] } },
    orderBy: [{ severity: 'desc' }, { openedAt: 'asc' }],
    take: 100,
    select: {
      id: true,
      status: true,
      severity: true,
      reason: true,
      openedAt: true,
      reviewedAt: true,
      resolution: true,
      missionDraftJson: true,
      assertion: {
        select: {
          id: true,
          kind: true,
          subjectKey: true,
          state: true,
          venue: { select: { id: true, slug: true, name: true } },
          currentVersion: {
            select: {
              id: true,
              valueJson: true,
              valueSchemaVersion: true,
              observedAt: true,
              recordedAt: true,
            },
          },
        },
      },
      observations: {
        orderBy: { joinedAt: 'asc' },
        select: {
          joinedAt: true,
          observation: {
            select: {
              id: true,
              valueJson: true,
              valueSchemaVersion: true,
              observedAt: true,
              createdAt: true,
              proofAttempt: {
                select: {
                  source: true,
                  proximityDecision: true,
                  proximityCode: true,
                  distanceKm: true,
                  allowedRadiusKm: true,
                  accuracyM: true,
                  verificationConfidence: true,
                },
              },
            },
          },
        },
      },
    },
  });
  return NextResponse.json({ success: true, data: { conflicts } });
}

export async function PUT(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  try {
    const parsed = conflictActionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid conflict action.' },
        { status: 400 },
      );
    }
    const result = await resolveAssertionConflict({
      ...parsed.data,
      reviewerIdentity: auth.walletAddress,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to resolve conflict.';
    const status = message.includes('not found') ? 404 : message.includes('changed') ? 409 : 400;
    console.error('[ADMIN_PLACE_MEMORY_CONFLICT] Failed:', message);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
