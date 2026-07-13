import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { isInternalApiAuthorized } from '@/lib/api-auth';
import { createDatabaseBackedBounty } from '@/lib/bounty-db-create';
import { getRankedCampaignMatches } from '@/lib/campaign-matching';
import { buildCampaignSlotCounts, buildCampaignTruth } from '@/lib/campaign-truth';
import {
  MANAGED_FIELD_SPRINT,
  hasValidManagedFieldSprintPaymentLines,
  isCanonicalManagedFieldSprintMission,
  isEligibleManagedFieldSprintEscrow,
} from '@/lib/financial-canon';
import { getApprovedTagSummaryMap } from '@/lib/place-tags';
import { markActivationIntakeLaunchedFromCampaign } from '@/lib/activation-funnel';
import { recordVenueReportEvent } from '@/lib/venue-report-pipeline';
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
// Commercial missions must attach a real, pre-funded linked dare. A database-only
// fallback would record budget without escrow and is therefore release-blocked.
const PLACE_CAMPAIGN_DB_FALLBACK = false;

// Campaign tier configurations
const TIER_CONFIG = {
  SIP_MENTION: {
    windowHours: 168, // 7 days
    strikeWindowMinutes: 0,
    precisionMultiplier: 1.0,
    rakePercent: 0,
    minPayout: 50,
  },
  SIP_SHILL: {
    windowHours: 24,
    strikeWindowMinutes: 0,
    precisionMultiplier: 1.0,
    rakePercent: 0,
    minPayout: 100,
  },
  CHALLENGE: {
    windowHours: 2,
    strikeWindowMinutes: 10,
    precisionMultiplier: 1.3,
    rakePercent: 0,
    minPayout: 250,
  },
  APEX: {
    windowHours: 1,
    strikeWindowMinutes: 5,
    precisionMultiplier: 1.5,
    rakePercent: 0,
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
  payoutPerCreator: z.number().min(1),
  venueId: z.string().min(1).optional(),
  selectedCreatorId: z.string().cuid().optional(),
  selectedCreatorWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  selectedCreatorTag: z.string().min(1).max(120).optional(),
  linkedDareId: z.string().cuid().optional(),
  syncTime: z.string().datetime().optional(),
  reportSource: z.string().max(80).optional(),
  reportAudience: z.enum(['venue', 'sponsor']).optional(),
  reportSessionKey: z.string().min(6).max(200).optional(),
  reportIntent: z.enum(['activation', 'repeat']).optional(),
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

function asJsonRecord(value: unknown): Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
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
          select: {
            id: true,
            slug: true,
            name: true,
            city: true,
            country: true,
            memories: {
              orderBy: { bucketStartAt: 'desc' },
              take: 1,
              select: {
                proofCount: true,
                completedDareCount: true,
                checkInCount: true,
                bucketStartAt: true,
              },
            },
          },
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

    const venueIds = Array.from(
      new Set(campaigns.map((campaign) => campaign.venue?.id).filter((venueId): venueId is string => Boolean(venueId)))
    );
    const linkedDareIds = Array.from(
      new Set(
        campaigns
          .map((campaign) => campaign.linkedDare?.id)
          .filter((linkedDareId): linkedDareId is string => Boolean(linkedDareId))
      )
    );

    const [tagSummaryMap, linkedTagOutcomes] = await Promise.all([
      getApprovedTagSummaryMap(venueIds),
      linkedDareIds.length > 0
        ? prisma.placeTag.findMany({
            where: {
              linkedDareId: { in: linkedDareIds },
              status: 'APPROVED',
            },
            select: {
              linkedDareId: true,
              firstMark: true,
              heatContribution: true,
              submittedAt: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const linkedOutcomeByDareId = new Map(
      linkedTagOutcomes.map((outcome) => [outcome.linkedDareId, outcome])
    );

    // Add slot counts
    const campaignsWithCounts = campaigns.map((campaign) => {
      const mappedCampaign = mapCampaignWithCounts(campaign) as ReturnType<typeof mapCampaignWithCounts>;
      const venueTagSummary = campaign.venue ? tagSummaryMap.get(campaign.venue.id) : null;
      const latestMemory = campaign.venue?.memories?.[0] ?? null;
      const linkedOutcome = campaign.linkedDare?.id ? linkedOutcomeByDareId.get(campaign.linkedDare.id) ?? null : null;

      return {
        ...mappedCampaign,
        venue: campaign.venue
          ? {
              id: campaign.venue.id,
              slug: campaign.venue.slug,
              name: campaign.venue.name,
              city: campaign.venue.city,
              country: campaign.venue.country,
              impact: {
                pulseNow: venueTagSummary?.heatScore ?? 0,
                memoriesNow: venueTagSummary?.approvedCount ?? 0,
                lastMarkedAt: venueTagSummary?.lastTaggedAt ?? null,
                recentProofCount: latestMemory?.proofCount ?? 0,
                recentCompletedCount: latestMemory?.completedDareCount ?? 0,
                recentCheckInCount: latestMemory?.checkInCount ?? 0,
                memoryBucketStartedAt: latestMemory?.bucketStartAt?.toISOString() ?? null,
                campaignVerifiedMemory: Boolean(linkedOutcome),
                firstMarkWon: linkedOutcome?.firstMark ?? false,
                pulseContribution: linkedOutcome?.heatContribution ?? 0,
                linkedMemoryAt: linkedOutcome?.submittedAt?.toISOString() ?? null,
              },
            }
          : null,
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
      type,
      tier,
      title,
      description,
      creatorCountTarget,
      payoutPerCreator,
      venueId,
      selectedCreatorId,
      selectedCreatorWallet,
      selectedCreatorTag,
      linkedDareId,
      syncTime,
      reportSource,
      reportAudience,
      reportSessionKey,
      reportIntent,
      targetingCriteria,
      verificationCriteria,
    } = validation.data;

    const sessionWallet = await getVerifiedSessionWallet(request);
    const isInternalAuthorized = isInternalApiAuthorized(request);
    const actingWallet = sessionWallet ?? (isInternalAuthorized ? normalizeWalletForControl(brandWallet) : null);
    if (!actingWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (brandWallet.toLowerCase() !== actingWallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet mismatch. Use the connected brand wallet.' },
        { status: 401 }
      );
    }

    // A bounty funds contributor rewards; it does not collect BaseDare's
    // managed-service fee. Until a separate service-payment rail exists, only
    // the internal, human-confirmed invoice lane may launch business campaigns.
    if (!isInternalAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Managed business missions require confirmed invoice payment before launch.',
          code: 'BUSINESS_INVOICE_REQUIRED',
          invoiceHref: '/activations?source=buyer-portal&missionType=field-mission',
        },
        { status: 409 },
      );
    }

    if (reportSource !== 'activation-intake' || !reportSessionKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Launch requires a paid activation-intake reference.',
          code: 'PAID_INTAKE_REQUIRED',
        },
        { status: 409 },
      );
    }

    const paidIntake = await prisma.founderEvent.findFirst({
      where: {
        id: reportSessionKey,
        eventType: 'ACTIVATION_INTAKE',
        status: { in: ['PAID_CONFIRMED', 'LAUNCHED'] },
      },
      select: { metadataJson: true },
    });
    const paidIntakeOperator = asJsonRecord(asJsonRecord(paidIntake?.metadataJson).operator);
    if (
      !paidIntake ||
      !hasValidManagedFieldSprintPaymentLines({
        serviceRevenueUsd: paidIntakeOperator.paidConfirmedAmountUsd,
        rewardPoolUsd: paidIntakeOperator.rewardPoolConfirmedAmountUsd,
        designPartnerException: paidIntakeOperator.designPartnerServiceFeeException,
      })
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Confirm the service line and full contributor pool before launch.',
          code: 'PAYMENT_LINES_NOT_CONFIRMED',
        },
        { status: 409 },
      );
    }

    if (!isCanonicalManagedFieldSprintMission({
      type,
      tier,
      creatorCountTarget,
      grossRewardUsd: payoutPerCreator,
    })) {
      return NextResponse.json(
        {
          success: false,
          error: `Each Verified Field Sprint mission must fund one contributor at $${MANAGED_FIELD_SPRINT.grossRewardPerContributorUsd} gross.`,
          code: 'SPRINT_REWARD_MISMATCH',
        },
        { status: 409 },
      );
    }

    if (!linkedDareId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Fund the contributor reward in V2 escrow before registering the mission.',
          code: 'REWARD_ESCROW_REQUIRED',
        },
        { status: 409 },
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
    const isMainnet = process.env.NEXT_PUBLIC_NETWORK === 'mainnet';
    const activeMinPayout = isMainnet ? tierConfig.minPayout : 1;

    // Validate payout meets tier minimum
    if (payoutPerCreator < activeMinPayout) {
      return NextResponse.json(
        {
          success: false,
          error: `Minimum payout for ${tier} tier is $${activeMinPayout}`,
        },
        { status: 400 }
      );
    }

    // Managed-service revenue is recorded through the paid activation intake.
    // Campaign budget is reward funding only; do not manufacture an unpaid
    // percentage rake in the campaign record.
    const effectiveCreatorCountTarget = type === 'PLACE' ? 1 : creatorCountTarget;
    const grossBudget = payoutPerCreator * effectiveCreatorCountTarget;
    const platformRake = grossBudget * (tierConfig.rakePercent / 100);
    const totalBudget = grossBudget + platformRake;
    const campaignTargetingCriteria: Record<string, unknown> = {
      ...(targetingCriteria ?? {}),
    };

    if (reportSource) campaignTargetingCriteria.reportSource = reportSource;
    if (reportAudience) campaignTargetingCriteria.reportAudience = reportAudience;
    if (reportSessionKey) campaignTargetingCriteria.reportSessionKey = reportSessionKey;
    if (reportIntent) campaignTargetingCriteria.reportIntent = reportIntent;
    if (reportSource === 'activation-intake' && reportSessionKey) {
      campaignTargetingCriteria.activationLeadId = reportSessionKey;
    }
    const activationLeadNeedle = `\"activationLeadId\":${JSON.stringify(reportSessionKey)}`;

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

        const rankedMatches = await getRankedCampaignMatches(prisma, {
          targeting: targetingCriteria || {},
          venueId: placeContext.venueId,
          limit:
            selectedCreatorId || selectedCreatorWallet || selectedCreatorTag
              ? 150
              : 25,
        });

        const chosenCreator =
          (selectedCreatorId
            ? rankedMatches.find((match) => match.creator.id === selectedCreatorId) ?? null
            : selectedCreatorWallet
              ? rankedMatches.find(
                  (match) =>
                    match.creator.walletAddress.toLowerCase() ===
                    selectedCreatorWallet.toLowerCase()
                ) ?? null
              : selectedCreatorTag
                ? rankedMatches.find(
                    (match) =>
                      match.creator.tag.toLowerCase() ===
                      selectedCreatorTag.toLowerCase()
                  ) ?? null
                : rankedMatches[0] ?? null);

        if (!chosenCreator) {
          return NextResponse.json(
            {
              success: false,
              error:
                'No suitable creator match is ready for this venue yet. Broaden your targeting or try another venue.',
              code: 'NO_CREATOR_MATCH',
            },
            { status: 409 }
          );
        }

        campaign = await prisma.$transaction(
          async (tx) => {
            if (linkedDareId) {
              const existingCampaign = await tx.campaign.findUnique({
                where: { linkedDareId },
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
                      streamerHandle: true,
                      targetWalletAddress: true,
                    },
                  },
                  slots: true,
                },
              });

              if (existingCampaign) {
                if (!existingCampaign.targetingCriteria?.includes(activationLeadNeedle)) {
                  throw new Error('LINKED_DARE_ALREADY_REGISTERED');
                }
                return existingCampaign;
              }
            }

            const sprintMissionCount = await tx.campaign.count({
              where: {
                targetingCriteria: { contains: activationLeadNeedle },
                status: { not: 'CANCELLED' },
              },
            });
            if (sprintMissionCount >= MANAGED_FIELD_SPRINT.assignedContributorCount) {
              throw new Error('SPRINT_MISSION_LIMIT_REACHED');
            }

            const linkedLiveDare = linkedDareId
              ? await tx.dare.findUnique({
                  where: { id: linkedDareId },
                  select: {
                    id: true,
                    shortId: true,
                    bounty: true,
                    status: true,
                    verifiedAt: true,
                    completed_at: true,
                    createdAt: true,
                    venueId: true,
                    streamerHandle: true,
                    targetWalletAddress: true,
                    stakerAddress: true,
                    isSimulated: true,
                    onChainDareId: true,
                  },
                })
              : null;

            if (linkedDareId) {
              if (!linkedLiveDare) {
                throw new Error('Linked funded dare not found');
              }

              if (!isEligibleManagedFieldSprintEscrow({
                grossRewardUsd: linkedLiveDare.bounty,
                status: linkedLiveDare.status,
                isSimulated: linkedLiveDare.isSimulated,
                onChainDareId: linkedLiveDare.onChainDareId,
              })) {
                throw new Error(`Linked dare must be an active, non-simulated $${MANAGED_FIELD_SPRINT.grossRewardPerContributorUsd} escrow.`);
              }

              if (!linkedLiveDare.stakerAddress || linkedLiveDare.stakerAddress.toLowerCase() !== brand.walletAddress.toLowerCase()) {
                throw new Error('Linked funded dare does not belong to this brand wallet');
              }

              if (linkedLiveDare.venueId !== placeContext.venueId) {
                throw new Error('Linked funded dare venue does not match this campaign venue');
              }

              if (linkedLiveDare.streamerHandle?.toLowerCase() !== chosenCreator.creator.tag.toLowerCase()) {
                throw new Error('Linked funded dare target tag does not match the selected creator');
              }

              if (
                linkedLiveDare.targetWalletAddress?.toLowerCase() !==
                chosenCreator.creator.walletAddress.toLowerCase()
              ) {
                throw new Error('Linked funded dare wallet does not match the selected creator');
              }
            }

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
                targetingCriteria: JSON.stringify(campaignTargetingCriteria),
                verificationCriteria: JSON.stringify(verificationCriteria),
                vetoWindowEndsAt,
                status: 'LIVE',
                fundedAt: new Date(),
                liveAt: new Date(),
                linkedDareId: linkedLiveDare?.id,
                slots: {
                  create: [
                    {
                      status: 'ASSIGNED',
                      creatorAddress: chosenCreator.creator.walletAddress.toLowerCase(),
                      creatorHandle: chosenCreator.creator.tag,
                      creatorFollowers: chosenCreator.creator.followerCount ?? null,
                      claimedAt: new Date(),
                      claimRationale: chosenCreator.reasons.slice(0, 3).join(' • '),
                    },
                  ],
                },
              },
            });

            if (linkedLiveDare) {
              return tx.campaign.findUniqueOrThrow({
                where: { id: createdCampaign.id },
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
                      streamerHandle: true,
                      targetWalletAddress: true,
                    },
                  },
                  slots: true,
                },
              });
            }

            const bounty = await createDatabaseBackedBounty({
              db: tx,
              title,
              missionMode: 'IRL',
              missionTag: 'brand-campaign',
              // Paid brand/venue mission — never auto-approve on generic proof.
              requireSentinel: true,
              amount: payoutPerCreator,
              streamerTag: chosenCreator.creator.tag,
              streamId: `campaign:${createdCampaign.id}`,
              tagVerified: true,
              stakerAddress: brand.walletAddress,
              targetWalletAddress: chosenCreator.creator.walletAddress,
              venueId: placeContext.venueId,
              isNearbyDare: placeContext.isNearbyDare,
              latitude: placeContext.latitude,
              longitude: placeContext.longitude,
              geohash: placeContext.geohash,
              locationLabel: placeContext.locationLabel,
              discoveryRadiusKm: placeContext.discoveryRadiusKm,
              isSimulated: PLACE_CAMPAIGN_DB_FALLBACK,
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
                    streamerHandle: true,
                    targetWalletAddress: true,
                  },
                },
                slots: true,
              },
            });
          },
          {
            maxWait: 5000,
            timeout: 15000,
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
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
        if (error instanceof Error && error.message === 'SPRINT_MISSION_LIMIT_REACHED') {
          return NextResponse.json(
            {
              success: false,
              error: `This Sprint already has ${MANAGED_FIELD_SPRINT.assignedContributorCount} funded missions.`,
              code: 'SPRINT_MISSION_LIMIT_REACHED',
            },
            { status: 409 }
          );
        }
        if (error instanceof Error && error.message === 'LINKED_DARE_ALREADY_REGISTERED') {
          return NextResponse.json(
            {
              success: false,
              error: 'This funded dare already belongs to a different Sprint.',
              code: 'LINKED_DARE_ALREADY_REGISTERED',
            },
            { status: 409 }
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

    if (venueId) {
      void recordVenueReportEvent({
        venueId: campaign.venueId ?? venueId,
        audience: reportAudience ?? 'venue',
        eventType: reportIntent === 'repeat' ? 'REPEAT_LAUNCHED' : 'ACTIVATION_LAUNCHED',
        sessionKey: reportSessionKey,
        channel: 'campaign-create',
        metadataJson: {
          campaignId: campaign.id,
          linkedDareId: campaign.linkedDareId ?? null,
          tier,
          payoutPerCreator,
        },
      });

      void markActivationIntakeLaunchedFromCampaign({
        leadId: reportSessionKey,
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        venueId: campaign.venueId ?? venueId,
        venueSlug: campaign.venue?.slug ?? null,
        actor: brandWallet,
        amount: totalBudget,
      }).catch((error) => {
        console.error('[CAMPAIGNS] Activation intake launch tracking failed:', error);
      });
    }

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
