import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { isAddress } from 'viem';
import { alertClaimRequestSubmission } from '@/lib/telegram';
import { findPrimaryCreatorTagForWallet } from '@/lib/creator-tag-resolver';
import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limit';
import { evaluateClaimEligibility } from '@/lib/dare-claim-policy';
import { bindDareIntentToWallet } from '@/lib/creator-attribution-server';

// ============================================================================
// CLAIM DARE API - For @open dares (moderated claim request flow)
// POST /api/dares/[id]/claim - Request to claim an open dare (requires mod approval)
// DELETE /api/dares/[id]/claim - Withdraw a pending claim request
//
// Wallet-first: a signed cold wallet may claim/withdraw without a verified tag.
// All lifecycle decisions run through lib/dare-claim-policy (open-ness, expiry,
// self-dealing, squat-TTL); writes are compare-and-set on the exact observed
// state so concurrent claimers/moderators cannot race through a stale read.
// ============================================================================

const ClaimSchema = z.object({
  walletAddress: z.string().optional(),
});

function normalizeWallet(value: string | null | undefined): string | null {
  if (!value || !isAddress(value)) return null;
  return value.toLowerCase();
}

// Display fallback for a wallet with no verified tag yet. Never used as a real
// tag — only for admin alerts / UI labels. A short 0x1234…abcd form.
function shortenWallet(wallet: string): string {
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dareId } = await params;
    const body = await request.json();
    const validation = ClaimSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const normalizedBodyWallet = normalizeWallet(validation.data.walletAddress);
    const lowerWallet = await getAuthorizedWalletForRequest(request, {
      walletAddress: normalizedBodyWallet,
      action: 'dare:claim',
      resource: dareId,
    });

    if (!lowerWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Best-effort per-wallet load-shedding (in-memory, per-instance). NOT a
    // durable anti-Sybil control — disposable wallets across serverless
    // instances are not stopped here; durable abuse accounting is still owed
    // before public real-money scale. The 30-min stale-release bounds one lock.
    const throttle = checkRateLimit('dare:claim', {
      limit: 8,
      windowMs: 60 * 1000,
      keyPrefix: `dare:claim:${lowerWallet}`,
    });
    if (!throttle.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many claim attempts. Please wait a moment and try again.' },
        { status: 429, headers: createRateLimitHeaders(throttle) }
      );
    }

    // A verified tag is OPTIONAL (money-first onboarding). Used only for display
    // if present; never required, never minted.
    const userTag = await findPrimaryCreatorTagForWallet(lowerWallet);
    const claimDisplay = userTag?.tag ?? shortenWallet(lowerWallet);

    const dare = await prisma.dare.findUnique({ where: { id: dareId } });
    if (!dare) {
      return NextResponse.json({ success: false, error: 'Dare not found' }, { status: 404 });
    }

    const now = new Date();
    const evaluation = evaluateClaimEligibility(dare, lowerWallet, now);

    if (!evaluation.ok) {
      return NextResponse.json(
        { success: false, error: evaluation.message, code: evaluation.code },
        { status: evaluation.status }
      );
    }

    if (evaluation.kind === 'ALREADY_YOURS') {
      return NextResponse.json({
        success: true,
        data: {
          message: 'You have already submitted a claim request for this dare',
          dareId: dare.id,
          claimRequestTag: dare.claimRequestTag,
          claimRequestedAt: dare.claimRequestedAt,
          claimRequestStatus: dare.claimRequestStatus,
          alreadyRequested: true,
        },
      });
    }

    // Compare-and-set: only win the slot if the exact observed state is intact.
    // FRESH → the slot must still be empty; STALE_TAKEOVER → the same stale
    // request we saw must still be present. A concurrent writer that changed the
    // row makes count === 0 → 409.
    // Open-ness (exact observed handle), unassigned, PENDING, and unexpired are
    // all inside the predicate, so time passing or a concurrent handle/claim
    // change makes the write lose (count 0 → 409).
    const unexpired = { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
    const casWhere =
      evaluation.kind === 'STALE_TAKEOVER'
        ? {
            id: dareId,
            status: 'PENDING',
            claimedBy: null,
            targetWalletAddress: null,
            streamerHandle: dare.streamerHandle,
            claimRequestStatus: 'PENDING',
            claimRequestWallet: dare.claimRequestWallet,
            claimRequestedAt: dare.claimRequestedAt,
            ...unexpired,
          }
        : {
            id: dareId,
            status: 'PENDING',
            claimedBy: null,
            targetWalletAddress: null,
            streamerHandle: dare.streamerHandle,
            claimRequestStatus: null,
            ...unexpired,
          };

    const cas = await prisma.dare.updateMany({
      where: casWhere,
      data: {
        claimRequestWallet: lowerWallet,
        claimRequestTag: userTag?.tag ?? null,
        claimRequestedAt: now,
        claimRequestStatus: 'PENDING',
      },
    });

    if (cas.count === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'This dare was just updated by someone else. Refresh and try again.',
          code: 'STATE_CHANGED',
        },
        { status: 409 }
      );
    }

    // Attribution is deliberately separate from claim authorization and
    // payout economics. Bind a previously locked Mission Pass intent only
    // after the claim CAS wins; storage failure must never undo the claim.
    await bindDareIntentToWallet(request, dare.id, lowerWallet).catch((attributionError) => {
      console.error(
        '[ATTRIBUTION] Claim intent binding failed:',
        attributionError instanceof Error ? attributionError.message : attributionError
      );
      return null;
    });

    console.log(`[CLAIM REQUEST] Dare ${dareId} requested by ${claimDisplay} (${lowerWallet})`);

    void alertClaimRequestSubmission({
      dareId: dare.id,
      shortId: dare.shortId || dare.id,
      title: dare.title,
      bounty: dare.bounty,
      claimTag: claimDisplay,
      walletAddress: lowerWallet,
    }).catch((err) => console.error('[TELEGRAM] Claim request alert failed:', err));

    return NextResponse.json({
      success: true,
      data: {
        message: 'Claim request submitted! A moderator will review and approve your request.',
        dareId: dare.id,
        title: dare.title,
        bounty: dare.bounty,
        claimRequestTag: userTag?.tag ?? null,
        claimRequestedAt: now,
        claimRequestStatus: 'PENDING',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CLAIM REQUEST] Failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Withdraw a pending claim request. Uses the same wallet-action authorization as
// POST so a signed cold wallet (header/bearer or session) can withdraw its own
// request — not session-only.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dareId } = await params;
    const { searchParams } = new URL(request.url);
    const queryWallet = normalizeWallet(searchParams.get('wallet'));

    // Distinct action so a fresh claim signature cannot be replayed as a
    // withdrawal authorization (cross-method signature replay).
    const lowerWallet = await getAuthorizedWalletForRequest(request, {
      walletAddress: queryWallet,
      action: 'dare:claim:withdraw',
      resource: dareId,
    });

    if (!lowerWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Atomic withdraw: only clear if THIS wallet still holds the pending request.
    const cas = await prisma.dare.updateMany({
      where: {
        id: dareId,
        claimRequestStatus: 'PENDING',
        claimRequestWallet: lowerWallet,
      },
      data: {
        claimRequestWallet: null,
        claimRequestTag: null,
        claimRequestedAt: null,
        claimRequestStatus: null,
      },
    });

    if (cas.count === 0) {
      return NextResponse.json(
        { success: false, error: 'You do not have a pending claim request for this dare' },
        { status: 400 }
      );
    }

    console.log(`[CLAIM REQUEST] Dare ${dareId} request withdrawn by ${lowerWallet}`);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Claim request withdrawn. The dare is now available for others.',
        dareId,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CLAIM REQUEST] Withdraw failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
