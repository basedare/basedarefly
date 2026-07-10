import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, formatEther, http, isAddress, parseEther, type Address } from 'viem';
import { prisma } from '@/lib/prisma';
import { BOUNTY_ABI } from '@/abis/BaseDareBounty';
import { verifyCronSecret } from '@/lib/api-auth';
import { getBaseChain, getBaseRpcUrl } from '@/lib/base-chain';
import { findBountySettlementEvent, waitForSuccessfulReceipt } from '@/lib/bounty-chain';
import { alertError } from '@/lib/telegram';
import { finalizeVerifiedDare, syncLinkedCampaignForDareState } from '@/lib/dare-approval';
import { getRefereeAccount } from '@/lib/referee-wallet';
import { isBountySimulationMode } from '@/lib/bounty-mode';

// Network config
const activeChain = getBaseChain();
const rpcUrl = getBaseRpcUrl();

const BOUNTY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS as Address;
const FORCE_SIMULATION = isBountySimulationMode();

// Safety limits
const MAX_RETRIES_PER_RUN = 5;
// Grace window: verify-proof holds PENDING_PAYOUT as a short-lived settlement lock
// while its on-chain payout is in flight. The cron must NOT grab a row that was
// just locked (it would race the in-flight request and double-broadcast at the
// same referee nonce), so it only retries rows untouched for at least this long.
// A crashed in-flight settlement is still recovered — its updatedAt ages past the
// window and the next run picks it up.
const SETTLEMENT_LOCK_GRACE_MS = 3 * 60 * 1000; // 3 minutes
// How long a per-row payout lease is honored before another worker may steal it
// (covers a worker that crashed mid-payout without releasing its lease).
const PAYOUT_LEASE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const REFEREE_MAX_BALANCE_ETH = '0.05';
const REFEREE_MAX_BALANCE_WEI = parseEther(REFEREE_MAX_BALANCE_ETH);
const REFEREE_ALERT_COOLDOWN_MS = 5 * 60 * 1000;

let lastRefereeBalanceAlertAt = 0;

type RefereeBalanceClient = {
  getBalance: (args: { address: Address }) => Promise<bigint>;
};

