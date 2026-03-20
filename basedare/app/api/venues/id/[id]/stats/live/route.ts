import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TERMINAL_DARE_STATUSES = ['EXPIRED', 'FAILED', 'VERIFIED'] as const;

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function subHours(date: Date, hours: number) {
  return new Date(date.getTime() - hours * 60 * 60 * 1000);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const venue = await prisma.venue.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!venue) {
      return NextResponse.json(
        { success: false, error: 'Venue not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const [scansLastHour, uniqueVisitorsToday, activeDares] = await Promise.all([
      prisma.venueCheckIn.count({
        where: {
          venueId: id,
          status: 'CONFIRMED',
          scannedAt: { gte: subHours(now, 1) },
        },
      }),
      prisma.venueCheckIn.findMany({
        where: {
          venueId: id,
          status: 'CONFIRMED',
          scannedAt: { gte: startOfDay(now) },
        },
        distinct: ['walletAddress'],
        select: { walletAddress: true },
      }),
      prisma.dare.count({
        where: {
          venueId: id,
          NOT: {
            OR: [
              { status: { in: [...TERMINAL_DARE_STATUSES] } },
              { expiresAt: { lt: now } },
            ],
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        scansLastHour,
        uniqueVisitorsToday: uniqueVisitorsToday.length,
        activeDares,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUE_STATS_LIVE] Failed:', message);
    return NextResponse.json(
      { success: false, error: 'Unable to fetch venue stats right now' },
      { status: 500 }
    );
  }
}
