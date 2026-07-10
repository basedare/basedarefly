import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { createWalletNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';
import { resolveApprovalHandle, evaluateApproval, buildRejectCasWhere } from '@/lib/dare-claim-policy';

// ============================================================================
// ADMIN CLAIM REQUESTS API
// GET - List pending claim requests
// PUT - Approve or reject a claim request
// ============================================================================

// ============================================================================
// GET /api/admin/claims - List pending claim requests
// ============================================================================

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';

    // Fetch dares with pending claim requests
    const dares = await prisma.dare.findMany({
      where: status === 'ALL'
        ? { claimRequestStatus: { not: null } }
        : { claimRequestStatus: status },
      orderBy: { claimRequestedAt: 'asc' },
      select: {
        id: true,
        shortId: true,
        title: true,
        bounty: true,
        streamerHandle: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        claimRequestWallet: true,
        claimRequestTag: true,
        claimRequestedAt: true,
        claimRequestStatus: true,
      },
    });

    // Get counts
    const counts = await prisma.dare.groupBy({
      by: ['claimRequestStatus'],
      where: { claimRequestStatus: { not: null } },
      _count: true,
    });

    const countMap = counts.reduce(
      (acc, item) => {
        if (item.claimRequestStatus) {
          acc[item.claimRequestStatus] = item._count;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      success: true,
      data: {
        claims: dares,
        counts: {
          pending: countMap['PENDING'] || 0,
          approved: countMap['APPROVED'] || 0,
          rejected: countMap['REJECTED'] || 0,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ============================================================================
// PUT /api/admin/claims - Approve or reject a claim request
// ============================================================================

const ClaimDecisionSchema = z.object({
  dareId: z.string(),
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().max(500).optional(),
});

export async function PUT(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const body = await request.json();
    const validation = ClaimDecisionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { dareId, decision, reason } = validation.data;

    // Fetch the dare
    const dare = await prisma.dare.findUnique({
      where: { id: dareId },
    });

    if (!dare) {
      return NextResponse.json({ success: false, error: 'Dare not found' }, { status: 404 });
    }

    if (dare.claimRequestStatus !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'No pending claim request for this dare' },
        { status: 400 }
      );
    }

    // A tag is optional (money-first, wallet-only claims). Only the wallet is
    // required — it becomes the assigned doer on approval.
    if (!dare.claimRequestWallet) {
      return NextResponse.json(
        { success: false, error: 'Invalid claim request data (no wallet)' },
        { status: 400 }
      );
    }

    // Display label for logs/notifications — real tag if present, else short wallet.
    const claimDisplay =
      dare.claimRequestTag ?? `${dare.claimRequestWallet.slice(0, 6)}…${dare.claimRequestWallet.slice(-4)}`;
    const now = new Date();
    const notifyLink = `/dare/${dare.shortId || dare.id}`;

    if (decision === 'APPROVE') {
      // Revalidate at decision time: not expired/claimed/terminal, no
      // self-dealing, and no real creator handle introduced after the request.
      const approvalCheck = evaluateApproval(dare, now);
      if (!approvalCheck.ok) {
        return NextResponse.json(
          { success: false, error: approvalCheck.message, code: approvalCheck.code },
          { status: approvalCheck.status }
        );
      }

      // Clear only open sentinel handles (@open/@everyone/null) so the receipt
      // and proof actor fall back to the assigned wallet; a real claim tag wins;
      // a real creator handle is preserved.
      const resolvedHandle = resolveApprovalHandle(dare.streamerHandle, dare.claimRequestTag);

      // Compare-and-set with the open-handle (exact observed) and unexpired
      // predicates INSIDE the guard, so a concurrent handle change, assignment,
      // or expiry between read and write loses (count 0 → 409).
      const cas = await prisma.dare.updateMany({
        where: {
          id: dareId,
          status: 'PENDING',
          claimedBy: null,
          targetWalletAddress: null,
          claimRequestStatus: 'PENDING',
          claimRequestWallet: dare.claimRequestWallet,
          streamerHandle: dare.streamerHandle,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        data: {
          streamerHandle: resolvedHandle,
          targetWalletAddress: dare.claimRequestWallet,
          claimedBy: dare.claimRequestWallet,
          claimedAt: now,
          claimRequestStatus: 'APPROVED',
          moderatorAddress: auth.walletAddress,
          moderatedAt: now,
          moderatorNote: reason || 'Claim approved',
        },
      });

      if (cas.count === 0) {
        return NextResponse.json(
          { success: false, error: 'This claim was just updated by someone else. Refresh the queue.', code: 'STATE_CHANGED' },
          { status: 409 }
        );
      }

      console.log(`[CLAIM APPROVED] Dare ${dareId} assigned to ${claimDisplay} by moderator ${auth.walletAddress}`);

      await createWalletNotification({
        wallet: dare.claimRequestWallet,
        type: 'CLAIM_APPROVED',
        title: 'Claim Approved',
        message: `You now control "${dare.title}". Submit proof when you are ready.`,
        link: notifyLink,
        pushTopic: 'wallet',
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Claim approved! Dare assigned to ${claimDisplay}`,
        data: {
          dareId,
          streamerHandle: resolvedHandle,
          targetWalletAddress: dare.claimRequestWallet,
        },
      });
    } else {
      // Reject — atomic clear guarded on the same pending, un-assigned request so
      // it cannot rewrite claim status on an already-assigned/terminal dare.
      const cas = await prisma.dare.updateMany({
        // Complete terminal-state guard (symmetric with approve): also blocks a
        // targeted-conversion (targetWalletAddress set out-of-band) and any dare
        // that left PENDING. See buildRejectCasWhere for the full rationale.
        where: buildRejectCasWhere(dareId, { claimRequestWallet: dare.claimRequestWallet }),
        data: {
          claimRequestWallet: null,
          claimRequestTag: null,
          claimRequestedAt: null,
          claimRequestStatus: 'REJECTED',
          moderatorAddress: auth.walletAddress,
          moderatedAt: now,
          moderatorNote: reason || 'Claim rejected',
        },
      });

      if (cas.count === 0) {
        return NextResponse.json(
          { success: false, error: 'This claim was just updated by someone else. Refresh the queue.', code: 'STATE_CHANGED' },
          { status: 409 }
        );
      }

      console.log(`[CLAIM REJECTED] Dare ${dareId} claim by ${claimDisplay} rejected by moderator ${auth.walletAddress}`);

      await createWalletNotification({
        wallet: dare.claimRequestWallet,
        type: 'CLAIM_REJECTED',
        title: 'Claim Rejected',
        message: `Your claim request for "${dare.title}" was not approved.`,
        link: notifyLink,
        pushTopic: 'wallet',
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Claim request rejected`,
        data: { dareId },
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN CLAIMS] Decision failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