function getRefereeClient() {
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

async function enforceRefereeBalanceCap(
  publicClient: RefereeBalanceClient,
  refereeAddress: Address,
  context: string
): Promise<{ allowed: boolean; balanceEth: string }> {
  const balanceWei = await publicClient.getBalance({ address: refereeAddress });
  const balanceEth = formatEther(balanceWei);

  if (balanceWei <= REFEREE_MAX_BALANCE_WEI) {
    return { allowed: true, balanceEth };
  }

  console.warn(
    `[SECURITY] Referee hot wallet balance cap exceeded: ${balanceEth} ETH > ${REFEREE_MAX_BALANCE_ETH} ETH`
  );

  const now = Date.now();
  if (now - lastRefereeBalanceAlertAt > REFEREE_ALERT_COOLDOWN_MS) {
    lastRefereeBalanceAlertAt = now;
    alertError({
      type: 'CONTRACT_ERROR',
      error: `Referee hot wallet balance ${balanceEth} ETH exceeds ${REFEREE_MAX_BALANCE_ETH} ETH cap`,
      context: `${context} paused. Wallet: ${refereeAddress}`,
    }).catch((err) => console.error('[TELEGRAM] Referee balance alert failed:', err));
  }

  return { allowed: false, balanceEth };
}

// ============================================================================
// POST /api/cron/retry-payouts
//
// Finds dares stuck in PENDING_PAYOUT and retries the on-chain verifyAndPayout.
// Protected by CRON_SECRET. Safe to call repeatedly — each dare is processed
// independently and failures don't block other retries.
//
// Deploy as: Vercel Cron, Railway Cron, or external scheduler hitting this endpoint.
// Recommended schedule: every 5-10 minutes.
// ============================================================================

async function handleRetryPayouts(req: NextRequest) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  try {
    const stuckDares = await prisma.dare.findMany({
      where: {
        status: 'PENDING_PAYOUT',
        // Skip freshly-locked rows so we never race an in-flight verify-proof
        // settlement holding the PENDING_PAYOUT lock.
        updatedAt: { lt: new Date(Date.now() - SETTLEMENT_LOCK_GRACE_MS) },
      },
      orderBy: { updatedAt: 'asc' },
      take: MAX_RETRIES_PER_RUN,
    });

    if (stuckDares.length === 0) {
      return NextResponse.json({
        success: true,
        data: { processed: 0, message: 'No pending payouts to retry' },
      });
    }

    console.log(`[CRON] Found ${stuckDares.length} dares in PENDING_PAYOUT`);

    const liveDares = stuckDares.filter((dare) => !FORCE_SIMULATION && !dare.isSimulated);
    const needsChain = liveDares.length > 0;

    if (needsChain && !isAddress(BOUNTY_CONTRACT_ADDRESS)) {
      await alertError({
        type: 'CONTRACT_ERROR',
        error: 'Bounty contract not configured',
        context: `retry-payouts cron found ${liveDares.length} live payout item(s) but NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS is invalid`,
      });

      return NextResponse.json(
        { success: false, error: 'Bounty contract not configured' },
        { status: 503 }
      );
    }

    const results: Array<{
      dareId: string;
      status: 'paid' | 'failed' | 'skipped' | 'refunded';
      txHash?: string;
      error?: string;
    }> = [];

    const chainClients = needsChain ? getRefereeClient() : null;

    if (chainClients) {
      const balanceCheck = await enforceRefereeBalanceCap(
        chainClients.publicClient,
        chainClients.account.address,
        'retry-payouts cron'
      );

      if (!balanceCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Payouts paused: referee hot wallet balance (${balanceCheck.balanceEth} ETH) exceeds ${REFEREE_MAX_BALANCE_ETH} ETH cap`,
            code: 'REFEREE_BALANCE_CAP_EXCEEDED',
            data: {
              paused: true,
              processed: 0,
              balanceEth: balanceCheck.balanceEth,
              capEth: REFEREE_MAX_BALANCE_ETH,
            },
          },
          { status: 503 }
        );
      }
    }

    for (const dare of stuckDares) {
      // Atomic per-row lease: only the worker that flips payoutLeaseAt from
      // null/expired to now proceeds. A second concurrent cron invocation that
      // selected the same stale row gets count 0 here and skips it, so the same
      // dare is never double-processed / double-broadcast. The lease self-expires
      // after PAYOUT_LEASE_TTL_MS so a crashed worker's row is recoverable.
      const lease = await prisma.dare.updateMany({
        where: {
          id: dare.id,
          status: 'PENDING_PAYOUT',
          OR: [
            { payoutLeaseAt: null },
            { payoutLeaseAt: { lt: new Date(Date.now() - PAYOUT_LEASE_TTL_MS) } },
          ],
        },
        data: { payoutLeaseAt: new Date() },
      });
      if (lease.count === 0) {
        console.log(`[CRON] Dare ${dare.id} — lease held by another worker, skipping`);
        results.push({ dareId: dare.id, status: 'skipped' });
        continue;
      }

      if (FORCE_SIMULATION || dare.isSimulated) {
        // Simulated dares don't need on-chain payout — just mark verified
        await finalizeVerifiedDare({
          dareId: dare.id,
          sourceContext: 'CRON_RETRY_PAYOUT',
          verifiedAt: new Date(),
          verifyConfidence: dare.verifyConfidence,
          proofHash: dare.proofHash,
          proofMedia: dare.videoUrl,
        });
        results.push({ dareId: dare.id, status: 'paid' });
        console.log(`[CRON] Simulated dare ${dare.id} marked VERIFIED`);
        continue;
      }

      if (!dare.onChainDareId) {
        console.error(`[CRON] Live dare ${dare.id} missing onChainDareId — payout blocked`);
        results.push({ dareId: dare.id, status: 'failed', error: 'Live payout missing onChainDareId' });
        continue;
      }

      try {
        if (!chainClients) {
          throw new Error('Chain clients unavailable for live payout retry');
        }

        const { publicClient, walletClient } = chainClients;
        const onChainDareId = BigInt(dare.onChainDareId);

        // Check if bounty still exists on-chain before attempting payout
        const bountyData = await publicClient.readContract({
          address: BOUNTY_CONTRACT_ADDRESS,
          abi: BOUNTY_ABI,
          functionName: 'bounties',
          args: [onChainDareId],
        }) as [bigint, string, string, string, boolean];

        const [amount, , , , isVerified] = bountyData;

        if (amount === BigInt(0)) {
          const settlement = await findBountySettlementEvent({
            publicClient,
            contractAddress: BOUNTY_CONTRACT_ADDRESS,
            dareId: onChainDareId,
            fundingTxHash: dare.txHash,
          });

          if (settlement.type === 'PAYOUT') {
            console.log(`[CRON] Dare ${dare.id} — payout already happened on-chain, repairing DB state`);
            await finalizeVerifiedDare({
              dareId: dare.id,
              sourceContext: 'CRON_RETRY_PAYOUT_REPAIR',
              verifiedAt: new Date(),
              verifyTxHash: settlement.txHash,
              verifyConfidence: dare.verifyConfidence,
              proofHash: dare.proofHash,
              proofMedia: dare.videoUrl,
              appealStatus: null,
            });
            results.push({ dareId: dare.id, status: 'paid', txHash: settlement.txHash });
            continue;
          }

          if (settlement.type === 'REFUND') {
            console.log(`[CRON] Dare ${dare.id} — refund already happened on-chain, repairing DB state`);
            // CAS: only repair a row still in PENDING_PAYOUT. If a concurrent
            // finalize already moved it to VERIFIED, do NOT clobber it to REFUNDED.
            const refundCas = await prisma.dare.updateMany({
              where: { id: dare.id, status: 'PENDING_PAYOUT' },
              data: { status: 'REFUNDED', appealStatus: 'NONE', appealReason: null },
            });
            if (refundCas.count === 0) {
              console.log(`[CRON] Dare ${dare.id} — refund repair skipped (already settled elsewhere)`);
              results.push({ dareId: dare.id, status: 'skipped' });
              continue;
            }
            await syncLinkedCampaignForDareState({
              dareId: dare.id,
              status: 'REFUNDED',
            });
            results.push({ dareId: dare.id, status: 'refunded', txHash: settlement.txHash });
            continue;
          }

          // Bounty gone on-chain but neither a PAYOUT nor a REFUND log is visible
          // yet. This is INCONCLUSIVE (commonly RPC log-index lag right after a
          // payout that deleted the bounty). Marking FAILED here could overwrite a
          // dare that was actually paid and finalized to VERIFIED, so we leave it
          // PENDING_PAYOUT and let a later run reclassify it once the log indexes.
          console.warn(`[CRON] Dare ${dare.id} — bounty absent on-chain but no settlement log yet; leaving PENDING_PAYOUT for a later run (not failing).`);
          results.push({ dareId: dare.id, status: 'skipped', error: 'Inconclusive: bounty absent, settlement log not yet visible' });
          continue;
        }

        if (isVerified) {
          console.log(`[CRON] Dare ${dare.id} — already verified on-chain, syncing DB`);
          await finalizeVerifiedDare({
            dareId: dare.id,
            sourceContext: 'CRON_RETRY_PAYOUT',
            verifiedAt: new Date(),
            verifyConfidence: dare.verifyConfidence,
            proofHash: dare.proofHash,
            proofMedia: dare.videoUrl,
          });
          results.push({ dareId: dare.id, status: 'paid' });
          continue;
        }

        // Execute the payout
        const hash = await walletClient.writeContract({
          address: BOUNTY_CONTRACT_ADDRESS,
          abi: BOUNTY_ABI,
          functionName: 'verifyAndPayout',
          args: [onChainDareId],
        });

        const receipt = await waitForSuccessfulReceipt({
          publicClient,
          hash,
          context: `retry-payout:${dare.id}`,
        });

        await finalizeVerifiedDare({
          dareId: dare.id,
          sourceContext: 'CRON_RETRY_PAYOUT',
          verifiedAt: new Date(),
          verifyTxHash: hash,
          verifyConfidence: dare.verifyConfidence,
          proofHash: dare.proofHash,
          proofMedia: dare.videoUrl,
          appealStatus: null,
        });

        console.log(`[CRON] Dare ${dare.id} PAID — tx: ${hash}, block: ${receipt.blockNumber}`);
        results.push({ dareId: dare.id, status: 'paid', txHash: hash });

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[CRON] Retry failed for dare ${dare.id}: ${message}`);
        results.push({ dareId: dare.id, status: 'failed', error: message.slice(0, 200) });
      }
    }

    const paid = results.filter(r => r.status === 'paid').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    console.log(`[CRON] Retry complete — paid: ${paid}, failed: ${failed}, skipped: ${skipped}`);

    if (failed > 0) {
      const failedSummary = results
        .filter((result) => result.status === 'failed')
        .slice(0, 3)
        .map((result) => `${result.dareId}: ${result.error ?? 'Unknown error'}`)
        .join(' | ');

      await alertError({
        type: 'PAYOUT_FAILED',
        error: `${failed} retry payout item(s) failed`,
        context: `retry-payouts cron completed with failures${failedSummary ? ` — ${failedSummary}` : ''}`,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        paid,
        failed,
        skipped,
        results,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CRON] Retry payouts fatal error:', message);
    await alertError({
      type: 'CONTRACT_ERROR',
      error: message,
      context: 'retry-payouts cron fatal error',
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Retry payouts failed. Please try again shortly.',
        code: 'RETRY_PAYOUTS_ERROR',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleRetryPayouts(req);
}

export async function POST(req: NextRequest) {
  return handleRetryPayouts(req);
}
