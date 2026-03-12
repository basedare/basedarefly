import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const ClaimTagSchema = z.object({
  walletAddress: z.string().refine(isAddress, 'Invalid wallet address'),
  tag: z
    .string()
    .min(2, 'Tag must be at least 2 characters')
    .max(20, 'Tag must be 20 characters or less')
    .regex(/^@?[a-zA-Z0-9_]+$/, 'Tag can only contain letters, numbers, and underscores'),
  inviteToken: z.string().min(1).optional(),
});

type ClaimSession = {
  provider?: string;
  token?: string;
  twitterId?: string;
  twitterHandle?: string;
  twitchId?: string;
  twitchHandle?: string;
  youtubeId?: string;
  youtubeHandle?: string;
};

type ProviderContext = {
  verificationMethod: 'TWITTER' | 'TWITCH' | 'YOUTUBE';
  platformId: string;
  platformHandle: string;
};

function normalizeTag(input: string): string {
  return input.startsWith('@') ? input : `@${input}`;
}

function getProviderContext(session: ClaimSession): ProviderContext | null {
  if (session.provider === 'twitter' && session.twitterId && session.twitterHandle) {
    return {
      verificationMethod: 'TWITTER',
      platformId: session.twitterId,
      platformHandle: session.twitterHandle,
    };
  }

  if (session.provider === 'twitch' && session.twitchId && session.twitchHandle) {
    return {
      verificationMethod: 'TWITCH',
      platformId: session.twitchId,
      platformHandle: session.twitchHandle,
    };
  }

  if (session.provider === 'google' && session.youtubeId && session.youtubeHandle) {
    return {
      verificationMethod: 'YOUTUBE',
      platformId: session.youtubeId,
      platformHandle: session.youtubeHandle,
    };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sign in required to claim a tag' },
        { status: 401 }
      );
    }

    const sessionData = session as unknown as ClaimSession;

    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (bearerToken && sessionData.token && bearerToken !== sessionData.token) {
      return NextResponse.json(
        { success: false, error: 'Invalid session token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = ClaimTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const providerContext = getProviderContext(sessionData);
    if (!providerContext) {
      return NextResponse.json(
        { success: false, error: 'OAuth provider session is missing required account data' },
        { status: 400 }
      );
    }

    const { walletAddress: rawWalletAddress, tag, inviteToken } = parsed.data;
    const walletAddress = rawWalletAddress.toLowerCase();
    const normalizedTag = normalizeTag(tag);
    const { verificationMethod, platformId, platformHandle } = providerContext;

    const existingTag = await prisma.streamerTag.findUnique({
      where: { tag: normalizedTag },
      select: { tag: true, walletAddress: true, status: true },
    });

    if (existingTag && existingTag.status !== 'REVOKED' && existingTag.walletAddress !== walletAddress) {
      return NextResponse.json(
        { success: false, error: `Tag ${normalizedTag} is already claimed` },
        { status: 409 }
      );
    }

    const providerWhere =
      verificationMethod === 'TWITTER'
        ? { twitterId: platformId }
        : verificationMethod === 'TWITCH'
          ? { twitchId: platformId }
          : { youtubeId: platformId };

    const existingPlatform = await prisma.streamerTag.findFirst({
      where: {
        ...providerWhere,
        status: { not: 'REVOKED' },
        NOT: { tag: normalizedTag },
      },
      select: { tag: true },
    });

    if (existingPlatform) {
      return NextResponse.json(
        {
          success: false,
          error: `This ${verificationMethod.toLowerCase()} account is already linked to tag ${existingPlatform.tag}`,
        },
        { status: 400 }
      );
    }

    const walletTagCount = await prisma.streamerTag.count({
      where: {
        walletAddress,
        status: { in: ['ACTIVE', 'PENDING'] },
        NOT: { tag: normalizedTag },
      },
    });

    if (walletTagCount >= 3) {
      return NextResponse.json(
        { success: false, error: 'Maximum 3 tags per wallet' },
        { status: 400 }
      );
    }

    const now = new Date();
    const platformData =
      verificationMethod === 'TWITTER'
        ? {
            twitterId: platformId,
            twitterHandle: platformHandle,
            twitterVerified: true,
          }
        : verificationMethod === 'TWITCH'
          ? {
              twitchId: platformId,
              twitchHandle: platformHandle,
              twitchVerified: true,
            }
          : {
              youtubeId: platformId,
              youtubeHandle: platformHandle,
              youtubeVerified: true,
            };

    const streamerTag = await prisma.streamerTag.upsert({
      where: { tag: normalizedTag },
      update: {
        walletAddress,
        verificationMethod,
        status: 'ACTIVE',
        verifiedAt: now,
        revokedAt: null,
        revokedBy: null,
        revokeReason: null,
        ...platformData,
      },
      create: {
        tag: normalizedTag,
        walletAddress,
        verificationMethod,
        status: 'ACTIVE',
        verifiedAt: now,
        ...platformData,
      },
    });

    const activationWhere = {
      status: 'AWAITING_CLAIM',
      streamerHandle: { equals: normalizedTag, mode: 'insensitive' as const },
      ...(inviteToken ? { inviteToken } : {}),
    };

    const pendingDares = await prisma.dare.findMany({
      where: activationWhere,
      select: { bounty: true },
    });

    if (pendingDares.length > 0) {
      await prisma.dare.updateMany({
        where: activationWhere,
        data: {
          status: 'PENDING',
          targetWalletAddress: walletAddress,
        },
      });
    }

    const totalActivatedBounty = pendingDares.reduce((sum, dare) => sum + dare.bounty, 0);

    return NextResponse.json({
      success: true,
      data: {
        tag: streamerTag.tag,
        walletAddress: streamerTag.walletAddress,
        status: streamerTag.status,
        platformHandle,
        activatedDares: pendingDares.length,
        totalActivatedBounty,
        message:
          pendingDares.length > 0
            ? `Tag claimed and activated! ${pendingDares.length} pending dare${pendingDares.length > 1 ? 's' : ''} worth $${totalActivatedBounty.toLocaleString()} USDC are now active.`
            : 'Tag claimed and active!',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CLAIM-TAG] Failed:', message);
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to claim tag right now. Please try again in a moment.',
        code: 'CLAIM_TAG_FAILED',
      },
      { status: 500 }
    );
  }
}
