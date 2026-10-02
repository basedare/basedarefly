import assert from 'node:assert/strict';
const bounty = '0x1111111111111111111111111111111111111111';
const usdc = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const hash = '0x' + 'a'.repeat(64);
const Module = require('node:module');
const original = Module._load;
Module._load = function(name: string, ...args: unknown[]) {
  if (name === '@/lib/contracts') return { BOUNTY_CONTRACT_ADDRESS: bounty, USDC_ADDRESS: usdc,
    CONTRACT_VALIDATION: { coreValid: true }, NETWORK_CONFIG: { chainId: 8453, chainName: 'Base' } };
  return original.call(this, name, ...args);
};
const { submitBountyCreation } = require('@/lib/bounty-flow');
async function run(options: { ready?: boolean; chain?: number; approval?: string; funding?: string; registrationOffline?: boolean; drift?: boolean } = {}) {
  const writes: { functionName: string; args: unknown[] }[] = [];
  const calls: string[] = [];
  global.fetch = async (input) => {
    const url = String(input); calls.push(url);
    if (url.includes('payment-readiness')) return Response.json({ ready: options.ready ?? true, chainId: 8453, bounty: options.drift ? usdc : bounty, usdc });
    if (url.endsWith('/init')) return Response.json({ success: true, data: { paymentConfig: { chainId: 8453, bounty, usdc }, dareId: 'test', onChainDareId: '1', targetAddress: bounty, referrerAddress: bounty, shortId: 'test123' } });
    if (options.registrationOffline) throw Error('connection lost');
    return Response.json({ success: true, data: { id: 'test', shortId: 'test123', status: 'PENDING_ACCEPTANCE', streamerHandle: '@test' } });
  };
  const promise = submitBountyCreation({ title: 'Test payment', amount: 5, stakerAddress: bounty, streamerTag: '@test' }, {
    isSimulationMode: false,
    publicClient: { getChainId: async () => options.chain ?? 8453, readContract: async () => 0n,
      waitForTransactionReceipt: async () => {
        const status = writes.at(-1)?.functionName === 'approve' ? options.approval : options.funding;
        if (status === 'timeout') throw Error('timeout');
        return { status: status || 'success' };
      } },
    writeContractAsync: async (tx: { functionName: string; args: unknown[] }) => { writes.push(tx); return hash; },
  });
  return { promise, writes, calls };
}
async function main() {
  for (const setup of [{ ready: false }, { chain: 84532 }, { drift: true }]) {
    const r = await run(setup); await assert.rejects(r.promise); assert.equal(r.writes.length, 0); assert.equal(r.calls.includes('/api/bounties/init'), false);
  }
  const approval = await run({ approval: 'reverted' }); await assert.rejects(approval.promise, /approval reverted/); assert.equal(approval.writes.length, 1);
  const reverted = await run({ funding: 'reverted' }); await assert.rejects(reverted.promise, /Funding reverted/); assert.equal(reverted.calls.includes('/api/bounties/register'), false);
  const ok = await run(); assert.equal((await ok.promise).syncPending, undefined); assert.equal(ok.writes[0].args[1], 5_000_000n);
  const recovery = await run({ funding: 'timeout', registrationOffline: true });
  const pending = await recovery.promise; assert.equal(pending.syncPending, true); assert.equal(pending.txHash, hash);
  assert.equal(recovery.writes.filter(w => w.functionName === 'fundBounty').length, 1);
  assert.equal(recovery.calls.filter(p => p === '/api/bounties/register').length, 3);
  console.log('PASS: no wallet writes for unavailable/drifted/wrong-chain setup; approval/funding reverts stop; exact allowance; timeout preserves hash and retries registration without paying twice.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
