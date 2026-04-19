import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import {
  notifyCampaignSlotAssigned,
  notifyCampaignSlotClaimedForBrand,
  notifyCampaignSlotVetoed,
} from '@/lib/campaign-notifications';

// ============================================================================
// CAMPAIGN SLOTS API
// For scouts to claim slots and brands to manage them
// ============================================================================

type WalletSession = {
  token?: string;
  walletAddress?: string;
  user?: {
    walletAddress?: string | null;
  } | null;
};

const ClaimSlotSchema = z.object({
  scoutWallet: z.string().optional(),
  creatorAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  creatorHandle: z.string().min(1).max(100),
  creatorFollowers: z.number().min(0),
  claimRationale: z.string().max(500).optional(),
});

const VetoSlotSchema = z.object({
  brandWallet: z.string().optional(),
  slotId: z.string(),
  reason: z.string().max(200).optional(),
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

// ============================================================================
// GET /api/campaigns/[id]/slots - Get slots for a campaign
// ============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        brand: { select: { name: true, walletAddress: true } },
        slots: {
          include: {
            scout: {
              select: {
                id: true,
                handle: true,
                walletAddress: true,
                reputationScore: true,
                tier: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: campaign,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SLOTS] Failed to fetch slots:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/campaigns/[id]/slots - Scout claims a slot
// ============================================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = ClaimSlotSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const sessionWallet = await getVerifiedSessionWallet(request);
    if (!sessionWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { scoutWallet, creatorAddress, creatorHandle, creatorFollowers, claimRationale } =
      validation.data;
    const normalizedScoutWallet = scoutWallet?.toLowerCase();

    if (normalizedScoutWallet && normalizedScoutWallet !== sessionWallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet mismatch. Use authenticated session wallet.' },
        { status: 401 }
      );
    }

    // Get campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        brand: true,
        venue: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.status !== 'RECRUITING') {
      return NextResponse.json(
        { success: false, error: 'Campaign is not accepting claims' },
        { status: 400 }
      );
    }

    // Get or create scout
    let scout = await prisma.scout.findUnique({
      where: { walletAddress: sessionWallet },
    });

    if (!scout) {
      scout = await prisma.scout.create({
        data: { walletAddress: sessionWallet },
      });
    }

    // Check targeting criteria
    const targetingCriteria = JSON.parse(campaign.targetingCriteria || '{}');
    if (targetingCriteria.minFollowers && creatorFollowers < targetingCriteria.minFollowers) {
      return NextResponse.json(
        {
          success: false,
          error: `Creator needs at least ${targetingCriteria.minFollowers} followers`,
        },
        { status: 400 }
      );
    }

    // Find an open slot
    const openSlot = await prisma.campaignSlot.findFirst({
      where: {
        campaignId: id,
        status: 'OPEN',
      },
    });

    if (!openSlot) {
      return NextResponse.json(
        { success: false, error: 'No open slots available' },
        { status: 400 }
      );
    }

    // Check if creator is already in this campaign
    const existingCreatorSlot = await prisma.campaignSlot.findFirst({
      where: {
        campaignId: id,
        creatorAddress: creatorAddress.toLowerCase(),
        status: { not: 'VETOED' },
      },
    });

    if (existingCreatorSlot) {
      return NextResponse.json(
        { success: false, error: 'Creator is already assigned to this campaign' },
        { status: 400 }
      );
    }

    // Check scout reputation for auto-accept (rep > 70)
    const autoAccept = scout.reputationScore >= 70;

    // Claim the slot
    const updatedSlot = await prisma.campaignSlot.update({
      where: { id: openSlot.id },
      data: {
        scoutId: scout.id,
        creatorAddress: creatorAddress.toLowerCase(),
        creatorHandle,
        creatorFollowers,
        claimRationale,
        claimedAt: new Date(),
        status: autoAccept ? 'ASSIGNED' : 'CLAIMED',
      },
      include: {
        scout: { select: { handle: true, reputationScore: true } },
      },
    });

    // Update or create ScoutCreator binding
    const existingBinding = await prisma.scoutCreator.findUnique({
      where: { creatorAddress: creatorAddress.toLowerCase() },
    });

    if (!existingBinding) {
      // New creator - scout gets discovery binding
      await prisma.scoutCreator.create({
        data: {
          creatorAddress: creatorAddress.toLowerCase(),
          creatorHandle,
          discoveryScoutId: scout.id,
          activeScoutId: scout.id,
        },
      });
    } else if (existingBinding.bindingStatus === 'UNBOUND') {
      // Rebinding dormant creator
      await prisma.scoutCreator.update({
        where: { id: existingBinding.id },
        data: {
          activeScoutId: scout.id,
          bindingStatus: 'BOUND',
          lastActiveAt: new Date(),
        },
      });
    } else {
      // Update active scout if different
      await prisma.scoutCreator.update({
        where: { id: existingBinding.id },
        data: {
          activeScoutId: scout.id,
          lastActiveAt: new Date(),
        },
      });
    }

    console.log(
      `[SLOTS] Slot claimed: ${creatorHandle} for campaign ${campaign.title} by scout ${scout.walletAddress} (${autoAccept ? 'auto-accepted' : 'pending veto'})`
    );

    void notifyCampaignSlotAssigned({
      creatorWallet: creatorAddress,
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      venueName: campaign.venue?.name,
      autoAccepted: autoAccept,
    });

    void notifyCampaignSlotClaimedForBrand({
      brandWallet: campaign.brand.walletAddress,
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      creatorHandle,
      autoAccepted: autoAccept,
    });

    return NextResponse.json({
      success: true,
      data: {
        slot: updatedSlot,
        autoAccepted: autoAccept,
        message: autoAccept
          ? 'Slot claimed and auto-accepted (Scout rep > 70)'
          : 'Slot claimed, pending brand veto window (24h)',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SLOTS] Failed to claim slot:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/campaigns/[id]/slots - Brand vetos a claimed slot
// ============================================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = VetoSlotSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const sessionWallet = await getVerifiedSessionWallet(request);
    if (!sessionWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { brandWallet, slotId, reason } = validation.data;
    const normalizedBrandWallet = brandWallet?.toLowerCase();

    if (normalizedBrandWallet && normalizedBrandWallet !== sessionWallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet mismatch. Use authenticated session wallet.' },
        { status: 401 }
      );
    }

    // Get campaign and verify brand ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { brand: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.brand.walletAddress.toLowerCase() !== sessionWallet) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - not campaign owner' },
        { status: 403 }
      );
    }

    // Check veto window
    if (campaign.vetoWindowEndsAt && new Date() > campaign.vetoWindowEndsAt) {
      return NextResponse.json(
        { success: false, error: 'Veto window has expired' },
        { status: 400 }
      );
    }

    // Check veto cap (25% of total slots)
    const maxVetos = Math.ceil(campaign.creatorCountTarget * (campaign.maxVetoPercent / 100));
    if (campaign.vetoCount >= maxVetos) {
      return NextResponse.json(
        {
          success: false,
          error: `Veto cap reached (${maxVetos} max). Cannot veto more slots.`,
        },
        { status: 400 }
      );
    }

    // Get and veto the slot
    const slot = await prisma.campaignSlot.findFirst({
      where: {
        id: slotId,
        campaignId: id,
        status: 'CLAIMED',
      },
    });

    if (!slot) {
      return NextResponse.json(
        { success: false, error: 'Slot not found or not in CLAIMED status' },
        { status: 404 }
      );
    }

    // Veto the slot and create a new open slot to replace it
    await prisma.$transaction([
      prisma.campaignSlot.update({
        where: { id: slotId },
        data: { status: 'VETOED' },
      }),
      prisma.campaign.update({
        where: { id },
        data: { vetoCount: { increment: 1 } },
      }),
      prisma.campaignSlot.create({
        data: {
          campaignId: id,
          status: 'OPEN',
        },
      }),
    ]);

    console.log(
      `[SLOTS] Slot vetoed: ${slot.creatorHandle} from campaign ${campaign.title}. Reason: ${reason || 'No reason provided'}`
    );

    void notifyCampaignSlotVetoed({
      creatorWallet: slot.creatorAddress,
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      reason,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Slot vetoed. A new open slot has been created.',
        vetoCount: campaign.vetoCount + 1,
        maxVetos,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SLOTS] Failed to veto slot:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
