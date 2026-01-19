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
import { baseSepolia } from 'viem/chains';
import { BOUNTY_ABI, USDC_ABI } from '@/abis/BaseDareBounty';
import { prisma } from '@/lib/prisma';

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
// $BARE TAG TO ADDRESS MAPPING (Mock for development)
// ============================================================================

const TAG_TO_ADDRESS_MAP: Record<string, Address> = {
  '@KaiCenat': '0x1234567890123456789012345678901234567890',
  '@xQc': '0x2345678901234567890123456789012345678901',
  '@Asmongold': '0x3456789012345678901234567890123456789012',
  '@Pokimane': '0x4567890123456789012345678901234567890123',
  '@Ninja': '0x5678901234567890123456789012345678901234',
  '@shroud': '0x6789012345678901234567890123456789012345',
  '@TimTheTatman': '0x7890123456789012345678901234567890123456',
  '@DrDisrespect': '0x8901234567890123456789012345678901234567',
};

function resolveTagToAddress(tag: string): { address: Address | null; simulated: boolean } {
  const normalizedTag = tag.toLowerCase();

  // Check exact match (case-insensitive)
  for (const [knownTag, address] of Object.entries(TAG_TO_ADDRESS_MAP)) {
    if (knownTag.toLowerCase() === normalizedTag) {
      return { address, simulated: false };
    }
  }

  // Tag not found - generate deterministic simulated address for testing
  const hash = normalizedTag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const simulatedAddress = `0x${hash.toString(16).padStart(8, '0')}${'0'.repeat(32)}` as Address;

  return { address: simulatedAddress, simulated: true };
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

  // Streamer tag (@username format)
  streamerTag: z
    .string()
    .min(3, 'Tag must be at least 3 characters')
    .max(20, 'Tag must be 20 characters or less')
    .regex(/^@[a-zA-Z0-9_]+$/, 'Tag must start with @ and contain only letters, numbers, and underscores'),

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

    const { title, description, amount, streamId, streamerTag, referrerAddress, referrerTag, dareId } =
      validation.data;

    // -------------------------------------------------------------------------
    // 2. RESOLVE STREAMER TAG TO ADDRESS
    // -------------------------------------------------------------------------
    const tagResolution = resolveTagToAddress(streamerTag);
    const streamerAddress = tagResolution.address;
    const tagSimulated = tagResolution.simulated;

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
    // 4. CHECK CONTRACT DEPLOYMENT STATUS / SIMULATION MODE
    // -------------------------------------------------------------------------
    if (!isContractDeployed || FORCE_SIMULATION) {
      // Contract not deployed or simulation mode - return simulated response
      console.warn('[BOUNTY] Running in simulated mode (contract not deployed or SIMULATE_BOUNTIES=true)');

      // -----------------------------------------------------------------------
      // WRITE TO PRISMA DATABASE (Simulated Mode)
      // -----------------------------------------------------------------------

      // Resolve referrer tag to address (mock mapping)
      let resolvedReferrerAddress: string | null = null;
      if (referrerTag) {
        const referrerResolution = resolveTagToAddress(referrerTag);
        resolvedReferrerAddress = referrerResolution.address;
        console.log(`[REFERRAL] Tracking referrer: ${referrerTag} -> ${resolvedReferrerAddress} (1% fee on payout)`);
      }

      const dbDare = await prisma.dare.create({
        data: {
          title,
          bounty: amount,
          streamerHandle: streamerTag,
          status: 'PENDING',
          streamId,
          txHash: null,
          isSimulated: true,
          referrerTag: referrerTag || null,
          referrerAddress: resolvedReferrerAddress,
        },
      });

      console.log(`[AUDIT] Simulated dare created in DB - id: ${dbDare.id}, title: "${title}", tag: ${streamerTag}${referrerTag ? `, referrer: ${referrerTag}` : ''}`);

      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Contract not deployed - simulated stake for frontend testing',
        data: {
          dareId: dbDare.id,
          title,
          description,
          amount,
          streamerTag,
          streamerAddress,
          tagSimulated,
          referrerAddress: referrerAddress || null,
          streamId,
          streamVerification: {
            name: streamVerification.streamName,
            playbackId: streamVerification.playbackId,
          },
          txHash: null,
          blockNumber: '0',
          status: 'PENDING',
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
    const txHash = await walletClient.writeContract({
      address: BOUNTY_CONTRACT_ADDRESS,
      abi: BOUNTY_ABI,
      functionName: 'stakeBounty',
      args: [
        finalDareId,
        streamerAddress,
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

    // Resolve referrer tag to address (mock mapping)
    let resolvedReferrerAddress: string | null = null;
    if (referrerTag) {
      const referrerResolution = resolveTagToAddress(referrerTag);
      resolvedReferrerAddress = referrerResolution.address;
      console.log(`[REFERRAL] Tracking referrer: ${referrerTag} -> ${resolvedReferrerAddress} (1% fee on payout)`);
    }

    const dbDare = await prisma.dare.create({
      data: {
        title,
        bounty: amount,
        streamerHandle: streamerTag,
        status: receipt.status === 'success' ? 'PENDING' : 'FAILED',
        streamId,
        txHash,
        isSimulated: false,
        referrerTag: referrerTag || null,
        referrerAddress: resolvedReferrerAddress,
      },
    });

    // -------------------------------------------------------------------------
    // 12. AUDIT LOG (no sensitive data)
    // -------------------------------------------------------------------------
    console.log(
      `[AUDIT] Bounty staked - dbId: ${dbDare.id}, dareId: ${finalDareId}, title: "${title}", tag: ${streamerTag}, amount: ${amount} USDC, txHash: ${txHash}`
    );

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
        streamerTag,
        streamerAddress,
        tagSimulated,
        referrerAddress: referrerAddress || null,
        streamId,
        streamVerification: {
          name: streamVerification.streamName,
          playbackId: streamVerification.playbackId,
        },
        txHash,
        blockNumber: receipt.blockNumber.toString(),
        status: receipt.status === 'success' ? 'PENDING' : 'FAILED',
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
      // Fetch real bounties from database
      const dbBounties = await prisma.dare.findMany({
        where: { status: 'PENDING' },
        orderBy: sort === 'amount' ? { bounty: 'desc' } : { createdAt: 'desc' },
        take: 50,
      });

      // Transform database bounties to API format
      const realBounties = dbBounties.map((dare) => ({
        dareId: dare.id,
        title: dare.title,
        amount: dare.bounty,
        streamerTag: dare.streamerHandle,
        status: dare.status as 'PENDING' | 'VERIFIED' | 'FAILED',
        createdAt: dare.createdAt.toISOString(),
        potSize: Math.floor(dare.bounty * 1.2), // Simulated pot multiplier
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
