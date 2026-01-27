import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Livepeer } from 'livepeer';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  isAddress,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { BOUNTY_ABI, USDC_ABI } from '@/abis/BaseDareBounty';
import { prisma } from '@/lib/prisma';
import { alertNewDare, alertBigPledge } from '@/lib/telegram';

// Big pledge threshold for alerts
const BIG_PLEDGE_THRESHOLD = 100;

// Network selection based on environment
const IS_MAINNET = process.env.NEXT_PUBLIC_NETWORK === 'mainnet';
const activeChain = IS_MAINNET ? base : baseSepolia;
const rpcUrl = IS_MAINNET ? 'https://mainnet.base.org' : 'https://sepolia.base.org';

// ============================================================================
// SHORT ID GENERATOR
// ============================================================================

function generateShortId(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateInviteToken(): string {
  // Generate a UUID-like token for invite links
  return 'inv_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

// ============================================================================
// ENVIRONMENT & CONFIG
// ============================================================================

const BOUNTY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS as Address;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as Address;
const LIVEPEER_API_KEY = process.env.LIVEPEER_API_KEY;

// Check if contract address is a valid Ethereum address (not a placeholder UUID)
const isContractDeployed = isAddress(BOUNTY_CONTRACT_ADDRESS);

// Force simulated mode for development (set SIMULATE_BOUNTIES=true in .env.local)
const FORCE_SIMULATION = process.env.SIMULATE_BOUNTIES === 'true';

// ============================================================================
// TAG TO ADDRESS RESOLUTION - Uses verified tags from database
// ============================================================================

// Fallback map for legacy/testing (will be phased out)
const LEGACY_TAG_MAP: Record<string, Address> = {
  '@KaiCenat': '0x1234567890123456789012345678901234567890',
  '@xQc': '0x2345678901234567890123456789012345678901',
};

async function resolveTagToAddress(tag: string): Promise<{ address: Address | null; simulated: boolean; verified: boolean }> {
  const normalizedTag = tag.startsWith('@') ? tag : `@${tag}`;

  // 1. Check database for verified tag
  const verifiedTag = await prisma.streamerTag.findUnique({
    where: { tag: normalizedTag },
    select: { walletAddress: true, status: true },
  });

  if (verifiedTag && verifiedTag.status === 'VERIFIED') {
    console.log(`[TAG] Resolved ${normalizedTag} → ${verifiedTag.walletAddress} (verified)`);
    return {
      address: verifiedTag.walletAddress as Address,
      simulated: false,
      verified: true
    };
  }

  // 2. Check legacy map (for backwards compatibility during transition)
  const normalizedTagLower = normalizedTag.toLowerCase();
  for (const [knownTag, address] of Object.entries(LEGACY_TAG_MAP)) {
    if (knownTag.toLowerCase() === normalizedTagLower) {
      console.log(`[TAG] Resolved ${normalizedTag} → ${address} (legacy map)`);
      return { address, simulated: false, verified: false };
    }
  }

  // 3. Tag not found - generate simulated address for testing
  const hash = normalizedTagLower.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const simulatedAddress = `0x${hash.toString(16).padStart(8, '0')}${'0'.repeat(32)}` as Address;

  console.log(`[TAG] Resolved ${normalizedTag} → ${simulatedAddress} (simulated - tag not verified)`);
  return { address: simulatedAddress, simulated: true, verified: false };
}

// ============================================================================
// ZOD SCHEMAS - Truth Machine Input Validation
// ============================================================================

const StakeBountySchema = z.object({
  // Bounty metadata
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title too long')
    .transform((val) => val.replace(/<[^>]*>/g, '')), // XSS sanitization

  description: z
    .string()
    .max(500, 'Description too long')
    .optional()
    .transform((val) => val?.replace(/<[^>]*>/g, '')), // XSS sanitization

  // Stake amount (USDC)
  amount: z
    .number()
    .min(5, 'Minimum bounty is $5 USDC')
    .max(10000, 'Maximum bounty is $10,000 USDC'),

  // Livepeer stream verification
  streamId: z.string().min(1, 'Stream ID is required'),

  // Streamer tag (@username format) - optional for open bounties
  streamerTag: z
    .string()
    .max(20, 'Tag must be 20 characters or less')
    .regex(/^(@[a-zA-Z0-9_]+)?$/, 'Tag must start with @ if provided')
    .optional()
    .or(z.literal('')),

  referrerAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid referrer address')
    .refine((addr) => isAddress(addr), 'Address checksum invalid')
    .optional(),

  // Referrer tag for 1% fee tracking
  referrerTag: z
    .string()
    .max(20, 'Tag must be 20 characters or less')
    .regex(/^(@[a-zA-Z0-9_]+)?$/, 'Tag must start with @ if provided')
    .optional(),

  // Optional: client-provided dareId (for idempotency)
  dareId: z.string().optional(),

  // Staker wallet address (for filtering dashboard)
  stakerAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid staker address')
    .refine((addr) => isAddress(addr), 'Address checksum invalid')
    .optional(),
});

const GetBountySchema = z.object({
  dareId: z.string().min(1, 'Dare ID is required'),
});

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
// LIVEPEER STREAM VERIFICATION - The Oracle
// ============================================================================

interface StreamVerificationResult {
  active: boolean;
  streamName?: string;
  playbackId?: string;
  error?: string;
}

async function verifyStreamActive(streamId: string): Promise<StreamVerificationResult> {
  // Dev mode: skip verification if no API key or if using dev stream ID
  if (!LIVEPEER_API_KEY || streamId.startsWith('dev-')) {
    console.warn('[LIVEPEER] Skipping stream verification (dev mode)');
    return { active: true, streamName: 'dev-stream' };
  }

  try {
    const livepeer = new Livepeer({ apiKey: LIVEPEER_API_KEY });
    const response = await livepeer.stream.get(streamId);

    if (!response.stream) {
      return { active: false, error: 'Stream not found in Livepeer' };
    }

    const stream = response.stream;
    const isActive = stream.isActive === true;

    return {
      active: isActive,
      streamName: stream.name,
      playbackId: stream.playbackId,
      error: isActive ? undefined : 'Stream exists but is not currently live',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown Livepeer error';
    console.error('[LIVEPEER] Verification failed:', message);
    return { active: false, error: `Stream verification failed: ${message}` };
  }
}

// ============================================================================
// USDC ALLOWANCE CHECK
// ============================================================================

async function checkAllowance(
  ownerAddress: Address,
  spenderAddress: Address,
  requiredAmount: bigint
): Promise<{ sufficient: boolean; current: bigint }> {
  const { publicClient } = getServerClients();

  const currentAllowance = (await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: [ownerAddress, spenderAddress],
  })) as bigint;

  return {
    sufficient: currentAllowance >= requiredAmount,
    current: currentAllowance,
  };
}

// ============================================================================
// POST /api/bounties - STAKE BOUNTY (Truth Machine Entry Point)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // -------------------------------------------------------------------------
    // 1. PARSE & VALIDATE INPUT (Zod Schema)
    // -------------------------------------------------------------------------
    const body = await request.json();
    const validation = StakeBountySchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: firstError.message,
          field: firstError.path.join('.'),
        },
        { status: 400 }
      );
    }

    const { title, description, amount, streamId, streamerTag, referrerAddress, referrerTag, dareId, stakerAddress } =
      validation.data;

    // -------------------------------------------------------------------------
    // 2. RESOLVE STREAMER TAG TO ADDRESS (or handle open bounty)
    // -------------------------------------------------------------------------
    const isOpenBounty = !streamerTag || streamerTag.trim() === '';
    let streamerAddress: Address | null = null;
    let tagSimulated = false;
    let tagVerified = false;

    if (!isOpenBounty) {
      const tagResolution = await resolveTagToAddress(streamerTag);
      streamerAddress = tagResolution.address;
      tagSimulated = tagResolution.simulated;
      tagVerified = tagResolution.verified;

      if (!streamerAddress) {
        return NextResponse.json(
          {
            success: false,
            error: 'Could not resolve streamer tag to address',
            code: 'TAG_RESOLUTION_FAILED',
          },
          { status: 400 }
        );
      }

      console.log(`[TAG] Resolved ${streamerTag} -> ${streamerAddress}${tagSimulated ? ' (simulated)' : ''}`);
    } else {
      console.log(`[BOUNTY] Creating open bounty - no target specified`);
    }

    // -------------------------------------------------------------------------
    // 3. VERIFY LIVEPEER STREAM IS ACTIVE
    // -------------------------------------------------------------------------
    const streamVerification = await verifyStreamActive(streamId);

    if (!streamVerification.active) {
      return NextResponse.json(
        {
          success: false,
          error: streamVerification.error || 'Stream is not active',
          code: 'STREAM_INACTIVE',
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // 4. CHECK CONTRACT DEPLOYMENT STATUS / SIMULATION MODE / OPEN BOUNTY
    // -------------------------------------------------------------------------
    // Use database-only mode for: no contract, simulation, open bounties, or unverified tags
    // Only go on-chain for verified tags with real wallet addresses
    if (!isContractDeployed || FORCE_SIMULATION || isOpenBounty || tagSimulated) {
      // Database-only mode
      if (isOpenBounty) {
        console.log('[BOUNTY] Open bounty - using database-only mode (no on-chain escrow)');
      } else if (tagSimulated) {
        console.log(`[BOUNTY] Unverified tag ${streamerTag} - using database-only mode until claimed`);
      } else {
        console.warn('[BOUNTY] Running in simulated mode (contract not deployed or SIMULATE_BOUNTIES=true)');
      }

      // -----------------------------------------------------------------------
      // WRITE TO PRISMA DATABASE (Simulated Mode)
      // -----------------------------------------------------------------------

      // Resolve referrer tag to address
      let resolvedReferrerAddress: string | null = null;
      if (referrerTag) {
        const referrerResolution = await resolveTagToAddress(referrerTag);
        resolvedReferrerAddress = referrerResolution.address;
        console.log(`[REFERRAL] Tracking referrer: ${referrerTag} -> ${resolvedReferrerAddress} (1% fee on payout)`);
      }

      // Set expiry to 24 hours from now
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const shortId = generateShortId();

      // Determine status and invite flow based on tag verification
      // Open bounties go straight to PENDING (anyone can complete)
      // Targeted bounties with unverified tags go to AWAITING_CLAIM
      const isAwaitingClaim = !isOpenBounty && !tagVerified;
      const inviteToken = isAwaitingClaim ? generateInviteToken() : null;
      // If tag is unverified, set 30-day claim deadline
      const claimDeadline = isAwaitingClaim ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
      const dareStatus = isAwaitingClaim ? 'AWAITING_CLAIM' : 'PENDING';
      // Only set targetWalletAddress if tag is verified
      const targetWalletAddress = tagVerified ? streamerAddress : null;

      const dbDare = await prisma.dare.create({
        data: {
          title,
          bounty: amount,
          streamerHandle: isOpenBounty ? null : streamerTag,
          status: dareStatus,
          streamId,
          txHash: null,
          isSimulated: true,
          expiresAt,
          shortId,
          referrerTag: referrerTag || null,
          referrerAddress: resolvedReferrerAddress,
          stakerAddress: stakerAddress?.toLowerCase() || null,
          inviteToken,
          claimDeadline,
          targetWalletAddress,
        },
      });

      console.log(`[AUDIT] Simulated dare created in DB - id: ${dbDare.id}, title: "${title}", ${isOpenBounty ? 'OPEN BOUNTY' : `tag: ${streamerTag}`}, staker: ${stakerAddress || 'anonymous'}, status: ${dareStatus}, expires: ${expiresAt.toISOString()}${referrerTag ? `, referrer: ${referrerTag}` : ''}${isAwaitingClaim ? `, inviteToken: ${inviteToken}` : ''}`);

      // Send Telegram alert (fire and forget - don't block response)
      alertNewDare({
        dareId: dbDare.id,
        shortId,
        title,
        amount,
        streamerTag: isOpenBounty ? null : streamerTag || null,
        isOpenBounty,
        stakerAddress,
      }).catch(err => console.error('[TELEGRAM] Alert failed:', err));

      // Big pledge alert for high-value dares
      if (amount >= BIG_PLEDGE_THRESHOLD && stakerAddress) {
        alertBigPledge({
          dareId: dbDare.id,
          shortId,
          title,
          pledgeAmount: amount,
          totalPot: amount,
          pledgerAddress: stakerAddress,
          txHash: null,
        }).catch(err => console.error('[TELEGRAM] Big pledge alert failed:', err));
      }

      // Build invite link for unclaimed tags (not for open bounties)
      const inviteLink = isAwaitingClaim && streamerTag
        ? `/claim-tag?invite=${inviteToken}&handle=${encodeURIComponent(streamerTag.replace('@', ''))}`
        : null;

      return NextResponse.json({
        success: true,
        simulated: true,
        message: isOpenBounty
          ? 'Open bounty created - anyone can complete this dare!'
          : isAwaitingClaim
            ? 'Bounty escrowed - tag not yet claimed. Share the invite link!'
            : 'Contract not deployed - simulated stake for frontend testing',
        data: {
          dareId: dbDare.id,
          title,
          description,
          amount,
          streamerTag: isOpenBounty ? null : streamerTag,
          streamerAddress,
          tagSimulated,
          tagVerified,
          isOpenBounty,
          referrerAddress: referrerAddress || null,
          streamId,
          streamVerification: {
            name: streamVerification.streamName,
            playbackId: streamVerification.playbackId,
          },
          txHash: null,
          blockNumber: '0',
          status: dareStatus,
          expiresAt: expiresAt.toISOString(),
          shortId,
          shareUrl: `/dare/${shortId}`,
          // Invite flow fields
          awaitingClaim: isAwaitingClaim,
          inviteLink,
          inviteToken,
          claimDeadline: claimDeadline?.toISOString() || null,
        },
      });
    }

    // -------------------------------------------------------------------------
    // 5. GET SERVER-SIDE WALLET CLIENT
    // -------------------------------------------------------------------------
    const { publicClient, walletClient, account } = getServerClients();

    // -------------------------------------------------------------------------
    // 6. CONVERT AMOUNT TO USDC UNITS (6 decimals)
    // -------------------------------------------------------------------------
    const amountInUnits = parseUnits(amount.toString(), 6);

    // -------------------------------------------------------------------------
    // 7. CHECK USDC ALLOWANCE
    // -------------------------------------------------------------------------
    const allowance = await checkAllowance(account.address, BOUNTY_CONTRACT_ADDRESS, amountInUnits);

    if (!allowance.sufficient) {
      // Auto-approve if insufficient (server wallet controls the funds)
      console.log('[BOUNTY] Approving USDC spend...');
      const approveHash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [BOUNTY_CONTRACT_ADDRESS, amountInUnits],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      console.log(`[AUDIT] USDC approval tx: ${approveHash}`);
    }

    // -------------------------------------------------------------------------
    // 8. GENERATE DARE ID (or use client-provided for idempotency)
    // -------------------------------------------------------------------------
    const finalDareId = dareId ? BigInt(dareId) : BigInt(Date.now());

    // -------------------------------------------------------------------------
    // 9. EXECUTE stakeBounty ON-CHAIN (CEI Pattern in contract)
    // -------------------------------------------------------------------------
    // For open bounties, use zero address as placeholder (anyone can claim)
    const targetAddress = streamerAddress || '0x0000000000000000000000000000000000000000' as Address;

    const txHash = await walletClient.writeContract({
      address: BOUNTY_CONTRACT_ADDRESS,
      abi: BOUNTY_ABI,
      functionName: 'stakeBounty',
      args: [
        finalDareId,
        targetAddress,
        (referrerAddress || '0x0000000000000000000000000000000000000000') as Address,
        amountInUnits,
      ],
    });

    // -------------------------------------------------------------------------
    // 10. WAIT FOR CONFIRMATION
    // -------------------------------------------------------------------------
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    // -------------------------------------------------------------------------
    // 11. WRITE TO PRISMA DATABASE (Real Contract Mode)
    // -------------------------------------------------------------------------

    // Resolve referrer tag to address
    let resolvedReferrerAddress: string | null = null;
    if (referrerTag) {
      const referrerResolution = await resolveTagToAddress(referrerTag);
      resolvedReferrerAddress = referrerResolution.address;
      console.log(`[REFERRAL] Tracking referrer: ${referrerTag} -> ${resolvedReferrerAddress} (1% fee on payout)`);
    }

    // Set expiry to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const shortId = generateShortId();

    // Determine status and invite flow based on tag verification
    // Open bounties go straight to PENDING (anyone can complete)
    const isAwaitingClaim = !isOpenBounty && !tagVerified;
    const inviteToken = isAwaitingClaim ? generateInviteToken() : null;
    // If tag is unverified, set 30-day claim deadline
    const claimDeadline = isAwaitingClaim ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
    const dareStatus = receipt.status !== 'success' ? 'FAILED' : (isAwaitingClaim ? 'AWAITING_CLAIM' : 'PENDING');
    // Only set targetWalletAddress if tag is verified
    const targetWalletAddress = tagVerified ? streamerAddress : null;

    const dbDare = await prisma.dare.create({
      data: {
        title,
        bounty: amount,
        streamerHandle: isOpenBounty ? null : streamerTag,
        status: dareStatus,
        streamId,
        txHash,
        isSimulated: false,
        expiresAt,
        shortId,
        referrerTag: referrerTag || null,
        referrerAddress: resolvedReferrerAddress,
        stakerAddress: stakerAddress?.toLowerCase() || null,
        inviteToken,
        claimDeadline,
        targetWalletAddress,
      },
    });

    // -------------------------------------------------------------------------
    // 12. AUDIT LOG (no sensitive data)
    // -------------------------------------------------------------------------
    console.log(
      `[AUDIT] Bounty staked - dbId: ${dbDare.id}, dareId: ${finalDareId}, title: "${title}", ${isOpenBounty ? 'OPEN BOUNTY' : `tag: ${streamerTag}`}, amount: ${amount} USDC, status: ${dareStatus}, txHash: ${txHash}${isAwaitingClaim ? `, inviteToken: ${inviteToken}` : ''}`
    );

    // Send Telegram alert (fire and forget - don't block response)
    alertNewDare({
      dareId: dbDare.id,
      shortId,
      title,
      amount,
      streamerTag: isOpenBounty ? null : streamerTag || null,
      isOpenBounty,
      stakerAddress,
    }).catch(err => console.error('[TELEGRAM] Alert failed:', err));

    // Big pledge alert for high-value dares
    if (amount >= BIG_PLEDGE_THRESHOLD && stakerAddress) {
      alertBigPledge({
        dareId: dbDare.id,
        shortId,
        title,
        pledgeAmount: amount,
        totalPot: amount,
        pledgerAddress: stakerAddress,
        txHash,
      }).catch(err => console.error('[TELEGRAM] Big pledge alert failed:', err));
    }

    // Build invite link for unclaimed tags (not for open bounties)
    const inviteLink = isAwaitingClaim && streamerTag
      ? `/claim-tag?invite=${inviteToken}&handle=${encodeURIComponent(streamerTag.replace('@', ''))}`
      : null;

    // -------------------------------------------------------------------------
    // 13. RETURN SUCCESS
    // -------------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      data: {
        dareId: dbDare.id,
        title,
        description,
        amount,
        streamerTag: isOpenBounty ? null : streamerTag,
        streamerAddress,
        tagSimulated,
        tagVerified,
        isOpenBounty,
        referrerAddress: referrerAddress || null,
        streamId,
        streamVerification: {
          name: streamVerification.streamName,
          playbackId: streamVerification.playbackId,
        },
        txHash,
        blockNumber: receipt.blockNumber.toString(),
        status: dareStatus,
        expiresAt: expiresAt.toISOString(),
        shortId,
        shareUrl: `/dare/${shortId}`,
        // Invite flow fields
        awaitingClaim: isAwaitingClaim,
        inviteLink,
        inviteToken,
        claimDeadline: claimDeadline?.toISOString() || null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ERROR] Bounty stake failed:', message);

    // Handle specific error cases
    if (message.includes('insufficient funds')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient USDC balance', code: 'INSUFFICIENT_FUNDS' },
        { status: 400 }
      );
    }

    if (message.includes('user rejected')) {
      return NextResponse.json(
        { success: false, error: 'Transaction rejected', code: 'USER_REJECTED' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ============================================================================
// MOCK BOUNTIES FOR SIMULATED MODE
// ============================================================================

const MOCK_BOUNTIES = [
  {
    dareId: 'sim-1001',
    title: 'Do 100 pushups on stream',
    amount: 250,
    streamerTag: '@KaiCenat',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    potSize: 1250,
  },
  {
    dareId: 'sim-1002',
    title: 'Eat the worlds hottest chip',
    amount: 500,
    streamerTag: '@xQc',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    potSize: 2100,
  },
  {
    dareId: 'sim-1003',
    title: 'Play Dark Souls blindfolded for 1 hour',
    amount: 1000,
    streamerTag: '@Asmongold',
    status: 'VERIFIED',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    potSize: 5420,
  },
  {
    dareId: 'sim-1004',
    title: 'Learn to juggle live in 30 mins',
    amount: 75,
    streamerTag: '@Pokimane',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
    potSize: 320,
  },
  {
    dareId: 'sim-1005',
    title: 'Win a game using only pistol',
    amount: 150,
    streamerTag: '@shroud',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago
    potSize: 890,
  },
  {
    dareId: 'sim-1006',
    title: 'Speak only in rhymes for 1 hour',
    amount: 200,
    streamerTag: '@Ninja',
    status: 'FAILED',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    potSize: 0,
  },
  {
    dareId: 'sim-1007',
    title: 'Beat Elden Ring boss first try',
    amount: 2500,
    streamerTag: '@TimTheTatman',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
    potSize: 8750,
  },
  {
    dareId: 'sim-1008',
    title: 'Do a backflip on camera',
    amount: 100,
    streamerTag: '@DrDisrespect',
    status: 'VERIFIED',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    potSize: 1100,
  },
];

// ============================================================================
// GET /api/bounties - FETCH ALL BOUNTIES OR SINGLE BY ID
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dareId = searchParams.get('dareId');

    // -------------------------------------------------------------------------
    // SINGLE BOUNTY LOOKUP (by dareId)
    // -------------------------------------------------------------------------
    if (dareId) {
      const validation = GetBountySchema.safeParse({ dareId });
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error.issues[0].message },
          { status: 400 }
        );
      }

      // Simulated mode - return from database or mock
      if (!isContractDeployed || FORCE_SIMULATION) {
        // First try database
        const dbBounty = await prisma.dare.findUnique({
          where: { id: dareId },
        });

        if (dbBounty) {
          return NextResponse.json({
            success: true,
            simulated: true,
            data: {
              dareId: dbBounty.id,
              title: dbBounty.title,
              amount: dbBounty.bounty,
              streamerTag: dbBounty.streamerHandle,
              status: dbBounty.status,
              createdAt: dbBounty.createdAt.toISOString(),
              potSize: Math.floor(dbBounty.bounty * 1.2),
              // Invite flow fields
              inviteToken: dbBounty.inviteToken,
              claimDeadline: dbBounty.claimDeadline?.toISOString() || null,
              targetWalletAddress: dbBounty.targetWalletAddress,
              awaitingClaim: dbBounty.status === 'AWAITING_CLAIM',
            },
          });
        }

        // Fallback to mock bounties
        const mockBounty = MOCK_BOUNTIES.find((b) => b.dareId === dareId);
        if (mockBounty) {
          return NextResponse.json({
            success: true,
            simulated: true,
            data: mockBounty,
          });
        }
        return NextResponse.json(
          { success: false, error: 'Bounty not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      // Read from contract
      const { publicClient } = getServerClients();
      const bountyData = (await publicClient.readContract({
        address: BOUNTY_CONTRACT_ADDRESS,
        abi: BOUNTY_ABI,
        functionName: 'bounties',
        args: [BigInt(validation.data.dareId)],
      })) as [bigint, Address, Address, boolean];

      const [amount, streamer, referrer, isVerified] = bountyData;

      if (amount === BigInt(0)) {
        return NextResponse.json(
          { success: false, error: 'Bounty not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          dareId: validation.data.dareId,
          amount: (Number(amount) / 1e6).toString(),
          streamer,
          referrer,
          isVerified,
          status: isVerified ? 'VERIFIED' : 'PENDING',
        },
      });
    }

    // -------------------------------------------------------------------------
    // LIST ALL BOUNTIES
    // -------------------------------------------------------------------------
    const sort = searchParams.get('sort') || 'recent'; // 'recent' | 'amount'

    // Simulated mode or no indexer - fetch from database + mock data
    if (!isContractDeployed || FORCE_SIMULATION) {
      // Fetch real bounties from database (including AWAITING_CLAIM)
      const dbBounties = await prisma.dare.findMany({
        where: { status: { in: ['PENDING', 'AWAITING_CLAIM'] } },
        orderBy: sort === 'amount' ? { bounty: 'desc' } : { createdAt: 'desc' },
        take: 50,
      });

      // Transform database bounties to API format
      const realBounties = dbBounties.map((dare) => ({
        dareId: dare.id,
        title: dare.title,
        amount: dare.bounty,
        streamerTag: dare.streamerHandle,
        status: dare.status as 'PENDING' | 'VERIFIED' | 'FAILED' | 'AWAITING_CLAIM',
        createdAt: dare.createdAt.toISOString(),
        potSize: Math.floor(dare.bounty * 1.2), // Simulated pot multiplier
        awaitingClaim: dare.status === 'AWAITING_CLAIM',
        claimDeadline: dare.claimDeadline?.toISOString() || null,
      }));

      // Combine with mock bounties if database is empty
      let allBounties = realBounties.length > 0 ? realBounties : [...MOCK_BOUNTIES];

      if (sort === 'amount') {
        allBounties.sort((a, b) => b.amount - a.amount);
      } else {
        allBounties.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }

      const totalPot = allBounties.reduce((sum, b) => sum + b.potSize, 0);

      return NextResponse.json({
        success: true,
        simulated: true,
        data: {
          bounties: allBounties,
          total: allBounties.length,
          totalPot,
        },
      });
    }

    // Contract deployed with indexer - would read from chain
    // For now, return empty if contract is deployed but no indexer
    return NextResponse.json({
      success: true,
      data: {
        bounties: [],
        total: 0,
        totalPot: 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ERROR] Bounty fetch failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
