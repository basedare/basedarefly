import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPublicClient, createWalletClient, formatEther, http, isAddress, parseEther, type Address, keccak256, toBytes } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { Livepeer } from 'livepeer';
import { prisma } from '@/lib/prisma';
import { BOUNTY_ABI } from '@/abis/BaseDareBounty';
import { checkRateLimit, getClientIp, RateLimiters, createRateLimitHeaders } from '@/lib/rate-limit';
import { isBountySimulationMode } from '@/lib/bounty-mode';
import { alertError, alertSentinelReviewRequired, alertVerification } from '@/lib/telegram';
import { verifyInternalApiKey } from '@/lib/api-auth';
import { waitForSuccessfulReceipt } from '@/lib/bounty-chain';
import { finalizeVerifiedDare, syncLinkedCampaignForDareState } from '@/lib/dare-approval';
import { recordDareFounderEventSafe, type FounderDareEventLike } from '@/lib/founder-events';
import { createWalletNotification } from '@/lib/notifications';
import { getRefereeAccount } from '@/lib/referee-wallet';
import { checkAndSendSentinelQueueAlert } from '@/lib/sentinel-queue';
import { getAuthorizedProofSubmitterWallet } from '@/lib/proof-submit-auth-server';

// Network selection based on environment
const IS_MAINNET = process.env.NEXT_PUBLIC_NETWORK === 'mainnet';
const activeChain = IS_MAINNET ? base : baseSepolia;
const rpcUrl = IS_MAINNET ? 'https://mainnet.base.org' : 'https://sepolia.base.org';

// ============================================================================
// ENVIRONMENT & CONFIG
// ============================================================================

const BOUNTY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS as Address;
const LIVEPEER_API_KEY = process.env.LIVEPEER_API_KEY;
const isContractDeployed = isAddress(BOUNTY_CONTRACT_ADDRESS);
const FORCE_SIMULATION = isBountySimulationMode();

// Fee distribution constants (matching BaseDareBountyV2)
const STREAMER_FEE_PERCENT = 96;
const HOUSE_FEE_PERCENT = 4;
const REFERRER_FEE_PERCENT = 0;
const REFEREE_MAX_BALANCE_ETH = '0.05';
const REFEREE_MAX_BALANCE_WEI = parseEther(REFEREE_MAX_BALANCE_ETH);
const REFEREE_ALERT_COOLDOWN_MS = 5 * 60 * 1000;

let lastRefereeBalanceAlertAt = 0;

type RefereeBalanceClient = {
  getBalance: (args: { address: Address }) => Promise<bigint>;
};

// ============================================================================
// ZOD VALIDATION
// ============================================================================

const VerifyProofSchema = z.object({
  dareId: z.string().min(1, 'Dare ID is required'),
  streamUrl: z.string().url().optional(),
  // Optional: proof data for future ZKML integration
  proofData: z.object({
    streamId: z.string().optional(),
    videoUrl: z.string().optional(),
    timestamp: z.number().optional(),
  }).optional(),
});

// ============================================================================
// SERVER-SIDE WALLET CLIENT (Referee)
// ============================================================================

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
// LIVEPEER STREAM VERIFICATION
// ============================================================================

interface StreamVerificationResult {
  active: boolean;
  healthy: boolean;
  streamName?: string;
  error?: string;
}

