import { NextRequest, NextResponse } from 'next/server';
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  type Address,
} from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { BOUNTY_ABI } from '@/abis/BaseDareBounty';
import { findBountySettlementEvent, waitForSuccessfulReceipt } from '@/lib/bounty-chain';
import { prisma } from '@/lib/prisma';
import { verifyCronSecret } from '@/lib/api-auth';
import { isBountySimulationMode } from '@/lib/bounty-mode';
import { syncLinkedCampaignForDareState } from '@/lib/dare-approval';
import { getRefereeAccount } from '@/lib/referee-wallet';
import { alertError } from '@/lib/telegram';

// Network selection based on environment
const IS_MAINNET = process.env.NEXT_PUBLIC_NETWORK === 'mainnet';
const activeChain = IS_MAINNET ? base : baseSepolia;
const rpcUrl = IS_MAINNET ? 'https://mainnet.base.org' : 'https://sepolia.base.org';

const BOUNTY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS as Address;
const isContractDeployed = isAddress(BOUNTY_CONTRACT_ADDRESS);
const FORCE_SIMULATION = isBountySimulationMode();

// Cron secret handled by verifyCronSecret (fail-closed)

// ============================================================================
// SERVER-SIDE VIEM CLIENTS
// ============================================================================

function getServerClients() {
  const account = getRefereeAccount(process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS);

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
          await syncLinkedCampaignForDareState({
            dareId: dare.id,
            status: 'REFUNDED',
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
          await syncLinkedCampaignForDareState({
            dareId: dare.id,
            status: 'REFUNDED',
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

        // Wait for confirmation and fail closed on reverted receipts
        await waitForSuccessfulReceipt({
          publicClient,
          hash: txHash,
          context: `refundBacker:${dare.id}`,
        });

        // Update database
        await prisma.dare.update({
          where: { id: dare.id },
          data: {
            status: 'REFUNDED',
          },
        });
        await syncLinkedCampaignForDareState({
          dareId: dare.id,
          status: 'REFUNDED',
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

        if (dare.onChainDareId && isContractDeployed && !FORCE_SIMULATION && !dare.isSimulated) {
          try {
            const { publicClient } = getServerClients();
            const settlement = await findBountySettlementEvent({
              publicClient,
              contractAddress: BOUNTY_CONTRACT_ADDRESS,
              dareId: BigInt(dare.onChainDareId),
              fundingTxHash: dare.txHash,
            });

            if (settlement.type === 'REFUND') {
              await prisma.dare.update({
                where: { id: dare.id },
                data: { status: 'REFUNDED' },
              });
              await syncLinkedCampaignForDareState({
                dareId: dare.id,
                status: 'REFUNDED',
              });

              results.push({
                dareId: dare.id,
                status: 'refunded',
                txHash: settlement.txHash,
              });
              console.log(`[REFUND] Reconciled refunded dare ${dare.id} from on-chain event ${settlement.txHash}`);
              continue;
            }
          } catch (reconciliationError: unknown) {
            const reconcileMessage =
              reconciliationError instanceof Error ? reconciliationError.message : 'Unknown reconciliation error';
            console.error(`[REFUND] Settlement reconciliation failed for dare ${dare.id}:`, reconcileMessage);
          }
        }

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

    if (failed > 0) {
      const failedSummary = results
        .filter((result) => result.status === 'failed')
        .slice(0, 3)
        .map((result) => `${result.dareId}: ${result.error ?? 'Unknown error'}`)
        .join(' | ');

      await alertError({
        type: 'REFUND_FAILED',
        error: `${failed} expired refund item(s) failed`,
        context: `refund-expired cron completed with failures${failedSummary ? ` — ${failedSummary}` : ''}`,
      });
    }

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
    await alertError({
      type: 'REFUND_FAILED',
      error: message,
      context: 'refund-expired cron fatal error',
    });
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
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch expired dares' }, { status: 500 });
  }
}
