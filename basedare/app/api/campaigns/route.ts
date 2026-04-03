import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { isBountySimulationMode } from '@/lib/bounty-mode';
import { createDatabaseBackedBounty } from '@/lib/bounty-db-create';
import { buildCampaignSlotCounts, buildCampaignTruth } from '@/lib/campaign-truth';
import {
  BountyPlaceResolutionError,
  resolveCanonicalBountyPlaceContext,
} from '@/lib/bounty-place';

// ============================================================================
// CAMPAIGNS API
// For creating and managing B2B campaigns in Control Mode
// ============================================================================

const CREATOR_CAMPAIGNS_DORMANT_MESSAGE =
  'CREATOR campaigns stay visible in Control Mode, but new creator-routing launches are temporarily parked while we finish the real social-routing path.';
const PLACE_CAMPAIGN_MODE = isBountySimulationMode();

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

function mapCampaignWithCounts<
  T extends {
    id: string;
    slots: Array<{ status: string }>;
    creatorCountTarget: number;
    type: string;
    status: string;
    createdAt: Date;
    updatedAt?: Date;
    fundedAt?: Date | null;
    liveAt?: Date | null;
    settledAt?: Date | null;
    budgetUsdc: number;
    payoutPerCreator: number;
    venue?: { id: string; slug: string; name: string; city: string | null; country: string | null } | null;
    brand?: { name: string; logo: string | null; walletAddress?: string } | null;
    linkedDare?: {
      id: string;
      shortId: string | null;
      status: string;
      verifiedAt?: Date | null;
      completed_at?: Date | null;
      createdAt?: Date;
      venueId?: string | null;
    } | null;
  },
>(
  campaign: T
) {
  const slotCounts = buildCampaignSlotCounts(campaign.slots, campaign.creatorCountTarget);

  return {
    ...campaign,
    slots: undefined,
    slotCounts,
    truth: buildCampaignTruth(campaign),
  };
}

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

type WalletSession = {
  token?: string;
  walletAddress?: string;
  user?: {
    walletAddress?: string | null;
  } | null;
};

const CreateCampaignSchema = z.object({
  brandWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  type: z.enum(['PLACE', 'CREATOR']).default('PLACE'),
  tier: z.enum(['SIP_MENTION', 'SIP_SHILL', 'CHALLENGE', 'APEX']),
  title: z.string().min(5).max(200),
  description: z.string().max(1000).optional(),
  creatorCountTarget: z.number().min(1).max(1000),
  payoutPerCreator: z.number().min(50),
  venueId: z.string().min(1).optional(),
  syncTime: z.string().datetime().optional(),
  targetingCriteria: TargetingCriteriaSchema.optional(),
  verificationCriteria: VerificationCriteriaSchema,
});

async function getVerifiedSessionWallet(request: NextRequest): Promise<string | null> {
  const session = (await getServerSession(authOptions)) as WalletSession | null;
  if (!session) return null;

  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim();

  if (session.token && (!bearerToken || bearerToken !== session.token)) {
    return null;
  }

  const wallet = session.walletAddress ?? session.user?.walletAddress ?? null;
  if (!wallet || !isAddress(wallet)) return null;

  return wallet.toLowerCase();
}

function normalizeWalletForControl(value: string | null | undefined): string | null {
  if (!value || !isAddress(value)) return null;
  return value.toLowerCase();
}

