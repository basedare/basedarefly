import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateClaimEligibility,
  resolveApprovalHandle,
  evaluateApproval,
  buildRejectCasWhere,
  isOpenHandle,
  isRealCreatorHandle,
  isPendingClaimStale,
  PENDING_CLAIM_TTL_MS,
  type ClaimDareSnapshot,
} from './dare-claim-policy.ts';

const NOW = new Date('2026-07-10T12:00:00.000Z');
const CLAIMER = '0x1111111111111111111111111111111111111111';
const FUNDER = '0x2222222222222222222222222222222222222222';
const OTHER = '0x3333333333333333333333333333333333333333';

function openDare(overrides: Partial<ClaimDareSnapshot> = {}): ClaimDareSnapshot {
  return {
    status: 'PENDING',
    streamerHandle: '@everyone',
    claimedBy: null,
    targetWalletAddress: null,
    stakerAddress: FUNDER,
    expiresAt: null,
    claimRequestStatus: null,
    claimRequestWallet: null,
    claimRequestTag: null,
    claimRequestedAt: null,
    ...overrides,
  };
}

test('handle helpers', () => {
  for (const h of [null, undefined, '', '@open', '@OPEN', '@everyone', '@Everyone']) {
    assert.equal(isOpenHandle(h as string | null), true, `open: ${h}`);
    assert.equal(isRealCreatorHandle(h as string | null), false, `not real: ${h}`);
  }
  assert.equal(isOpenHandle('@basedarebear'), false);
  assert.equal(isRealCreatorHandle('@basedarebear'), true);
});

test('fresh open dare is claimable by a non-funder wallet', () => {
  const r = evaluateClaimEligibility(openDare(), CLAIMER, NOW);
  assert.deepEqual(r, { ok: true, kind: 'FRESH' });
});

test('null handle counts as open', () => {
  const r = evaluateClaimEligibility(openDare({ streamerHandle: null }), CLAIMER, NOW);
  assert.equal(r.ok, true);
});

test('self-dealing: the funder cannot claim their own dare', () => {
  const r = evaluateClaimEligibility(openDare(), FUNDER, NOW);
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.code, 'SELF_DEALING');
  assert.equal(r.ok === false && r.status, 403);
});

test('expired dare rejected', () => {
  const r = evaluateClaimEligibility(
    openDare({ expiresAt: new Date(NOW.getTime() - 1000) }),
    CLAIMER,
    NOW,
  );
  assert.equal(r.ok === false && r.code, 'EXPIRED');
});

test('non-open (real target handle) rejected', () => {
  const r = evaluateClaimEligibility(openDare({ streamerHandle: '@somecreator' }), CLAIMER, NOW);
  assert.equal(r.ok === false && r.code, 'NOT_OPEN');
});

test('already-claimed (claimedBy set) rejected as not open', () => {
  const r = evaluateClaimEligibility(openDare({ claimedBy: OTHER }), CLAIMER, NOW);
  assert.equal(r.ok === false && r.code, 'NOT_OPEN');
});

test('non-PENDING status rejected', () => {
  const r = evaluateClaimEligibility(openDare({ status: 'VERIFIED' }), CLAIMER, NOW);
  assert.equal(r.ok === false && r.code, 'NOT_CLAIMABLE');
});

test('same wallet re-request is idempotent (ALREADY_YOURS)', () => {
  const r = evaluateClaimEligibility(
    openDare({ claimRequestStatus: 'PENDING', claimRequestWallet: CLAIMER, claimRequestedAt: NOW }),
    CLAIMER,
    NOW,
  );
  assert.deepEqual(r, { ok: true, kind: 'ALREADY_YOURS' });
});

test('another wallet with a fresh pending request blocks with 409', () => {
  const r = evaluateClaimEligibility(
    openDare({ claimRequestStatus: 'PENDING', claimRequestWallet: OTHER, claimRequestedAt: NOW }),
    CLAIMER,
    NOW,
  );
  assert.equal(r.ok === false && r.status, 409);
  assert.equal(r.ok === false && r.code, 'SLOT_TAKEN');
});

test('a stale pending request from another wallet can be taken over', () => {
  const stale = new Date(NOW.getTime() - PENDING_CLAIM_TTL_MS - 1000);
  const r = evaluateClaimEligibility(
    openDare({ claimRequestStatus: 'PENDING', claimRequestWallet: OTHER, claimRequestedAt: stale }),
    CLAIMER,
    NOW,
  );
  assert.deepEqual(r, { ok: true, kind: 'STALE_TAKEOVER' });
});

