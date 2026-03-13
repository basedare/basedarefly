import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { generateOnChainDareId } from '@/lib/dare-id';
import { encodeGeohash, isValidCoordinates } from '@/lib/geo';

// Simplified schema for initialization
const InitBountySchema = z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    amount: z.number().min(5),
    streamId: z.string().min(1),
    streamerTag: z.string().optional().or(z.literal('')),
    missionMode: z.enum(['IRL', 'STREAM']).default('IRL'),
    missionTag: z.string().max(40).default('nightlife'),
    stakerAddress: z.string().optional(),
    isNearbyDare: z.boolean().default(false),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    locationLabel: z.string().max(100).optional(),
    discoveryRadiusKm: z.number().min(0.5).max(50).default(5),
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
            missionMode,
            missionTag,
            stakerAddress,
            isNearbyDare,
            latitude,
            longitude,
            locationLabel,
            discoveryRadiusKm,
        } = validation.data;

        if (isNearbyDare && (latitude === undefined || longitude === undefined)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Latitude and longitude are required for nearby dares',
                    code: 'MISSING_COORDINATES',
                },
                { status: 400 }
            );
        }

        let geohash: string | null = null;
        if (isNearbyDare && latitude !== undefined && longitude !== undefined) {
            if (!isValidCoordinates(latitude, longitude)) {
                return NextResponse.json(
                    { success: false, error: 'Invalid coordinates provided', code: 'INVALID_COORDINATES' },
                    { status: 400 }
                );
            }
            geohash = encodeGeohash(latitude, longitude, 6);
        }

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
                missionMode,
                tag: missionTag,
                bounty: amount,
                streamerHandle: streamerTag || null,
                status: 'FUNDING',
                streamId,
                isSimulated: false,
                expiresAt,
                shortId,
                stakerAddress: stakerAddress?.toLowerCase() || null,
                isNearbyDare,
                latitude: isNearbyDare ? latitude ?? null : null,
                longitude: isNearbyDare ? longitude ?? null : null,
                geohash,
                locationLabel: isNearbyDare ? locationLabel ?? null : null,
                discoveryRadiusKm: isNearbyDare ? discoveryRadiusKm : null,
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
                shortId,
                isNearbyDare,
                latitude: isNearbyDare ? latitude ?? null : null,
                longitude: isNearbyDare ? longitude ?? null : null,
                geohash,
                locationLabel: isNearbyDare ? locationLabel ?? null : null,
                discoveryRadiusKm: isNearbyDare ? discoveryRadiusKm : null,
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[INIT] Error:', message);
        return NextResponse.json(
            { success: false, error: 'Failed to initialize bounty' },
            { status: 500 }
        );
    }
}
