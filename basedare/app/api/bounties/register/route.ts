import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createPublicClient, http, decodeEventLog, isAddress, parseUnits, zeroAddress, type Address } from 'viem';
import { BOUNTY_ABI } from '@/abis/BaseDareBounty';
import { getBaseChain, getBaseRpcUrl } from '@/lib/base-chain';
import { generateOnChainDareId } from '@/lib/dare-id';
import { notifyTargetedDareReceived } from '@/lib/dare-notifications';
import { getPostFundingDareStatus } from '@/lib/dare-status';

const RegisterBountySchema = z.object({
    dareId: z.string().min(1),
    txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
});

const activeChain = getBaseChain();
const rpcUrl = getBaseRpcUrl();
const BOUNTY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS as Address;
const hasValidContractAddress = isAddress(BOUNTY_CONTRACT_ADDRESS);

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

        if (!hasValidContractAddress || BOUNTY_CONTRACT_ADDRESS === zeroAddress) {
            return NextResponse.json({ success: false, code: 'MONEY_RAILS_NOT_READY', error: 'Payment configuration unavailable' }, { status: 503 });
        }

        // 1. Check if dare exists and is in FUNDING state
        const dare = await prisma.dare.findUnique({
            where: { id: dareId }
        });

        if (!dare) {
            return NextResponse.json({ success: false, error: 'Dare not found' }, { status: 404 });
        }

        // A successful retry must not reopen a submitted, paid or refunded mission.
        if (!dare.isSimulated && dare.txHash?.toLowerCase() === txHash.toLowerCase() && dare.status !== 'FUNDING') {
            return NextResponse.json({ success: true, data: { id: dare.id, shortId: dare.shortId, status: dare.status, streamerHandle: dare.streamerHandle } });
        }
        if (dare.isSimulated || dare.status !== 'FUNDING') {
            return NextResponse.json({ success: false, error: `Dare is already ${dare.status}` }, { status: 400 });
        }

        // 2. Fetch Transaction Receipt to Verify it actually succeeded on-chain
        console.log(`[VERIFY] Fetching receipt for tx: ${txHash}`);
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });

        if (receipt.status !== 'success') {
            return NextResponse.json({ success: false, error: 'Transaction failed on-chain' }, { status: 400 });
        }

        if (!dare.stakerAddress) {
            return NextResponse.json(
                { success: false, error: 'Dare missing staker identity', code: 'MISSING_STAKER' },
                { status: 400 }
            );
        }

        const expectedOnChainDareId = dare.onChainDareId || generateOnChainDareId(dare.id).toString();

        // 3. Extract BountyCreated event and verify onChainBountyId
        let foundBountyEvent = false;
        let actualOnChainDareId = null;

        for (const log of receipt.logs) {
            try {
                if (
                    log.address.toLowerCase() !== BOUNTY_CONTRACT_ADDRESS.toLowerCase()
                ) {
                    continue;
                }

                const decoded = decodeEventLog({
                    abi: BOUNTY_ABI,
                    data: log.data,
                    topics: log.topics,
                });

                if (decoded.eventName === 'BountyFunded') {
                    // Check if this event corresponds to our dare
                    // Depending on ABI types, dareId might be bigInt
                    const eventDareId = decoded.args.dareId?.toString();

                    if (eventDareId === expectedOnChainDareId &&
                        decoded.args.backer?.toLowerCase() === dare.stakerAddress.toLowerCase() &&
                        decoded.args.amount === parseUnits(dare.bounty.toFixed(6), 6)) {
                        actualOnChainDareId = eventDareId;
                        foundBountyEvent = true;
                    }
                }
            } catch {
                // Ignore logs that don't match our ABI
            }
        }

        if (!foundBountyEvent) {
            return NextResponse.json({ success: false, error: 'Verification failed: BountyFunded event not found in transaction' }, { status: 400 });
        }

        // The event alone does not bind the recipient. Check active escrow too.
        // Use its stored backer rather than receipt.from (smart wallets use a bundler).
        const [amount, recipient, , backer, settled] = await publicClient.readContract({
            address: BOUNTY_CONTRACT_ADDRESS, abi: BOUNTY_ABI, functionName: 'bounties',
            args: [BigInt(expectedOnChainDareId)],
        });
        if (settled || amount !== parseUnits(dare.bounty.toFixed(6), 6) ||
            backer.toLowerCase() !== dare.stakerAddress.toLowerCase() ||
            !dare.targetWalletAddress || recipient.toLowerCase() !== dare.targetWalletAddress.toLowerCase()) {
            return NextResponse.json({ success: false, error: 'Escrow does not match this mission', code: 'ESCROW_MISMATCH' }, { status: 409 });
        }

        // Compare-and-set prevents a delayed registration from overwriting review/payment.
        const changed = await prisma.dare.updateMany({
            where: { id: dareId, status: 'FUNDING', isSimulated: false },
            data: {
                status: getPostFundingDareStatus({ isAwaitingClaim: false, targetWalletAddress: dare.targetWalletAddress }),
                txHash,
                onChainDareId: actualOnChainDareId || expectedOnChainDareId,
            },
        });
        const updatedDare = await prisma.dare.findUniqueOrThrow({
            where: { id: dareId },
            select: { id: true, shortId: true, status: true, streamerHandle: true, title: true, bounty: true, targetWalletAddress: true, txHash: true },
        });
        if (updatedDare.txHash?.toLowerCase() !== txHash.toLowerCase()) {
            return NextResponse.json({ success: false, error: 'Funding state changed. Refresh the mission.' }, { status: 409 });
        }

        if (changed.count === 1 && updatedDare.targetWalletAddress) {
            await notifyTargetedDareReceived({
                walletAddress: updatedDare.targetWalletAddress,
                title: updatedDare.title,
                shortId: updatedDare.shortId || updatedDare.id,
                bounty: updatedDare.bounty,
            }).catch(() => console.warn('[REGISTER] Notification delivery needs retry'));
        }

        return NextResponse.json({
            success: true,
            data: updatedDare
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[REGISTER] Verification error:', message);
        return NextResponse.json(
            { success: false, error: 'Failed to verify transaction' },
            { status: 500 }
        );
    }
}
