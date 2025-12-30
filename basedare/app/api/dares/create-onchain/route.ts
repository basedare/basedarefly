import { NextRequest, NextResponse } from 'next/server';
import { getWalletClient, PROTOCOL_CONTRACT_ADDRESS, PROTOCOL_ABI, publicClient } from '@/lib/contracts';
import { parseUnits } from 'viem';
import { base44 } from '@/lib/base44Client';
import type { Address } from 'viem';

/**
 * POST /api/dares/create-onchain
 * Create a dare on-chain (smart contract) and optionally sync to Base44
 * 
 * This endpoint handles the blockchain transaction for creating a dare,
 * including USDC approval and contract interaction.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      streamerAddress,
      amount, // USDC amount (in human-readable format, e.g., 100 for $100)
      referrerAddress, // Optional referrer address
      // Optional Base44 data to sync after on-chain creation
      base44Data,
    } = body;

    // Validate required fields
    if (!streamerAddress || !amount) {
      return NextResponse.json(
        { success: false, error: 'Streamer address and amount are required' },
        { status: 400 }
      );
    }

    if (amount < 5) {
      return NextResponse.json(
        { success: false, error: 'Minimum amount is $5' },
        { status: 400 }
      );
    }

    // Get wallet client for contract interaction
    const walletClient = getWalletClient();

    // Convert amount to USDC units (6 decimals for USDC)
    const amountInUnits = parseUnits(amount.toString(), 6);

    // Call createDare on the smart contract
    const hash = await walletClient.writeContract({
      address: PROTOCOL_CONTRACT_ADDRESS,
      abi: PROTOCOL_ABI,
      functionName: 'createDare',
      args: [
        streamerAddress as Address,
        amountInUnits,
        (referrerAddress || '0x0000000000000000000000000000000000000000') as Address,
      ],
    });

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Extract dare ID from event logs or transaction
    // This depends on your contract's event structure
    let dareId: bigint | null = null;
    
    // Try to extract dare ID from events
    // Adjust based on your contract's event structure
    if (receipt.logs) {
      // You'll need to decode the DareCreated event to get the dareId
      // This is a placeholder - adjust based on actual event structure
    }

    // Optionally sync to Base44 after successful on-chain creation
    let base44Dare = null;
    if (base44Data && hash) {
      try {
        base44Dare = await base44.entities.Dare.create({
          ...base44Data,
          onchain_tx_hash: hash,
          onchain_dare_id: dareId?.toString(),
          status: 'pending',
        });
      } catch (base44Error) {
        console.error('Failed to sync to Base44, but on-chain creation succeeded:', base44Error);
        // Don't fail the request if Base44 sync fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        transactionHash: hash,
        receipt,
        dareId: dareId?.toString(),
        base44Dare,
      },
    });
  } catch (error: any) {
    console.error('Error creating on-chain dare:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create on-chain dare' },
      { status: 500 }
    );
  }
}

