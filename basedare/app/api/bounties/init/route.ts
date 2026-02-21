import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { generateOnChainDareId } from '@/lib/dare-id';

// Simplified schema for initialization
const InitBountySchema = z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    amount: z.number().min(5),
    streamId: z.string().min(1),
    streamerTag: z.string().optional().or(z.literal('')),
    stakerAddress: z.string().optional(),
});

function generateShortId(length = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validation = InitBountySchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const {
            title,
            amount,
            streamId,
            streamerTag,
            stakerAddress,
        } = validation.data;

        // Resolve tag to address (dummy implementation for target/referrer in this MVP)
        // We'll use zero address for target if not resolving specifically right now
        const targetAddress = '0x0000000000000000000000000000000000000000';
        const PLATFORM_WALLET_ADDRESS = process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';

        // Create DB record in FUNDING state
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const shortId = generateShortId();

        const dbDare = await prisma.dare.create({
            data: {
                title,
                bounty: amount,
                streamerHandle: streamerTag || null,
                status: 'FUNDING',
                streamId,
                isSimulated: false,
                expiresAt,
                shortId,
                stakerAddress: stakerAddress?.toLowerCase() || null,
            },
        });

        const onChainDareId = generateOnChainDareId(dbDare.id).toString();

        return NextResponse.json({
            success: true,
            data: {
                dareId: dbDare.id,
                onChainDareId,
                targetAddress,
                referrerAddress: PLATFORM_WALLET_ADDRESS,
                shortId
            },
        });
    } catch (error: any) {
        console.error('[INIT] Error:', error.message);
        return NextResponse.json(
            { success: false, error: 'Failed to initialize bounty' },
            { status: 500 }
        );
    }
}
