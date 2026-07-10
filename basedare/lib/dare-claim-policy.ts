// Deterministic claim-lifecycle policy for open dares.
//
// Pure functions only — NO prisma/next imports — so the money + proof rails are
// trivially and adversarially testable and the API routes stay thin. Every
// claim/approve decision flows through here so there is one audited place for
// open-ness, expiry, self-dealing, squat-TTL, and actor-handle resolution.

/** Handles that mean "anyone can claim" — never a real completing actor. */
const OPEN_HANDLE_SENTINELS = new Set(['@open', '@everyone']);

/** A pending claim request older than this may be released so a disposable
 *  wallet cannot squat the single claim slot indefinitely. */
export const PENDING_CLAIM_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function isOpenHandle(handle: string | null | undefined): boolean {
  if (!handle) return true; // null/empty handle = open
  return OPEN_HANDLE_SENTINELS.has(handle.trim().toLowerCase());
}

export function isRealCreatorHandle(handle: string | null | undefined): boolean {
  return Boolean(handle) && !isOpenHandle(handle);
}

export interface ClaimDareSnapshot {
  status: string;
  streamerHandle: string | null;
  claimedBy: string | null;
  targetWalletAddress: string | null;
  stakerAddress: string | null;
  expiresAt: Date | null;
  claimRequestStatus: string | null;
  claimRequestWallet: string | null;
  claimRequestTag: string | null;
  claimRequestedAt: Date | null;
}

export type ClaimEvalResult =
  | { ok: true; kind: 'FRESH' | 'ALREADY_YOURS' | 'STALE_TAKEOVER' }
  | { ok: false; status: number; code: string; message: string };

export function isPendingClaimStale(
  claimRequestedAt: Date | null,
  now: Date,
  ttlMs: number = PENDING_CLAIM_TTL_MS,
): boolean {
  if (!claimRequestedAt) return false;
  return now.getTime() - claimRequestedAt.getTime() > ttlMs;
}

/**
 * Decide whether `claimantWallet` may take the single claim slot on `dare`.
 * Deterministic and side-effect free — the caller performs a compare-and-set
 * guarded on the exact observed state to actually win the slot.
 */
export function evaluateClaimEligibility(
  dare: ClaimDareSnapshot,
  claimantWallet: string,
  now: Date,
  ttlMs: number = PENDING_CLAIM_TTL_MS,
): ClaimEvalResult {
  const wallet = claimantWallet.toLowerCase();

  if (dare.status !== 'PENDING') {
    return {
      ok: false,
      status: 400,
      code: 'NOT_CLAIMABLE',
      message: `Dare is not available for claiming (status: ${dare.status})`,
    };
  }

  // Genuinely open: nobody assigned, and the handle is null/@open/@everyone.
  if (dare.claimedBy || dare.targetWalletAddress || isRealCreatorHandle(dare.streamerHandle)) {
    return {
      ok: false,
      status: 400,
      code: 'NOT_OPEN',
      message: 'This dare is targeted at a specific creator, not open for claiming',
    };
  }

  if (dare.expiresAt && dare.expiresAt.getTime() < now.getTime()) {
    return { ok: false, status: 400, code: 'EXPIRED', message: 'This dare has expired' };
  }

  // No self-dealing: the funder cannot claim (and later pay) their own bounty.
  if (dare.stakerAddress && dare.stakerAddress.toLowerCase() === wallet) {
    return {
      ok: false,
      status: 403,
      code: 'SELF_DEALING',
      message: 'You funded this dare and cannot claim your own bounty.',
    };
  }

  if (dare.claimRequestStatus === 'PENDING') {
    if (dare.claimRequestWallet?.toLowerCase() === wallet) {
      return { ok: true, kind: 'ALREADY_YOURS' };
    }
    if (isPendingClaimStale(dare.claimRequestedAt, now, ttlMs)) {
      return { ok: true, kind: 'STALE_TAKEOVER' };
    }
    return {
      ok: false,
      status: 409,
      code: 'SLOT_TAKEN',
      message:
        'Another wallet has a pending claim request. Please wait for moderator review or try again shortly.',
    };
  }

  return { ok: true, kind: 'FRESH' };
}

