import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { isAddress } from 'viem';

// ============================================================================
// ADMIN MODERATE API
// For moderators to make final decisions on dares after community voting
// ============================================================================

// Admin authentication via secret OR moderator wallet
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const MODERATOR_WALLETS = (process.env.MODERATOR_WALLETS || '')
  .split(',')
  .map((w) => w.trim().toLowerCase())
  .filter(Boolean);

function isAuthorized(request: NextRequest): { authorized: boolean; moderatorAddress?: string } {
  // Check admin secret header
  const authHeader = request.headers.get('x-admin-secret');
  if (authHeader && ADMIN_SECRET && ADMIN_SECRET.length >= 32) {
    if (authHeader.length === ADMIN_SECRET.length) {
      let result = 0;
      for (let i = 0; i < authHeader.length; i++) {
        result |= authHeader.charCodeAt(i) ^ ADMIN_SECRET.charCodeAt(i);
      }
      if (result === 0) {
        return { authorized: true, moderatorAddress: 'admin' };
      }
    }
  }

  // Check moderator wallet header
  const walletHeader = request.headers.get('x-moderator-wallet');
  if (walletHeader && isAddress(walletHeader)) {
    const lowerWallet = walletHeader.toLowerCase();
    if (MODERATOR_WALLETS.includes(lowerWallet)) {
      return { authorized: true, moderatorAddress: lowerWallet };
    }
  }

  return { authorized: false };
}

// ============================================================================
// GET /api/admin/moderate - List dares ready for moderation
// ============================================================================

export async function GET(request: NextRequest) {
  const auth = isAuthorized(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - admin secret or moderator wallet required' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING_REVIEW';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    // Fetch dares ready for moderation
    // - Has proof (videoUrl)
    // - Has enough votes OR is in PENDING_REVIEW status
    const dares = await prisma.dare.findMany({
      where: {
        OR: [
          { status: 'PENDING_REVIEW' },
          {
            status: 'PENDING',
            videoUrl: { not: null },
          },
        ],
      },
      orderBy: [{ bounty: 'desc' }, { createdAt: 'asc' }],
      take: limit,
      include: {
        votes: true,
        _count: { select: { votes: true } },
      },
    });

    // Calculate vote summaries
    const daresWithVoteSummary = dares.map((dare) => {
      const approveVotes = dare.votes.filter((v) => v.voteType === 'APPROVE').length;
      const rejectVotes = dare.votes.filter((v) => v.voteType === 'REJECT').length;
      const totalVotes = dare.votes.length;

      return {
        id: dare.id,
        shortId: dare.shortId,
        title: dare.title,
        bounty: dare.bounty,
        streamerHandle: dare.streamerHandle,
        status: dare.status,
        videoUrl: dare.videoUrl,
        claimedBy: dare.claimedBy,
        targetWalletAddress: dare.targetWalletAddress,
        createdAt: dare.createdAt,
        votes: {
          approve: approveVotes,
          reject: rejectVotes,
          total: totalVotes,
          approvePercent: totalVotes > 0 ? Math.round((approveVotes / totalVotes) * 100) : 0,
        },
        readyForDecision: totalVotes >= dare.voteThreshold,
        voteThreshold: dare.voteThreshold,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        dares: daresWithVoteSummary,
        total: daresWithVoteSummary.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MODERATE] List failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ============================================================================
// POST /api/admin/moderate - Make a moderation decision
// ============================================================================

const ModerateSchema = z.object({
  dareId: z.string().min(1, 'Dare ID required'),
  decision: z.enum(['APPROVE', 'REJECT']),
  note: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const auth = isAuthorized(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - admin secret or moderator wallet required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const validation = ModerateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { dareId, decision, note } = validation.data;

    // Fetch the dare
    const dare = await prisma.dare.findUnique({
      where: { id: dareId },
    });

    if (!dare) {
      return NextResponse.json(
        { success: false, error: 'Dare not found' },
        { status: 404 }
      );
    }

    // Check dare has proof
    if (!dare.videoUrl) {
      return NextResponse.json(
        { success: false, error: 'Cannot moderate dare without proof submission' },
        { status: 400 }
      );
    }

    // Check dare isn't already moderated
    if (dare.moderatorDecision) {
      return NextResponse.json(
        { success: false, error: `Dare already moderated: ${dare.moderatorDecision}` },
        { status: 400 }
      );
    }

    // Determine new status based on decision
    const newStatus = decision === 'APPROVE' ? 'VERIFIED' : 'FAILED';

    // Update the dare with moderation decision
    const updatedDare = await prisma.dare.update({
      where: { id: dareId },
      data: {
        status: newStatus,
        moderatorDecision: decision,
        moderatorAddress: auth.moderatorAddress,
        moderatedAt: new Date(),
        moderatorNote: note || null,
        verifiedAt: decision === 'APPROVE' ? new Date() : null,
      },
    });

    console.log(
      `[MODERATE] Dare ${dareId} ${decision} by ${auth.moderatorAddress}${note ? ` - ${note}` : ''}`
    );

    // TODO: Trigger payout if APPROVED, refund if REJECTED
    // This would call your payout/refund logic

    return NextResponse.json({
      success: true,
      data: {
        dareId: updatedDare.id,
        decision,
        newStatus,
        moderatedAt: updatedDare.moderatedAt,
        moderatorAddress: auth.moderatorAddress,
        note: updatedDare.moderatorNote,
        message:
          decision === 'APPROVE'
            ? 'Dare approved! Payout will be processed.'
            : 'Dare rejected. Funds will be refunded to backers.',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MODERATE] Decision failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
