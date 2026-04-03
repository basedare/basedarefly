import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { buildCampaignMatch, parseCampaignTargetingCriteria } from '@/lib/campaign-matching';
import { findPrimaryCreatorTagForWallet } from '@/lib/creator-tag-resolver';
import { isPlaceTagTableMissingError } from '@/lib/place-tags';

type WalletSession = {
  token?: string;
  walletAddress?: string;
  user?: {
    walletAddress?: string | null;
  } | null;
};

function normalizeWallet(value: string | null | undefined): string | null {
  if (!value || !isAddress(value)) return null;
  return value.toLowerCase();
}

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryWallet = normalizeWallet(searchParams.get('wallet'));
    const sessionWallet = await getVerifiedSessionWallet(request);
    const actingWallet = sessionWallet ?? queryWallet;

    if (!actingWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (sessionWallet && queryWallet && queryWallet !== sessionWallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet mismatch. Use the connected creator wallet.' },
        { status: 401 }
      );
    }

    const creator = await findPrimaryCreatorTagForWallet(actingWallet);

    if (!creator) {
      return NextResponse.json({
        success: true,
        data: {
          creator: null,
          campaigns: [],
          reason: 'CLAIM_TAG_REQUIRED',
        },
      });
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        type: 'PLACE',
        status: 'LIVE',
      },
      include: {
        venue: {
          select: {
            id: true,
            slug: true,
            name: true,
            city: true,
            country: true,
          },
        },
        linkedDare: {
          select: {
            id: true,
            shortId: true,
            status: true,
            expiresAt: true,
            streamerHandle: true,
            targetWalletAddress: true,
            claimRequestWallet: true,
            claimRequestStatus: true,
          },
        },
      },
      orderBy: [{ liveAt: 'desc' }, { createdAt: 'desc' }],
      take: 30,
    });

    let venueMarkCounts = new Map<string, { total: number; firstMarks: number }>();
    let cityMarkCounts = new Map<string, number>();

    try {
      const creatorMarks = await prisma.placeTag.findMany({
        where: {
          status: 'APPROVED',
          creatorTag: creator.tag,
        },
        select: {
          firstMark: true,
          venueId: true,
          venue: {
            select: {
              city: true,
              country: true,
            },
          },
        },
      });

      venueMarkCounts = creatorMarks.reduce((accumulator, mark) => {
        const current = accumulator.get(mark.venueId) ?? { total: 0, firstMarks: 0 };
        current.total += 1;
        if (mark.firstMark) {
          current.firstMarks += 1;
        }
        accumulator.set(mark.venueId, current);
        return accumulator;
      }, new Map<string, { total: number; firstMarks: number }>());

      cityMarkCounts = creatorMarks.reduce((accumulator, mark) => {
        const cityKey = [mark.venue.city ?? '', mark.venue.country ?? ''].join('|').toLowerCase();
        if (!cityKey || cityKey === '|') {
          return accumulator;
        }
        accumulator.set(cityKey, (accumulator.get(cityKey) ?? 0) + 1);
        return accumulator;
      }, new Map<string, number>());
    } catch (error) {
      if (!isPlaceTagTableMissingError(error)) {
        throw error;
      }
    }

    const opportunities = campaigns
      .map((campaign) => {
        const linkedDareExpiresAt = campaign.linkedDare?.expiresAt
          ? new Date(campaign.linkedDare.expiresAt)
          : null;
        const linkedDareIsExpired = Boolean(
          linkedDareExpiresAt && linkedDareExpiresAt.getTime() <= Date.now()
        );
        const targeting = parseCampaignTargetingCriteria(campaign.targetingCriteria);
        const match = buildCampaignMatch(creator, targeting);
        const reasons = [...match.reasons];
        let score = match.score;

        if (campaign.venue) {
          score += 6;
          reasons.unshift(`paid activation at ${campaign.venue.name}`);
        }

        if (campaign.linkedDare?.status === 'PENDING' && !linkedDareIsExpired) {
          score += 8;
          reasons.unshift('live now and ready to complete');
        }

        const venueAffinity = campaign.venue ? venueMarkCounts.get(campaign.venue.id) : undefined;
        const cityKey = campaign.venue
          ? [campaign.venue.city ?? '', campaign.venue.country ?? ''].join('|').toLowerCase()
          : '';
        const cityMarks = cityKey && cityKey !== '|' ? cityMarkCounts.get(cityKey) ?? 0 : 0;

        return {
          id: campaign.id,
          shortId: campaign.shortId,
          title: campaign.title,
          description: campaign.description,
          payoutAmount: campaign.payoutPerCreator,
          payoutCurrency: 'USDC' as const,
          matchScore: score,
          matchReasons: reasons.slice(0, 5),
          status: campaign.status,
          venue: campaign.venue,
          linkedDare: campaign.linkedDare,
          affinity: {
            venueMarks: venueAffinity?.total ?? 0,
            firstMarksAtVenue: venueAffinity?.firstMarks ?? 0,
            cityMarks,
          },
          claimable: Boolean(
            campaign.linkedDare &&
              !campaign.linkedDare.streamerHandle &&
              campaign.linkedDare.status === 'PENDING' &&
              !linkedDareIsExpired &&
              !campaign.linkedDare.targetWalletAddress &&
              !campaign.linkedDare.claimRequestWallet
          ),
          shortlisted: false,
        };
      })
      .filter((campaign) => campaign.matchScore > 0 && campaign.claimable)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 8);

    return NextResponse.json({
      success: true,
      data: {
        creator: {
          tag: creator.tag,
          followerCount: creator.followerCount,
          tags: creator.tags,
          completedDares: creator.completedDares,
          totalEarned: creator.totalEarned,
          platforms: [
            creator.twitterHandle ? 'twitter' : null,
            creator.twitchHandle ? 'twitch' : null,
            creator.youtubeHandle ? 'youtube' : null,
            creator.kickHandle ? 'kick' : null,
          ].filter(Boolean),
        },
        campaigns: opportunities,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load creator opportunities';
    console.error('[FOR_CREATOR_CAMPAIGNS] Failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
