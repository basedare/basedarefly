import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditFundingRows, classifyFundingSnapshot, fundingIdentity } from './funding-audit.mjs';

const owner = '0x0000000000000000000000000000000000000001';
const player = '0x0000000000000000000000000000000000000002';
const row = { id: 'database-id', bounty: 1, status: 'FUNDING', onChainDareId: null, stakerAddress: owner, targetWalletAddress: player };
const target = { chainId: 8453, address: owner, rpcUrl: 'https://mainnet.base.org' };
const bounty = [1000000n, player, owner, owner, false];
test('uses current deterministic identity but records that historical IDs may differ', () => {
  assert.equal(fundingIdentity(row).derived, true);
  assert.equal(fundingIdentity({ ...row, onChainDareId: '42' }).onChainId, 42n);
  assert.throws(() => fundingIdentity({ ...row, onChainDareId: '-1' }));
  assert.throws(() => fundingIdentity({ ...row, bounty: NaN }));
  assert.throws(() => fundingIdentity({ ...row, bounty: 0.0000001 }));
  assert.throws(() => fundingIdentity({ ...row, stakerAddress: 'invalid-wallet' }));
});
test('only an exact active identity/amount match qualifies for funding receipt review', () => {
  assert.equal(classifyFundingSnapshot(row, { bounty, used: true }), 'MATCHED_ACTIVE_ESCROW_REQUIRES_FUNDING_RECEIPT');
  assert.equal(classifyFundingSnapshot({ ...row, bounty: 2 }, { bounty, used: true }), 'ESCROW_MISMATCH');
  assert.equal(classifyFundingSnapshot({ ...row, stakerAddress: player }, { bounty, used: true }), 'ESCROW_MISMATCH');
  assert.equal(classifyFundingSnapshot({ ...row, targetWalletAddress: null }, { bounty, used: true }), 'INCOMPLETE_DATABASE_IDENTITY');
});
test('cleared storage and used IDs never imply payout or refund', () => {
  const empty = [0n, player, owner, owner, false];
  assert.equal(classifyFundingSnapshot(row, { bounty: empty, used: true }), 'USED_ID_REQUIRES_SETTLEMENT_RECEIPTS');
  assert.equal(classifyFundingSnapshot(row, { bounty: empty, used: false }), 'NO_ESCROW_AT_CHECKED_ID');
  assert.equal(classifyFundingSnapshot(row, { bounty: empty, used: null }), 'NO_ESCROW_HISTORY_UNAVAILABLE');
});
test('missing bytecode cannot be mistaken for an RPC failure or a funded record', async () => {
  const report = await auditFundingRows([row], [target], async () => ({ chainId: async () => 8453n, blockNumber: async () => 100, hasCode: async () => false, read: () => { throw Error('must not read'); } }));
  assert.equal(report.items[0].evidence[0].classification, 'CONTRACT_NOT_DEPLOYED');
  assert.equal(report.items[0].classification, 'OPERATOR_REVIEW_REQUIRED');
  assert.equal(report.items[0].idSource, 'DERIVED_CURRENT_ID_SCHEME');
});
test('read failures remain inconclusive; wrong-network RPC aborts', async () => {
  const reader = { chainId: async () => 8453n, blockNumber: async () => 100, hasCode: async () => true, read: async () => { throw Error('RPC down'); } };
  const report = await auditFundingRows([row], [target], async () => reader);
  assert.equal(report.items[0].evidence[0].classification, 'RPC_OR_CONTRACT_READ_FAILED');
  await assert.rejects(auditFundingRows([row], [target], async () => ({ ...reader, chainId: async () => 84532n })), /chain/);
});
