import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  calculatePayout,
  calculateRakeBreakdown,
  canSubmitSlot,
  getSyncStatusMessage,
} from '@/lib/campaign-payouts';

// ============================================================================
// SLOT SUBMISSION API
// For creators to submit proof of completion with sync window logic
// ============================================================================

const SubmitSlotSchema = z.object({
  slotId: z.string(),
  creatorWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  proofUrl: z.string().url(),
  proofHash: z.string().optional(),
});

// ============================================================================
// POST /api/campaigns/[id]/slots/submit - Submit proof for a slot
// ============================================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const body = await request.json();
    const validation = SubmitSlotSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { slotId, creatorWallet, proofUrl, proofHash } = validation.data;

    // Get the campaign and slot
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { brand: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const slot = await prisma.campaignSlot.findFirst({
      where: {
        id: slotId,
        campaignId,
        creatorAddress: creatorWallet.toLowerCase(),
        status: 'ASSIGNED',
      },
      include: {
        scout: true,
      },
    });

    if (!slot) {
      return NextResponse.json(
        { success: false, error: 'Slot not found or not assigned to this creator' },
        { status: 404 }
      );
    }

    // Check if submission window is open
    const submissionCheck = canSubmitSlot(
      campaign.syncTime,
      campaign.windowHours
    );

    if (!submissionCheck.canSubmit) {
      return NextResponse.json(
        {
          success: false,
          error: submissionCheck.reason,
          code: 'WINDOW_CLOSED',
        },
        { status: 400 }
      );
    }

    const submittedAt = new Date();

    // Calculate payout based on sync timing
    const payoutResult = calculatePayout(submittedAt, campaign.payoutPerCreator, {
      syncTime: campaign.syncTime,
      windowHours: campaign.windowHours,
      strikeWindowMinutes: campaign.strikeWindowMinutes,
      precisionMultiplier: campaign.precisionMultiplier,
    });

    // If forfeited (outside window), reject
    if (payoutResult.status === 'FORFEITED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Submission outside allowed window - slot forfeited',
          code: 'FORFEITED',
          details: {
            minutesFromTarget: payoutResult.minutesFromTarget,
            windowHours: campaign.windowHours,
          },
        },
        { status: 400 }
      );
    }

    // Calculate rake breakdown
    const rakeBreakdown = calculateRakeBreakdown(
      payoutResult.totalPayout,
      campaign.rakePercent
    );

    // Get scout creator binding for rake distribution
    const scoutCreator = await prisma.scoutCreator.findUnique({
      where: { creatorAddress: creatorWallet.toLowerCase() },
    });

    // Update slot with submission and calculated payout
    const updatedSlot = await prisma.campaignSlot.update({
      where: { id: slotId },
      data: {
        status: 'SUBMITTED',
        submittedAt,
        proofUrl,
        proofHash,
        basePayout: payoutResult.basePayout,
        precisionBonus: payoutResult.precisionBonus,
        totalPayout: payoutResult.totalPayout,
        discoveryRake: rakeBreakdown.discoveryRake,
        activeRake: rakeBreakdown.activeRake,
      },
    });

    // Update scout creator activity
    if (scoutCreator) {
      await prisma.scoutCreator.update({
        where: { id: scoutCreator.id },
        data: {
          lastActiveAt: submittedAt,
          totalCompletions: { increment: 1 },
        },
      });
    }

    console.log(
      `[SLOTS] Submission: ${slot.creatorHandle} for "${campaign.title}" - ` +
        `${payoutResult.status} ($${payoutResult.totalPayout.toFixed(2)})`
    );

    return NextResponse.json({
      success: true,
      data: {
        slot: updatedSlot,
        payout: {
          ...payoutResult,
          statusMessage: getSyncStatusMessage(payoutResult),
        },
        rake: rakeBreakdown,
        message:
          payoutResult.status === 'STRIKE_BONUS'
            ? `🎯 Strike Bonus! You earned $${payoutResult.totalPayout.toFixed(2)} (${campaign.precisionMultiplier}x multiplier)`
            : `Submitted! Base payout: $${payoutResult.basePayout.toFixed(2)}`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SLOTS] Submission failed:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
