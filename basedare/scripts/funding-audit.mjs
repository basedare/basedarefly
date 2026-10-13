#!/usr/bin/env node
// Read-only evidence collection. Never imports the app's mutating reconciler.
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { getAddress, id, parseUnits } from 'ethers';
import { createPublicClient, http, parseAbi } from 'viem';

const ABI = parseAbi([
  'function bounties(uint256) view returns (uint256,address,address,address,bool)',
  'function usedDareIds(uint256) view returns (bool)',
]);

export function fundingIdentity(row) {
  if (!row || typeof row.id !== 'string' || !row.id.trim()) throw new Error('Missing database ID');
  const derived = row.onChainDareId == null || row.onChainDareId === '';
  const value = derived ? BigInt(id(row.id)) : BigInt(row.onChainDareId);
  if (value < 0n || value >= 2n ** 256n) throw new Error('Invalid uint256 ID');
  if (!Number.isFinite(row.bounty) || row.bounty <= 0) throw new Error('Invalid reward amount');
  const amount = parseUnits(row.bounty.toFixed(6), 6);
  if (amount <= 0n) throw new Error('Invalid reward precision');
  if (row.stakerAddress) getAddress(row.stakerAddress);
  if (row.targetWalletAddress) getAddress(row.targetWalletAddress);
  return { onChainId: value, derived, amount };
}

export function classifyFundingSnapshot(row, snapshot) {
  const expected = fundingIdentity(row);
  const [amount, recipient, , backer, processed] = snapshot.bounty;
  if (amount === 0n) {
    if (snapshot.used === null) return 'NO_ESCROW_HISTORY_UNAVAILABLE';
    return snapshot.used
      ? 'USED_ID_REQUIRES_SETTLEMENT_RECEIPTS'
      : 'NO_ESCROW_AT_CHECKED_ID';
  }
  if (processed) return 'PROCESSED_REQUIRES_SETTLEMENT_RECEIPTS';
  if (!row.stakerAddress || !row.targetWalletAddress) return 'INCOMPLETE_DATABASE_IDENTITY';
  if (amount !== expected.amount ||
      getAddress(backer) !== getAddress(row.stakerAddress) ||
      getAddress(recipient) !== getAddress(row.targetWalletAddress)) return 'ESCROW_MISMATCH';
  return 'MATCHED_ACTIVE_ESCROW_REQUIRES_FUNDING_RECEIPT';
}

export async function auditFundingRows(rows, targets, connect) {
  const contracts = [];
  for (const target of targets) {
    if (![8453, 84532].includes(target.chainId)) throw new Error('Only explicit Base mainnet/Sepolia targets are supported');
    getAddress(target.address);
    const url = new URL(target.rpcUrl);
    if (url.protocol !== 'https:') throw new Error('Use an HTTPS read-only RPC');
    const reader = await connect(target);
    if (await reader.chainId() !== BigInt(target.chainId)) throw new Error('RPC chain does not match audit target');
    const block = await reader.blockNumber();
    const hasCode = await reader.hasCode(block);
    contracts.push({ target, reader, block, hasCode });
  }
  const items = [];
  for (const row of rows) {
    if (row.status && row.status !== 'FUNDING') throw new Error('Input must contain FUNDING records only');
    if (row.isSimulated) {
      items.push({ id: row.id, classification: 'SIMULATED_RECORD_EXCLUDED', evidence: [] });
      continue;
    }
    let identity;
    try { identity = fundingIdentity(row); } catch {
      items.push({ id: row.id, classification: 'INVALID_DATABASE_IDENTITY', evidence: [] });
      continue;
    }
    const evidence = [];
    for (const { target, reader, block, hasCode } of contracts) {
      const base = { chainId: target.chainId, contract: getAddress(target.address), block };
      if (!hasCode) { evidence.push({ ...base, classification: 'CONTRACT_NOT_DEPLOYED' }); continue; }
      try {
        const snapshot = await reader.read(identity.onChainId, block);
        evidence.push({ ...base, classification: classifyFundingSnapshot(row, snapshot),
          amountUnits: snapshot.bounty[0].toString(), recipient: snapshot.bounty[1],
          backer: snapshot.bounty[3], used: snapshot.used });
      } catch {
        evidence.push({ ...base, classification: 'RPC_OR_CONTRACT_READ_FAILED' });
      }
    }
    items.push({ id: row.id, onChainId: identity.onChainId.toString(),
      idSource: identity.derived ? 'DERIVED_CURRENT_ID_SCHEME' : 'DATABASE',
      recordedTransaction: row.txHash ?? null, classification: 'OPERATOR_REVIEW_REQUIRED', evidence });
  }
  return { generatedAt: new Date().toISOString(), mode: 'READ_ONLY', records: items.length,
    limitation: 'Only supplied contracts and the recorded/current deterministic ID are checked. Missing escrow is not proof that no funds moved elsewhere. No status changes, refunds or registration are authorized by this report. Active matches and used IDs still require transaction receipts and event validation.',
    targets: contracts.map(({ target, block, hasCode }) => ({ chainId: target.chainId, address: getAddress(target.address), block, hasCode })), items };
}

async function main() {
  const args = process.argv.slice(2);
  const value = (flag) => { const i = args.indexOf(flag); if (i < 0 || !args[i + 1]) throw new Error(`Required: ${flag}`); return args[i + 1]; };
  const rows = JSON.parse(await fs.readFile(value('--input'), 'utf8')).rows;
  const targets = JSON.parse(await fs.readFile(value('--contracts'), 'utf8'));
  if (!Array.isArray(rows) || !Array.isArray(targets) || targets.length === 0) throw new Error('Supply rows and explicit contract targets');
  const report = await auditFundingRows(rows, targets, async (target) => {
    const client = createPublicClient({ transport: http(target.rpcUrl, { timeout: 8000, retryCount: 1 }) });
    return {
      chainId: async () => BigInt(await client.getChainId()),
      blockNumber: async () => Number(await client.getBlockNumber()),
      hasCode: async (block) => { const code = await client.getBytecode({ address: target.address, blockNumber: BigInt(block) }); return Boolean(code && code !== '0x'); },
      read: async (onChainId, block) => {
        const bounty = await client.readContract({ address: target.address, abi: ABI, functionName: 'bounties', args: [onChainId], blockNumber: BigInt(block) });
        // Legacy escrow may not expose usedDareIds. Unknown history is never false.
        const used = await client.readContract({ address: target.address, abi: ABI, functionName: 'usedDareIds', args: [onChainId], blockNumber: BigInt(block) }).catch(() => null);
        return { bounty, used };
      },
    };
  });
  await fs.writeFile(value('--out'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  const counts = {};
  for (const row of report.items) for (const e of row.evidence) counts[e.classification] = (counts[e.classification] ?? 0) + 1;
  console.log(JSON.stringify({ mode: report.mode, records: report.records, evidenceCounts: counts, databaseWrites: 0 }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message.startsWith('Required:') ? error.message : 'Read-only funding audit failed. Check inputs and RPC access; records are unchanged.'); process.exitCode = 1; });
}