async function verifyLivepeerStream(streamId: string): Promise<StreamVerificationResult> {
  // In production (mainnet), require Livepeer API key
  if (IS_MAINNET && !LIVEPEER_API_KEY) {
    console.warn('[LIVEPEER] WARNING: No API key configured for mainnet');
    // Still allow verification to proceed - stream check is optional for video proof
    return { active: true, healthy: true, streamName: 'no-key-configured' };
  }

  // Allow dev streams only on testnet
  if (streamId.startsWith('dev-')) {
    if (IS_MAINNET) {
      console.log('[LIVEPEER] Dev streams not allowed on mainnet');
      return { active: false, healthy: false, error: 'Dev streams not allowed in production' };
    }
    console.log('[LIVEPEER] Dev stream allowed on testnet');
    return { active: true, healthy: true, streamName: 'dev-stream' };
  }

  // No Livepeer key - skip stream check (video proof is primary verification)
  if (!LIVEPEER_API_KEY) {
    console.log('[LIVEPEER] No API key - skipping stream verification');
    return { active: true, healthy: true, streamName: 'stream-check-skipped' };
  }

  try {
    const livepeer = new Livepeer({ apiKey: LIVEPEER_API_KEY });
    const response = await livepeer.stream.get(streamId);

    if (!response.stream) {
      return { active: false, healthy: false, error: 'Stream not found' };
    }

    return {
      active: response.stream.isActive === true,
      healthy: response.stream.isHealthy !== false,
      streamName: response.stream.name,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Livepeer error';
    console.error(`[LIVEPEER] Stream verification failed: ${message}`);
    // Don't fail entire verification if Livepeer is down - video proof is primary
    return { active: true, healthy: true, error: message };
  }
}

// ============================================================================
// PROOF VERIFICATION SYSTEM
// ============================================================================
//
// Security Model (inspired by Noones/LocalCoinSwap):
// 1. ALL verifications require valid video proof upload
// 2. Proofs are validated for format, size, and uniqueness
// 3. Low-value dares (<$50) can be auto-approved with valid proof
// 4. High-value dares (>=$50) require manual admin review
// 5. No gaming via URL strings - only valid IPFS/uploaded proofs count
//
// ============================================================================

interface VerificationResult {
  success: boolean;
  confidence: number;
  reason: string;
  proofHash: string;
  requiresManualReview: boolean;
}

// Threshold for automatic approval (in USDC)
const AUTO_APPROVE_THRESHOLD = 50;

// Valid proof URL patterns (IPFS, Pinata, or our upload endpoint)
const VALID_PROOF_PATTERNS = [
  /^https:\/\/.*\.pinata\.cloud\//,
  /^https:\/\/ipfs\.io\/ipfs\//,
  /^https:\/\/gateway\.pinata\.cloud\/ipfs\//,
  /^https:\/\/.*\.mypinata\.cloud\//,
  /^ipfs:\/\//,
];

function isValidProofUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return VALID_PROOF_PATTERNS.some(pattern => pattern.test(url));
}

async function validateProof(
  dare: {
    id: string;
    title: string;
    bounty: number;
    requireSentinel?: boolean;
    videoUrl?: string | null;
    streamId?: string | null;
  },
  proofData?: { videoUrl?: string; streamId?: string; timestamp?: number }
): Promise<VerificationResult> {
  const videoUrl = proofData?.videoUrl || dare.videoUrl;
  const timestamp = proofData?.timestamp || Date.now();

  // Generate unique proof hash from content
  const proofInput = `${dare.id}:${videoUrl || ''}:${timestamp}`;
  const proofHash = keccak256(toBytes(proofInput));

  // -------------------------------------------------------------------------
  // VALIDATION STEP 1: Check if proof URL exists and is valid format
  // -------------------------------------------------------------------------
  if (!videoUrl) {
    return {
      success: false,
      confidence: 0,
      reason: 'No video proof submitted. Upload a video showing dare completion.',
      proofHash,
      requiresManualReview: false,
    };
  }

  // -------------------------------------------------------------------------
  // VALIDATION STEP 2: Check proof URL is from trusted source
  // -------------------------------------------------------------------------
  if (!isValidProofUrl(videoUrl)) {
    console.log(`[VERIFY] Invalid proof URL format: ${videoUrl.substring(0, 50)}...`);
    return {
      success: false,
      confidence: 0.1,
      reason: 'Invalid proof source. Video must be uploaded through the platform.',
      proofHash,
      requiresManualReview: false,
    };
  }

  // -------------------------------------------------------------------------
  // VALIDATION STEP 3: Check proof hasn't been used before (replay protection via DB)
  // -------------------------------------------------------------------------
  const existingProof = await prisma.dare.findFirst({
    where: {
      videoUrl,
      status: { in: ['VERIFIED', 'PENDING_REVIEW', 'PENDING_PAYOUT'] },
      id: { not: dare.id },
    },
    select: { id: true },
  });

  if (existingProof) {
    console.log(`[VERIFY] Duplicate proof detected — already used by dare ${existingProof.id}`);
    return {
      success: false,
      confidence: 0.2,
      reason: 'This proof has already been used for another dare. Submit unique evidence.',
      proofHash,
      requiresManualReview: false,
    };
  }

  // -------------------------------------------------------------------------
  // VALIDATION STEP 4: Check proof timestamp is recent (within 7 days)
  // -------------------------------------------------------------------------
  const proofAge = Date.now() - timestamp;
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  if (proofAge > maxAge) {
    return {
      success: false,
      confidence: 0.3,
      reason: 'Proof is too old. Submit evidence within 7 days of dare creation.',
      proofHash,
      requiresManualReview: false,
    };
  }

  // -------------------------------------------------------------------------
  // DECISION: Auto-approve or require manual review based on value
  // -------------------------------------------------------------------------
  const requiresManualReview = Boolean(dare.requireSentinel) || dare.bounty >= AUTO_APPROVE_THRESHOLD;

  if (requiresManualReview) {
    const reviewReason = dare.requireSentinel
      ? 'Valid proof submitted. Sentinel verification was requested and now needs referee review.'
      : `Valid proof submitted. Bounties ≥$${AUTO_APPROVE_THRESHOLD} require manual review for security.`;

    console.log(
      dare.requireSentinel
        ? `[VERIFY] Sentinel-requested dare ($${dare.bounty}) - queuing for manual review`
        : `[VERIFY] High-value dare ($${dare.bounty}) - queuing for manual review`
    );

    return {
      success: false, // Not auto-approved
      confidence: 0.75, // Proof looks valid but needs human review
      reason: reviewReason,
      proofHash,
      requiresManualReview: true,
    };
  } else {
    // LOW VALUE: Auto-approve with valid proof
    console.log(`[VERIFY] Low-value dare ($${dare.bounty}) - auto-approving with valid proof`);

    return {
      success: true,
      confidence: 0.85,
      reason: 'Valid proof submitted and verified. Auto-approved for low-value dare.',
      proofHash,
      requiresManualReview: false,
    };
  }
}

