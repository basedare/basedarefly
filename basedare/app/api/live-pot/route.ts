import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  calculateP2PSettlement,
  calculateB2BSettlement,
  calculateSunderSettlement,
  calculateWeeklyRewards,
  FEE_CONFIG,
} from '@/lib/fee-splitter';

// ============================================================================
// LIVE POT (SUNDER POOL) API
// Community War Chest - Progressive Jackpot
// ============================================================================

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'basedare-admin-2024';

function isAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('x-admin-secret');
  return authHeader === ADMIN_SECRET;
}

// Ensure LivePot exists
async function getOrCreateLivePot() {
  let pot = await prisma.livePot.findFirst();
  if (!pot) {
    pot = await prisma.livePot.create({
      data: { balance: 0, totalDeposited: 0, totalDistributed: 0, totalSlashed: 0 },
    });
  }
  return pot;
}

// ============================================================================
// GET /api/live-pot - Get current pot stats
// ============================================================================
export async function GET() {
  try {
    const pot = await getOrCreateLivePot();

    // Get recent transactions
    const recentTransactions = await prisma.potTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Get weekly stats
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const weeklyDeposits = await prisma.potTransaction.aggregate({
      where: {
        createdAt: { gte: weekStart },
        amount: { gt: 0 },
      },
      _sum: { amount: true },
    });

    const weeklyDistributions = await prisma.potTransaction.aggregate({
      where: {
        createdAt: { gte: weekStart },
        amount: { lt: 0 },
      },
      _sum: { amount: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        pot: {
          balance: pot.balance,
          totalDeposited: pot.totalDeposited,
          totalDistributed: pot.totalDistributed,
          totalSlashed: pot.totalSlashed,
          lastDepositAt: pot.lastDepositAt,
          lastDistributionAt: pot.lastDistributionAt,
        },
        weekly: {
          deposited: weeklyDeposits._sum.amount || 0,
          distributed: Math.abs(weeklyDistributions._sum.amount || 0),
        },
        recentTransactions,
        feeStructure: {
          p2p: FEE_CONFIG.P2P,
          b2b: FEE_CONFIG.B2B,
          weeklyRewards: FEE_CONFIG.WEEKLY_REWARDS,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[LIVE-POT] Failed to fetch:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/live-pot - Record a deposit (called internally after settlements)
// ============================================================================

const DepositSchema = z.object({
  type: z.enum(['DEPOSIT_P2P', 'DEPOSIT_B2B', 'SUNDER']),
  amount: z.number().positive(),
  sourceType: z.enum(['DARE', 'CAMPAIGN']).optional(),
  sourceId: z.string().optional(),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = DepositSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { type, amount, sourceType, sourceId, description } = validation.data;

    const pot = await getOrCreateLivePot();
    const newBalance = pot.balance + amount;

    // Update pot
    await prisma.livePot.update({
      where: { id: pot.id },
      data: {
        balance: newBalance,
        totalDeposited: { increment: amount },
        totalSlashed: type === 'SUNDER' ? { increment: amount } : undefined,
        lastDepositAt: new Date(),
      },
    });

    // Record transaction
    const transaction = await prisma.potTransaction.create({
      data: {
        type,
        amount,
        balanceAfter: newBalance,
        sourceType,
        sourceId,
        description: description || `${type}: $${amount.toFixed(2)}`,
      },
    });

    console.log(`[LIVE-POT] ${type}: +$${amount.toFixed(2)} → Balance: $${newBalance.toFixed(2)}`);

    return NextResponse.json({
      success: true,
      data: {
        transaction,
        newBalance,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[LIVE-POT] Deposit failed:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/live-pot - Trigger weekly rewards (admin only)
// ============================================================================
export async function PUT(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const pot = await getOrCreateLivePot();

    if (pot.balance < 100) {
      return NextResponse.json(
        { success: false, error: 'Pot balance too low for distribution (min $100)' },
        { status: 400 }
      );
    }

    // Get week boundaries
    const weekEnd = new Date();
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);

    // Check if already distributed this week
    const existingDistribution = await prisma.weeklyRewardDistribution.findUnique({
      where: { weekStart },
    });

    if (existingDistribution?.status === 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Weekly rewards already distributed for this period' },
        { status: 400 }
      );
    }

    // Get top creators by volume this week
    const topCreators = await prisma.dare.groupBy({
      by: ['streamerHandle'],
      where: {
        status: 'VERIFIED',
        verifiedAt: { gte: weekStart, lt: weekEnd },
      },
      _sum: { bounty: true },
      orderBy: { _sum: { bounty: 'desc' } },
      take: 3,
    });

    // Get top scouts
    const topScouts = await prisma.scout.findMany({
      where: {
        updatedAt: { gte: weekStart },
      },
      orderBy: { successfulSlots: 'desc' },
      take: 3,
      select: {
        walletAddress: true,
        _count: { select: { discoveredCreators: true } },
      },
    });

    // Calculate rewards
    const rewards = calculateWeeklyRewards(
      pot.balance,
      topCreators.map((c) => ({
        address: c.streamerHandle, // Using handle as address for now
        volume: c._sum.bounty || 0,
      })),
      topScouts.map((s) => ({
        address: s.walletAddress,
        creatorsRecruited: s._count.discoveredCreators,
      }))
    );

    // Update pot balance
    await prisma.livePot.update({
      where: { id: pot.id },
      data: {
        balance: rewards.potBalanceAfter,
        totalDistributed: { increment: rewards.distributionAmount },
        lastDistributionAt: new Date(),
      },
    });

    // Record distribution transaction
    await prisma.potTransaction.create({
      data: {
        type: 'WEEKLY_REWARD',
        amount: -rewards.distributionAmount,
        balanceAfter: rewards.potBalanceAfter,
        description: `Weekly rewards: ${rewards.creatorRewards.length} creators, ${rewards.scoutRewards.length} scouts`,
      },
    });

    // Record individual reward transactions
    for (const reward of rewards.creatorRewards) {
      await prisma.potTransaction.create({
        data: {
          type: 'WEEKLY_REWARD',
          amount: -reward.amount,
          balanceAfter: rewards.potBalanceAfter,
          recipientAddress: reward.address,
          recipientType: 'CREATOR',
          description: `Weekly reward #${reward.rank}: $${reward.amount.toFixed(2)}`,
        },
      });
    }

    for (const reward of rewards.scoutRewards) {
      await prisma.potTransaction.create({
        data: {
          type: 'WEEKLY_REWARD',
          amount: -reward.amount,
          balanceAfter: rewards.potBalanceAfter,
          recipientAddress: reward.address,
          recipientType: 'SCOUT',
          description: `Weekly reward #${reward.rank}: $${reward.amount.toFixed(2)}`,
        },
      });
    }

    // Save distribution record
    await prisma.weeklyRewardDistribution.upsert({
      where: { weekStart },
      create: {
        weekStart,
        weekEnd,
        potBalanceBefore: rewards.potBalanceBefore,
        distributionAmount: rewards.distributionAmount,
        potBalanceAfter: rewards.potBalanceAfter,
        status: 'COMPLETED',
        creatorRewards: JSON.stringify(rewards.creatorRewards),
        scoutRewards: JSON.stringify(rewards.scoutRewards),
        processedAt: new Date(),
      },
      update: {
        potBalanceBefore: rewards.potBalanceBefore,
        distributionAmount: rewards.distributionAmount,
        potBalanceAfter: rewards.potBalanceAfter,
        status: 'COMPLETED',
        creatorRewards: JSON.stringify(rewards.creatorRewards),
        scoutRewards: JSON.stringify(rewards.scoutRewards),
        processedAt: new Date(),
      },
    });

    console.log(
      `[LIVE-POT] Weekly rewards distributed: $${rewards.distributionAmount.toFixed(2)} to ${
        rewards.creatorRewards.length + rewards.scoutRewards.length
      } recipients`
    );

    return NextResponse.json({
      success: true,
      data: {
        distribution: rewards,
        message: `Distributed $${rewards.distributionAmount.toFixed(2)} to top performers`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[LIVE-POT] Weekly rewards failed:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
