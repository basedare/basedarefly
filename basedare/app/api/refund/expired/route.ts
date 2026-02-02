import { NextRequest, NextResponse } from 'next/server';
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { BOUNTY_ABI } from '@/abis/BaseDareBounty';
import { prisma } from '@/lib/prisma';
import { verifyCronSecret } from '@/lib/api-auth';

// Network selection based on environment
const IS_MAINNET = process.env.NEXT_PUBLIC_NETWORK === 'mainnet';
const activeChain = IS_MAINNET ? base : baseSepolia;
const rpcUrl = IS_MAINNET ? 'https://mainnet.base.org' : 'https://sepolia.base.org';

const BOUNTY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS as Address;
const isContractDeployed = isAddress(BOUNTY_CONTRACT_ADDRESS);
const FORCE_SIMULATION = process.env.SIMULATE_BOUNTIES === 'true';

// Cron secret handled by verifyCronSecret (fail-closed)

// ============================================================================
// SERVER-SIDE VIEM CLIENTS
// ============================================================================

function getServerClients() {
  const privateKey = process.env.REFEREE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('REFEREE_PRIVATE_KEY not configured');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const publicClient = createPublicClient({
    chain: activeChain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: activeChain,
    transport: http(rpcUrl),
  });

  return { publicClient, walletClient, account };
}

// ============================================================================
// POST /api/refund/expired - Process expired AWAITING_CLAIM dares
// Designed to be called by Vercel Cron or manually by admin
// ============================================================================

export async function POST(request: NextRequest) {
  // Fail-closed cron authentication
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {

    // Find all AWAITING_CLAIM dares that have passed their claimDeadline
    const expiredDares = await prisma.dare.findMany({
      where: {
        status: 'AWAITING_CLAIM',
        claimDeadline: {
          lt: new Date(), // Past deadline
        },
      },
      take: 50, // Process in batches
    });

    if (expiredDares.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired dares to refund',
        processed: 0,
      });
    }

    console.log(`[REFUND] Processing ${expiredDares.length} expired dares`);

    const results: Array<{
      dareId: string;
      status: 'refunded' | 'failed' | 'simulated';
      txHash?: string;
      error?: string;
    }> = [];

    // Process each expired dare
    for (const dare of expiredDares) {
      try {
        // Simulation mode - just update status
        if (!isContractDeployed || FORCE_SIMULATION || dare.isSimulated) {
          await prisma.dare.update({
            where: { id: dare.id },
            data: {
              status: 'REFUNDED',
            },
          });

          results.push({
            dareId: dare.id,
            status: 'simulated',
          });

          console.log(`[REFUND] Simulated refund for dare ${dare.id}`);
          continue;
        }

        // Real contract mode - call refundBacker on contract
        const { publicClient, walletClient } = getServerClients();

        if (!dare.onChainDareId) {
          console.warn(`[REFUND] No onChainDareId for dare ${dare.id} — skipping on-chain refund`);
          await prisma.dare.update({
            where: { id: dare.id },
            data: { status: 'REFUNDED' },
          });
          results.push({ dareId: dare.id, status: 'simulated' });
          continue;
        }
        const bountyId = BigInt(dare.onChainDareId);

        const txHash = await walletClient.writeContract({
          address: BOUNTY_CONTRACT_ADDRESS,
          abi: BOUNTY_ABI,
          functionName: 'refundBacker',
          args: [bountyId],
        });

        // Wait for confirmation
        await publicClient.waitForTransactionReceipt({ hash: txHash });

        // Update database
        await prisma.dare.update({
          where: { id: dare.id },
          data: {
            status: 'REFUNDED',
          },
        });

        results.push({
          dareId: dare.id,
          status: 'refunded',
          txHash,
        });

        console.log(`[REFUND] Refunded dare ${dare.id}, txHash: ${txHash}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[REFUND] Failed to refund dare ${dare.id}:`, message);

        results.push({
          dareId: dare.id,
          status: 'failed',
          error: message,
        });
      }
    }

    // Summary
    const refunded = results.filter((r) => r.status === 'refunded' || r.status === 'simulated').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    console.log(`[REFUND] Complete - Refunded: ${refunded}, Failed: ${failed}`);

    return NextResponse.json({
      success: true,
      message: `Processed ${expiredDares.length} expired dares`,
      processed: expiredDares.length,
      refunded,
      failed,
      results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[REFUND] Error processing expired dares:', message);
    return NextResponse.json({ success: false, error: 'Failed to process expired dares' }, { status: 500 });
  }
}

// ============================================================================
// GET /api/refund/expired - Check for expired dares (read-only)
// ============================================================================

export async function GET() {
  try {
    const expiredCount = await prisma.dare.count({
      where: {
        status: 'AWAITING_CLAIM',
        claimDeadline: {
          lt: new Date(),
        },
      },
    });

    const upcomingExpiries = await prisma.dare.findMany({
      where: {
        status: 'AWAITING_CLAIM',
        claimDeadline: {
          gte: new Date(),
          lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
        },
      },
      select: {
        id: true,
        shortId: true,
        title: true,
        bounty: true,
        streamerHandle: true,
        claimDeadline: true,
      },
      orderBy: { claimDeadline: 'asc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: {
        expiredCount,
        upcomingExpiries: upcomingExpiries.map((d) => ({
          id: d.id,
          shortId: d.shortId,
          title: d.title,
          bounty: d.bounty,
          streamerHandle: d.streamerHandle,
          claimDeadline: d.claimDeadline?.toISOString(),
        })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: 'Failed to fetch expired dares' }, { status: 500 });
  }
}
