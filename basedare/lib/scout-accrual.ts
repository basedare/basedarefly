import { prisma } from '@/lib/prisma';
import { computeScoutRake, SCOUT_RAKE_CONFIG, type ScoutRakeSplit } from '@/lib/scout-rake';

/**
 * Scout rake accrual (scout-engine slice 4).
 *
 * Call on each SETTLED B2B venue payment. Carves scout commission via
 * computeScoutRake and writes idempotent ScoutRakeEvent ledger rows for the
 * discovery + active scouts, bumping the denormalized Scout totals atomically.
 *
 * Idempotent on [scoutId, sourceId, kind]: safe to call twice for the same
 * payment — a duplicate create violates the unique constraint and the whole
 * transaction (including the increment) rolls back, so money is never
 * double-counted. Unassigned roles accrue nothing (that share stays platform-side).
 */

export type ScoutAccrualResult = {
  accrued: boolean;
  split: ScoutRakeSplit;
  discoveryScoutId: string | null;
  activeScoutId: string | null;
  reason: string;
};

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'P2002';
}

async function writeRakeEvent(event: {
  scoutId: string;
  venueId: string;
  kind: 'DISCOVERY' | 'ACTIVE';
  sourceId: string;
  amount: number;
  vestsAt: Date;
}): Promise<boolean> {
  try {
    await prisma.$transaction([
      prisma.scoutRakeEvent.create({
        data: {
          scoutId: event.scoutId,
          venueId: event.venueId,
          kind: event.kind,
          sourceType: 'B2B_PAYMENT',
          sourceId: event.sourceId,
          amount: event.amount,
          status: 'PENDING',
          vestsAt: event.vestsAt,
        },
      }),
      prisma.scout.update({
        where: { id: event.scoutId },
        data:
          event.kind === 'DISCOVERY'
            ? { totalDiscoveryRake: { increment: event.amount } }
            : { totalActiveRake: { increment: event.amount } },
      }),
    ]);
    return true;
  } catch (error) {
    if (isUniqueViolation(error)) return false; // already accrued for this payment — no double-pay
    throw error;
  }
}

export async function accrueScoutRakeForVenuePayment(input: {
  venueId: string;
  /** The settled payment id — the idempotency key. */
  sourceId: string;
  /** Gross B2B amount that settled. */
  amount: number;
}): Promise<ScoutAccrualResult> {
  const venue = await prisma.venue.findUnique({
    where: { id: input.venueId },
    select: { discoveryScoutId: true, activeScoutId: true },
  });

  const discoveryScoutId = venue?.discoveryScoutId ?? null;
  const activeScoutId = venue?.activeScoutId ?? null;

  const split = computeScoutRake(input.amount, {
    hasDiscoveryScout: Boolean(discoveryScoutId),
    hasActiveScout: Boolean(activeScoutId),
  });

  if (!discoveryScoutId && !activeScoutId) {
    return { accrued: false, split, discoveryScoutId, activeScoutId, reason: 'No scout bound to this venue — nothing to accrue.' };
  }

  const vestsAt = new Date(Date.now() + SCOUT_RAKE_CONFIG.vestDays * 24 * 60 * 60 * 1000);
  let wrote = false;

  if (discoveryScoutId && split.discoveryAmount > 0) {
    wrote = (await writeRakeEvent({ scoutId: discoveryScoutId, venueId: input.venueId, kind: 'DISCOVERY', sourceId: input.sourceId, amount: split.discoveryAmount, vestsAt })) || wrote;
  }
  if (activeScoutId && split.activeAmount > 0) {
    wrote = (await writeRakeEvent({ scoutId: activeScoutId, venueId: input.venueId, kind: 'ACTIVE', sourceId: input.sourceId, amount: split.activeAmount, vestsAt })) || wrote;
  }

  return {
    accrued: wrote,
    split,
    discoveryScoutId,
    activeScoutId,
    reason: wrote ? 'Scout rake accrued to the ledger.' : 'Already accrued for this payment (idempotent no-op).',
  };
}
