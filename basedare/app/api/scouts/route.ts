import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  calculateReputation,
  getReputationLevel,
  checkBindingDecay,
} from '@/lib/scout-reputation';

// ============================================================================
// SCOUTS API
// For scout registration, stats, and bound creator management
// ============================================================================

const RegisterScoutSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  handle: z.string().min(1).max(50).optional(),
});

// ============================================================================
// GET /api/scouts - Get scout by wallet address
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address required' },
        { status: 400 }
      );
    }

    const scout = await prisma.scout.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: {
        discoveredCreators: {
          orderBy: { lastActiveAt: 'desc' },
        },
        activeCreators: {
          orderBy: { lastActiveAt: 'desc' },
        },
        slots: {
          where: {
            status: { in: ['CLAIMED', 'ASSIGNED', 'SUBMITTED', 'VERIFIED', 'PAID'] },
          },
          include: {
            campaign: {
              select: {
                title: true,
                tier: true,
                status: true,
                syncTime: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!scout) {
      return NextResponse.json(
        { success: false, error: 'Scout not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Calculate detailed reputation
    const reputation = calculateReputation({
      successfulSlots: scout.successfulSlots,
      failedSlots: scout.failedSlots,
      totalCampaigns: scout.totalCampaigns,
      totalDiscoveryRake: scout.totalDiscoveryRake,
      totalActiveRake: scout.totalActiveRake,
    });

    // Update tier and reputation if changed
    if (reputation.tier !== scout.tier || reputation.score !== scout.reputationScore) {
      await prisma.scout.update({
        where: { id: scout.id },
        data: { tier: reputation.tier, reputationScore: reputation.score },
      });
      scout.tier = reputation.tier;
      scout.reputationScore = reputation.score;
    }

    // Add decay warnings for discovered creators
    const creatorsWithDecay = scout.discoveredCreators.map((creator) => {
      const decay = checkBindingDecay(new Date(creator.lastActiveAt));
      return {
        ...creator,
        decay,
      };
    });

    // Get reputation level info
    const reputationLevel = getReputationLevel(reputation.score);

    return NextResponse.json({
      success: true,
      data: {
        ...scout,
        discoveredCreators: creatorsWithDecay,
        reputation: {
          ...reputation,
          level: reputationLevel,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SCOUTS] Failed to fetch scout:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/scouts - Register or update scout
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = RegisterScoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { walletAddress, handle } = validation.data;

    // Upsert scout
    const scout = await prisma.scout.upsert({
      where: { walletAddress: walletAddress.toLowerCase() },
      update: { handle },
      create: {
        walletAddress: walletAddress.toLowerCase(),
        handle,
      },
    });

    console.log(`[SCOUTS] Scout registered/updated: ${walletAddress}`);

    return NextResponse.json({
      success: true,
      data: scout,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SCOUTS] Failed to register scout:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
