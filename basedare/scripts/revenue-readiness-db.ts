import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { verifyMessage } from 'viem';
import { prisma } from '@/lib/prisma';
import { CONTENT_RIGHTS_VERSION } from '@/lib/content-delivery';
import { buildOutcomeContractSnapshot } from '@/lib/outcome-contracts';
import { buildWalletActionMessage } from '@/lib/wallet-action-auth';
import { contentRightsFingerprint, hasContentRightsAcceptance, contentSubmissionProblem, recordContentRightsAcceptance } from '@/lib/content-rights-server';
import { getSprintEconomics, recordSprintEconomics } from '@/lib/delivery-economics-server';
import { createWalletNotification } from '@/lib/notifications';

// The actual claim route and database run here. Next's request-scoped session
// adapter is replaced with local EOA signature verification; no chain calls,
// external notifications, real customers or production funds are involved.
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function(request: string, ...args: unknown[]) {
  if (request === '@/lib/wallet-action-auth-server') return {
    getAuthorizedWalletForRequest: async (req: NextRequest, input: { walletAddress: string; action: string; resource: string }) => {
      const issuedAt = req.headers.get('x-basedare-wallet-issued-at');
      const signature = req.headers.get('x-basedare-wallet-signature');
      if (!issuedAt || !signature || !input.walletAddress) return null;
      try { return await verifyMessage({ address: input.walletAddress as `0x${string}`, signature: signature as `0x${string}`,
        message: buildWalletActionMessage({ ...input, issuedAt }) }) ? input.walletAddress.toLowerCase() : null; }
      catch { return null; }
    },
  };
  if (request === '@/lib/proof-submit-auth-server') return {
    getAuthorizedProofSubmitterWallet: async (req: NextRequest, input: { authorizedWallets: Array<string | null> }) => {
      const wallet = req.headers.get('x-test-wallet');
      return wallet && input.authorizedWallets.some((allowed) => allowed?.toLowerCase() === wallet) ? wallet : null;
    },
  };
  if (request === '@/lib/admin-auth') return {
    authorizeAdminRequest: async (req: NextRequest) => ({ authorized: req.headers.get('x-test-admin') === 'yes', walletAddress: 'test-operator' }),
    unauthorizedAdminResponse: () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  };
  if (request === '@/lib/media-upload') return {
    ...originalLoad.call(this, request, ...args),
    uploadPublicMediaFile: async () => { const cid = randomUUID(); return { cid, url: `https://example.com/${cid}.mp4` }; },
  };
  return originalLoad.call(this, request, ...args);
};

