import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getWalletClient, PROTOCOL_CONTRACT_ADDRESS, PROTOCOL_ABI, publicClient } from '@/lib/contracts';
import { parseUnits, isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { verifyInternalApiKey } from '@/lib/api-auth';
import { extractDareIdFromReceipt } from '@/lib/contracts/utils';
import type { Address } from 'viem';
import { notifyTargetedDareReceived } from '@/lib/dare-notifications';
import { getPostFundingDareStatus } from '@/lib/dare-status';

const PLATFORM_WALLET_ADDRESS = process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS as Address;

const CreateOnChainSchema = z.object({
  streamerAddress: z
    .string()
    .refine((addr) => isAddress(addr), 'Invalid streamer address'),
  amount: z.number().min(5, 'Minimum amount is $5').max(10000, 'Maximum $10,000'),
  referrerAddress: z
    .string()
    .refine((addr) => isAddress(addr), 'Invalid referrer address')
    .optional(),
  title: z.string().min(3).max(100).optional(),
});

export async function POST(request: NextRequest) {
  // Authentication — internal API key required
  const authError = verifyInternalApiKey(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const validation = CreateOnChainSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { streamerAddress, amount, referrerAddress, title } = validation.data;

    // Substitute platform wallet for missing/zero-address referrer
    const safeReferrer: Address = (referrerAddress && referrerAddress !== '0x0000000000000000000000000000000000000000')
      ? referrerAddress as Address
      : PLATFORM_WALLET_ADDRESS;

    const walletClient = getWalletClient();
    const amountInUnits = parseUnits(amount.toString(), 6);

    // Create DB record first so we can reconcile the actual contract event back to DB.
    const dbDare = await prisma.dare.create({
      data: {
        title: title || 'On-chain dare',
        bounty: amount,
        status: 'FUNDING',
        isSimulated: false,
      },
    });

    const hash = await walletClient.writeContract({
      address: PROTOCOL_CONTRACT_ADDRESS,
      abi: PROTOCOL_ABI,
      functionName: 'createDare',
      args: [
        streamerAddress as Address,
        amountInUnits,
        safeReferrer,
      ],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const actualOnChainDareId = receipt.status === 'success' ? extractDareIdFromReceipt(receipt) : null;

    if (receipt.status === 'success' && actualOnChainDareId === null) {
      await prisma.dare.update({
        where: { id: dbDare.id },
        data: {
          status: 'FUNDING',
          txHash: hash,
          onChainDareId: null,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'On-chain dare created but DareCreated event could not be decoded for reconciliation',
        },
        { status: 502 }
      );
    }

    // Update DB with tx result
    await prisma.dare.update({
      where: { id: dbDare.id },
      data: {
        status: receipt.status === 'success'
          ? getPostFundingDareStatus({
              isAwaitingClaim: false,
              targetWalletAddress: streamerAddress,
            })
          : 'FAILED',
        txHash: hash,
        onChainDareId: actualOnChainDareId?.toString() ?? null,
      },
    });

    if (receipt.status === 'success' && streamerAddress) {
      await notifyTargetedDareReceived({
        walletAddress: streamerAddress,
        title: title || 'On-chain dare',
        shortId: dbDare.shortId || dbDare.id,
        bounty: amount,
      });
    }

    console.log(`[AUDIT] On-chain dare created - dbId: ${dbDare.id}, txHash: ${hash}`);

    return NextResponse.json({
      success: true,
      data: {
        transactionHash: hash,
        dareId: dbDare.id,
        onChainDareId: actualOnChainDareId?.toString() ?? null,
        blockNumber: receipt.blockNumber.toString(),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ERROR] On-chain dare creation failed:', errorMessage);
    return NextResponse.json(
      { success: false, error: 'Failed to create on-chain dare' },
      { status: 500 }
    );
  }
}