/**
 * On approval, decide the dare's `streamerHandle`.
 * - a real claim tag wins (tagged creator path, unchanged)
 * - otherwise a real existing creator handle is preserved (never cleared)
 * - otherwise the open sentinel (@open/@everyone/null) is cleared to null so the
 *   receipt/proof actor falls back to the assigned wallet — never @everyone
 *   masquerading as the completing actor.
 */
export function resolveApprovalHandle(
  currentHandle: string | null,
  claimTag: string | null,
): string | null {
  if (isRealCreatorHandle(claimTag)) return claimTag;
  if (isRealCreatorHandle(currentHandle)) return currentHandle;
  return null;
}

export type ApprovalEvalResult =
  | { ok: true }
  | { ok: false; status: number; code: string; message: string };

/**
 * Approval-time revalidation. The world can change between request and
 * moderation, so re-check everything that matters — claimability, expiry,
 * self-dealing, and (critically) that no real creator handle was introduced
 * after the request. Returns a 409/403 result the route mirrors into an atomic
 * compare-and-set; it never mutates.
 */
export function evaluateApproval(dare: ClaimDareSnapshot, now: Date): ApprovalEvalResult {
  if (dare.status !== 'PENDING') {
    return { ok: false, status: 409, code: 'NOT_CLAIMABLE', message: `Dare is no longer claimable (status: ${dare.status}).` };
  }
  if (dare.claimedBy || dare.targetWalletAddress) {
    return { ok: false, status: 409, code: 'ALREADY_ASSIGNED', message: 'This dare has already been assigned.' };
  }
  if (dare.expiresAt && dare.expiresAt.getTime() < now.getTime()) {
    return { ok: false, status: 409, code: 'EXPIRED', message: 'This dare has expired and can no longer be assigned.' };
  }
  // Recheck self-dealing at moderation time — the funder can never be assigned.
  if (
    dare.stakerAddress &&
    dare.claimRequestWallet &&
    dare.stakerAddress.toLowerCase() === dare.claimRequestWallet.toLowerCase()
  ) {
    return { ok: false, status: 403, code: 'SELF_DEALING', message: 'The funder cannot be assigned their own bounty.' };
  }
  // A real creator handle introduced after the request (not the claim's own tag)
  // means this is no longer the open dare that was requested — never preserve it
  // while assigning a different wallet.
  if (isRealCreatorHandle(dare.streamerHandle) && dare.streamerHandle !== dare.claimRequestTag) {
    return {
      ok: false,
      status: 409,
      code: 'HANDLE_CHANGED',
      message: 'This dare is no longer open (a creator handle was set after the request).',
    };
  }
  return { ok: true };
}

/** The exact reject compare-and-set predicate (typed, no Prisma import). */
export interface RejectCasWhere {
  id: string;
  status: 'PENDING';
  claimedBy: null;
  targetWalletAddress: null;
  claimRequestStatus: 'PENDING';
  claimRequestWallet: string | null;
}

/**
 * Complete terminal-state guard for rejecting a pending claim, symmetric with the
 * approve CAS. A reject may only clear the claim of a still-live (status PENDING),
 * unassigned (claimedBy AND targetWalletAddress both null) dare whose pending
 * request still belongs to the observed wallet. Atomically blocks (count 0 → 409):
 *  - approved-in-between        → claimRequestStatus flipped to APPROVED, claimedBy set
 *  - rejected / withdrawn       → claimRequestStatus is REJECTED or null
 *  - another-wallet takeover    → claimRequestWallet changed
 *  - targeted-conversion        → targetWalletAddress set out-of-band by tag verification
 *  - dare left PENDING          → any terminal/settlement status
 * streamerHandle is intentionally NOT guarded: a handle change alone must still
 * allow clearing a stale open claim, so adding it would wrongly 409 a valid reject.
 */
export function buildRejectCasWhere(
  dareId: string,
  observed: Pick<ClaimDareSnapshot, 'claimRequestWallet'>,
): RejectCasWhere {
  return {
    id: dareId,
    status: 'PENDING',
    claimedBy: null,
    targetWalletAddress: null,
    claimRequestStatus: 'PENDING',
    claimRequestWallet: observed.claimRequestWallet,
  };
}