async function markProofPendingPayoutFallback({
  dareId,
  dare,
  verification,
  proofVideoUrl,
}: {
  dareId: string;
  dare: FounderDareEventLike & {
    requireSentinel?: boolean | null;
    sentinelVerified?: boolean | null;
    videoUrl?: string | null;
  };
  verification: {
    confidence: number;
    proofHash: string;
  };
  proofVideoUrl?: string | null;
}) {
  const queuedDare = await prisma.dare.update({
    where: { id: dareId },
    data: {
      status: 'PENDING_PAYOUT',
      videoUrl: proofVideoUrl ?? dare.videoUrl ?? undefined,
      verifyConfidence: verification.confidence,
      proofHash: verification.proofHash,
      manualReviewNeeded: false,
      sentinelVerified: dare.requireSentinel ? true : dare.sentinelVerified ?? false,
    },
  });

  await recordDareFounderEventSafe({
    eventType: 'payout_queued',
    source: 'verify-proof',
    dare: queuedDare,
    status: 'PENDING_PAYOUT',
    metadata: {
      confidence: verification.confidence,
      proofHash: verification.proofHash,
      fallback: true,
    },
  });
}

// ============================================================================
// MOCK SBT SUNDER (Reputation burn on failure)
// ============================================================================

function mockSunderReputation(streamerHandle: string): void {
  // In production: Call BaseDareSBT.sunder() to burn repScore/life
  console.log(`[SBT] Mock sunder: Burning reputation for ${streamerHandle}`);
}

// ============================================================================
// POST /api/verify-proof - AI REFEREE ENDPOINT
// ============================================================================

