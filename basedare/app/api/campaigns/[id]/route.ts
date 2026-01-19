import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// ============================================================================
// CAMPAIGN MANAGEMENT API
// Get campaign details and manage campaign status
// ============================================================================

const UpdateCampaignSchema = z.object({
  brandWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  action: z.enum(['FUND', 'ACTIVATE', 'PAUSE', 'SETTLE', 'CANCEL']),
});

// ============================================================================
// GET /api/campaigns/[id] - Get campaign details
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
        brand: {
          select: { name: true, logo: true, walletAddress: true },
        },
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

    // Calculate slot statistics
    const slotStats = {
      total: campaign.creatorCountTarget,
      open: campaign.slots.filter((s) => s.status === 'OPEN').length,
      claimed: campaign.slots.filter((s) => s.status === 'CLAIMED').length,
      vetoed: campaign.slots.filter((s) => s.status === 'VETOED').length,
      assigned: campaign.slots.filter((s) => s.status === 'ASSIGNED').length,
      submitted: campaign.slots.filter((s) => s.status === 'SUBMITTED').length,
      verified: campaign.slots.filter((s) => s.status === 'VERIFIED').length,
      paid: campaign.slots.filter((s) => s.status === 'PAID').length,
      forfeited: campaign.slots.filter((s) => s.status === 'FORFEITED').length,
    };

    // Calculate payout totals
    const verifiedSlots = campaign.slots.filter(
      (s) => s.status === 'VERIFIED' || s.status === 'PAID'
    );
    const payoutTotals = {
      totalCreatorPayout: verifiedSlots.reduce((sum, s) => sum + (s.totalPayout || 0), 0),
      totalDiscoveryRake: verifiedSlots.reduce((sum, s) => sum + (s.discoveryRake || 0), 0),
      totalActiveRake: verifiedSlots.reduce((sum, s) => sum + (s.activeRake || 0), 0),
      strikeBonusesPaid: verifiedSlots.reduce((sum, s) => sum + (s.precisionBonus || 0), 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        ...campaign,
        slotStats,
        payoutTotals,
        targetingCriteria: JSON.parse(campaign.targetingCriteria || '{}'),
        verificationCriteria: JSON.parse(campaign.verificationCriteria || '{}'),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CAMPAIGNS] Failed to fetch campaign:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/campaigns/[id] - Update campaign status
// ============================================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = UpdateCampaignSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { brandWallet, action } = validation.data;

    // Get campaign and verify ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { brand: true, slots: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.brand.walletAddress.toLowerCase() !== brandWallet.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - not campaign owner' },
        { status: 403 }
      );
    }

    // Handle actions based on current status
    let updateData: Record<string, unknown> = {};
    let message = '';

    switch (action) {
      case 'FUND':
        // Move from DRAFT to FUNDING (waiting for USDC deposit)
        if (campaign.status !== 'DRAFT') {
          return NextResponse.json(
            { success: false, error: `Cannot fund campaign in ${campaign.status} status` },
            { status: 400 }
          );
        }
        updateData = { status: 'FUNDING', fundedAt: new Date() };
        message = 'Campaign moved to FUNDING. Deposit USDC to activate.';
        break;

      case 'ACTIVATE':
        // Move from FUNDING to RECRUITING (opens for scout claims)
        if (campaign.status !== 'FUNDING') {
          return NextResponse.json(
            { success: false, error: `Cannot activate campaign in ${campaign.status} status` },
            { status: 400 }
          );
        }
        // Set veto window (24h from now)
        const vetoWindowEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        updateData = {
          status: 'RECRUITING',
          vetoWindowEndsAt,
        };
        message = 'Campaign is now RECRUITING. Scouts can claim slots.';
        break;

      case 'PAUSE':
        // Pause a live campaign
        if (!['RECRUITING', 'LIVE'].includes(campaign.status)) {
          return NextResponse.json(
            { success: false, error: `Cannot pause campaign in ${campaign.status} status` },
            { status: 400 }
          );
        }
        updateData = { status: 'DRAFT' };
        message = 'Campaign paused.';
        break;

      case 'SETTLE':
        // Settle a completed campaign
        if (campaign.status !== 'LIVE' && campaign.status !== 'VERIFYING') {
          return NextResponse.json(
            { success: false, error: `Cannot settle campaign in ${campaign.status} status` },
            { status: 400 }
          );
        }

        // Calculate final settlement
        const verifiedSlots = campaign.slots.filter(
          (s) => s.status === 'VERIFIED' || s.status === 'PAID'
        );
        const totalPaid = verifiedSlots.reduce((sum, s) => sum + (s.totalPayout || 0), 0);

        updateData = {
          status: 'SETTLED',
          settledAt: new Date(),
        };

        // Update brand total spend
        await prisma.brand.update({
          where: { id: campaign.brandId },
          data: { totalSpend: { increment: totalPaid } },
        });

        message = `Campaign settled. Total paid: $${totalPaid.toFixed(2)} to ${verifiedSlots.length} creators.`;
        break;

      case 'CANCEL':
        // Cancel campaign (only if not yet live)
        if (['LIVE', 'SETTLED'].includes(campaign.status)) {
          return NextResponse.json(
            { success: false, error: 'Cannot cancel a live or settled campaign' },
            { status: 400 }
          );
        }
        updateData = { status: 'CANCELLED' };
        message = 'Campaign cancelled.';
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
    });

    console.log(`[CAMPAIGNS] ${action}: ${campaign.title} → ${updatedCampaign.status}`);

    return NextResponse.json({
      success: true,
      data: {
        campaign: updatedCampaign,
        message,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CAMPAIGNS] Status update failed:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
