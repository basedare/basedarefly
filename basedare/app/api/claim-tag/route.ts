import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { alertTagClaimSubmission } from '@/lib/telegram';
import { isInternalApiAuthorized } from '@/lib/api-auth';

const ClaimTagSchema = z.object({
  tag: z
    .string()
    .min(2, 'Tag must be at least 2 characters')
    .max(20, 'Tag must be 20 characters or less')
    .regex(/^@?[a-zA-Z0-9_]+$/, 'Tag can only contain letters, numbers, and underscores'),
  platform: z.enum(['twitter', 'twitch', 'youtube', 'kick']),
  handle: z
    .string()
    .min(1, 'Handle is required')
    .max(50, 'Handle is too long')
    .regex(/^@?[a-zA-Z0-9_.-]+$/, 'Handle contains invalid characters'),
  // Accepted for compatibility but never trusted for auth.
  walletAddress: z.string().optional(),
});

type ClaimSession = {
  token?: string;
  walletAddress?: string | null;
  provider?: 'twitter' | 'twitch' | 'google' | string | null;
  platformHandle?: string | null;
  platformBio?: string | null;
  platformFollowerCount?: number | null;
  twitterId?: string | null;
  twitterHandle?: string | null;
  twitchId?: string | null;
  twitchHandle?: string | null;
  youtubeId?: string | null;
  youtubeHandle?: string | null;
  user?: {
    walletAddress?: string | null;
  } | null;
};

function normalizeTag(input: string): string {
  const cleaned = input.trim().replace(/^@+/, '');
  return `@${cleaned}`;
}

function normalizeHandle(input: string): string {
  return input.trim().replace(/^@+/, '');
}

function mapVerificationMethod(platform: 'twitter' | 'twitch' | 'youtube' | 'kick'): string {
  switch (platform) {
    case 'twitter':
      return 'TWITTER';
    case 'twitch':
      return 'TWITCH';
    case 'youtube':
      return 'YOUTUBE';
    case 'kick':
      return 'KICK';
    default:
      return 'MANUAL';
  }
}

function getPlatformFields(platform: 'twitter' | 'twitch' | 'youtube' | 'kick', handle: string) {
  const cleared = {
    twitterId: null as string | null,
    twitterHandle: null as string | null,
    twitterVerified: false,
    twitchId: null as string | null,
    twitchHandle: null as string | null,
    twitchVerified: false,
    youtubeId: null as string | null,
    youtubeHandle: null as string | null,
    youtubeVerified: false,
    kickHandle: null as string | null,
    kickVerificationCode: null as string | null,
    kickVerified: false,
  };

  switch (platform) {
    case 'twitter':
      return { ...cleared, twitterHandle: handle };
    case 'twitch':
      return { ...cleared, twitchHandle: handle };
    case 'youtube':
      return { ...cleared, youtubeHandle: handle };
    case 'kick':
      return { ...cleared, kickHandle: handle };
    default:
      return cleared;
  }
}

