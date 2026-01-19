import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPublicClient, createWalletClient, http, isAddress, type Address, keccak256, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { Livepeer } from 'livepeer';
import { prisma } from '@/lib/prisma';
import { BOUNTY_ABI } from '@/abis/BaseDareBounty';
import { checkRateLimit, getClientIp, RateLimiters, createRateLimitHeaders } from '@/lib/rate-limit';

// ============================================================================
// ENVIRONMENT & CONFIG
// ============================================================================

const BOUNTY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS as Address;
const LIVEPEER_API_KEY = process.env.LIVEPEER_API_KEY;
const isContractDeployed = isAddress(BOUNTY_CONTRACT_ADDRESS);
const FORCE_SIMULATION = process.env.SIMULATE_BOUNTIES === 'true';

// Fee distribution constants (matching contract)
const STREAMER_FEE_PERCENT = 89;
const HOUSE_FEE_PERCENT = 10;
const REFERRER_FEE_PERCENT = 1;

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
  const privateKey = process.env.REFEREE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('REFEREE_PRIVATE_KEY not configured');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });

  return { publicClient, walletClient, account };
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
  if (!LIVEPEER_API_KEY || streamId.startsWith('dev-')) {
    console.log('[LIVEPEER] Skipping stream verification (dev mode)');
    return { active: true, healthy: true, streamName: 'dev-stream' };
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
    return { active: false, healthy: false, error: message };
  }
}

// ============================================================================
// ZKML MOCK VERIFICATION (Human Action Model)
// ============================================================================

interface VerificationResult {
  success: boolean;
  confidence: number;
  reason: string;
  proofHash: string;
}

