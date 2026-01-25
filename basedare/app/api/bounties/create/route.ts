import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Livepeer } from 'livepeer';
import { createPublicClient, createWalletClient, http, parseUnits, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { BOUNTY_ABI, USDC_ABI } from '@/abis/BaseDareBounty';

// Network selection based on environment
const IS_MAINNET = process.env.NEXT_PUBLIC_NETWORK === 'mainnet';
const activeChain = IS_MAINNET ? base : baseSepolia;
const rpcUrl = IS_MAINNET ? 'https://mainnet.base.org' : 'https://sepolia.base.org';

// Environment validation (server-side only)
const BOUNTY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS as Address;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as Address;
const LIVEPEER_API_KEY = process.env.LIVEPEER_API_KEY;

// Zod schema for request validation
const CreateBountySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title too long'),
  amount: z.number().min(5, 'Minimum bounty is $5 USDC').max(10000, 'Maximum bounty is $10,000 USDC'),
  streamId: z.string().min(1, 'Stream ID is required'),
  streamerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid streamer address'),
  referrerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid referrer address').optional(),
});

// Server-side clients (auto-selects mainnet or sepolia)
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

// Verify Livepeer stream is active
async function verifyStreamActive(streamId: string): Promise<{ active: boolean; error?: string }> {
  if (!LIVEPEER_API_KEY) {
    console.warn('LIVEPEER_API_KEY not set, skipping stream verification');
    return { active: true }; // Allow in dev without key
  }

  try {
    const livepeer = new Livepeer({ apiKey: LIVEPEER_API_KEY });
    const stream = await livepeer.stream.get(streamId);

    if (!stream.stream) {
      return { active: false, error: 'Stream not found' };
    }

    // Check if stream is active/healthy
    const isActive = stream.stream.isActive === true;
    return { active: isActive, error: isActive ? undefined : 'Stream is not currently active' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { active: false, error: `Failed to verify stream: ${message}` };
  }
}

// Check and handle USDC allowance
async function ensureAllowance(
  ownerAddress: Address,
  spenderAddress: Address,
  requiredAmount: bigint
): Promise<string | null> {
  const { publicClient, walletClient } = getServerClients();

  const currentAllowance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: [ownerAddress, spenderAddress],
  }) as bigint;

  if (currentAllowance < requiredAmount) {
    // Approve the bounty contract to spend USDC
    const approveHash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [spenderAddress, requiredAmount],
    });

    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log(`[AUDIT] USDC approval tx: ${approveHash}`);
    return approveHash;
  }
  return null;
}

/**
 * POST /api/bounties/create
 * Create a new bounty stake on-chain
 *
 * Required: { title, amount, streamId, streamerAddress }
 * Optional: { referrerAddress }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request body with Zod
    const body = await request.json();
    const validation = CreateBountySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title, amount, streamId, streamerAddress, referrerAddress } = validation.data;

    // 2. Verify Livepeer stream is active
    const streamCheck = await verifyStreamActive(streamId);
    if (!streamCheck.active) {
      return NextResponse.json(
        { success: false, error: streamCheck.error || 'Stream verification failed' },
        { status: 400 }
      );
    }

    // 3. Get server-side wallet client
    const { publicClient, walletClient, account } = getServerClients();

    // 4. Convert amount to USDC units (6 decimals)
    const amountInUnits = parseUnits(amount.toString(), 6);

    // 5. Ensure USDC allowance for the bounty contract
    await ensureAllowance(
      account.address,
      BOUNTY_CONTRACT_ADDRESS,
      amountInUnits
    );

    // 6. Generate a unique dare ID (timestamp-based for now)
    const dareId = BigInt(Date.now());

    // 7. Execute stakeBounty on the contract
    const hash = await walletClient.writeContract({
      address: BOUNTY_CONTRACT_ADDRESS,
      abi: BOUNTY_ABI,
      functionName: 'stakeBounty',
      args: [
        dareId,
        streamerAddress as Address,
        (referrerAddress || '0x0000000000000000000000000000000000000000') as Address,
        amountInUnits,
      ],
    });

    // 8. Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // 9. Audit log (server-side only, no sensitive data)
    console.log(`[AUDIT] Bounty created - dareId: ${dareId}, title: "${title}", amount: ${amount} USDC, txHash: ${hash}`);

    return NextResponse.json({
      success: true,
      data: {
        txHash: hash,
        dareId: dareId.toString(),
        title,
        amount,
        streamerAddress,
        blockNumber: receipt.blockNumber.toString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ERROR] Bounty creation failed:', message);

    return NextResponse.json(
      { success: false, error: message || 'Failed to create bounty' },
      { status: 500 }
    );
  }
}
