import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { isAddress } from 'viem';

type SessionPlatformData = {
  provider?: string;
  platformBio?: string | null;
  platformFollowerCount?: number | null;
  twitterId?: string | null;
  twitterHandle?: string | null;
  twitchId?: string | null;
  twitchHandle?: string | null;
  youtubeId?: string | null;
  youtubeHandle?: string | null;
};

// ============================================================================
// GET /api/tags - List all verified tags or check availability
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get('tag');
  const wallet = searchParams.get('wallet');

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
          bio: true,
          followerCount: true,
          tags: true,
        },
      });

      if (existing) {
        return NextResponse.json({
          available: false,
          tag: existing.tag,
          status: existing.status,
          owner: existing.status === 'VERIFIED' ? existing.walletAddress.slice(0, 6) + '...' : null,
          platform: existing.verificationMethod?.toLowerCase(),
        });
      }

      return NextResponse.json({ available: true, tag: normalizedTag });
    }

    // Get tags for a specific wallet
    if (wallet) {
      const tags = await prisma.streamerTag.findMany({
        where: { walletAddress: wallet.toLowerCase() }, // Normalize to lowercase
        select: {
          id: true,
          tag: true,
          status: true,
          verificationMethod: true,
          totalEarned: true,
          completedDares: true,
          bio: true,
          followerCount: true,
          tags: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ success: true, tags });
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

    return NextResponse.json({ success: true, tags: verifiedTags });
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
  // For manual verification (any platform)
  manualUsername: z.string().optional(),
  manualCode: z.string().optional(),
  // Legacy Kick fields (redirect to manual fields)
  kickUsername: z.string().optional(),
  kickCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const body = await request.json();
    const validation = ClaimTagSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { walletAddress: rawWalletAddress, tag, platform, manualUsername, manualCode, kickUsername, kickCode } = validation.data;
    const walletAddress = rawWalletAddress.toLowerCase(); // Normalize to lowercase for consistent lookups
    const normalizedTag = tag.startsWith('@') ? tag : `@${tag}`;

    // Support legacy Kick fields by merging into manual fields
    const effectiveManualUsername = manualUsername || kickUsername;
    const effectiveManualCode = manualCode || kickCode;

    // Get session for OAuth-based verification
    const session = await getServerSession(authOptions);
    const sessionData = (session ?? {}) as SessionPlatformData;

    // Platform-specific data
    let platformId: string | null = null;
    let platformHandle: string | null = null;
    let verificationMethod: string;
    let status: string;
    let isManualVerification = false;
    const sessionBio = sessionData.platformBio ?? null;
    const sessionFollowerCountRaw = sessionData.platformFollowerCount;
    const sessionFollowerCount =
      typeof sessionFollowerCountRaw === 'number' && Number.isFinite(sessionFollowerCountRaw)
        ? Math.max(0, Math.floor(sessionFollowerCountRaw))
        : null;

    // Check if this is a manual verification request (code provided)
    if (effectiveManualCode && effectiveManualUsername) {
      // Manual verification for any platform
      if (!effectiveManualCode.startsWith('BASEDARE-')) {
        return NextResponse.json(
          { success: false, error: 'Invalid verification code format' },
          { status: 400 }
        );
      }

      platformHandle = effectiveManualUsername;
      verificationMethod = platform.toUpperCase();
      status = 'PENDING'; // Requires admin verification
      isManualVerification = true;
    } else if (platform === 'kick') {
      // Kick always requires manual verification
      return NextResponse.json(
        { success: false, error: 'Kick username and verification code are required' },
        { status: 400 }
      );
    } else {
      // OAuth-based verification (Twitter, Twitch, YouTube)
      if (!session) {
        return NextResponse.json(
          { success: false, error: `Please sign in with ${platform} first, or use manual verification` },
          { status: 401 }
        );
      }

      const sessionProvider = sessionData.provider;

      // Verify the session matches the requested platform
      const expectedProvider = platform === 'youtube' ? 'google' : platform;
      if (sessionProvider !== expectedProvider) {
        return NextResponse.json(
          { success: false, error: `Please sign in with ${platform}, not ${sessionProvider}` },
          { status: 400 }
        );
      }

      // Get platform-specific data from session
      if (platform === 'twitter') {
        platformId = sessionData.twitterId ?? null;
        platformHandle = sessionData.twitterHandle ?? null;
        verificationMethod = 'TWITTER';
      } else if (platform === 'twitch') {
        platformId = sessionData.twitchId ?? null;
        platformHandle = sessionData.twitchHandle ?? null;
        verificationMethod = 'TWITCH';
      } else if (platform === 'youtube') {
        platformId = sessionData.youtubeId ?? null;
        platformHandle = sessionData.youtubeHandle ?? null;
        verificationMethod = 'YOUTUBE';
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid platform' },
          { status: 400 }
        );
      }

      if (!platformId || !platformHandle) {
        return NextResponse.json(
          { success: false, error: `${platform} verification failed. Please try again.` },
          { status: 400 }
        );
      }

      status = 'VERIFIED'; // OAuth is instant verification
    }

    // Check if tag matches platform handle (recommended)
    const tagMatchesPlatform = normalizedTag.toLowerCase() === `@${platformHandle}`.toLowerCase();

    // Check if tag already claimed
    const existingTag = await prisma.streamerTag.findUnique({
      where: { tag: normalizedTag },
    });

    if (existingTag && existingTag.status !== 'REVOKED') {
      return NextResponse.json(
        { success: false, error: 'This tag is already claimed' },
        { status: 400 }
      );
    }

    // Check if platform account already used (for OAuth platforms)
    if (platform !== 'kick' && platformId) {
      const existingPlatform = await prisma.streamerTag.findFirst({
        where: {
          OR: [
            { twitterId: platform === 'twitter' ? platformId : undefined },
            { twitchId: platform === 'twitch' ? platformId : undefined },
            { youtubeId: platform === 'youtube' ? platformId : undefined },
          ],
          status: { not: 'REVOKED' },
        },
      });

      if (existingPlatform) {
        return NextResponse.json(
          {
            success: false,
            error: `This ${platform} account is already linked to tag ${existingPlatform.tag}`,
          },
          { status: 400 }
        );
      }
    }

    // Check if platform handle already used (for manual verification)
    if (isManualVerification && effectiveManualUsername) {
      let existingHandle;
      if (platform === 'kick') {
        existingHandle = await prisma.streamerTag.findFirst({
          where: { kickHandle: effectiveManualUsername, status: { not: 'REVOKED' } },
        });
      } else if (platform === 'twitter') {
        existingHandle = await prisma.streamerTag.findFirst({
          where: { twitterHandle: effectiveManualUsername, status: { not: 'REVOKED' } },
        });
      } else if (platform === 'twitch') {
        existingHandle = await prisma.streamerTag.findFirst({
          where: { twitchHandle: effectiveManualUsername, status: { not: 'REVOKED' } },
        });
      } else if (platform === 'youtube') {
        existingHandle = await prisma.streamerTag.findFirst({
          where: { youtubeHandle: effectiveManualUsername, status: { not: 'REVOKED' } },
        });
      }

      if (existingHandle) {
        return NextResponse.json(
          {
            success: false,
            error: `This ${platform} username is already linked to tag ${existingHandle.tag}`,
          },
          { status: 400 }
        );
      }
    }

    // Check wallet doesn't have too many tags (limit to 3)
    const walletTags = await prisma.streamerTag.count({
      where: { walletAddress, status: { in: ['VERIFIED', 'PENDING'] } },
    });

    if (walletTags >= 3) {
      return NextResponse.json(
        { success: false, error: 'Maximum 3 tags per wallet' },
        { status: 400 }
      );
    }

    // Build update/create data based on platform
    const platformData: Omit<Prisma.StreamerTagCreateInput, 'tag'> = {
      walletAddress,
      verificationMethod,
      status,
      verifiedAt: status === 'VERIFIED' ? new Date() : null,
      revokedAt: null,
      revokedBy: null,
      revokeReason: null,
      bio: sessionBio,
      followerCount: sessionFollowerCount,
    };

    // Set platform-specific fields
    if (isManualVerification) {
      // Manual verification - store handle and code for admin review
      if (platform === 'twitter') {
        platformData.twitterHandle = platformHandle;
        platformData.twitterVerified = false;
      } else if (platform === 'twitch') {
        platformData.twitchHandle = platformHandle;
        platformData.twitchVerified = false;
      } else if (platform === 'youtube') {
        platformData.youtubeHandle = platformHandle;
        platformData.youtubeVerified = false;
      } else if (platform === 'kick') {
        platformData.kickHandle = platformHandle;
        platformData.kickVerified = false;
      }
      // Store verification code in kickVerificationCode field (reused for all manual verifications)
      if (effectiveManualCode) {
        platformData.kickVerificationCode = effectiveManualCode;
      }
    } else if (platform === 'twitter') {
      platformData.twitterId = platformId;
      platformData.twitterHandle = platformHandle;
      platformData.twitterVerified = true;
    } else if (platform === 'twitch') {
      platformData.twitchId = platformId;
      platformData.twitchHandle = platformHandle;
      platformData.twitchVerified = true;
    } else if (platform === 'youtube') {
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
      },
    });

    console.log(
      `[TAG] ${status === 'VERIFIED' ? 'Claimed' : 'Pending'}: ${normalizedTag} by ${walletAddress} (${verificationMethod}: ${platformHandle})`
    );

    // -----------------------------------------------------------------------
    // ACTIVATE PENDING DARES - When tag is verified, update AWAITING_CLAIM dares
    // -----------------------------------------------------------------------
    let activatedDares = 0;
    let totalActivatedBounty = 0;

    if (status === 'VERIFIED') {
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
      message = `Tag submitted for review! An admin will verify your ${platform} account (${effectiveManualUsername}) within 24 hours.`;
    } else if (activatedDares > 0) {
      message = `Tag claimed and verified! ${activatedDares} pending dare${activatedDares > 1 ? 's' : ''} worth $${totalActivatedBounty.toLocaleString()} USDC are now active.`;
    } else if (tagMatchesPlatform) {
      message = 'Tag claimed and verified!';
    } else {
      message = `Tag claimed! Note: Your tag (${normalizedTag}) differs from your ${platform} (@${platformHandle}).`;
    }

    return NextResponse.json({
      success: true,
      data: {
        tag: streamerTag.tag,
        walletAddress: streamerTag.walletAddress,
        platform: platform,
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

const UpdateTagProfileSchema = z.object({
  walletAddress: z.string().refine(isAddress, 'Invalid wallet address'),
  tag: z
    .string()
    .min(2, 'Tag must be at least 2 characters')
    .max(21, 'Tag must be 21 characters or less'),
  tags: z
    .array(z.string().min(2).max(24))
    .min(3, 'Select at least 3 tags')
    .max(5, 'Maximum 5 tags'),
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = UpdateTagProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const walletAddress = validation.data.walletAddress.toLowerCase();
    const normalizedTag = validation.data.tag.startsWith('@')
      ? validation.data.tag
      : `@${validation.data.tag}`;

    const normalizedTags = Array.from(
      new Set(
        validation.data.tags
          .map((tag) => tag.replace(/^#/, '').trim().toLowerCase())
          .filter((tag) => tag.length >= 2)
      )
    ).slice(0, 5);

    if (normalizedTags.length < 3 || normalizedTags.length > 5) {
      return NextResponse.json(
        { success: false, error: 'Please provide between 3 and 5 unique tags' },
        { status: 400 }
      );
    }

    const existing = await prisma.streamerTag.findFirst({
      where: {
        tag: { equals: normalizedTag, mode: 'insensitive' },
        walletAddress,
        status: { in: ['VERIFIED', 'ACTIVE'] },
      },
      select: { id: true, tag: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Tag not found or not owned by this wallet' },
        { status: 404 }
      );
    }

    const updated = await prisma.streamerTag.update({
      where: { id: existing.id },
      data: { tags: normalizedTags },
      select: {
        id: true,
        tag: true,
        tags: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
