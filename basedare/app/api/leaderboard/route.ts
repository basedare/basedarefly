import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeCreatorHandle, toDisplayCreatorHandle } from '@/lib/creator-stats';

// ============================================================================
// LEADERBOARD API
// Get rankings for creators and scouts with competition metrics
// ============================================================================
const LEADERBOARD_TIMEOUT_MS = 1400;
const LEADERBOARD_CACHE_HEADER = 'public, max-age=30, stale-while-revalidate=120';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function leaderboardResponse(payload: unknown, source: 'database' | 'fallback') {
  const response = NextResponse.json(payload);
  response.headers.set('Cache-Control', LEADERBOARD_CACHE_HEADER);
  response.headers.set('X-BaseDare-Data-Source', source);
  return response;
}

function leaderboardFallback(period: string, type: string, message: string) {
  return leaderboardResponse(
    {
      success: true,
      data: {
        period,
        type,
        leaderboard: [],
      },
      source: 'fallback',
      warning: message,
    },
    'fallback'
  );
}

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
      const topCreators = await withTimeout(prisma.dare.groupBy({
        by: ['streamerHandle'],
        where: {
          status: 'VERIFIED',
          streamerHandle: { not: null },
          verifiedAt: period === 'WEEKLY' ? { gte: weekStart, lt: weekEnd } : undefined,
        },
        _sum: { bounty: true },
        _count: { id: true },
        orderBy: { _sum: { bounty: 'desc' } },
        take: limit,
      }), LEADERBOARD_TIMEOUT_MS, 'Creator leaderboard query timed out');

      // Also get B2B campaign completions
      const campaignCompletions = await withTimeout(prisma.campaignSlot.groupBy({
        by: ['creatorHandle'],
        where: {
          status: { in: ['VERIFIED', 'PAID'] },
          submittedAt: period === 'WEEKLY' ? { gte: weekStart, lt: weekEnd } : undefined,
        },
        _sum: { totalPayout: true },
        _count: { id: true },
      }), LEADERBOARD_TIMEOUT_MS, 'Campaign leaderboard query timed out');

      // Merge P2P and B2B stats
      const creatorMap = new Map<string, {
        handle: string;
        p2pVolume: number;
        p2pCount: number;
        b2bVolume: number;
        b2bCount: number;
      }>();

      topCreators.forEach((c) => {
        const normalizedHandle = normalizeCreatorHandle(c.streamerHandle);
        if (!normalizedHandle) return;

        const existing = creatorMap.get(normalizedHandle) || {
          handle: toDisplayCreatorHandle(c.streamerHandle) || c.streamerHandle!,
          p2pVolume: 0,
          p2pCount: 0,
          b2bVolume: 0,
          b2bCount: 0,
        };
        existing.p2pVolume = c._sum.bounty || 0;
        existing.p2pCount = c._count.id;
        creatorMap.set(normalizedHandle, existing);
      });

      campaignCompletions.forEach((c) => {
        const normalizedHandle = normalizeCreatorHandle(c.creatorHandle);
        if (!normalizedHandle) return;

        const existing = creatorMap.get(normalizedHandle) || {
          handle: toDisplayCreatorHandle(c.creatorHandle) || c.creatorHandle!,
          p2pVolume: 0,
          p2pCount: 0,
          b2bVolume: 0,
          b2bCount: 0,
        };
        existing.b2bVolume = c._sum.totalPayout || 0;
        existing.b2bCount = c._count.id;
        creatorMap.set(normalizedHandle, existing);
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

      return leaderboardResponse({
        success: true,
        data: {
          period,
          periodStart: weekStart,
          periodEnd: weekEnd,
          type: 'CREATOR',
          leaderboard,
        },
      }, 'database');
    }

    if (type === 'SCOUT') {
      // Get top scouts by successful placements
      const topScouts = await withTimeout(prisma.scout.findMany({
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
      }), LEADERBOARD_TIMEOUT_MS, 'Scout leaderboard query timed out');

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

      return leaderboardResponse({
        success: true,
        data: {
          period,
          type: 'SCOUT',
          leaderboard,
        },
      }, 'database');
    }

    return NextResponse.json(
      { success: false, error: 'Invalid type. Use CREATOR or SCOUT.' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[LEADERBOARD] Failed to fetch:', message);
    const { searchParams } = new URL(request.url);
    return leaderboardFallback(
      searchParams.get('period') || 'WEEKLY',
      searchParams.get('type') || 'CREATOR',
      'Leaderboard is temporarily warming up.'
    );
  }
}