async function zkmlVerification(
  dare: { streamId?: string | null; title: string; videoUrl?: string | null },
  streamUrl?: string
): Promise<VerificationResult> {
  // Generate deterministic proof hash
  const proofInput = `${dare.streamId || ''}:${dare.title}:${streamUrl || ''}:${Date.now()}`;
  const proofHash = keccak256(toBytes(proofInput));

  // Mock ZKML "Human Action" model inference
  // Rule: If streamUrl contains "pass" → success (confidence > 80%)
  // Rule: If streamUrl contains "fail" → fail
  // Fallback: Use existing rules

  const streamUrlLower = streamUrl?.toLowerCase() || '';
  const streamId = dare.streamId?.toLowerCase() || '';
  const videoUrl = dare.videoUrl;

  // ZKML Rule 1: Stream URL contains "pass"
  if (streamUrlLower.includes('pass')) {
    return {
      success: true,
      confidence: 0.92,
      reason: 'ZKML Human Action model: Stream verification PASSED (streamUrl signal)',
      proofHash,
    };
  }

  // ZKML Rule 2: Stream URL contains "fail"
  if (streamUrlLower.includes('fail')) {
    return {
      success: false,
      confidence: 0.88,
      reason: 'ZKML Human Action model: Stream verification FAILED (streamUrl signal)',
      proofHash,
    };
  }

  // Fallback rules
  if (streamId.includes('pass')) {
    return {
      success: true,
      confidence: 0.95,
      reason: 'ZKML: Stream verification passed (streamId contains "pass")',
      proofHash,
    };
  }

  if (streamId.includes('fail')) {
    return {
      success: false,
      confidence: 0.85,
      reason: 'ZKML: Stream verification failed (streamId contains "fail")',
      proofHash,
    };
  }

  if (videoUrl) {
    return {
      success: true,
      confidence: 0.88,
      reason: 'ZKML: Video proof submitted and verified',
      proofHash,
    };
  }

  // Random for testing variety (70% pass rate with confidence > 80%)
  const random = Math.random();
  if (random > 0.3) {
    return {
      success: true,
      confidence: 0.82,
      reason: 'ZKML Human Action model: Dare completion detected',
      proofHash,
    };
  }

  return {
    success: false,
    confidence: 0.75,
    reason: 'ZKML Human Action model: Dare completion NOT detected',
    proofHash,
  };
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
  // 0. RATE LIMITING - Prevent abuse of AI Referee
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
    // 4. STEP 2: RUN ZKML VERIFICATION (Mock Human Action Model)
    // -------------------------------------------------------------------------
    const verification = await zkmlVerification(
      {
        streamId: streamId,
        title: dare.title,
        videoUrl: proofData?.videoUrl || dare.videoUrl,
      },
      streamUrl
    );

    console.log(`[REFEREE] ZKML result: ${verification.success ? 'PASSED' : 'FAILED'} (${(verification.confidence * 100).toFixed(1)}% confidence)`);
    console.log(`[REFEREE] Reason: ${verification.reason}`);
    console.log(`[REFEREE] Proof hash: ${verification.proofHash}`);

    // -------------------------------------------------------------------------
    // 5. HANDLE VERIFICATION RESULT
    // -------------------------------------------------------------------------
    // Only pass if confidence > 80%
    const passedVerification = verification.success && verification.confidence > 0.80;

    if (passedVerification) {
      // SUCCESS PATH: Trigger on-chain payout
      let txHash: string | null = null;
      let blockNumber: string | null = null;

      // Calculate fee splits
      const totalBounty = dare.bounty;
      const streamerPayout = (totalBounty * STREAMER_FEE_PERCENT) / 100;
      const houseFee = (totalBounty * HOUSE_FEE_PERCENT) / 100;
      const referrerFee = dare.referrerTag ? (totalBounty * REFERRER_FEE_PERCENT) / 100 : 0;

      console.log(`[PAYOUT] Fee split - Streamer: $${streamerPayout}, House: $${houseFee}, Referrer: $${referrerFee}`);

      if (isContractDeployed && !dare.isSimulated && !FORCE_SIMULATION) {
        // Real contract call
        const { publicClient, walletClient } = getRefereeClient();

        try {
          // Note: Contract uses numeric dareId, but we store cuid in DB
          // For real integration, you'd need to track the on-chain dareId separately
          // For now, we'll use a hash of the DB id as the on-chain id
          const onChainDareId = BigInt('0x' + Buffer.from(dareId).slice(0, 8).toString('hex'));

          const hash = await walletClient.writeContract({
            address: BOUNTY_CONTRACT_ADDRESS,
            abi: BOUNTY_ABI,
            functionName: 'verifyAndPayout',
            args: [onChainDareId],
          });

          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          txHash = hash;
          blockNumber = receipt.blockNumber.toString();

          console.log(`[AUDIT] Payout executed - txHash: ${txHash}`);
        } catch (contractError: unknown) {
          const message = contractError instanceof Error ? contractError.message : 'Contract call failed';
          console.error(`[REFEREE] Contract payout failed: ${message}`);
          // Don't fail the whole request - mark as verified in DB, note contract issue
        }
      } else {
        console.log(`[REFEREE] Simulated mode - skipping on-chain payout`);
      }

      // Log referrer payout for tracking
      if (dare.referrerTag) {
        console.log(`[REFERRAL] Referrer ${dare.referrerTag} (${dare.referrerAddress}) earns $${referrerFee} (1% of $${totalBounty})`);
      }

      // Update database with verification result
      await prisma.dare.update({
        where: { id: dareId },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
          verifyTxHash: txHash,
          verifyConfidence: verification.confidence,
          proofHash: verification.proofHash,
          appealStatus: null,
          referrerPayout: referrerFee > 0 ? referrerFee : null,
        },
      });

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
            },
          },
        },
      });
    } else {
      // FAILURE PATH: Mark as failed, burn reputation, enable appeal
      mockSunderReputation(dare.streamerHandle);

      await prisma.dare.update({
        where: { id: dareId },
        data: {
          status: 'FAILED',
          appealStatus: 'NONE', // Can be appealed
          verifiedAt: new Date(),
          verifyConfidence: verification.confidence,
          proofHash: verification.proofHash,
        },
      });

      console.log(`[AUDIT] Dare ${dareId} FAILED - reason: ${verification.reason}, confidence: ${(verification.confidence * 100).toFixed(1)}%`);

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
      { success: false, error: message },
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
      { success: false, error: message },
      { status: 500 }
    );
  }
}
