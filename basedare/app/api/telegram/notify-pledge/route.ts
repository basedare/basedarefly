import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { alertBigPledge } from '@/lib/telegram';

// Minimum pledge amount to trigger alert (in USDC)
const BIG_PLEDGE_THRESHOLD = 50;

const NotifyPledgeSchema = z.object({
  dareId: z.string().min(1, 'Dare ID is required'),
  amount: z.number().positive('Amount must be positive'),
  pledgerAddress: z.string().refine(isAddress, 'Invalid address'),
  txHash: z.string().optional(),
});

/**
 * POST /api/telegram/notify-pledge
 * Called by frontend after successful funding to notify admins
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = NotifyPledgeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { dareId, amount, pledgerAddress, txHash } = validation.data;

    // Only alert for big pledges
    if (amount < BIG_PLEDGE_THRESHOLD) {
      return NextResponse.json({
        success: true,
        alerted: false,
        reason: `Pledge under $${BIG_PLEDGE_THRESHOLD} threshold`,
      });
    }

    // Fetch dare details
    const dare = await prisma.dare.findUnique({
      where: { id: dareId },
      select: { id: true, shortId: true, title: true, bounty: true },
    });

    if (!dare) {
      return NextResponse.json(
        { success: false, error: 'Dare not found' },
        { status: 404 }
      );
    }

    // Calculate new total pot (existing + new pledge)
    const totalPot = dare.bounty + amount;

    // Update dare bounty in database
    await prisma.dare.update({
      where: { id: dareId },
      data: { bounty: totalPot },
    });

    // Send Telegram alert
    await alertBigPledge({
      dareId: dare.id,
      shortId: dare.shortId || dare.id,
      title: dare.title,
      pledgeAmount: amount,
      totalPot,
      pledgerAddress,
      txHash,
    });

    console.log(`[AUDIT] Big pledge alert sent - dare: ${dareId}, amount: $${amount}, total: $${totalPot}`);

    return NextResponse.json({
      success: true,
      alerted: true,
      totalPot,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ERROR] Notify pledge failed:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
