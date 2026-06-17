import { prisma } from '@/lib/prisma';

/**
 * Scout rake vesting + clawback (scout-engine).
 *
 * Rake accrues as PENDING with a vestsAt (accrual sets +14d). This processor:
 *  - vestDueScoutRake: flips PENDING -> VESTED once vestsAt has passed (the
 *    money is now "earned for real" — until then the dashboard shows it as
 *    vesting, not withdrawable).
 *  - clawbackScoutRakeForPayment: when a settled payment reverses (e.g. a paid
 *    activation is rejected/refunded), mark its events CLAWED_BACK and reverse
 *    the denormalized Scout totals. Idempotent — only touches non-clawed events.
 *
 * Vesting is a status flip only (totals already counted at accrual = earned).
 * Clawback reverses the earning. The dashboard rollup excludes CLAWED_BACK.
 */

function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

export async function vestDueScoutRake(now: Date = new Date()): Promise<{ vested: number }> {
  const result = await prisma.scoutRakeEvent.updateMany({
    where: { status: 'PENDING', vestsAt: { not: null, lte: now } },
    data: { status: 'VESTED' },
  });
  return { vested: result.count };
}

export type ClawbackResult = {
  clawedBack: number;
  reversedDiscovery: number;
  reversedActive: number;
};

export async function clawbackScoutRakeForPayment(sourceId: string): Promise<ClawbackResult> {
  const events = await prisma.scoutRakeEvent.findMany({
    where: { sourceId, status: { not: 'CLAWED_BACK' } },
    select: { id: true, scoutId: true, kind: true, amount: true },
  });

  if (events.length === 0) {
    return { clawedBack: 0, reversedDiscovery: 0, reversedActive: 0 };
  }

  let reversedDiscovery = 0;
  let reversedActive = 0;

  await prisma.$transaction(async (tx) => {
    for (const event of events) {
      await tx.scoutRakeEvent.update({ where: { id: event.id }, data: { status: 'CLAWED_BACK' } });
      await tx.scout.update({
        where: { id: event.scoutId },
        data:
          event.kind === 'DISCOVERY'
            ? { totalDiscoveryRake: { decrement: event.amount } }
            : { totalActiveRake: { decrement: event.amount } },
      });
      if (event.kind === 'DISCOVERY') reversedDiscovery += event.amount;
      else reversedActive += event.amount;
    }
  });

  return {
    clawedBack: events.length,
    reversedDiscovery: round2(reversedDiscovery),
    reversedActive: round2(reversedActive),
  };
}
