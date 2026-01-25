import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/invite/[token] - Fetch pending dares for an invite token
// ============================================================================

const TokenSchema = z.string().min(1, 'Token is required');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Validate token format
    const validation = TokenSchema.safeParse(token);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid invite token' },
        { status: 400 }
      );
    }

    // Find dare(s) with this invite token
    const dares = await prisma.dare.findMany({
      where: {
        inviteToken: token,
        status: 'AWAITING_CLAIM',
      },
      select: {
        id: true,
        shortId: true,
        title: true,
        bounty: true,
        streamerHandle: true,
        status: true,
        createdAt: true,
        claimDeadline: true,
        expiresAt: true,
      },
      orderBy: { bounty: 'desc' },
    });

    if (dares.length === 0) {
      // Check if the invite was already claimed
      const claimedDare = await prisma.dare.findFirst({
        where: { inviteToken: token },
        select: { status: true, streamerHandle: true },
      });

      if (claimedDare) {
        return NextResponse.json({
          success: true,
          data: {
            alreadyClaimed: true,
            streamerHandle: claimedDare.streamerHandle,
            message: 'This invite has already been claimed!',
          },
        });
      }

      return NextResponse.json(
        { success: false, error: 'Invite not found or expired', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Calculate totals
    const totalBounty = dares.reduce((sum, d) => sum + d.bounty, 0);
    const streamerHandle = dares[0].streamerHandle;

    // Get the earliest claim deadline
    const claimDeadline = dares
      .map((d) => d.claimDeadline)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime())[0];

    return NextResponse.json({
      success: true,
      data: {
        streamerHandle,
        totalBounty,
        dareCount: dares.length,
        claimDeadline: claimDeadline?.toISOString() || null,
        pendingDares: dares.map((d) => ({
          id: d.id,
          shortId: d.shortId,
          title: d.title,
          bounty: d.bounty,
          createdAt: d.createdAt.toISOString(),
          expiresAt: d.expiresAt?.toISOString() || null,
        })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[INVITE] Fetch failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