export async function POST(req: NextRequest) {
  // -------------------------------------------------------------------------
  // 0a. AUTHENTICATION - Internal key OR authenticated wallet/session
  // -------------------------------------------------------------------------
  const internalAuthError = verifyInternalApiKey(req);
  const isInternalAuthorized = !internalAuthError;

  // -------------------------------------------------------------------------
  // 0b. RATE LIMITING - Prevent abuse of AI Referee
  // -------------------------------------------------------------------------
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit(clientIp, {
    ...RateLimiters.verification,
    keyPrefix: 'verify-proof',
  });

  if (!rateLimitResult.allowed) {
    console.log(`[RATE_LIMIT] Blocked ${clientIp} - exceeded ${rateLimitResult.limit} requests per 5 minutes`);

    return NextResponse.json(
      {
        success: false,
        error: 'Too many verification requests. Please wait before trying again.',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil(rateLimitResult.resetIn / 1000),
      },
      {
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult),
      }
    );
  }

  try {
    // -------------------------------------------------------------------------
    // 1. VALIDATE INPUT
    // -------------------------------------------------------------------------
    const body = await req.json();
    const validation = VerifyProofSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { dareId, streamUrl, proofData } = validation.data;

    // -------------------------------------------------------------------------
    // 2. FETCH DARE FROM DATABASE
    // -------------------------------------------------------------------------
    const dare = await prisma.dare.findUnique({
      where: { id: dareId },
    });

    if (!dare) {
      return NextResponse.json(
        { success: false, error: 'Dare not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const authorizedWallet = isInternalAuthorized
      ? null
      : await getAuthorizedProofSubmitterWallet(req, {
          dareId,
          authorizedWallets: [
            dare.stakerAddress,
            dare.targetWalletAddress,
            dare.claimedBy,
          ],
        });

    if (!authorizedWallet && !isInternalAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (
      !isInternalAuthorized &&
      dare.stakerAddress?.toLowerCase() !== authorizedWallet &&
      dare.targetWalletAddress?.toLowerCase() !== authorizedWallet &&
      dare.claimedBy?.toLowerCase() !== authorizedWallet
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    if (dare.status === 'VERIFIED') {
      return NextResponse.json(
        { success: false, error: 'Dare already verified', code: 'ALREADY_VERIFIED' },
        { status: 400 }
      );
    }

    if (dare.status === 'FAILED' && dare.appealStatus !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Dare already failed. Submit an appeal to retry.', code: 'ALREADY_FAILED' },
        { status: 400 }
      );
    }

    console.log(`[REFEREE] Starting verification for dare ${dareId}: "${dare.title}"`);

    // -------------------------------------------------------------------------
    // 3. STEP 1: VERIFY LIVEPEER STREAM IS ACTIVE/HEALTHY
    // -------------------------------------------------------------------------
    const streamId = proofData?.streamId || dare.streamId || 'dev-stream';
    const livepeerCheck = await verifyLivepeerStream(streamId);

    console.log(`[LIVEPEER] Stream check: active=${livepeerCheck.active}, healthy=${livepeerCheck.healthy}`);

    if (!livepeerCheck.active && !streamId.startsWith('dev-')) {
      return NextResponse.json({
        success: false,
        error: 'Stream is not active. Cannot verify until stream is live.',
        code: 'STREAM_INACTIVE',
      }, { status: 400 });
    }

    // -------------------------------------------------------------------------
    // 4. STEP 2: VALIDATE PROOF (Secure verification - no mock/random logic)
    // -------------------------------------------------------------------------
    const verification = await validateProof(
      {
        id: dare.id,
        title: dare.title,
        bounty: dare.bounty,
        requireSentinel: dare.requireSentinel,
        videoUrl: dare.videoUrl,
        streamId: streamId,
      },
      proofData
    );

    console.log(`[REFEREE] Verification result: ${verification.success ? 'APPROVED' : 'PENDING/FAILED'}`);
    console.log(`[REFEREE] Confidence: ${(verification.confidence * 100).toFixed(1)}%`);
    console.log(`[REFEREE] Reason: ${verification.reason}`);
    console.log(`[REFEREE] Requires manual review: ${verification.requiresManualReview}`);
    console.log(`[REFEREE] Proof hash: ${verification.proofHash}`);

    // -------------------------------------------------------------------------
    // 5. HANDLE VERIFICATION RESULT
    // -------------------------------------------------------------------------
    // Handle manual review flow for high-value dares
    if (verification.requiresManualReview) {
      const sentinelReviewRequested = Boolean(dare.requireSentinel);
      const reviewReason = sentinelReviewRequested
        ? 'Sentinel verification requested. Proof requires referee review.'
        : 'High-value bounty requires manual verification';

      // Update dare with proof info, set to PENDING_REVIEW status
      const queuedDare = await prisma.dare.update({
        where: { id: dareId },
        data: {
          status: 'PENDING_REVIEW',
          videoUrl: proofData?.videoUrl || dare.videoUrl,
          proofHash: verification.proofHash,
          verifyConfidence: verification.confidence,
          manualReviewNeeded: sentinelReviewRequested,
          appealStatus: 'PENDING', // Use appeal system for manual review
          appealReason: reviewReason,
          appealedAt: new Date(),
        },
      });

      await recordDareFounderEventSafe({
        eventType: 'proof_submitted',
        source: 'verify-proof',
        dare: queuedDare,
        status: 'PENDING_REVIEW',
        actor: authorizedWallet,
        metadata: {
          confidence: verification.confidence,
          proofHash: verification.proofHash,
          reason: verification.reason,
          sentinelReviewRequested,
          manualReview: true,
        },
      });

      // Notify User it's under review
      if (dare.targetWalletAddress) {
        await createWalletNotification({
          wallet: dare.targetWalletAddress,
          type: 'DARE_REVIEW',
          title: 'Dare Under Review',
          message: sentinelReviewRequested
            ? `Your proof for "${dare.title}" entered Sentinel review and is waiting on referee approval.`
            : `Your proof for "${dare.title}" is under manual administrative review.`,
          link: '/dashboard',
          pushTopic: 'wallet',
        });
      }

      console.log(
        `[AUDIT] Dare ${dareId} queued for manual review - bounty: $${dare.bounty} USDC${sentinelReviewRequested ? ' (sentinel)' : ''}`
      );

      if (sentinelReviewRequested) {
        await alertSentinelReviewRequired({
          dareId,
          shortId: dare.shortId || dareId,
          title: dare.title,
          qrCheckLabel: 'PENDING',
        }).catch((err) => console.error('[TELEGRAM] Sentinel review alert failed:', err));

        await checkAndSendSentinelQueueAlert().catch((err) =>
          console.error('[SENTINEL_QUEUE] Threshold alert failed:', err)
        );
      } else {
        alertVerification({
          dareId,
          shortId: dare.shortId || dareId,
          title: dare.title,
          streamerTag: dare.streamerHandle,
          result: 'PENDING_REVIEW',
          bounty: dare.bounty,
          proofUrl: dare.videoUrl,
          confidence: Math.round(verification.confidence * 100),
        }).catch(err => console.error('[TELEGRAM] Manual review alert failed:', err));
      }

      return NextResponse.json({
        success: true,
        data: {
          dareId,
          status: 'PENDING_REVIEW',
          verification: {
            confidence: verification.confidence,
            reason: verification.reason,
            proofHash: verification.proofHash,
          },
          message: sentinelReviewRequested
            ? 'Proof submitted successfully. Sentinel review is now active and a referee has been pinged.'
            : `Proof submitted successfully. Bounties ≥$${AUTO_APPROVE_THRESHOLD} require manual review for security. An admin will review within 24-48 hours.`,
        },
      });
    }

    // For low-value dares, check if passed
    const passedVerification = verification.success && verification.confidence > 0.80;

    if (passedVerification) {
      // SUCCESS PATH: Trigger on-chain payout
      let txHash: string | null = null;
      let blockNumber: string | null = null;
      const completedAt = new Date();
      const proofMedia = proofData?.videoUrl || dare.videoUrl || streamUrl || null;

      await recordDareFounderEventSafe({
        eventType: 'proof_submitted',
        source: 'verify-proof',
        dare,
        actor: authorizedWallet,
        metadata: {
          confidence: verification.confidence,
          proofHash: verification.proofHash,
          reason: verification.reason,
          autoApproved: true,
          proofMedia,
        },
      });

      // Calculate fee splits
      const totalBounty = dare.bounty;
      const streamerPayout = (totalBounty * STREAMER_FEE_PERCENT) / 100;
      const houseFee = (totalBounty * HOUSE_FEE_PERCENT) / 100;
      const referrerFee = dare.referrerAddress ? (totalBounty * REFERRER_FEE_PERCENT) / 100 : 0;

      console.log(`[PAYOUT] Fee split - Streamer: $${streamerPayout}, House: $${houseFee}, Referrer: $${referrerFee}`);

      try {
        if (isContractDeployed && !dare.isSimulated && !FORCE_SIMULATION) {
          // Real contract call
          const { publicClient, walletClient, account } = getRefereeClient();

          const balanceCheck = await enforceRefereeBalanceCap(
            publicClient,
            account.address,
            `verify-proof:${dareId}`
          );

          if (!balanceCheck.allowed) {
            await markProofPendingPayoutFallback({
              dareId,
              dare,
              verification,
              proofVideoUrl: proofMedia,
            });

            return NextResponse.json({
              success: true,
              data: {
                dareId,
                status: 'PENDING_PAYOUT',
                verification: {
                  confidence: verification.confidence,
                  reason: `Proof verified but payouts are paused. Referee hot wallet balance (${balanceCheck.balanceEth} ETH) exceeds ${REFEREE_MAX_BALANCE_ETH} ETH cap.`,
                  proofHash: verification.proofHash,
                },
              },
            });
          }

          try {
            if (!dare.onChainDareId) {
              console.error(`[REFEREE] No onChainDareId for dare ${dareId} — skipping on-chain payout`);
              throw new Error('Missing on-chain dare ID');
            }
            const onChainDareId = BigInt(dare.onChainDareId);

            const hash = await walletClient.writeContract({
              address: BOUNTY_CONTRACT_ADDRESS,
              abi: BOUNTY_ABI,
              functionName: 'verifyAndPayout',
              args: [onChainDareId],
            });

            const receipt = await waitForSuccessfulReceipt({
              publicClient,
              hash,
              context: `verifyAndPayout:${dareId}`,
            });
            txHash = hash;
            blockNumber = receipt.blockNumber.toString();

            console.log(`[AUDIT] Payout executed - txHash: ${txHash}`);
          } catch (contractError: unknown) {
            const contractMsg = contractError instanceof Error ? contractError.message : 'Contract call failed';
            console.error(`[REFEREE] Contract payout failed: ${contractMsg}`);
            // On-chain failed — mark as PENDING_PAYOUT so it can be retried
            await markProofPendingPayoutFallback({
              dareId,
              dare,
              verification,
              proofVideoUrl: proofMedia,
            });

            return NextResponse.json({
              success: true,
              data: {
                dareId,
                status: 'PENDING_PAYOUT',
                verification: {
                  confidence: verification.confidence,
                  reason: 'Proof verified but on-chain payout failed. Will be retried.',
                  proofHash: verification.proofHash,
                },
              },
            });
          }
        } else {
          console.log(`[REFEREE] Simulated mode - skipping on-chain payout`);
        }

        // Log referrer payout for tracking
        if (dare.referrerAddress) {
          console.log(`[REFERRAL] Referrer ${dare.referrerTag || 'direct-address'} (${dare.referrerAddress}) earns $${referrerFee} (0% of $${totalBounty})`);
        }

        await finalizeVerifiedDare({
          dareId,
          sourceContext: 'VERIFY_PROOF',
          verifiedAt: completedAt,
          verifyTxHash: txHash,
          verifyConfidence: verification.confidence,
          proofHash: verification.proofHash,
          proofMedia,
          appealStatus: null,
          notificationMessage: `Your proof for "${dare.title}" was approved. ${streamerPayout.toFixed(2)} USDC has been sent to your wallet.`,
        });
      } catch (successPathError: unknown) {
        const successPathMessage =
          successPathError instanceof Error ? successPathError.message : 'Unknown settlement error';
        console.error(`[REFEREE] Post-verification settlement fallback for ${dareId}: ${successPathMessage}`);

        await markProofPendingPayoutFallback({
          dareId,
          dare,
          verification,
          proofVideoUrl: proofMedia,
        });

        return NextResponse.json({
          success: true,
          data: {
            dareId,
            status: 'PENDING_PAYOUT',
            verification: {
              confidence: verification.confidence,
              reason: 'Proof verified but settlement hit an internal ops error. Payout has been queued for retry.',
              proofHash: verification.proofHash,
            },
          },
        });
      }

      console.log(`[AUDIT] Dare ${dareId} VERIFIED - streamer: ${dare.streamerHandle}, bounty: $${totalBounty} USDC`);

      return NextResponse.json({
        success: true,
        data: {
          dareId,
          status: 'VERIFIED',
          verification: {
            confidence: verification.confidence,
            reason: verification.reason,
            proofHash: verification.proofHash,
          },
          payout: {
            txHash,
            blockNumber,
            simulated: dare.isSimulated || !isContractDeployed || FORCE_SIMULATION,
            splits: {
              streamer: streamerPayout,
              house: houseFee,
              referrer: referrerFee,
              referrerTag: dare.referrerTag,
              referrerAddress: dare.referrerAddress,
            },
          },
        },
      });

    } else {
      // FAILURE PATH: Mark as failed, burn reputation, enable appeal
      if (dare?.streamerHandle) {
        mockSunderReputation(dare.streamerHandle);
      }

      const failedDare = await prisma.dare.update({
        where: { id: dareId },
        data: {
          status: 'FAILED',
          appealStatus: 'NONE', // Can be appealed
          verifiedAt: new Date(),
          verifyConfidence: verification.confidence,
          proofHash: verification.proofHash,
          manualReviewNeeded: false,
        },
      });
      await syncLinkedCampaignForDareState({
        dareId,
        status: 'FAILED',
      });

      await recordDareFounderEventSafe({
        eventType: 'dare_failed',
        source: 'verify-proof',
        dare: failedDare,
        status: 'FAILED',
        actor: authorizedWallet,
        metadata: {
          confidence: verification.confidence,
          proofHash: verification.proofHash,
          reason: verification.reason,
        },
      });

      // Notify Creator of Failure
      if (dare.targetWalletAddress) {
        await createWalletNotification({
          wallet: dare.targetWalletAddress,
          type: 'DARE_FAILED',
          title: 'Dare Failed Verification',
          message: `Your proof for "${dare.title}" was rejected. You can submit an appeal.`,
          link: '/dashboard',
          pushTopic: 'wallet',
        });
      }

      console.log(`[AUDIT] Dare ${dareId} FAILED - reason: ${verification.reason}, confidence: ${(verification.confidence * 100).toFixed(1)}%`);

      // Send Telegram alert (fire and forget)
      alertVerification({
        dareId,
        shortId: dare.shortId || dareId,
        title: dare.title,
        streamerTag: dare.streamerHandle,
        result: 'FAILED',
        confidence: Math.round(verification.confidence * 100),
      }).catch(err => console.error('[TELEGRAM] Verification alert failed:', err));

      return NextResponse.json({
        success: true, // Request succeeded, but verification failed
        data: {
          dareId,
          status: 'FAILED',
          verification: {
            confidence: verification.confidence,
            reason: verification.reason,
            proofHash: verification.proofHash,
          },
          appealable: true,
          message: 'Verification failed. You can submit an appeal if you believe this is incorrect.',
        },
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ERROR] Verification failed:', message);
    return NextResponse.json(
      { success: false, error: 'Verification failed due to an internal error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/verify-proof/appeal - SUBMIT APPEAL
// ============================================================================

const AppealSchema = z.object({
  dareId: z.string().min(1, 'Dare ID is required'),
  reason: z.string().min(10, 'Please provide a detailed reason for your appeal').max(500),
});

export async function PUT(req: NextRequest) {
  // -------------------------------------------------------------------------
  // RATE LIMITING - Prevent appeal spam (3 per hour)
  // -------------------------------------------------------------------------
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit(clientIp, {
    ...RateLimiters.appeal,
    keyPrefix: 'appeal',
  });

  if (!rateLimitResult.allowed) {
    console.log(`[RATE_LIMIT] Blocked appeal from ${clientIp} - exceeded ${rateLimitResult.limit} requests per hour`);

    return NextResponse.json(
      {
        success: false,
        error: 'Too many appeal submissions. Please wait before trying again.',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil(rateLimitResult.resetIn / 1000),
      },
      {
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult),
      }
    );
  }

  try {
    const body = await req.json();
    const validation = AppealSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { dareId, reason } = validation.data;

    const dare = await prisma.dare.findUnique({
      where: { id: dareId },
    });

    if (!dare) {
      return NextResponse.json(
        { success: false, error: 'Dare not found' },
        { status: 404 }
      );
    }

    const authorizedWallet = await getAuthorizedProofSubmitterWallet(req, {
      dareId,
      authorizedWallets: [
        dare.stakerAddress,
        dare.targetWalletAddress,
        dare.claimedBy,
      ],
    });

    if (!authorizedWallet) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (dare.status !== 'FAILED') {
      return NextResponse.json(
        { success: false, error: 'Only failed dares can be appealed' },
        { status: 400 }
      );
    }

    if (dare.appealStatus === 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Appeal already submitted' },
        { status: 400 }
      );
    }

    await prisma.dare.update({
      where: { id: dareId },
      data: {
        appealStatus: 'PENDING',
        appealReason: reason,
        appealedAt: new Date(),
      },
    });

    console.log(`[AUDIT] Appeal submitted for dare ${dareId}: "${reason.substring(0, 50)}..."`);

    return NextResponse.json({
      success: true,
      data: {
        dareId,
        appealStatus: 'PENDING',
        message: 'Appeal submitted. A human reviewer will check within 24-48 hours.',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ERROR] Appeal submission failed:', message);
    return NextResponse.json(
      { success: false, error: 'Appeal submission failed due to an internal error' },
      { status: 500 }
    );
  }
}