// ============================================================================
// GET /api/campaigns - List campaigns (for brands or scouts)
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandWallet = searchParams.get('brand');
    const venueId = searchParams.get('venueId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
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

    if (venueId) {
      where.venueId = venueId;
    }

    if (type) {
      where.type = type;
    }

    // For scouts, only show RECRUITING campaigns
    if (forScouts) {
      where.status = 'RECRUITING';
      where.type = 'CREATOR';
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        brand: {
          select: { name: true, logo: true },
        },
        venue: {
          select: { id: true, slug: true, name: true, city: true, country: true },
        },
        linkedDare: {
          select: {
            id: true,
            shortId: true,
            status: true,
            videoUrl: true,
            updatedAt: true,
            moderatedAt: true,
            moderatorNote: true,
            verifiedAt: true,
            completed_at: true,
            createdAt: true,
            venueId: true,
            streamerHandle: true,
            targetWalletAddress: true,
            claimedBy: true,
            claimedAt: true,
            claimRequestWallet: true,
            claimRequestTag: true,
            claimRequestedAt: true,
            claimRequestStatus: true,
          },
        },
        slots: {
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add slot counts
    const campaignsWithCounts = campaigns.map(mapCampaignWithCounts);

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
      type,
      tier,
      title,
      description,
      creatorCountTarget,
      payoutPerCreator,
      venueId,
      syncTime,
      targetingCriteria,
      verificationCriteria,
    } = validation.data;

    const sessionWallet = await getVerifiedSessionWallet(request);
    const actingWallet = sessionWallet ?? normalizeWalletForControl(brandWallet);
    if (!actingWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (brandWallet.toLowerCase() !== actingWallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet mismatch. Use the connected brand wallet.' },
        { status: 401 }
      );
    }

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
    const effectiveCreatorCountTarget = type === 'PLACE' ? 1 : creatorCountTarget;
    const grossBudget = payoutPerCreator * effectiveCreatorCountTarget;
    const platformRake = grossBudget * (tierConfig.rakePercent / 100);
    const totalBudget = grossBudget + platformRake;

    // Calculate veto window (24h after campaign goes to RECRUITING)
    const vetoWindowEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    let campaign;

    if (type === 'PLACE') {
      if (!venueId) {
        return NextResponse.json(
          { success: false, error: 'PLACE campaigns require a valid venue.' },
          { status: 400 }
        );
      }

      try {
        const placeContext = await resolveCanonicalBountyPlaceContext({
          venueId,
          creationContext: 'MAP',
          discoveryRadiusKm: 0.5,
        });

        campaign = await prisma.$transaction(
          async (tx) => {
            const createdCampaign = await tx.campaign.create({
              data: {
                brandId: brand.id,
                type,
                tier,
                title,
                description,
                budgetUsdc: totalBudget,
                creatorCountTarget: 1,
                payoutPerCreator,
                venueId: placeContext.venueId,
                syncTime: syncTime ? new Date(syncTime) : null,
                windowHours: tierConfig.windowHours,
                strikeWindowMinutes: tierConfig.strikeWindowMinutes,
                precisionMultiplier: tierConfig.precisionMultiplier,
                rakePercent: tierConfig.rakePercent,
                targetingCriteria: JSON.stringify(targetingCriteria || {}),
                verificationCriteria: JSON.stringify(verificationCriteria),
                vetoWindowEndsAt,
                status: 'LIVE',
                fundedAt: new Date(),
                liveAt: new Date(),
                slots: {
                  create: [{ status: 'OPEN' }],
                },
              },
            });

            const bounty = await createDatabaseBackedBounty({
              db: tx,
              title,
              missionMode: 'IRL',
              missionTag: 'brand-campaign',
              amount: payoutPerCreator,
              streamerTag: null,
              streamId: `campaign:${createdCampaign.id}`,
              tagVerified: false,
              stakerAddress: brand.walletAddress,
              targetWalletAddress: null,
              venueId: placeContext.venueId,
              isNearbyDare: placeContext.isNearbyDare,
              latitude: placeContext.latitude,
              longitude: placeContext.longitude,
              geohash: placeContext.geohash,
              locationLabel: placeContext.locationLabel,
              discoveryRadiusKm: placeContext.discoveryRadiusKm,
              isSimulated: PLACE_CAMPAIGN_MODE,
            });

            return tx.campaign.update({
              where: { id: createdCampaign.id },
              data: {
                linkedDareId: bounty.dare.id,
              },
              include: {
                brand: {
                  select: { name: true, logo: true },
                },
                venue: {
                  select: { id: true, slug: true, name: true, city: true, country: true },
                },
                linkedDare: {
                  select: {
                    id: true,
                    shortId: true,
                    status: true,
                    verifiedAt: true,
                    completed_at: true,
                    createdAt: true,
                    venueId: true,
                  },
                },
                slots: true,
              },
            });
          },
          {
            maxWait: 5000,
            timeout: 15000,
          }
        );
      } catch (error) {
        if (error instanceof BountyPlaceResolutionError) {
          return NextResponse.json(
            { success: false, error: error.message, code: error.code },
            { status: 400 }
          );
        }
        if (error instanceof Error && error.message.includes('Transaction already closed')) {
          return NextResponse.json(
            {
              success: false,
              error: 'Campaign creation timed out locally. Retry once more.',
              code: 'PLACE_CAMPAIGN_TIMEOUT',
            },
            { status: 503 }
          );
        }
        throw error;
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          dormant: true,
          error: CREATOR_CAMPAIGNS_DORMANT_MESSAGE,
          code: 'CREATOR_CAMPAIGNS_DORMANT',
          data: {
            requestedType: 'CREATOR',
            status: 'DORMANT',
          },
        },
        { status: 200 }
      );
    }

    console.log(
      `[CAMPAIGNS] Created: ${title} (${type}/${tier}) - $${totalBudget} for ${effectiveCreatorCountTarget} creator slots`
    );

    const campaignWithCounts = mapCampaignWithCounts(campaign as Parameters<typeof mapCampaignWithCounts>[0]);

    return NextResponse.json({
      success: true,
      data: Object.assign({}, campaignWithCounts as Record<string, unknown>, {
        budgetBreakdown: {
          grossPayout: grossBudget,
          platformRake,
          totalBudget,
          rakePercent: tierConfig.rakePercent,
        },
      }),
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
