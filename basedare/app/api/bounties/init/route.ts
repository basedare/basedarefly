import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { generateOnChainDareId } from '@/lib/dare-id';
import { authOptions } from '@/lib/auth-options';
import { isInternalApiAuthorized } from '@/lib/api-auth';
import {
    BountyPlaceResolutionError,
    resolveCanonicalBountyPlaceContext,
} from '@/lib/bounty-place';

const FORCE_SIMULATION = process.env.SIMULATE_BOUNTIES === 'true';
const REQUIRE_WALLET_IN_SIMULATION = process.env.REQUIRE_WALLET_IN_SIMULATION !== 'false';

type WalletSession = {
    token?: string;
    walletAddress?: string;
    user?: {
        walletAddress?: string | null;
    } | null;
};

async function getVerifiedSessionWallet(request: NextRequest): Promise<string | null> {
    const session = (await getServerSession(authOptions)) as WalletSession | null;
    if (!session) return null;

    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (session.token && (!bearerToken || bearerToken !== session.token)) {
        return null;
    }

    const wallet = session.walletAddress ?? session.user?.walletAddress ?? null;
    if (!wallet || !isAddress(wallet)) return null;

    return wallet.toLowerCase();
}

// Simplified schema for initialization
const InitBountySchema = z.object({
    missionMode: z.enum(['IRL', 'STREAM']).default('IRL'),
    missionTag: z.string().max(50).optional(),
    title: z.string().min(3),
    description: z.string().optional(),
    amount: z.number().min(5),
    streamId: z.string().min(1),
    streamerTag: z
        .string()
        .max(20, 'Tag must be 20 characters or less')
        .regex(/^(@[a-zA-Z0-9_]+)?$/, 'Tag must start with @ if provided')
        .optional()
        .or(z.literal('')),
    stakerAddress: z.string().optional(),
    isNearbyDare: z.boolean().default(false),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    locationLabel: z.string().max(100).optional(),
    discoveryRadiusKm: z.number().min(0.5).max(50).default(5),
    venueId: z.string().min(1).optional(),
    creationContext: z.enum(['MAP', 'CREATE']).optional(),
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
            missionMode,
            missionTag,
            title,
            amount,
            streamId,
            streamerTag,
            stakerAddress,
            isNearbyDare: rawIsNearbyDare,
            latitude: rawLatitude,
            longitude: rawLongitude,
            locationLabel: rawLocationLabel,
            discoveryRadiusKm: rawDiscoveryRadiusKm,
            venueId,
            creationContext,
        } = validation.data;
        const normalizedMissionMode = missionMode === 'STREAM' ? 'STREAM' : 'IRL';
        const normalizedMissionTag = missionTag?.trim() || null;

        const normalizedStakerAddress = stakerAddress?.toLowerCase();
        const sessionWallet = await getVerifiedSessionWallet(request);
        const isInternalAuthorized = isInternalApiAuthorized(request);

        if (!normalizedStakerAddress || !isAddress(normalizedStakerAddress)) {
            return NextResponse.json(
                { success: false, error: 'UNAUTHORIZED', code: 'UNAUTHORIZED' },
                { status: 401 }
            );
        }

        if (FORCE_SIMULATION) {
            if (
                REQUIRE_WALLET_IN_SIMULATION &&
                !isInternalAuthorized &&
                (!sessionWallet || normalizedStakerAddress !== sessionWallet)
            ) {
                return NextResponse.json(
                    { success: false, error: 'UNAUTHORIZED', code: 'UNAUTHORIZED' },
                    { status: 401 }
                );
            }
        } else if (!isInternalAuthorized && sessionWallet && normalizedStakerAddress !== sessionWallet) {
            return NextResponse.json(
                { success: false, error: 'UNAUTHORIZED', code: 'UNAUTHORIZED' },
                { status: 401 }
            );
        }

        const placeContext = await resolveCanonicalBountyPlaceContext({
            venueId,
            creationContext,
            isNearbyDare: rawIsNearbyDare,
            latitude: rawLatitude,
            longitude: rawLongitude,
            locationLabel: rawLocationLabel,
            discoveryRadiusKm: rawDiscoveryRadiusKm,
        });

        const {
            venueId: canonicalVenueId,
            isNearbyDare,
            latitude,
            longitude,
            locationLabel,
            discoveryRadiusKm,
            geohash,
        } = placeContext;

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
                missionMode: normalizedMissionMode,
                tag: normalizedMissionTag,
                bounty: amount,
                streamerHandle: streamerTag || null,
                status: 'FUNDING',
                streamId,
                isSimulated: false,
                expiresAt,
                shortId,
                stakerAddress: normalizedStakerAddress || null,
                venueId: canonicalVenueId,
                isNearbyDare,
                latitude: isNearbyDare ? latitude : null,
                longitude: isNearbyDare ? longitude : null,
                geohash,
                locationLabel: isNearbyDare ? locationLabel : null,
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
                venueId: canonicalVenueId,
                isNearbyDare,
                latitude: isNearbyDare ? latitude : null,
                longitude: isNearbyDare ? longitude : null,
                geohash,
                locationLabel: isNearbyDare ? locationLabel : null,
                discoveryRadiusKm: isNearbyDare ? discoveryRadiusKm : null,
            },
        });
    } catch (error: unknown) {
        if (error instanceof BountyPlaceResolutionError) {
            return NextResponse.json(
                { success: false, error: error.message, code: error.code },
                { status: 400 }
            );
        }
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[INIT] Error:', message);
        return NextResponse.json(
            { success: false, error: 'Failed to initialize bounty' },
            { status: 500 }
        );
    }
}
