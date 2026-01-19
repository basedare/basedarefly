import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ============================================================================
// LEADERBOARD API
// Get rankings for creators and scouts with competition metrics
// ============================================================================

// Helper to get week boundaries
function getWeekBoundaries(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return { start, end };
}

// ============================================================================
// GET /api/leaderboard - Get leaderboard rankings
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'WEEKLY';
    const type = searchParams.get('type') || 'CREATOR';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

    const { start: weekStart, end: weekEnd } = getWeekBoundaries();

    if (type === 'CREATOR') {
      // Get top creators by completed dare volume
      const topCreators = await prisma.dare.groupBy({
        by: ['streamerHandle'],
        where: {
          status: 'VERIFIED',
          verifiedAt: period === 'WEEKLY' ? { gte: weekStart, lt: weekEnd } : undefined,
        },
        _sum: { bounty: true },
        _count: { id: true },
        orderBy: { _sum: { bounty: 'desc' } },
        take: limit,
      });

      // Also get B2B campaign completions
      const campaignCompletions = await prisma.campaignSlot.groupBy({
        by: ['creatorHandle'],
        where: {
          status: { in: ['VERIFIED', 'PAID'] },
          submittedAt: period === 'WEEKLY' ? { gte: weekStart, lt: weekEnd } : undefined,
        },
        _sum: { totalPayout: true },
        _count: { id: true },
      });

      // Merge P2P and B2B stats
      const creatorMap = new Map<string, {
        handle: string;
        p2pVolume: number;
        p2pCount: number;
        b2bVolume: number;
        b2bCount: number;
      }>();

      topCreators.forEach((c) => {
        const existing = creatorMap.get(c.streamerHandle) || {
          handle: c.streamerHandle,
          p2pVolume: 0,
          p2pCount: 0,
          b2bVolume: 0,
          b2bCount: 0,
        };
        existing.p2pVolume = c._sum.bounty || 0;
        existing.p2pCount = c._count.id;
        creatorMap.set(c.streamerHandle, existing);
      });

      campaignCompletions.forEach((c) => {
        if (!c.creatorHandle) return;
        const existing = creatorMap.get(c.creatorHandle) || {
          handle: c.creatorHandle,
          p2pVolume: 0,
          p2pCount: 0,
          b2bVolume: 0,
          b2bCount: 0,
        };
        existing.b2bVolume = c._sum.totalPayout || 0;
        existing.b2bCount = c._count.id;
        creatorMap.set(c.creatorHandle, existing);
      });

      // Convert to array and sort by total volume
      const leaderboard = Array.from(creatorMap.values())
        .map((c) => ({
          handle: c.handle,
          totalVolume: c.p2pVolume + c.b2bVolume,
          totalCompletions: c.p2pCount + c.b2bCount,
          p2pVolume: c.p2pVolume,
          p2pCount: c.p2pCount,
          b2bVolume: c.b2bVolume,
          b2bCount: c.b2bCount,
        }))
        .sort((a, b) => b.totalVolume - a.totalVolume)
        .slice(0, limit)
        .map((c, index) => ({
          ...c,
          rank: index + 1,
          rewardTier: index < 3 ? ['🥇 GOLD', '🥈 SILVER', '🥉 BRONZE'][index] : null,
        }));

      return NextResponse.json({
        success: true,
        data: {
          period,
          periodStart: weekStart,
          periodEnd: weekEnd,
          type: 'CREATOR',
          leaderboard,
        },
      });
    }

    if (type === 'SCOUT') {
      // Get top scouts by successful placements
      const topScouts = await prisma.scout.findMany({
        where: {
          successfulSlots: { gt: 0 },
        },
        orderBy: [
          { successfulSlots: 'desc' },
          { totalDiscoveryRake: 'desc' },
        ],
        take: limit,
        select: {
          id: true,
          walletAddress: true,
          handle: true,
          tier: true,
          reputationScore: true,
          successfulSlots: true,
          failedSlots: true,
          totalCampaigns: true,
          totalDiscoveryRake: true,
          totalActiveRake: true,
          _count: {
            select: {
              discoveredCreators: true,
            },
          },
        },
      });

      const leaderboard = topScouts.map((s, index) => ({
        rank: index + 1,
        walletAddress: s.walletAddress,
        handle: s.handle || `Scout ${s.walletAddress.slice(0, 6)}`,
        tier: s.tier,
        reputationScore: s.reputationScore,
        successfulSlots: s.successfulSlots,
        failedSlots: s.failedSlots,
        totalCampaigns: s.totalCampaigns,
        creatorsDiscovered: s._count.discoveredCreators,
        totalRakeEarned: s.totalDiscoveryRake + s.totalActiveRake,
        successRate: s.successfulSlots + s.failedSlots > 0
          ? Math.round((s.successfulSlots / (s.successfulSlots + s.failedSlots)) * 100)
          : 0,
        rewardTier: index < 3 ? ['🥇 GOLD', '🥈 SILVER', '🥉 BRONZE'][index] : null,
      }));

      return NextResponse.json({
        success: true,
        data: {
          period,
          type: 'SCOUT',
          leaderboard,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid type. Use CREATOR or SCOUT.' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[LEADERBOARD] Failed to fetch:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
