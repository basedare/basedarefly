import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { buildCampaignMatch, parseCampaignTargetingCriteria } from '@/lib/campaign-matching';

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

function normalizeWallet(value: string | null | undefined): string | null {
    if (!value || !isAddress(value)) return null;
    return value.toLowerCase();
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const brandWallet = normalizeWallet(searchParams.get('brandWallet'));
        const sessionWallet = await getVerifiedSessionWallet(request);
        const actingWallet = sessionWallet ?? brandWallet;

        if (!actingWallet) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        if (sessionWallet && brandWallet && brandWallet !== sessionWallet) {
            return NextResponse.json(
                { success: false, error: 'Wallet mismatch. Use the connected brand wallet.' },
                { status: 401 }
            );
        }

        const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: {
                brand: {
                    select: { walletAddress: true, name: true },
                },
                venue: {
                    select: { id: true, slug: true, name: true, city: true, country: true },
                },
            },
        });

        if (!campaign) {
            return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
        }

        if (campaign.brand.walletAddress.toLowerCase() !== actingWallet) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized - not campaign owner' },
                { status: 403 }
            );
        }

        const targeting = parseCampaignTargetingCriteria(campaign.targetingCriteria);

        const candidates = await prisma.streamerTag.findMany({
            where: {
                status: { in: ['ACTIVE', 'VERIFIED'] },
            },
            select: {
                id: true,
                tag: true,
                bio: true,
                followerCount: true,
                tags: true,
                status: true,
                twitterHandle: true,
                twitterVerified: true,
                twitchHandle: true,
                twitchVerified: true,
                youtubeHandle: true,
                youtubeVerified: true,
                kickHandle: true,
                kickVerified: true,
                totalEarned: true,
                completedDares: true,
            },
            take: 100,
            orderBy: [{ followerCount: 'desc' }, { completedDares: 'desc' }, { totalEarned: 'desc' }],
        });

        const matches = candidates
            .map((candidate) => buildCampaignMatch(candidate, targeting))
            .sort((a, b) => b.score - a.score)
            .slice(0, 25);

        return NextResponse.json({
            success: true,
            data: {
                campaign: {
                    id: campaign.id,
                    title: campaign.title,
                    type: campaign.type,
                    tier: campaign.tier,
                    venue: campaign.venue,
                    targeting,
                },
                matches,
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[CAMPAIGN_MATCHES] Failed:', message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
