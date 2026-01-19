import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// ============================================================================
// ADMIN APPEALS API
// For reviewing and resolving appeals submitted by users
// ============================================================================

// Simple admin check - in production, use proper auth
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'basedare-admin-2024';

function isAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('x-admin-secret');
  return authHeader === ADMIN_SECRET;
}

// ============================================================================
// GET /api/admin/appeals - List all appeals
// ============================================================================

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';

    const appeals = await prisma.dare.findMany({
      where: {
        appealStatus: status === 'ALL' ? { not: null } : status,
      },
      orderBy: { appealedAt: 'desc' },
      select: {
        id: true,
        shortId: true,
        title: true,
        bounty: true,
        streamerHandle: true,
        status: true,
        appealStatus: true,
        appealReason: true,
        appealedAt: true,
        verifyConfidence: true,
        proofHash: true,
        videoUrl: true,
        stakerAddress: true,
        createdAt: true,
        isSimulated: true,
      },
    });

    // Get counts for each status
    const counts = await prisma.dare.groupBy({
      by: ['appealStatus'],
      _count: true,
      where: {
        appealStatus: { not: null },
      },
    });

    const countMap = counts.reduce((acc, item) => {
      if (item.appealStatus) {
        acc[item.appealStatus] = item._count;
      }
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: {
        appeals,
        counts: {
          pending: countMap['PENDING'] || 0,
          approved: countMap['APPROVED'] || 0,
          rejected: countMap['REJECTED'] || 0,
          none: countMap['NONE'] || 0,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN] Failed to fetch appeals:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/admin/appeals - Resolve an appeal
// ============================================================================

const ResolveAppealSchema = z.object({
  dareId: z.string().min(1, 'Dare ID is required'),
  decision: z.enum(['APPROVED', 'REJECTED']),
  adminNote: z.string().max(500).optional(),
});

export async function PUT(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const validation = ResolveAppealSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { dareId, decision, adminNote } = validation.data;

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

    if (dare.appealStatus !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'This appeal is not pending' },
        { status: 400 }
      );
    }

    // Update the dare based on decision
    if (decision === 'APPROVED') {
      // Approve = Mark as VERIFIED, clear appeal
      await prisma.dare.update({
        where: { id: dareId },
        data: {
          status: 'VERIFIED',
          appealStatus: 'APPROVED',
          verifiedAt: new Date(),
          // Note: In production, you'd trigger on-chain payout here
        },
      });

      console.log(`[ADMIN] Appeal APPROVED for dare ${dareId} - "${dare.title}"`);
      if (adminNote) console.log(`[ADMIN] Note: ${adminNote}`);

      return NextResponse.json({
        success: true,
        data: {
          dareId,
          decision: 'APPROVED',
          message: 'Appeal approved. Dare marked as verified.',
          note: 'Manual payout may be required if on-chain payout failed.',
        },
      });
    } else {
      // Reject = Keep as FAILED, mark appeal rejected
      await prisma.dare.update({
        where: { id: dareId },
        data: {
          appealStatus: 'REJECTED',
        },
      });

      console.log(`[ADMIN] Appeal REJECTED for dare ${dareId} - "${dare.title}"`);
      if (adminNote) console.log(`[ADMIN] Note: ${adminNote}`);

      return NextResponse.json({
        success: true,
        data: {
          dareId,
          decision: 'REJECTED',
          message: 'Appeal rejected. Dare remains failed.',
        },
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN] Failed to resolve appeal:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
