import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, formatEther, http, isAddress, parseEther, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { prisma } from '@/lib/prisma';
import { BOUNTY_ABI } from '@/abis/BaseDareBounty';
import { verifyCronSecret } from '@/lib/api-auth';
import { alertError, alertPayout } from '@/lib/telegram';

// Network config
const IS_MAINNET = process.env.NEXT_PUBLIC_NETWORK === 'mainnet';
const activeChain = IS_MAINNET ? base : baseSepolia;
const rpcUrl = IS_MAINNET ? 'https://mainnet.base.org' : 'https://sepolia.base.org';

const BOUNTY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS as Address;

// Fee distribution (matching contract)
const STREAMER_FEE_PERCENT = 89;
const HOUSE_FEE_PERCENT = 10;
const REFERRER_FEE_PERCENT = 1;

// Safety limits
const MAX_RETRIES_PER_RUN = 5;
const MAX_DARE_AGE_HOURS = 72;
const REFEREE_MAX_BALANCE_ETH = '0.05';
const REFEREE_MAX_BALANCE_WEI = parseEther(REFEREE_MAX_BALANCE_ETH);
const REFEREE_ALERT_COOLDOWN_MS = 5 * 60 * 1000;

let warnedLegacyRefereeKey = false;
let lastRefereeBalanceAlertAt = 0;

function getRefereeClient() {
  const privateKey = process.env.REFEREE_HOT_WALLET_PRIVATE_KEY || process.env.REFEREE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('REFEREE_HOT_WALLET_PRIVATE_KEY not configured');
  }

  if (!process.env.REFEREE_HOT_WALLET_PRIVATE_KEY && !warnedLegacyRefereeKey) {
    console.warn(
      '[SECURITY] REFEREE_HOT_WALLET_PRIVATE_KEY not set; falling back to REFEREE_PRIVATE_KEY. Configure a dedicated low-balance hot wallet.'
    );
    warnedLegacyRefereeKey = true;
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const platformWallet = process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS?.toLowerCase();
  if (platformWallet && account.address.toLowerCase() === platformWallet) {
    throw new Error('Referee wallet must be dedicated and different from platform wallet');
  }

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
  publicClient: ReturnType<typeof createPublicClient>,
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

export async function POST(req: NextRequest) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  try {
    if (!isAddress(BOUNTY_CONTRACT_ADDRESS)) {
      return NextResponse.json(
        { success: false, error: 'Bounty contract not configured' },
        { status: 503 }
      );
    }

    const cutoff = new Date(Date.now() - MAX_DARE_AGE_HOURS * 60 * 60 * 1000);

    const stuckDares = await prisma.dare.findMany({
      where: {
        status: 'PENDING_PAYOUT',
        updatedAt: { gte: cutoff },
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

    const results: Array<{
      dareId: string;
      status: 'paid' | 'failed' | 'skipped';
      txHash?: string;
      error?: string;
    }> = [];

    const { publicClient, walletClient, account } = getRefereeClient();
    const balanceCheck = await enforceRefereeBalanceCap(
      publicClient,
      account.address,
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

    for (const dare of stuckDares) {
      if (!dare.onChainDareId) {
        console.error(`[CRON] Dare ${dare.id} missing onChainDareId — skipping`);
        results.push({ dareId: dare.id, status: 'skipped', error: 'Missing onChainDareId' });
        continue;
      }

      if (dare.isSimulated) {
        // Simulated dares don't need on-chain payout — just mark verified
        await prisma.dare.update({
          where: { id: dare.id },
          data: {
            status: 'VERIFIED',
            verifiedAt: new Date(),
          },
        });
        results.push({ dareId: dare.id, status: 'paid' });
        console.log(`[CRON] Simulated dare ${dare.id} marked VERIFIED`);
        continue;
      }

      try {
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
          console.log(`[CRON] Dare ${dare.id} — bounty not found on-chain (already paid or never funded)`);
          await prisma.dare.update({
            where: { id: dare.id },
            data: { status: 'FAILED', appealStatus: 'NONE', appealReason: 'Bounty not found on-chain during retry' },
          });
          results.push({ dareId: dare.id, status: 'failed', error: 'Bounty not found on-chain' });
          continue;
        }

        if (isVerified) {
          console.log(`[CRON] Dare ${dare.id} — already verified on-chain, syncing DB`);
          await prisma.dare.update({
            where: { id: dare.id },
            data: { status: 'VERIFIED', verifiedAt: new Date() },
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

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // Calculate fee splits for DB record
        const totalBounty = dare.bounty;
        const streamerPayout = (totalBounty * STREAMER_FEE_PERCENT) / 100;
        const houseFee = (totalBounty * HOUSE_FEE_PERCENT) / 100;
        const referrerFee = dare.referrerTag ? (totalBounty * REFERRER_FEE_PERCENT) / 100 : 0;

        await prisma.dare.update({
          where: { id: dare.id },
          data: {
            status: 'VERIFIED',
            verifiedAt: new Date(),
            verifyTxHash: hash,
            appealStatus: null,
            referrerPayout: referrerFee > 0 ? referrerFee : null,
          },
        });

        console.log(`[CRON] Dare ${dare.id} PAID — tx: ${hash}, block: ${receipt.blockNumber}`);
        results.push({ dareId: dare.id, status: 'paid', txHash: hash });

        // Telegram alert (fire and forget)
        alertPayout({
          dareId: dare.id,
          shortId: dare.shortId || dare.id,
          title: dare.title,
          streamerTag: dare.streamerHandle || 'unknown',
          creatorPayout: streamerPayout,
          platformFee: houseFee,
          referrerPayout: referrerFee > 0 ? referrerFee : undefined,
          txHash: hash,
        }).catch(err => console.error('[CRON] Telegram alert failed:', err));
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
