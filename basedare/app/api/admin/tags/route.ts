import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { isAddress } from 'viem';

// ============================================================================
// ADMIN TAG MANAGEMENT
// Allows admin to view, revoke, and manually assign tags
// ============================================================================

// Admin authentication (same as appeals)
const ADMIN_SECRET = process.env.ADMIN_SECRET;

function isAdmin(request: NextRequest): boolean {
  if (!ADMIN_SECRET || ADMIN_SECRET.length < 32) {
    console.error('[SECURITY] Admin access denied - ADMIN_SECRET not properly configured');
    return false;
  }

  const authHeader = request.headers.get('x-admin-secret');
  if (!authHeader) return false;

  if (authHeader.length !== ADMIN_SECRET.length) return false;

  let result = 0;
  for (let i = 0; i < authHeader.length; i++) {
    result |= authHeader.charCodeAt(i) ^ ADMIN_SECRET.charCodeAt(i);
  }
  return result === 0;
}

// ============================================================================
// GET /api/admin/tags - List all tags with admin details
// ============================================================================

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ALL';

    const where = status === 'ALL' ? {} : { status };

    const tags = await prisma.streamerTag.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Get counts by status
    const counts = await prisma.streamerTag.groupBy({
      by: ['status'],
      _count: true,
    });

    const countMap = counts.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      success: true,
      data: {
        tags,
        counts: {
          verified: countMap['VERIFIED'] || 0,
          pending: countMap['PENDING'] || 0,
          revoked: countMap['REVOKED'] || 0,
          suspended: countMap['SUSPENDED'] || 0,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ============================================================================
// PUT /api/admin/tags - Revoke or modify a tag
// ============================================================================

const AdminTagActionSchema = z.object({
  tagId: z.string().optional(),
  tag: z.string().optional(),
  action: z.enum(['REVOKE', 'REINSTATE', 'SUSPEND', 'ASSIGN', 'VERIFY_KICK', 'REJECT_KICK', 'VERIFY_MANUAL', 'REJECT_MANUAL']),
  reason: z.string().max(500).optional(),
  // For ASSIGN action
  walletAddress: z.string().optional(),
});

export async function PUT(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = AdminTagActionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { tagId, tag, action, reason, walletAddress } = validation.data;

    // Find the tag
    let streamerTag;
    if (tagId) {
      streamerTag = await prisma.streamerTag.findUnique({ where: { id: tagId } });
    } else if (tag) {
      const normalizedTag = tag.startsWith('@') ? tag : `@${tag}`;
      streamerTag = await prisma.streamerTag.findUnique({ where: { tag: normalizedTag } });
    }

    if (!streamerTag && action !== 'ASSIGN') {
      return NextResponse.json({ success: false, error: 'Tag not found' }, { status: 404 });
    }

    const adminWallet = request.headers.get('x-admin-wallet') || 'admin';

    switch (action) {
      case 'REVOKE':
        await prisma.streamerTag.update({
          where: { id: streamerTag!.id },
          data: {
            status: 'REVOKED',
            revokedAt: new Date(),
            revokedBy: adminWallet,
            revokeReason: reason || 'Revoked by admin',
          },
        });
        console.log(`[ADMIN] Tag ${streamerTag!.tag} REVOKED by ${adminWallet}: ${reason}`);
        return NextResponse.json({
          success: true,
          message: `Tag ${streamerTag!.tag} has been revoked`,
        });

      case 'REINSTATE':
        await prisma.streamerTag.update({
          where: { id: streamerTag!.id },
          data: {
            status: 'VERIFIED',
            revokedAt: null,
            revokedBy: null,
            revokeReason: null,
          },
        });
        console.log(`[ADMIN] Tag ${streamerTag!.tag} REINSTATED by ${adminWallet}`);
        return NextResponse.json({
          success: true,
          message: `Tag ${streamerTag!.tag} has been reinstated`,
        });

      case 'SUSPEND':
        await prisma.streamerTag.update({
          where: { id: streamerTag!.id },
          data: {
            status: 'SUSPENDED',
            revokedBy: adminWallet,
            revokeReason: reason || 'Suspended for review',
          },
        });
        console.log(`[ADMIN] Tag ${streamerTag!.tag} SUSPENDED by ${adminWallet}: ${reason}`);
        return NextResponse.json({
          success: true,
          message: `Tag ${streamerTag!.tag} has been suspended`,
        });

      case 'ASSIGN':
        // Manually assign a tag to a wallet (admin override)
        if (!tag || !walletAddress) {
          return NextResponse.json(
            { success: false, error: 'Tag and walletAddress required for ASSIGN' },
            { status: 400 }
          );
        }

        if (!isAddress(walletAddress)) {
          return NextResponse.json(
            { success: false, error: 'Invalid wallet address' },
            { status: 400 }
          );
        }

        const normalizedTag = tag.startsWith('@') ? tag : `@${tag}`;

        const newTag = await prisma.streamerTag.upsert({
          where: { tag: normalizedTag },
          update: {
            walletAddress,
            status: 'VERIFIED',
            verificationMethod: 'ADMIN',
            verifiedAt: new Date(),
            revokedAt: null,
            revokedBy: null,
            revokeReason: null,
          },
          create: {
            tag: normalizedTag,
            walletAddress,
            verificationMethod: 'ADMIN',
            status: 'VERIFIED',
            verifiedAt: new Date(),
          },
        });

        console.log(`[ADMIN] Tag ${normalizedTag} ASSIGNED to ${walletAddress} by ${adminWallet}`);
        return NextResponse.json({
          success: true,
          message: `Tag ${normalizedTag} assigned to ${walletAddress}`,
          data: newTag,
        });

      case 'VERIFY_KICK':
        // Verify a pending Kick tag after admin confirms the code was shown on stream
        if (streamerTag!.verificationMethod !== 'KICK') {
          return NextResponse.json(
            { success: false, error: 'This action is only for Kick verifications' },
            { status: 400 }
          );
        }
        if (streamerTag!.status !== 'PENDING') {
          return NextResponse.json(
            { success: false, error: 'Tag is not pending verification' },
            { status: 400 }
          );
        }

        await prisma.streamerTag.update({
          where: { id: streamerTag!.id },
          data: {
            status: 'VERIFIED',
            kickVerified: true,
            verifiedAt: new Date(),
          },
        });
        console.log(`[ADMIN] Kick tag ${streamerTag!.tag} VERIFIED by ${adminWallet}`);
        return NextResponse.json({
          success: true,
          message: `Kick tag ${streamerTag!.tag} has been verified`,
        });

      case 'REJECT_KICK':
        // Reject a pending Kick tag (verification code not found)
        if (streamerTag!.verificationMethod !== 'KICK') {
          return NextResponse.json(
            { success: false, error: 'This action is only for Kick verifications' },
            { status: 400 }
          );
        }

        await prisma.streamerTag.update({
          where: { id: streamerTag!.id },
          data: {
            status: 'REVOKED',
            revokedAt: new Date(),
            revokedBy: adminWallet,
            revokeReason: reason || 'Verification code not found on Kick profile/stream',
          },
        });
        console.log(`[ADMIN] Kick tag ${streamerTag!.tag} REJECTED by ${adminWallet}: ${reason}`);
        return NextResponse.json({
          success: true,
          message: `Kick tag ${streamerTag!.tag} has been rejected`,
        });

      case 'VERIFY_MANUAL':
        // Verify any pending manual verification tag
        if (streamerTag!.status !== 'PENDING') {
          return NextResponse.json(
            { success: false, error: 'Tag is not pending verification' },
            { status: 400 }
          );
        }

        // Update the appropriate verified flag based on verification method
        const verifyData: Record<string, boolean | string | Date> = {
          status: 'VERIFIED',
          verifiedAt: new Date(),
        };
        if (streamerTag!.verificationMethod === 'KICK') {
          verifyData.kickVerified = true;
        } else if (streamerTag!.verificationMethod === 'TWITTER') {
          verifyData.twitterVerified = true;
        } else if (streamerTag!.verificationMethod === 'TWITCH') {
          verifyData.twitchVerified = true;
        } else if (streamerTag!.verificationMethod === 'YOUTUBE') {
          verifyData.youtubeVerified = true;
        }

        await prisma.streamerTag.update({
          where: { id: streamerTag!.id },
          data: verifyData,
        });

        // Activate any pending dares for this streamer
        const activatedDares = await prisma.dare.updateMany({
          where: {
            streamerHandle: { equals: streamerTag!.tag, mode: 'insensitive' },
            status: 'AWAITING_CLAIM',
          },
          data: {
            status: 'PENDING',
            targetWalletAddress: streamerTag!.walletAddress,
          },
        });

        console.log(`[ADMIN] Tag ${streamerTag!.tag} (${streamerTag!.verificationMethod}) VERIFIED by ${adminWallet}. Activated ${activatedDares.count} dares.`);
        return NextResponse.json({
          success: true,
          message: `Tag ${streamerTag!.tag} has been verified`,
          activatedDares: activatedDares.count,
        });

      case 'REJECT_MANUAL':
        // Reject any pending manual verification tag
        if (streamerTag!.status !== 'PENDING') {
          return NextResponse.json(
            { success: false, error: 'Tag is not pending verification' },
            { status: 400 }
          );
        }

        await prisma.streamerTag.update({
          where: { id: streamerTag!.id },
          data: {
            status: 'REVOKED',
            revokedAt: new Date(),
            revokedBy: adminWallet,
            revokeReason: reason || 'Verification code not found on profile',
          },
        });
        console.log(`[ADMIN] Tag ${streamerTag!.tag} (${streamerTag!.verificationMethod}) REJECTED by ${adminWallet}: ${reason}`);
        return NextResponse.json({
          success: true,
          message: `Tag ${streamerTag!.tag} has been rejected`,
        });

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN] Tag action failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