function buildSocialEnrichment(
  session: ClaimSession | null,
  platform: 'twitter' | 'twitch' | 'youtube' | 'kick',
  handle: string
) {
  const normalizedHandle = handle.toLowerCase();
  const platformBio = session?.platformBio?.trim() || null;
  const platformFollowerCount =
    typeof session?.platformFollowerCount === 'number' && Number.isFinite(session.platformFollowerCount)
      ? session.platformFollowerCount
      : null;

  const base = {
    bio: platformBio,
    followerCount: platformFollowerCount,
  };

  switch (platform) {
    case 'twitter':
      return {
        ...base,
        twitterId: session?.twitterId ?? null,
        twitterHandle: session?.twitterHandle ?? handle,
        twitterVerified:
          session?.provider === 'twitter' &&
          session?.platformHandle?.replace(/^@/, '').trim().toLowerCase() === normalizedHandle,
      };
    case 'twitch':
      return {
        ...base,
        twitchId: session?.twitchId ?? null,
        twitchHandle: session?.twitchHandle ?? handle,
        twitchVerified:
          session?.provider === 'twitch' &&
          session?.platformHandle?.replace(/^@/, '').trim().toLowerCase() === normalizedHandle,
      };
    case 'youtube':
      return {
        ...base,
        youtubeId: session?.youtubeId ?? null,
        youtubeHandle: session?.youtubeHandle ?? handle,
        youtubeVerified:
          session?.provider === 'google' &&
          session?.platformHandle?.replace(/^@/, '').trim().toLowerCase() === normalizedHandle,
      };
    default:
      return base;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ClaimTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const isInternalAuthorized = isInternalApiAuthorized(request);
    const session = (await getServerSession(authOptions)) as ClaimSession | null;
    if (!session && !isInternalAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Sign in required to claim a tag' },
        { status: 401 }
      );
    }

    let sessionWallet = '';

    if (isInternalAuthorized) {
      const providedWallet = (parsed.data.walletAddress || '').toLowerCase();
      if (!providedWallet || !isAddress(providedWallet)) {
        return NextResponse.json(
          { success: false, error: 'Valid walletAddress is required for internal tag claims' },
          { status: 400 }
        );
      }
      sessionWallet = providedWallet;
    } else {
      const authHeader = request.headers.get('authorization');
      const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim();
      if (session?.token && (!bearerToken || bearerToken !== session.token)) {
        return NextResponse.json(
          { success: false, error: 'Invalid session token' },
          { status: 401 }
        );
      }

      sessionWallet = (session?.walletAddress ?? session?.user?.walletAddress ?? '').toLowerCase();
      if (!sessionWallet || !isAddress(sessionWallet)) {
        return NextResponse.json(
          { success: false, error: 'Wallet session is missing. Reconnect and sign in again.' },
          { status: 401 }
        );
      }
    }

    const normalizedTag = normalizeTag(parsed.data.tag);
    const normalizedHandle = normalizeHandle(parsed.data.handle);
    const socialEnrichment = buildSocialEnrichment(session, parsed.data.platform, normalizedHandle);

    const conflictingTag = await prisma.streamerTag.findFirst({
      where: {
        tag: { equals: normalizedTag, mode: 'insensitive' },
        status: { in: ['ACTIVE', 'PENDING'] },
      },
      select: { id: true, tag: true, status: true },
    });

    if (conflictingTag) {
      return NextResponse.json(
        {
          success: false,
          error: `Tag ${conflictingTag.tag} is already claimed or pending review`,
        },
        { status: 409 }
      );
    }

    const existingTag = await prisma.streamerTag.findFirst({
      where: { tag: { equals: normalizedTag, mode: 'insensitive' } },
      select: { id: true },
    });

    const verificationMethod = mapVerificationMethod(parsed.data.platform);
    const platformFields = getPlatformFields(parsed.data.platform, normalizedHandle);
    const now = new Date();

    const claimRecord = existingTag
      ? await prisma.streamerTag.update({
          where: { id: existingTag.id },
          data: {
            tag: normalizedTag,
            walletAddress: sessionWallet,
            verificationMethod,
            status: 'PENDING',
            verifiedAt: null,
            revokedAt: null,
            revokedBy: null,
            revokeReason: null,
            updatedAt: now,
            ...platformFields,
            ...socialEnrichment,
          },
        })
      : await prisma.streamerTag.create({
          data: {
            tag: normalizedTag,
            walletAddress: sessionWallet,
            verificationMethod,
            status: 'PENDING',
            ...platformFields,
            ...socialEnrichment,
          },
        });

    void alertTagClaimSubmission({
      tagClaimId: claimRecord.id,
      tag: claimRecord.tag,
      platform: parsed.data.platform,
      handle: normalizedHandle,
      walletAddress: sessionWallet,
    }).catch((error) => {
      console.error('[CLAIM-TAG] Telegram notification failed:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Your tag claim is under review',
      data: {
        id: claimRecord.id,
        tag: claimRecord.tag,
        status: claimRecord.status,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CLAIM-TAG] Failed:', message);
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to submit tag claim right now. Please try again in a moment.',
        code: 'CLAIM_TAG_FAILED',
      },
      { status: 500 }
    );
  }
}
