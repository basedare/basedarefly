import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAddress, type Address } from 'viem';
import { prisma } from '@/lib/prisma';
import { generateOnChainDareId } from '@/lib/dare-id';
import { isBountySimulationMode } from '@/lib/bounty-mode';
import { isInternalApiAuthorized } from '@/lib/api-auth';
import { getAppSettings } from '@/lib/app-settings';
import { getAuthorizedBountyWallet } from '@/lib/bounty-create-auth-server';
import {
    BountyPlaceResolutionError,
    resolveCanonicalBountyPlaceContext,
} from '@/lib/bounty-place';
import { formatSentinelPausedMessage, getSentinelRecommendation } from '@/lib/sentinel';

const FORCE_SIMULATION = isBountySimulationMode();
const REQUIRE_WALLET_IN_SIMULATION = process.env.REQUIRE_WALLET_IN_SIMULATION !== 'false';
const OPEN_BOUNTY_TAGS = ['@everyone', '@anyone', '@all'];
const LEGACY_TAG_MAP: Record<string, Address> = {
    '@KaiCenat': '0x1234567890123456789012345678901234567890',
    '@xQc': '0x2345678901234567890123456789012345678901',
};

// Simplified schema for initialization
const InitBountySchema = z.object({
    missionMode: z.enum(['IRL', 'STREAM']).default('IRL'),
    missionTag: z.string().max(50).optional(),
    title: z.string().min(3),
    description: z.string().optional(),
    amount: z.number().min(1),
    streamId: z.string().min(1),
    streamerTag: z
        .string()
        .max(20, 'Tag must be 20 characters or less')
        .regex(/^(@[a-zA-Z0-9_]+)?$/, 'Tag must start with @ if provided')
        .optional()
        .or(z.literal('')),
    imageUrl: z.string().url().max(2048).optional(),
    imageCid: z.string().max(255).optional(),
    requireSentinel: z.boolean().optional(),
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

async function resolveTagToAddress(
    tag: string
): Promise<{ address: Address | null; simulated: boolean; verified: boolean }> {
    const normalizedTag = tag.startsWith('@') ? tag : `@${tag}`;

    const verifiedTag = await prisma.streamerTag.findUnique({
        where: { tag: normalizedTag },
        select: { walletAddress: true, status: true },
    });

    if (verifiedTag && verifiedTag.status === 'VERIFIED') {
        return {
            address: verifiedTag.walletAddress as Address,
            simulated: false,
            verified: true,
        };
    }

    const normalizedLower = normalizedTag.toLowerCase();
    for (const [knownTag, address] of Object.entries(LEGACY_TAG_MAP)) {
        if (knownTag.toLowerCase() === normalizedLower) {
            return {
                address,
                simulated: false,
                verified: false,
            };
        }
    }

    return {
        address: null,
        simulated: true,
        verified: false,
    };
}

function getPlatformWalletFallback(): Address | null {
    const platformWallet = process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS;
    return platformWallet && isAddress(platformWallet) ? (platformWallet as Address) : null;
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
            imageUrl,
            imageCid,
            requireSentinel,
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
        const normalizedTag = streamerTag?.trim().toLowerCase() || '';
        const isOpenBounty =
            !streamerTag || streamerTag.trim() === '' || OPEN_BOUNTY_TAGS.includes(normalizedTag);

        const normalizedStakerAddress = stakerAddress?.toLowerCase();
        const isInternalAuthorized = isInternalApiAuthorized(request);
        const authorizedWallet = normalizedStakerAddress
            ? await getAuthorizedBountyWallet(request, normalizedStakerAddress)
            : null;

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
                (!authorizedWallet || normalizedStakerAddress !== authorizedWallet)
            ) {
                return NextResponse.json(
                    { success: false, error: 'UNAUTHORIZED', code: 'UNAUTHORIZED' },
                    { status: 401 }
                );
            }
        } else if (!isInternalAuthorized && (!authorizedWallet || normalizedStakerAddress !== authorizedWallet)) {
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

        const appSettings = await getAppSettings();
        const sentinelRecommendation = getSentinelRecommendation({
            amount,
            missionTag: normalizedMissionTag,
            venueId: canonicalVenueId,
        });
        const requestedRequireSentinel = requireSentinel === true;
        const effectiveRequireSentinel =
            appSettings.sentinelEnabled &&
            (requestedRequireSentinel || (requireSentinel === undefined && sentinelRecommendation.recommended));

        if (!appSettings.sentinelEnabled && requestedRequireSentinel) {
            return NextResponse.json(
                {
                    success: false,
                    error: formatSentinelPausedMessage(appSettings.sentinelPausedReason),
                    code: 'SENTINEL_PAUSED',
                },
                { status: 409 }
            );
        }

        const isMainnet = process.env.NEXT_PUBLIC_NETWORK === 'mainnet';
        const activeMinDare = isMainnet ? 5 : 1;
        if (amount < activeMinDare) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Live onchain funding requires a minimum dare of $${activeMinDare}.`,
                    code: 'AMOUNT_TOO_SMALL',
                },
                { status: 400 }
            );
        }

        if (isOpenBounty) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        'Live onchain funding requires a verified target tag. Open challenges should use the database-only flow.',
                    code: 'TARGET_REQUIRED',
                },
                { status: 400 }
            );
        }

        const tagResolution = await resolveTagToAddress(streamerTag);
        if (!tagResolution.address || tagResolution.simulated || !tagResolution.verified) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        'Live onchain funding requires a claimed, verified target tag with a wallet address.',
                    code: 'TARGET_NOT_VERIFIED',
                },
                { status: 400 }
            );
        }

        const targetAddress = tagResolution.address;
        const platformWalletAddress = getPlatformWalletFallback();
        if (!platformWalletAddress) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Platform wallet fallback is not configured for live funding',
                    code: 'PLATFORM_WALLET_NOT_CONFIGURED',
                },
                { status: 500 }
            );
        }

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
                referrerAddress: platformWalletAddress,
                targetWalletAddress: targetAddress,
                imageUrl: imageUrl || null,
                imageCid: imageCid || null,
                requireSentinel: effectiveRequireSentinel,
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
                referrerAddress: platformWalletAddress,
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
