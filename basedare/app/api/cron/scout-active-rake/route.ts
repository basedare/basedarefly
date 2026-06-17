import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { evaluateActiveRakeEligibility, SCOUT_RAKE_CONFIG } from '@/lib/scout-rake';

/**
 * Monthly active-rake review (scout-engine slice 5).
 *
 * For every venue with an active scout, decide whether they keep the active rake
 * next cycle. Discovery rake is permanent and never touched here. When a venue's
 * active scout falls below the verified-loop threshold beyond the grace period,
 * the active slot opens up (activeScoutId cleared) — the active share then flows
 * to the platform until another scout earns it. CRON_SECRET-gated.
 *
 * consecutiveSlowMonths is derived from a 2-month lookback, which is exact for a
 * 1-month grace (we only need to know whether the prior month was also slow).
 */

function monthStartUtc(yearOffset: number, monthOffset: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear() + yearOffset, now.getUTCMonth() + monthOffset, 1));
}

async function verifiedLoops(venueId: string, from: Date, to: Date | null): Promise<number> {
  const scannedAt = to ? { gte: from, lt: to } : { gte: from };
  const createdAt = to ? { gte: from, lt: to } : { gte: from };
  const [checkIns, marks] = await Promise.all([
    prisma.venueCheckIn.count({
      where: { venueId, status: 'CONFIRMED', proofLevel: 'QR_AND_GPS', scannedAt },
    }),
    prisma.placeTag.count({ where: { venueId, status: 'APPROVED', createdAt } }),
  ]);
  return checkIns + marks;
}

async function runReview() {
  const thisMonthStart = monthStartUtc(0, 0);
  const lastMonthStart = monthStartUtc(0, -1);
  const stillPayingSince = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const venues = await prisma.venue.findMany({
    where: { activeScoutId: { not: null } },
    select: { id: true, slug: true, activeScoutId: true },
  });

  let reviewed = 0;
  let reassigned = 0;
  const opened: string[] = [];

  for (const venue of venues) {
    const [thisMonth, lastMonth, recentPayments] = await Promise.all([
      verifiedLoops(venue.id, thisMonthStart, null),
      verifiedLoops(venue.id, lastMonthStart, thisMonthStart),
      prisma.scoutRakeEvent.count({ where: { venueId: venue.id, createdAt: { gte: stillPayingSince } } }),
    ]);

    const threshold = SCOUT_RAKE_CONFIG.activeRetention.minVerifiedLoopsPerMonth;
    const consecutiveSlowMonths = thisMonth >= threshold ? 0 : lastMonth >= threshold ? 1 : 2;

    const evaluation = evaluateActiveRakeEligibility({
      verifiedLoopsThisMonth: thisMonth,
      consecutiveSlowMonths,
      venueStillPaying: recentPayments > 0,
    });

    if (evaluation.reassignable) {
      await prisma.venue.update({
        where: { id: venue.id },
        data: { activeScoutId: null, activeRakeReviewedAt: new Date() },
      });
      reassigned += 1;
      opened.push(venue.slug);
    } else {
      await prisma.venue.update({
        where: { id: venue.id },
        data: { activeRakeReviewedAt: new Date() },
      });
    }
    reviewed += 1;
  }

  return { reviewed, reassigned, opened };
}

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;
  try {
    const result = await runReview();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[CRON_SCOUT_ACTIVE_RAKE] Review failed:', error);
    return NextResponse.json({ success: false, error: 'Active-rake review failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
