import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// ============================================================================
// CAMPAIGNS API
// For creating and managing B2B campaigns in Control Mode
// ============================================================================

// Campaign tier configurations
const TIER_CONFIG = {
  SIP_MENTION: {
    windowHours: 168, // 7 days
    strikeWindowMinutes: 0,
    precisionMultiplier: 1.0,
    rakePercent: 25,
    minPayout: 50,
  },
  SIP_SHILL: {
    windowHours: 24,
    strikeWindowMinutes: 0,
    precisionMultiplier: 1.0,
    rakePercent: 28,
    minPayout: 100,
  },
  CHALLENGE: {
    windowHours: 2,
    strikeWindowMinutes: 10,
    precisionMultiplier: 1.3,
    rakePercent: 30,
    minPayout: 250,
  },
  APEX: {
    windowHours: 1,
    strikeWindowMinutes: 5,
    precisionMultiplier: 1.5,
    rakePercent: 35,
    minPayout: 1000,
  },
} as const;

// Zod schemas
const TargetingCriteriaSchema = z.object({
  niche: z.string().optional(),
  minFollowers: z.number().min(0).optional(),
  maxFollowers: z.number().optional(),
  location: z.string().optional(),
  platforms: z.array(z.string()).optional(),
});

const VerificationCriteriaSchema = z.object({
  productVisible: z.object({
    target: z.string(),
    minFramePercent: z.number().min(0).max(100).optional(),
    minHoldSeconds: z.number().optional(),
  }).optional(),
  ctaSpoken: z.object({
    phrase: z.string(),
    fuzzyMatch: z.boolean().optional(),
  }).optional(),
  hashtagsRequired: z.array(z.string()).optional(),
  minDurationSeconds: z.number().optional(),
});

const CreateCampaignSchema = z.object({
  brandWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tier: z.enum(['SIP_MENTION', 'SIP_SHILL', 'CHALLENGE', 'APEX']),
  title: z.string().min(5).max(200),
  description: z.string().max(1000).optional(),
  creatorCountTarget: z.number().min(1).max(1000),
  payoutPerCreator: z.number().min(50),
  syncTime: z.string().datetime().optional(),
  targetingCriteria: TargetingCriteriaSchema.optional(),
  verificationCriteria: VerificationCriteriaSchema,
});

// ============================================================================
// GET /api/campaigns - List campaigns (for brands or scouts)
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandWallet = searchParams.get('brand');
    const status = searchParams.get('status');
    const forScouts = searchParams.get('forScouts') === 'true';

    const where: Record<string, unknown> = {};

    if (brandWallet) {
      const brand = await prisma.brand.findUnique({
        where: { walletAddress: brandWallet.toLowerCase() },
      });
      if (brand) {
        where.brandId = brand.id;
      }
    }

    if (status) {
      where.status = status;
    }

    // For scouts, only show RECRUITING campaigns
    if (forScouts) {
      where.status = 'RECRUITING';
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        brand: {
          select: { name: true, logo: true },
        },
        slots: {
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add slot counts
    const campaignsWithCounts = campaigns.map((campaign) => {
      const openSlots = campaign.slots.filter((s) => s.status === 'OPEN').length;
      const claimedSlots = campaign.slots.filter((s) => s.status === 'CLAIMED').length;
      const assignedSlots = campaign.slots.filter((s) => s.status === 'ASSIGNED').length;
      const completedSlots = campaign.slots.filter(
        (s) => s.status === 'VERIFIED' || s.status === 'PAID'
      ).length;

      return {
        ...campaign,
        slots: undefined, // Don't expose raw slots
        slotCounts: {
          total: campaign.creatorCountTarget,
          open: openSlots,
          claimed: claimedSlots,
          assigned: assignedSlots,
          completed: completedSlots,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: campaignsWithCounts,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CAMPAIGNS] Failed to fetch campaigns:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/campaigns - Create a new campaign
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = CreateCampaignSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      brandWallet,
      tier,
      title,
      description,
      creatorCountTarget,
      payoutPerCreator,
      syncTime,
      targetingCriteria,
      verificationCriteria,
    } = validation.data;

    // Verify brand exists
    const brand = await prisma.brand.findUnique({
      where: { walletAddress: brandWallet.toLowerCase() },
    });

    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found. Please register first.' },
        { status: 404 }
      );
    }

    // Get tier configuration
    const tierConfig = TIER_CONFIG[tier];

    // Validate payout meets tier minimum
    if (payoutPerCreator < tierConfig.minPayout) {
      return NextResponse.json(
        {
          success: false,
          error: `Minimum payout for ${tier} tier is $${tierConfig.minPayout}`,
        },
        { status: 400 }
      );
    }

    // Calculate total budget (payout * count + platform rake)
    const grossBudget = payoutPerCreator * creatorCountTarget;
    const platformRake = grossBudget * (tierConfig.rakePercent / 100);
    const totalBudget = grossBudget + platformRake;

    // Calculate veto window (24h after campaign goes to RECRUITING)
    const vetoWindowEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create campaign with open slots
    const campaign = await prisma.campaign.create({
      data: {
        brandId: brand.id,
        tier,
        title,
        description,
        budgetUsdc: totalBudget,
        creatorCountTarget,
        payoutPerCreator,
        syncTime: syncTime ? new Date(syncTime) : null,
        windowHours: tierConfig.windowHours,
        strikeWindowMinutes: tierConfig.strikeWindowMinutes,
        precisionMultiplier: tierConfig.precisionMultiplier,
        rakePercent: tierConfig.rakePercent,
        targetingCriteria: JSON.stringify(targetingCriteria || {}),
        verificationCriteria: JSON.stringify(verificationCriteria),
        vetoWindowEndsAt,
        status: 'DRAFT',
        // Create open slots
        slots: {
          create: Array.from({ length: creatorCountTarget }, () => ({
            status: 'OPEN',
          })),
        },
      },
      include: {
        slots: true,
      },
    });

    console.log(
      `[CAMPAIGNS] Created: ${title} (${tier}) - $${totalBudget} for ${creatorCountTarget} creators`
    );

    return NextResponse.json({
      success: true,
      data: {
        ...campaign,
        budgetBreakdown: {
          grossPayout: grossBudget,
          platformRake,
          totalBudget,
          rakePercent: tierConfig.rakePercent,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CAMPAIGNS] Failed to create campaign:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
