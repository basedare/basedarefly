import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// ============================================================================
// SLOT VERIFICATION API
// AI Referee verification for B2B campaign submissions
// Cascade: Metadata → Vision → Audio → Composite Score
// ============================================================================

const VerifySlotSchema = z.object({
  slotId: z.string(),
  // Verification scores (from AI service)
  visualScore: z.number().min(0).max(100).optional(),
  audioScore: z.number().min(0).max(100).optional(),
  metadataPass: z.boolean(),
});

// Thresholds
const AUTO_PAY_THRESHOLD = 85;
const TRIBUNAL_THRESHOLD = 60;

// ============================================================================
// POST /api/campaigns/[id]/slots/verify - Verify a submitted slot
// ============================================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const body = await request.json();
    const validation = VerifySlotSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { slotId, visualScore, audioScore, metadataPass } = validation.data;

    // Get the campaign and slot
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
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
        status: 'SUBMITTED',
      },
      include: {
        scout: true,
      },
    });

    if (!slot) {
      return NextResponse.json(
        { success: false, error: 'Slot not found or not in SUBMITTED status' },
        { status: 404 }
      );
    }

    // Calculate composite confidence score
    // Cascade weighting: metadata (pass/fail gate) + visual (60%) + audio (40%)
    let totalConfidence = 0;

    if (!metadataPass) {
      // Metadata failed = automatic fail
      totalConfidence = 0;
    } else {
      // Weight visual and audio scores
      const visual = visualScore ?? 0;
      const audio = audioScore ?? 0;

      // If both scores provided, weighted average
      // If only visual, use it at 100%
      // If only audio, use it at 100%
      if (visualScore !== undefined && audioScore !== undefined) {
        totalConfidence = visual * 0.6 + audio * 0.4;
      } else if (visualScore !== undefined) {
        totalConfidence = visual;
      } else if (audioScore !== undefined) {
        totalConfidence = audio;
      } else {
        // Only metadata pass, give baseline
        totalConfidence = 70;
      }
    }

    // Determine verification result
    let newStatus: string;
    let message: string;

    if (totalConfidence >= AUTO_PAY_THRESHOLD) {
      // Auto-pay: verified
      newStatus = 'VERIFIED';
      message = `Auto-verified with ${totalConfidence.toFixed(1)}% confidence`;
    } else if (totalConfidence >= TRIBUNAL_THRESHOLD) {
      // Tribunal review needed
      newStatus = 'SUBMITTED'; // Keep as submitted, flag for review
      message = `Flagged for tribunal review (${totalConfidence.toFixed(1)}% confidence)`;
    } else {
      // Rejected
      newStatus = 'FORFEITED';
      message = `Verification failed (${totalConfidence.toFixed(1)}% confidence)`;
    }

    // Update slot with verification scores
    const updatedSlot = await prisma.campaignSlot.update({
      where: { id: slotId },
      data: {
        visualScore,
        audioScore,
        metadataPass,
        totalConfidence,
        status: newStatus,
      },
    });

    // If verified, update scout stats
    if (newStatus === 'VERIFIED' && slot.scoutId) {
      await prisma.scout.update({
        where: { id: slot.scoutId },
        data: {
          successfulSlots: { increment: 1 },
          totalCampaigns: { increment: 1 },
        },
      });

      // Update scout rake earnings
      const scoutCreator = await prisma.scoutCreator.findUnique({
        where: { creatorAddress: slot.creatorAddress! },
      });

      if (scoutCreator) {
        // Update discovery scout earnings
        await prisma.scout.update({
          where: { id: scoutCreator.discoveryScoutId },
          data: {
            totalDiscoveryRake: { increment: slot.discoveryRake || 0 },
          },
        });

        // Update active scout earnings (if different)
        if (scoutCreator.activeScoutId && scoutCreator.activeScoutId !== scoutCreator.discoveryScoutId) {
          await prisma.scout.update({
            where: { id: scoutCreator.activeScoutId },
            data: {
              totalActiveRake: { increment: slot.activeRake || 0 },
            },
          });
        } else if (scoutCreator.activeScoutId) {
          // Same scout is both discovery and active
          await prisma.scout.update({
            where: { id: scoutCreator.activeScoutId },
            data: {
              totalActiveRake: { increment: slot.activeRake || 0 },
            },
          });
        }
      }
    } else if (newStatus === 'FORFEITED' && slot.scoutId) {
      // Update failed slots count
      await prisma.scout.update({
        where: { id: slot.scoutId },
        data: {
          failedSlots: { increment: 1 },
        },
      });
    }

    console.log(
      `[VERIFY] Slot ${slotId}: ${newStatus} (${totalConfidence.toFixed(1)}% confidence)`
    );

    return NextResponse.json({
      success: true,
      data: {
        slot: updatedSlot,
        verification: {
          visualScore,
          audioScore,
          metadataPass,
          totalConfidence,
          threshold: AUTO_PAY_THRESHOLD,
          tribunalThreshold: TRIBUNAL_THRESHOLD,
          result: newStatus,
          message,
        },
        payout:
          newStatus === 'VERIFIED'
            ? {
                creator: slot.totalPayout,
                discoveryRake: slot.discoveryRake,
                activeRake: slot.activeRake,
                status: 'PENDING_SETTLEMENT',
              }
            : null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VERIFY] Slot verification failed:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
