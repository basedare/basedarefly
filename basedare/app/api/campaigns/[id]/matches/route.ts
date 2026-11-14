import { authorizeBuyerWallet, buyerJson } from '@/lib/buyer-workspace-auth';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { getRankedCampaignMatches, parseCampaignTargetingCriteria } from '@/lib/campaign-matching';

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
        const actingWallet = await authorizeBuyerWallet(request, brandWallet);

        if (!actingWallet) {
            return buyerJson({ success: false, error: 'Unauthorized' }, 401);
        }

        if (sessionWallet && brandWallet && brandWallet !== sessionWallet) {
            return buyerJson(
                { success: false, error: 'Wallet mismatch. Use the connected brand wallet.' },
                401
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
            return buyerJson({ success: false, error: 'Campaign not found' }, 404);
        }

        if (campaign.brand.walletAddress.toLowerCase() !== actingWallet) {
            return buyerJson(
                { success: false, error: 'Unauthorized - not campaign owner' },
                403
            );
        }

        const targeting = parseCampaignTargetingCriteria(campaign.targetingCriteria);

        const matches = await getRankedCampaignMatches(prisma, {
            targeting,
            venueId: campaign.venue?.id ?? null,
            venueCity: campaign.venue?.city ?? null,
            venueCountry: campaign.venue?.country ?? null,
            limit: 25,
        });

        return buyerJson({
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
        return buyerJson({ success: false, error: 'Creator suggestions could not load. Please retry.' }, 503);
    }
}
