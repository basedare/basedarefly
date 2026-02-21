import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createPublicClient, http, decodeEventLog } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { BOUNTY_ABI } from '@/abis/BaseDareBounty';

const RegisterBountySchema = z.object({
    dareId: z.string().min(1),
    txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
});

const IS_MAINNET = process.env.NEXT_PUBLIC_NETWORK === 'mainnet';
const activeChain = IS_MAINNET ? base : baseSepolia;
const rpcUrl = IS_MAINNET ? 'https://mainnet.base.org' : 'https://sepolia.base.org';

const publicClient = createPublicClient({
    chain: activeChain,
    transport: http(rpcUrl),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validation = RegisterBountySchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { dareId, txHash } = validation.data;

        // 1. Check if dare exists and is in FUNDING state
        const dare = await prisma.dare.findUnique({
            where: { id: dareId }
        });

        if (!dare) {
            return NextResponse.json({ success: false, error: 'Dare not found' }, { status: 404 });
        }

        if (dare.status !== 'FUNDING') {
            return NextResponse.json({ success: false, error: `Dare is already ${dare.status}` }, { status: 400 });
        }

        // 2. Fetch Transaction Receipt to Verify it actually succeeded on-chain
        console.log(`[VERIFY] Fetching receipt for tx: ${txHash}`);
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });

        if (receipt.status !== 'success') {
            return NextResponse.json({ success: false, error: 'Transaction failed on-chain' }, { status: 400 });
        }

        // 3. Extract BountyCreated event and verify onChainBountyId
        let foundBountyEvent = false;
        let actualOnChainDareId = null;

        for (const log of receipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: BOUNTY_ABI,
                    data: log.data,
                    topics: log.topics,
                });

                if (decoded.eventName === 'BountyFunded') {
                    // Check if this event corresponds to our dare
                    // Depending on ABI types, dareId might be bigInt
                    const eventDareId = decoded.args.dareId?.toString();

                    if (dare.onChainDareId === null) {
                        actualOnChainDareId = eventDareId;
                        foundBountyEvent = true;
                    } else if (eventDareId === dare.onChainDareId) {
                        foundBountyEvent = true;
                    }
                }
            } catch (e) {
                // Ignore logs that don't match our ABI
            }
        }

        if (!foundBountyEvent) {
            return NextResponse.json({ success: false, error: 'Verification failed: BountyFunded event not found in transaction' }, { status: 400 });
        }

        // 4. Update the DB with the hash and new status
        const updatedDare = await prisma.dare.update({
            where: { id: dareId },
            data: {
                status: 'PENDING',
                txHash,
                onChainDareId: actualOnChainDareId || dare.onChainDareId
            },
            select: {
                id: true,
                shortId: true,
                status: true,
                streamerHandle: true,
            }
        });

        return NextResponse.json({
            success: true,
            data: updatedDare
        });

    } catch (error: any) {
        console.error('[REGISTER] Verification error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to verify transaction' },
            { status: 500 }
        );
    }
}
