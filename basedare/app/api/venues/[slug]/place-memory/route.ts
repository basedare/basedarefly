import { NextRequest, NextResponse } from 'next/server';

import {
  canonicalJsonValue,
  domainHash,
  type PlaceAssertionKindName,
} from '@/lib/place-memory/contracts';
import {
  assertPublicReceiptContentHash,
  assertPrivacySafePublicValue,
  effectivePublicAssertionState,
  readPublicReceiptPayload,
  type PublicPlaceFact,
} from '@/lib/place-memory/read-model';
import { computePulseV1 } from '@/lib/place-memory/pulse';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const venue = await prisma.venue.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        timezone: true,
        fieldStationProfile: {
          select: {
            status: true,
            pulseState: true,
            pulseScore: true,
            pulseComputedAt: true,
            pulseModelVersion: true,
            pulseComponentsJson: true,
          },
        },
        placeAssertions: {
          orderBy: [{ kind: 'asc' }, { subjectKey: 'asc' }],
          include: {
            currentVersion: {
              include: {
                supportingObservations: {
                  select: { observation: { select: { observedAt: true } } },
                },
              },
            },
            conflicts: {
              where: { status: { in: ['OPEN', 'NEEDS_CORROBORATION'] } },
              select: { id: true },
            },
            refreshSchedule: { select: { status: true, dueAt: true } },
          },
        },
        placeReceipts: {
          orderBy: { issuedAt: 'desc' },
          take: 12,
          select: {
            serialNumber: true,
            outcome: true,
            contentHash: true,
            issuedAt: true,
            publicPayloadJson: true,
          },
        },
      },
    });
    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue not found.' }, { status: 404 });
    }

    const now = new Date();
    const recentSparkCount = await prisma.placeTag.count({
      where: {
        venueId: venue.id,
        status: 'APPROVED',
        submittedAt: { gte: new Date(now.getTime() - 30 * 86_400_000) },
      },
    });
    const pulse = computePulseV1({
      assertions: venue.placeAssertions.map((assertion) => {
        const supportTimes = assertion.currentVersion?.supportingObservations.map(
          (support) => support.observation.observedAt,
        ) ?? [];
        return {
          kind: assertion.kind as PlaceAssertionKindName,
          hasCurrentVersion: Boolean(assertion.currentVersion),
          observedAt: supportTimes.length
            ? new Date(Math.max(...supportTimes.map((value) => value.getTime())))
            : assertion.currentVersion?.observedAt ?? null,
          supportCount: supportTimes.length,
          conflicted: assertion.conflicts.length > 0,
        };
      }),
      recentSparkCount,
      now,
    });

    const facts: PublicPlaceFact[] = venue.placeAssertions.map((assertion) => {
      const supportTimes = assertion.currentVersion?.supportingObservations.map(
        (support) => support.observation.observedAt,
      ) ?? [];
      const latestObservedAt = supportTimes.length
        ? new Date(Math.max(...supportTimes.map((value) => value.getTime())))
        : assertion.currentVersion?.observedAt ?? null;
      const state = effectivePublicAssertionState({
        storedState: assertion.state,
        hasCurrentVersion: Boolean(assertion.currentVersion),
        hasOpenConflict: assertion.conflicts.length > 0,
        refreshDueAt: assertion.refreshSchedule?.dueAt ?? null,
        now,
      });
      return {
        assertionId: assertion.id,
        kind: assertion.kind as PlaceAssertionKindName,
        subjectKey: assertion.subjectKey,
        state,
        value: assertion.currentVersion
          ? canonicalJsonValue(assertion.currentVersion.valueJson)
          : null,
        valueSchemaVersion: assertion.currentVersion?.valueSchemaVersion ?? null,
        observedAt: latestObservedAt?.toISOString() ?? null,
        supportCount: supportTimes.length,
        hasOpenConflict: assertion.conflicts.length > 0,
        refreshDueAt: assertion.refreshSchedule?.dueAt.toISOString() ?? null,
        refreshStatus: assertion.refreshSchedule?.status ?? null,
      };
    });
    const receipts = venue.placeReceipts.map((receipt) => {
      const payload = readPublicReceiptPayload(receipt.publicPayloadJson);
      assertPublicReceiptContentHash(
        domainHash('basedare:place-receipt:v1', payload),
        receipt.contentHash,
      );
      return {
        serialNumber: receipt.serialNumber,
        outcome: receipt.outcome,
        contentHash: receipt.contentHash,
        issuedAt: receipt.issuedAt.toISOString(),
        href: `/api/place-receipts/${receipt.serialNumber}`,
        payload,
      };
    });
    const data = {
      venue: { slug: venue.slug, name: venue.name, timezone: venue.timezone },
      capability: {
        status: venue.fieldStationProfile?.status ?? 'LATENT',
        pulse: {
          state: pulse.state,
          score: pulse.score,
          computedAt: now.toISOString(),
          modelVersion: pulse.modelVersion,
          components: pulse.components,
          cachedAt: venue.fieldStationProfile?.pulseComputedAt?.toISOString() ?? null,
        },
      },
      facts,
      receipts,
    };
    assertPrivacySafePublicValue(data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[PLACE_MEMORY_READ] Failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to load Place Memory.' },
      { status: 500 },
    );
  }
}