test('isPendingClaimStale boundary', () => {
  assert.equal(isPendingClaimStale(null, NOW), false);
  assert.equal(isPendingClaimStale(new Date(NOW.getTime() - PENDING_CLAIM_TTL_MS + 1000), NOW), false);
  assert.equal(isPendingClaimStale(new Date(NOW.getTime() - PENDING_CLAIM_TTL_MS - 1000), NOW), true);
});

test('resolveApprovalHandle: real tag wins', () => {
  assert.equal(resolveApprovalHandle('@everyone', '@realcreator'), '@realcreator');
});

test('resolveApprovalHandle: open sentinels cleared to null (no @everyone actor)', () => {
  assert.equal(resolveApprovalHandle('@everyone', null), null);
  assert.equal(resolveApprovalHandle('@open', null), null);
  assert.equal(resolveApprovalHandle(null, null), null);
});

test('resolveApprovalHandle: a real existing creator handle is preserved', () => {
  assert.equal(resolveApprovalHandle('@existingcreator', null), '@existingcreator');
});

function pendingClaim(overrides: Partial<ClaimDareSnapshot> = {}): ClaimDareSnapshot {
  return openDare({ claimRequestStatus: 'PENDING', claimRequestWallet: CLAIMER, claimRequestedAt: NOW, ...overrides });
}

test('evaluateApproval: happy path ok', () => {
  assert.deepEqual(evaluateApproval(pendingClaim(), NOW), { ok: true });
});

test('evaluateApproval: already assigned → 409', () => {
  const r = evaluateApproval(pendingClaim({ claimedBy: OTHER }), NOW);
  assert.equal(r.ok === false && r.status, 409);
  assert.equal(r.ok === false && r.code, 'ALREADY_ASSIGNED');
});

test('evaluateApproval: terminal status → 409', () => {
  assert.equal(evaluateApproval(pendingClaim({ status: 'REFUNDED' }), NOW).ok, false);
});

test('evaluateApproval: expired → 409', () => {
  const r = evaluateApproval(pendingClaim({ expiresAt: new Date(NOW.getTime() - 1000) }), NOW);
  assert.equal(r.ok === false && r.code, 'EXPIRED');
});

test('evaluateApproval: rechecks self-dealing (funder is the requester) → 403', () => {
  const r = evaluateApproval(pendingClaim({ claimRequestWallet: FUNDER }), NOW);
  assert.equal(r.ok === false && r.status, 403);
  assert.equal(r.ok === false && r.code, 'SELF_DEALING');
});

test('evaluateApproval: real creator handle introduced after request → 409 HANDLE_CHANGED', () => {
  const r = evaluateApproval(pendingClaim({ streamerHandle: '@sniper', claimRequestTag: null }), NOW);
  assert.equal(r.ok === false && r.status, 409);
  assert.equal(r.ok === false && r.code, 'HANDLE_CHANGED');
});

test('evaluateApproval: handle equal to the claim tag is allowed (tagged path)', () => {
  assert.deepEqual(
    evaluateApproval(pendingClaim({ streamerHandle: '@realcreator', claimRequestTag: '@realcreator' }), NOW),
    { ok: true },
  );
});

// --- buildRejectCasWhere: complete terminal-state guard (P1-H) ----------------

test('buildRejectCasWhere: guards status PENDING (never reject a terminal-status dare)', () => {
  assert.equal(buildRejectCasWhere('d1', { claimRequestWallet: '0xabc' }).status, 'PENDING');
});

test('buildRejectCasWhere: guards targetWalletAddress null (the missing guard — no clobber of a targeted dare)', () => {
  assert.equal(buildRejectCasWhere('d1', { claimRequestWallet: '0xabc' }).targetWalletAddress, null);
});

test('buildRejectCasWhere: guards claimedBy null AND claimRequestStatus PENDING', () => {
  const w = buildRejectCasWhere('d1', { claimRequestWallet: '0xabc' });
  assert.equal(w.claimedBy, null);
  assert.equal(w.claimRequestStatus, 'PENDING');
});

test('buildRejectCasWhere: threads the observed wallet (never clobber a different wallet)', () => {
  assert.equal(buildRejectCasWhere('d1', { claimRequestWallet: '0xWALLET' }).claimRequestWallet, '0xWALLET');
  assert.equal(buildRejectCasWhere('d1', { claimRequestWallet: null }).claimRequestWallet, null);
});

test('buildRejectCasWhere: keys the row by id and does NOT guard streamerHandle', () => {
  const w = buildRejectCasWhere('d1', { claimRequestWallet: '0xabc' });
  assert.equal(w.id, 'd1');
  assert.equal('streamerHandle' in w, false);
});
