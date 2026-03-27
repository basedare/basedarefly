import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { alertTagClaimSubmission } from '@/lib/telegram';
import { isAddress } from 'viem';
import {
  annotatePrimaryTags,
  deriveIdentityHandle,
  deriveIdentityPlatform,
  deriveIdentityVerificationCode,
  selectPrimaryTag,
} from '@/lib/creator-identity';

type WalletSession = {
  token?: string;
  walletAddress?: string;
  user?: {
    walletAddress?: string | null;
  } | null;
  provider?: string;
  platformBio?: string | null;
  platformFollowerCount?: number | null;
  twitterId?: string;
  twitterHandle?: string;
  twitchId?: string;
  twitchHandle?: string;
  youtubeId?: string;
  youtubeHandle?: string;
  identityPlatform?: string;
  identityHandle?: string;
};

const MANUAL_IDENTITY_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'twitter', 'other'] as const;

function formatPlatformLabel(platform: string) {
  if (platform === 'twitter') return 'X';
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

// ============================================================================
// GET /api/tags - List all verified tags or check availability
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get('tag');
  const wallet = searchParams.get('wallet');
  const normalizedWallet = wallet && isAddress(wallet) ? wallet.toLowerCase() : null;

  try {
    // Check specific tag availability
    if (tag) {
      const normalizedTag = tag.startsWith('@') ? tag : `@${tag}`;
      const existing = await prisma.streamerTag.findUnique({
        where: { tag: normalizedTag },
        select: {
          tag: true,
          status: true,
          twitterHandle: true,
          twitchHandle: true,
          youtubeHandle: true,
          kickHandle: true,
          walletAddress: true,
          verifiedAt: true,
          verificationMethod: true,
          kickVerificationCode: true,
          bio: true,
          followerCount: true,
          tags: true,
        },
      });

      if (existing) {
        const ownedByCurrentWallet =
          Boolean(normalizedWallet) && existing.walletAddress.toLowerCase() === normalizedWallet;

        return NextResponse.json({
          available: ownedByCurrentWallet,
          ownedByCurrentWallet,
          tag: existing.tag,
          status: existing.status,
          owner:
            existing.status === 'ACTIVE' || existing.status === 'VERIFIED'
              ? existing.walletAddress.slice(0, 6) + '...'
              : null,
          platform: existing.verificationMethod?.toLowerCase(),
          identityPlatform: deriveIdentityPlatform(existing),
          identityHandle: deriveIdentityHandle(existing),
          identityVerificationCode: deriveIdentityVerificationCode(existing),
        });
      }

      return NextResponse.json({ available: true, tag: normalizedTag });
    }

    // Get tags for a specific wallet
    if (wallet) {
      const tags = await prisma.streamerTag.findMany({
        where: { walletAddress: normalizedWallet ?? wallet.toLowerCase() }, // Normalize to lowercase
        select: {
          id: true,
          tag: true,
          walletAddress: true,
          bio: true,
          followerCount: true,
          tags: true,
          verificationMethod: true,
          verifiedAt: true,
          twitterHandle: true,
          twitterVerified: true,
          twitchHandle: true,
          twitchVerified: true,
          youtubeHandle: true,
          youtubeVerified: true,
          kickHandle: true,
          kickVerificationCode: true,
          kickVerified: true,
          status: true,
          revokedAt: true,
          revokedBy: true,
          revokeReason: true,
          totalEarned: true,
          completedDares: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const annotatedTags = annotatePrimaryTags(tags);
      const primaryTag = selectPrimaryTag(annotatedTags);

      return NextResponse.json({
        success: true,
        primaryTag: primaryTag
          ? {
              id: primaryTag.id,
              tag: primaryTag.tag,
              status: primaryTag.status,
              identityPlatform: primaryTag.identityPlatform,
              identityHandle: primaryTag.identityHandle,
            }
          : null,
        tags: annotatedTags,
      });
    }

    // List all verified tags (public)
    const verifiedTags = await prisma.streamerTag.findMany({
      where: { status: { in: ['VERIFIED', 'ACTIVE'] } },
      select: {
        tag: true,
        twitterHandle: true,
        twitchHandle: true,
        youtubeHandle: true,
        kickHandle: true,
        kickVerificationCode: true,
        verificationMethod: true,
        totalEarned: true,
        completedDares: true,
        verifiedAt: true,
        bio: true,
        followerCount: true,
        tags: true,
      },
      orderBy: { totalEarned: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      tags: verifiedTags.map((tagRecord) => ({
        ...tagRecord,
        identityPlatform: deriveIdentityPlatform(tagRecord),
        identityHandle: deriveIdentityHandle(tagRecord),
        identityVerificationCode: deriveIdentityVerificationCode(tagRecord),
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ============================================================================
// POST /api/tags - Claim a tag via OAuth or manual verification
// ============================================================================

const ClaimTagSchema = z.object({
  walletAddress: z.string().refine(isAddress, 'Invalid wallet address'),
  tag: z
    .string()
    .min(2, 'Tag must be at least 2 characters')
    .max(20, 'Tag must be 20 characters or less')
    .regex(/^@?[a-zA-Z0-9_]+$/, 'Tag can only contain letters, numbers, and underscores'),
  platform: z.enum(['twitter', 'twitch', 'youtube', 'kick']).optional().default('twitter'),
  identityPlatform: z.enum(MANUAL_IDENTITY_PLATFORMS).optional(),
  // For manual verification (any platform)
  manualUsername: z.string().optional(),
  manualCode: z.string().optional(),
  // Legacy Kick fields (redirect to manual fields)
  kickUsername: z.string().optional(),
  kickCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as WalletSession | null;

    // Parse request
    const body = await request.json();
    const validation = ClaimTagSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      walletAddress: rawWalletAddress,
      tag,
      platform,
      identityPlatform,
      manualUsername,
      manualCode,
      kickUsername,
      kickCode,
    } = validation.data;
    const normalizedTag = tag.startsWith('@') ? tag : `@${tag}`;

    // Support legacy Kick fields by merging into manual fields
    const effectiveManualUsername = manualUsername || kickUsername;
    const effectiveManualCode = manualCode || kickCode;
    const isManualRequest = Boolean(effectiveManualCode && effectiveManualUsername);
    const claimPlatform = (isManualRequest ? (identityPlatform ?? platform) : platform) as string;

    let sessionWallet: string | null = null;
    if (session) {
      const authHeader = request.headers.get('authorization');
      const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim();
      if (session.token && (!bearerToken || bearerToken !== session.token)) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const sessionWalletRaw = session.walletAddress ?? session.user?.walletAddress ?? null;
      if (sessionWalletRaw && isAddress(sessionWalletRaw)) {
        sessionWallet = sessionWalletRaw.toLowerCase();
      }
    }

    const bodyWallet = rawWalletAddress && isAddress(rawWalletAddress)
      ? rawWalletAddress.toLowerCase()
      : null;
    const walletAddress = sessionWallet ?? bodyWallet;

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: isManualRequest ? 'Wallet connection required' : 'Wallet session required' },
        { status: 401 }
      );
    }

    if (sessionWallet && bodyWallet && bodyWallet !== sessionWallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet mismatch. Use authenticated session wallet.' },
        { status: 401 }
      );
    }

    // Session is already loaded above for wallet auth + OAuth provider checks

    // Platform-specific data
    let platformId: string | null = null;
    let platformHandle: string | null = null;
    let verificationMethod: string;
    let status: string;
    let isManualVerification = false;
    const sessionBio = session?.platformBio ?? null;
    const sessionFollowerCountRaw = session?.platformFollowerCount;
    const sessionFollowerCount =
      typeof sessionFollowerCountRaw === 'number' && Number.isFinite(sessionFollowerCountRaw)
        ? Math.max(0, Math.floor(sessionFollowerCountRaw))
        : null;

    // Check if this is a manual verification request (code provided)
    if (isManualRequest) {
      const manualCodeValue = effectiveManualCode!;
      const manualUsernameValue = effectiveManualUsername!;

      // Manual verification for any platform
      if (!manualCodeValue.startsWith('BASEDARE-')) {
        return NextResponse.json(
          { success: false, error: 'Invalid verification code format' },
          { status: 400 }
        );
      }

      platformHandle = manualUsernameValue;
      verificationMethod = claimPlatform.toUpperCase();
      status = 'PENDING'; // Requires admin verification
      isManualVerification = true;
    } else {
      // OAuth-based verification (Twitter, Twitch, YouTube)
      if (!session || !sessionWallet) {
        return NextResponse.json(
          { success: false, error: `Please sign in with ${claimPlatform} first, or use manual verification` },
          { status: 401 }
        );
      }

      const sessionProvider = session.provider;

      // Verify the session matches the requested platform
      const expectedProvider = claimPlatform === 'youtube' ? 'google' : claimPlatform;
      if (sessionProvider !== expectedProvider) {
        return NextResponse.json(
          { success: false, error: `Please sign in with ${formatPlatformLabel(claimPlatform)}, not ${sessionProvider}` },
          { status: 400 }
        );
      }

      // Get platform-specific data from session
      if (claimPlatform === 'twitter') {
        platformId = session.twitterId || null;
        platformHandle = session.twitterHandle || null;
        verificationMethod = 'TWITTER';
      } else if (claimPlatform === 'twitch') {
        platformId = session.twitchId || null;
        platformHandle = session.twitchHandle || null;
        verificationMethod = 'TWITCH';
      } else if (claimPlatform === 'youtube') {
        platformId = session.youtubeId || null;
        platformHandle = session.youtubeHandle || null;
        verificationMethod = 'YOUTUBE';
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid platform' },
          { status: 400 }
        );
      }

      if (!platformId || !platformHandle) {
        return NextResponse.json(
          { success: false, error: `${formatPlatformLabel(claimPlatform)} verification failed. Please try again.` },
          { status: 400 }
        );
      }

      status = 'ACTIVE'; // OAuth is instant verification
    }

    // Check if tag matches platform handle (recommended)
    const tagMatchesPlatform = normalizedTag.toLowerCase() === `@${platformHandle}`.toLowerCase();

    // Check if tag already claimed
    const existingTag = await prisma.streamerTag.findUnique({
      where: { tag: normalizedTag },
      select: {
        id: true,
        tag: true,
        walletAddress: true,
        status: true,
      },
    });

    const isSameWalletExistingTag =
      Boolean(existingTag) &&
      existingTag!.walletAddress.toLowerCase() === walletAddress;

    if (existingTag && existingTag.status !== 'REVOKED' && !isSameWalletExistingTag) {
      return NextResponse.json(
        { success: false, error: 'This tag is already claimed' },
        { status: 400 }
      );
    }

    // Check if platform account already used (for OAuth platforms)
    if (claimPlatform !== 'kick' && platformId) {
      const existingPlatform = await prisma.streamerTag.findFirst({
        where: {
          OR: [
            { twitterId: claimPlatform === 'twitter' ? platformId : undefined },
            { twitchId: claimPlatform === 'twitch' ? platformId : undefined },
            { youtubeId: claimPlatform === 'youtube' ? platformId : undefined },
          ],
          status: { not: 'REVOKED' },
        },
        select: {
          id: true,
          tag: true,
          walletAddress: true,
          status: true,
        },
      });

      if (existingPlatform) {
        return NextResponse.json(
          {
            success: false,
            error: `This ${formatPlatformLabel(claimPlatform)} account is already linked to tag ${existingPlatform.tag}`,
          },
          { status: 400 }
        );
      }
    }

    // Check if platform handle already used (for manual verification)
    if (isManualVerification && effectiveManualUsername) {
      const handleWhere =
        claimPlatform === 'twitter'
          ? { twitterHandle: effectiveManualUsername }
          : claimPlatform === 'twitch'
            ? { twitchHandle: effectiveManualUsername }
            : claimPlatform === 'youtube'
              ? { youtubeHandle: effectiveManualUsername }
              : {
                  kickHandle: effectiveManualUsername,
                  verificationMethod: claimPlatform.toUpperCase(),
                };

      const existingHandle = await prisma.streamerTag.findFirst({
        where: {
          status: { not: 'REVOKED' },
          OR: [handleWhere],
        },
        select: {
          id: true,
          tag: true,
          walletAddress: true,
          status: true,
        },
      });

      const isSameWalletExistingHandle =
        existingHandle &&
        existingHandle.walletAddress.toLowerCase() === walletAddress &&
        existingHandle.tag.toLowerCase() === normalizedTag.toLowerCase();

      if (existingHandle && !isSameWalletExistingHandle) {
        return NextResponse.json(
          {
            success: false,
            error: `This ${formatPlatformLabel(claimPlatform)} handle is already linked to tag ${existingHandle.tag}`,
          },
          { status: 400 }
        );
      }
    }

    // Build update/create data based on platform
    const platformData: Record<string, string | boolean | number | null | Date> = {
      walletAddress,
      verificationMethod,
      status,
      verifiedAt: status === 'ACTIVE' || status === 'VERIFIED' ? new Date() : null,
      revokedAt: null,
      revokedBy: null,
      revokeReason: null,
      bio: sessionBio,
      followerCount: sessionFollowerCount,
    };

    // Set platform-specific fields
    if (isManualVerification) {
      // Manual verification - store handle and code for admin review
      if (claimPlatform === 'twitter') {
        platformData.twitterHandle = platformHandle;
        platformData.twitterVerified = false;
      } else if (claimPlatform === 'twitch') {
        platformData.twitchHandle = platformHandle;
        platformData.twitchVerified = false;
      } else if (claimPlatform === 'youtube') {
        platformData.youtubeHandle = platformHandle;
        platformData.youtubeVerified = false;
      } else {
        platformData.kickHandle = platformHandle;
        platformData.kickVerified = false;
      }
      // Reuse the existing manual proof field for all manual verification paths.
      platformData.kickVerificationCode = effectiveManualCode ?? null;
    } else if (claimPlatform === 'twitter') {
      platformData.twitterId = platformId;
      platformData.twitterHandle = platformHandle;
      platformData.twitterVerified = true;
    } else if (claimPlatform === 'twitch') {
      platformData.twitchId = platformId;
      platformData.twitchHandle = platformHandle;
      platformData.twitchVerified = true;
    } else if (claimPlatform === 'youtube') {
      platformData.youtubeId = platformId;
      platformData.youtubeHandle = platformHandle;
      platformData.youtubeVerified = true;
    }

    // Create or update tag
    const streamerTag = await prisma.streamerTag.upsert({
      where: { tag: normalizedTag },
      update: platformData as Prisma.StreamerTagUpdateInput,
      create: {
        tag: normalizedTag,
        ...platformData,
      } as Prisma.StreamerTagCreateInput,
    });

    console.log(
      `[TAG] ${status === 'ACTIVE' || status === 'VERIFIED' ? 'Claimed' : 'Pending'}: ${normalizedTag} by ${walletAddress} (${verificationMethod}: ${platformHandle})`
    );

    if (isManualVerification) {
      void alertTagClaimSubmission({
        tagClaimId: streamerTag.id,
        tag: streamerTag.tag,
        platform: claimPlatform,
        handle: platformHandle || '',
        walletAddress,
      }).catch((err) => console.error('[TELEGRAM] Tag claim alert failed:', err));
    }

    // -----------------------------------------------------------------------
    // ACTIVATE PENDING DARES - When tag is verified, update AWAITING_CLAIM dares
    // -----------------------------------------------------------------------
    let activatedDares = 0;
    let totalActivatedBounty = 0;

    if (status === 'ACTIVE' || status === 'VERIFIED') {
      // Find all AWAITING_CLAIM dares for this streamer handle
      const pendingDares = await prisma.dare.findMany({
        where: {
          streamerHandle: { equals: normalizedTag, mode: 'insensitive' },
          status: 'AWAITING_CLAIM',
        },
      });

      if (pendingDares.length > 0) {
        // Update all pending dares to PENDING status with the wallet address
        await prisma.dare.updateMany({
          where: {
            streamerHandle: { equals: normalizedTag, mode: 'insensitive' },
            status: 'AWAITING_CLAIM',
          },
          data: {
            status: 'PENDING',
            targetWalletAddress: walletAddress,
          },
        });

        activatedDares = pendingDares.length;
        totalActivatedBounty = pendingDares.reduce((sum, d) => sum + d.bounty, 0);

        console.log(
          `[TAG] Activated ${activatedDares} pending dares for ${normalizedTag} worth ${totalActivatedBounty} USDC`
        );
      }
    }

    // Build response message
    let message: string;
    if (isManualVerification) {
      message = `Tag submitted for review! An admin will verify your ${formatPlatformLabel(claimPlatform)} handle (${effectiveManualUsername}) within 24 hours.`;
    } else if (activatedDares > 0) {
      message = `Tag claimed and verified! ${activatedDares} pending dare${activatedDares > 1 ? 's' : ''} worth $${totalActivatedBounty.toLocaleString()} USDC are now active.`;
    } else if (tagMatchesPlatform) {
      message = 'Tag claimed and verified!';
    } else {
      message = `Tag claimed! Note: Your tag (${normalizedTag}) differs from your ${formatPlatformLabel(claimPlatform)} handle (@${platformHandle}).`;
    }

    return NextResponse.json({
      success: true,
      data: {
        tag: streamerTag.tag,
        walletAddress: streamerTag.walletAddress,
        platform: claimPlatform,
        platformHandle: platformHandle,
        status: streamerTag.status,
        verifiedAt: streamerTag.verifiedAt,
        tagMatchesPlatform,
        message,
        // Activated dares info
        activatedDares,
        totalActivatedBounty,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TAG] Claim failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
