import { NextRequest, NextResponse } from 'next/server';
import { getWalletClient, BOUNTY_CONTRACT_ADDRESS, publicClient } from '@/lib/contracts';

const BOUNTY_ABI = [{
    "name": "verifyAndPayout",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{"name": "_dareId", "type": "uint256"}]
}] as const;

/**
 * POST /api/verify-proof
 * Verify a dare proof and trigger on-chain payout
 */
export async function POST(req: NextRequest) {
    try {
        const { dareId } = await req.json();
        
        if (!dareId) {
            return NextResponse.json(
                { success: false, error: "Dare ID is required" },
                { status: 400 }
            );
        }

        const walletClient = getWalletClient();

        // Trigger the on-chain payout
        const hash = await walletClient.writeContract({
            address: BOUNTY_CONTRACT_ADDRESS,
            abi: BOUNTY_ABI,
            functionName: 'verifyAndPayout',
            args: [BigInt(dareId)]
        });

        // Wait for transaction receipt
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        return NextResponse.json({
            success: true,
            data: {
                txHash: hash,
                receipt,
            }
        });
    } catch (error: any) {
        console.error('Error verifying proof:', error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to verify proof" },
            { status: 500 }
        );
    }
}







