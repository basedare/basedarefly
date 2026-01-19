import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPublicClient, http, parseUnits, isAddress } from 'viem';
import { baseSepolia } from 'viem/chains';
import { prisma } from '@/lib/prisma';
import { BOUNTY_ABI } from '@/abis/BaseDareBounty';

// Validation schema
const StealBountySchema = z.object({
  bountyId: z.string().min(1, 'Bounty ID required'),
  newAmount: z.number().min(1, 'New amount must be positive'),
  thiefAddress: z.string().refine((val) => isAddress(val), 'Invalid thief address'),
});

const BOUNTY_CONTRACT = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS as `0x${string}`;
const FORCE_SIMULATION = process.env.SIMULATE_BOUNTIES === 'true';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = StealBountySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { bountyId, newAmount, thiefAddress } = parsed.data;

    // Fetch the existing bounty from database
    const existingBounty = await prisma.dare.findUnique({
      where: { id: bountyId },
    });

    if (!existingBounty) {
      return NextResponse.json(
        { success: false, error: 'Bounty not found' },
        { status: 404 }
      );
    }

    // Check bounty is still active (PENDING status)
    if (existingBounty.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Bounty is no longer active' },
        { status: 400 }
      );
    }

    // Check new amount exceeds current
    if (newAmount <= existingBounty.bounty) {
      return NextResponse.json(
        { success: false, error: `New amount must exceed current bounty of $${existingBounty.bounty}` },
        { status: 400 }
      );
    }

    // Check contract deployment
    let isContractDeployed = false;
    if (BOUNTY_CONTRACT && !FORCE_SIMULATION) {
      try {
        const code = await publicClient.getCode({ address: BOUNTY_CONTRACT });
        isContractDeployed = code !== undefined && code !== '0x';
      } catch {
        isContractDeployed = false;
      }
    }

    // Calculate fees for response
    const oldAmount = existingBounty.bounty;
    const houseFee = Math.floor(oldAmount * 0.05); // 5% fee
    const refundAmount = oldAmount - houseFee;

    if (!isContractDeployed || FORCE_SIMULATION) {
      // SIMULATION MODE - Update database only
      const updatedBounty = await prisma.dare.update({
        where: { id: bountyId },
        data: {
          bounty: newAmount,
          isSimulated: true,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Contract not deployed - simulated steal for frontend testing',
        data: {
          dareId: bountyId,
          oldAmount,
          newAmount,
          houseFee,
          refundAmount,
          thief: thiefAddress,
          previousStaker: existingBounty.creatorId || 'unknown',
          txHash: null,
        },
      });
    }

    // PRODUCTION MODE - Return transaction data for client-side execution
    // The actual contract call happens on the frontend with user's wallet
    const amountInUSDC = parseUnits(newAmount.toString(), 6);

    return NextResponse.json({
      success: true,
      simulated: false,
      message: 'Ready for steal - execute transaction on client',
      data: {
        dareId: bountyId,
        oldAmount,
        newAmount,
        houseFee,
        refundAmount,
        amountInUSDC: amountInUSDC.toString(),
        contractAddress: BOUNTY_CONTRACT,
        functionName: 'stealBounty',
        args: [BigInt(bountyId.replace(/\D/g, '') || '0').toString(), amountInUSDC.toString()],
      },
    });
  } catch (error: unknown) {
    console.error('[STEAL API] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