async function main() {
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  assert.match(rows[0]?.name ?? '', /^basedare_revenue_readiness_/, 'Disposable database required.');
  process.env.CONTENT_RIGHTS_APPROVED_VERSION = CONTENT_RIGHTS_VERSION;
  const { POST } = require('../app/api/dares/[id]/claim/route');
  const accounts = [privateKeyToAccount(generatePrivateKey()), privateKeyToAccount(generatePrivateKey())];
  const snapshot = buildOutcomeContractSnapshot({ title: 'Film the venue entrance', amount: 100, missionMode: 'IRL', isNearbyDare: true,
    contentDelivery: { termsVersion: CONTENT_RIGHTS_VERSION, buyerName: 'Test venue', assetType: 'VIDEO', format: 'Vertical 20 seconds',
      acceptanceCriteria: 'Show the entrance with clear original footage.', posting: 'NONE', postingInstructions: '', revisionLimit: 0, deadline: new Date(Date.now() + 86400000).toISOString() } });
  const dare = await prisma.dare.create({ data: { title: 'Film the venue entrance', bounty: 100, status: 'PENDING', tag: 'brand-campaign', isNearbyDare: true,
    latitude: 9.8, longitude: 126.15, expiresAt: new Date(Date.now() + 86400000), outcomeContractSnapshot: snapshot } });
  const fingerprint = contentRightsFingerprint(snapshot);
  assert.equal(contentRightsFingerprint(dare.outcomeContractSnapshot), fingerprint, 'JSONB key ordering must not change consent');
  assert.ok(contentSubmissionProblem({ outcomeContractSnapshot: snapshot }));
  assert.equal(contentSubmissionProblem({ outcomeContractSnapshot: snapshot, contentSubmittedAt: new Date() }), null);
  assert.ok(contentSubmissionProblem({ outcomeContractSnapshot: snapshot, contentSubmittedAt: new Date(Date.now() + 2 * 86400000) }));
  async function claim(index: number, rights: unknown, signed = true) {
    const walletAddress = accounts[index].address.toLowerCase(); const issuedAt = new Date().toISOString();
    const signature = await accounts[index].signMessage({ message: buildWalletActionMessage({ walletAddress, issuedAt, action: 'dare:claim', resource: dare.id }) });
    const req = new NextRequest(`http://localhost/api/dares/${dare.id}/claim`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(signed ? { 'x-basedare-wallet-issued-at': issuedAt, 'x-basedare-wallet-signature': signature } : {}) },
      body: JSON.stringify({ walletAddress, ...(rights ? { contentRights: rights } : {}) }) });
    return POST(req, { params: Promise.resolve({ id: dare.id }) });
  }
  assert.equal((await claim(0, null, false)).status, 401);
  assert.equal((await claim(0, null)).status, 409);
  assert.equal((await claim(0, { accepted: true, fingerprint: '0'.repeat(64) })).status, 409);
  const concurrent = await Promise.all([claim(0, { accepted: true, fingerprint }), claim(1, { accepted: true, fingerprint })]);
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 409]);
  assert.equal(await prisma.contentRightsAcceptance.count(), 1);
  const requested = await prisma.dare.findUniqueOrThrow({ where: { id: dare.id } });
  const winner = accounts.findIndex((a) => a.address.toLowerCase() === requested.claimRequestWallet);
  assert.equal((await claim(winner, { accepted: true, fingerprint })).status, 200);
  assert.equal(await prisma.contentRightsAcceptance.count(), 1);
  assert.equal(await hasContentRightsAcceptance({ ...requested, claimedBy: requested.claimRequestWallet }), true);
  assert.equal(await hasContentRightsAcceptance({ ...requested, claimedBy: accounts[1 - winner].address }), false);
  assert.equal(await hasContentRightsAcceptance({ ...requested, claimedBy: requested.claimRequestWallet, outcomeContractSnapshot: { ...snapshot, contentDelivery: { ...snapshot.contentDelivery, buyerName: 'Different buyer' } } }), false);
  const acceptance = await prisma.contentRightsAcceptance.findFirstOrThrow();
  await assert.rejects(prisma.contentRightsAcceptance.update({ where: { id: acceptance.id }, data: { termsVersion: 'changed' } }), /immutable/);
  await assert.rejects(prisma.contentRightsAcceptance.delete({ where: { id: acceptance.id } }), /immutable/);
  await assert.rejects(prisma.$transaction(async (tx) => { await tx.$executeRawUnsafe('SET LOCAL ROLE anon'); await tx.$queryRaw`SELECT * FROM "ContentRightsAcceptance"`; }), /permission denied/);
  const serviceRead = await prisma.$transaction(async (tx) => { await tx.$executeRawUnsafe('SET LOCAL ROLE service_role'); return tx.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) FROM "ContentRightsAcceptance"`; });
  assert.equal(Number(serviceRead[0].count), 1, 'Service role can read consent under RLS');
  console.log('PASS: actual claim route rejects missing/wrong consent and unsigned access; concurrent claim has one winner and one immutable wallet-bound acceptance.');

  // Real upload route and database; only identity adapter and external media
  // storage are substituted. No fixture media leaves this process.
  const uploadRoute = require('../app/api/upload/route').POST;
  const winnerWallet = accounts[winner].address.toLowerCase();
  const buyerWallet = accounts[1 - winner].address.toLowerCase();
  await prisma.dare.update({ where: { id: dare.id }, data: { claimedBy: winnerWallet, stakerAddress: buyerWallet } });
  async function upload(id: string, wallet = winnerWallet, mime = 'video/mp4') {
    const body = new FormData(); body.set('dareId', id);
    body.set('file', new File(['test media'], mime === 'video/mp4' ? 'clip.mp4' : 'photo.jpg', { type: mime }));
    return uploadRoute(new NextRequest('http://localhost/api/upload', { method: 'POST', headers: { 'x-test-wallet': wallet }, body }));
  }
  assert.equal((await upload(dare.id, buyerWallet)).status, 403, 'Buyer cannot submit for contributor');
  assert.equal((await upload(dare.id, winnerWallet, 'image/jpeg')).status, 400, 'Wrong asset type rejected');
  const uploads = await Promise.all([upload(dare.id), upload(dare.id)]);
  const uploadStatuses = uploads.map((r) => r.status);
  assert.ok(uploadStatuses.includes(200));
  assert.ok(uploadStatuses.every((status) => status === 200 || status === 409));
  const delivered = await prisma.dare.findUniqueOrThrow({ where: { id: dare.id } });
  assert.ok(delivered.contentSubmittedAt); assert.ok(delivered.proofCid);
  assert.equal(contentSubmissionProblem(delivered), null);
  const recovery = await upload(dare.id);
  assert.equal(recovery.status, 200);
  assert.equal((await recovery.json()).existingProof, true);
  assert.equal((await prisma.dare.findUniqueOrThrow({ where: { id: dare.id } })).proofCid, delivered.proofCid);
  const lateSnapshot = { ...snapshot, contentDelivery: { ...snapshot.contentDelivery!, deadline: new Date(Date.now() - 60000).toISOString() } };
  const late = await prisma.dare.create({ data: { title: 'Expired content delivery', bounty: 100, claimedBy: winnerWallet, outcomeContractSnapshot: lateSnapshot } });
  await prisma.$transaction((tx) => recordContentRightsAcceptance(tx, { dareId: late.id, wallet: winnerWallet, snapshot: lateSnapshot, accepted: true, fingerprint: contentRightsFingerprint(lateSnapshot) }));
  assert.equal((await upload(late.id)).status, 409, 'Late new content cannot enter review');
  await prisma.dare.update({ where: { id: dare.id }, data: { status: 'PENDING_REVIEW' } });
  assert.equal((await upload(dare.id)).status, 409, 'Review proof cannot be replaced');
  console.log('PASS: content upload enforces assigned author, asset type and deadline; concurrent/retried uploads preserve the saved proof and review state.');

  const { approveDareWithPayout } = require('../lib/dare-approval');
  const { moderateDareDecision } = require('../lib/dare-moderation');
  const approval = (id: string) => approveDareWithPayout({ dareId: id, sourceContext: 'LOCAL_DB_TEST' });
  const noRights = await prisma.dare.create({ data: { title: 'Consent missing', bounty: 100, claimedBy: winnerWallet, outcomeContractSnapshot: snapshot, isSimulated: true } });
  await assert.rejects(approval(noRights.id), /consent is missing/);
  await assert.rejects(approval(late.id), /received before its delivery deadline/);
  const postSnapshot = { ...snapshot, contentDelivery: { ...snapshot.contentDelivery!, posting: 'PUBLIC_POST', postingInstructions: 'Publish on the agreed Instagram account.' } };
  const noPost = await prisma.dare.create({ data: { title: 'Publication missing', bounty: 100, claimedBy: winnerWallet, outcomeContractSnapshot: postSnapshot, isSimulated: true, contentSubmittedAt: new Date() } });
  await prisma.$transaction((tx) => recordContentRightsAcceptance(tx, { dareId: noPost.id, wallet: winnerWallet, snapshot: postSnapshot, accepted: true, fingerprint: contentRightsFingerprint(postSnapshot) }));
  await assert.rejects(approval(noPost.id), /public post URL/);
  assert.equal((await prisma.dare.findUniqueOrThrow({ where: { id: noPost.id } })).status, 'PENDING');

  // Reject -> contributor appeal -> simulated approval -> repeat approval.
  const rejected = await moderateDareDecision({ dareId: dare.id, decision: 'REJECT', sourceContext: 'LOCAL_DB_TEST', note: 'Please reconsider the original evidence.' });
  assert.equal(rejected.newStatus, 'FAILED');
  const rejectedNotice = await prisma.notification.findFirstOrThrow({ where: { type: 'DARE_FAILED' } });
  assert.equal(rejectedNotice.wallet, winnerWallet); assert.equal(rejectedNotice.link, `/earn/${dare.id}`);
  const appealRoute = require('../app/api/verify-proof/route').PUT;
  let testIp = 1;
  const appeal = (id: string, wallet = winnerWallet) => appealRoute(new NextRequest('http://localhost/api/verify-proof', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-test-wallet': wallet, 'x-forwarded-for': `127.0.0.${testIp++}` }, body: JSON.stringify({ dareId: id, reason: 'The original footage shows the agreed entrance clearly.' }) }));
  assert.equal((await appeal(dare.id, '0x0000000000000000000000000000000000000001')).status, 401);
  const appealResponses = await Promise.all([appeal(dare.id), appeal(dare.id)]);
  assert.equal(appealResponses.filter((r) => r.status === 200).length, 1);
  assert.ok(appealResponses.some((r) => [400, 409].includes(r.status)));
  assert.equal((await prisma.dare.findUniqueOrThrow({ where: { id: dare.id } })).appealStatus, 'PENDING');
  await prisma.dare.update({ where: { id: dare.id }, data: { isSimulated: true } });
  const settled = await approveDareWithPayout({ dareId: dare.id, sourceContext: 'LOCAL_DB_TEST', appealStatus: 'APPROVED' });
  assert.equal(settled.status, 'VERIFIED'); assert.equal(settled.txHash, null);
  assert.deepEqual(settled.payout, { totalBounty: 100, streamer: 96, house: 4, referrer: 0 });
  await approval(dare.id);
  assert.equal(await prisma.notification.count({ where: { type: 'DARE_VERIFIED', wallet: winnerWallet } }), 1);
  assert.equal((await appeal(dare.id)).status, 400, 'Completed work cannot reopen an appeal');
  // A stale reject must not downgrade settled money, even with a legacy blank decision.
  await prisma.dare.update({ where: { id: dare.id }, data: { moderatorDecision: null } });
  await assert.rejects(moderateDareDecision({ dareId: dare.id, decision: 'REJECT', sourceContext: 'LOCAL_DB_TEST' }), /changed during review/);
  assert.equal((await prisma.dare.findUniqueOrThrow({ where: { id: dare.id } })).status, 'VERIFIED');
  const review = await prisma.dare.create({ data: { title: 'Appeal review fixture', bounty: 100, status: 'PENDING_REVIEW', appealStatus: 'PENDING', claimedBy: winnerWallet } });
  const adminAppeal = require('../app/api/admin/appeals/route').PUT;
  const adminResponse = await adminAppeal(new NextRequest('http://localhost/api/admin/appeals', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-test-admin': 'yes' }, body: JSON.stringify({ dareId: review.id, decision: 'REJECTED' }) }));
  assert.equal(adminResponse.status, 200);
  assert.equal((await prisma.dare.findUniqueOrThrow({ where: { id: review.id } })).status, 'FAILED');
  console.log('PASS: payout rejects missing consent/deadline/post; rejection -> one appeal -> simulated approval is recoverable and idempotent; late rejection cannot downgrade settlement. No chain transaction was sent.');

  const sprint = await prisma.verifiedFieldSprint.create({ data: { receiptCode: randomUUID(), campaignCode: randomUUID(), status: 'COMPLETE', buyerName: 'Test buyer', buyerQuestion: 'Is the stated service available?', areaLabel: 'Test area', freshnessWindowHours: 6, createdBy: 'test', serviceFeeConfirmedUsd: 2000, rewardPoolConfirmedUsd: 500 } });
  const cost = { sprintId: sprint.id, requestId: randomUUID(), kind: 'DELIVERY_COST' as const, amountUsd: 2200, minutes: 720, note: 'Actual delivery cost including operator labour', actor: 'test' };
  await recordSprintEconomics(cost); await recordSprintEconomics(cost);
  await assert.rejects(recordSprintEconomics({ ...cost, amountUsd: 2201 }), /different entry/);
  await assert.rejects(recordSprintEconomics({ ...cost, requestId: randomUUID(), kind: 'SERVICE_REFUND', amountUsd: 2001, minutes: 0 }), /exceeds/);
  let economics = await getSprintEconomics(sprint.id);
  assert.equal(economics.recordedCostUsd, 2200); assert.equal(economics.contributionUsd, null);
  economics = await recordSprintEconomics({ ...cost, requestId: randomUUID(), kind: 'RECONCILED', amountUsd: 0, minutes: 0, note: 'All costs and refunds recorded' });
  assert.equal(economics.contributionUsd, -200); assert.equal(economics.costCeilingExceeded, true);
  assert.equal(economics.paidRepeatPurchases, null, 'Missing buyer identity must not imply zero repeat sales');
  const completedAt = new Date(Date.now() - 60000);
  await prisma.verifiedFieldSprint.update({ where: { id: sprint.id }, data: { buyerWalletAddress: buyerWallet, completedAt } });
  const later = await prisma.verifiedFieldSprint.create({ data: { receiptCode: randomUUID(), campaignCode: randomUUID(), status: 'COMPLETE', buyerName: 'Same buyer', buyerWalletAddress: buyerWallet, buyerQuestion: 'Check the service again', areaLabel: 'Test area', freshnessWindowHours: 6, createdBy: 'test', fundedAt: new Date(), completedAt: new Date(), serviceFeeConfirmedUsd: 2000, rewardPoolConfirmedUsd: 500 } });
  assert.equal((await getSprintEconomics(sprint.id)).paidRepeatPurchases, 1);
  await recordSprintEconomics({ sprintId: later.id, requestId: randomUUID(), kind: 'SERVICE_REFUND', amountUsd: 2000, minutes: 0, note: 'Full service refund recorded for test', actor: 'test' });
  assert.equal((await getSprintEconomics(sprint.id)).paidRepeatPurchases, 0, 'Fully refunded service is not a repeat sale');
  await createWalletNotification({ wallet: accounts[winner].address, type: 'CLAIM_APPROVED', title: 'Mission confirmed', message: 'Open the assigned mission.', link: `/earn/${dare.id}` });
  assert.equal((await prisma.notification.findFirstOrThrow({ where: { type: 'CLAIM_APPROVED' } })).link, `/earn/${dare.id}`);
  console.log('PASS: costs are idempotent, oversize refunds fail, recorded loss remains visible, and an in-app notification preserves the exact mission link.');
  console.log('NOT TESTED: production session adapter, real escrow/funding/payout/refund, physical phones or actual push delivery.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); process.exit(process.exitCode || 0); });
