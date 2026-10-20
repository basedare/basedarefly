import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';
import { promisify } from 'node:util';
import test from 'node:test';
import { Interface } from 'ethers';

const runFile = promisify(execFile);
const OWNER = '0x1111111111111111111111111111111111111111';
const PLATFORM = '0x2222222222222222222222222222222222222222';
const REFEREE = '0x3333333333333333333333333333333333333333';
const BOUNTY = '0x4444444444444444444444444444444444444444';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const abi = new Interface([
  'function owner() view returns (address)', 'function USDC() view returns (address)',
  'function PLATFORM_WALLET() view returns (address)', 'function AI_REFEREE_ADDRESS() view returns (address)',
  'function decimals() view returns (uint8)', 'function platformFeePercent() view returns (uint256)',
  'function referralFeePercent() view returns (uint256)', 'function totalFeePercent() view returns (uint256)',
]);

async function fixture(t, overrides = {}) {
  const values = { owner: OWNER, USDC, PLATFORM_WALLET: PLATFORM, AI_REFEREE_ADDRESS: REFEREE,
    decimals: 6, platformFeePercent: 4, referralFeePercent: 0, totalFeePercent: 4, ...overrides };
  const methods = [];
  const server = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const p = JSON.parse(body);
    methods.push(p.method);
    let result;
    if (p.method === 'eth_chainId') result = values.chainId ?? '0x2105';
    else if (p.method === 'eth_getCode') result = values.noBountyCode && p.params[0].toLowerCase() === BOUNTY.toLowerCase() ? '0x' : '0x6000';
    else if (p.method === 'eth_call') {
      const name = abi.getFunction(p.params[0].data.slice(0, 10)).name;
      result = abi.encodeFunctionResult(name, [values[name]]);
    } else if (p.method === 'eth_getTransactionCount') result = '0x2';
    else if (p.method === 'eth_getBalance') result = '0x38d7ea4c68000'; // 0.001 ETH: below the deploy reserve.
    else if (p.method === 'eth_estimateGas') result = '0x100000';
    else if (p.method === 'eth_blockNumber') result = '0x123';
    else if (p.method === 'eth_gasPrice' || p.method === 'eth_maxPriorityFeePerGas') result = '0x3b9aca00';
    else if (p.method === 'eth_getBlockByNumber') result = {
      number: '0x123', hash: '0x' + '11'.repeat(32), parentHash: '0x' + '22'.repeat(32),
      timestamp: '0x1', difficulty: '0x0', gasLimit: '0x1c9c380', gasUsed: '0x0',
      miner: OWNER, extraData: '0x', transactions: [], baseFeePerGas: '0x3b9aca00', nonce: '0x0000000000000000',
    };
    else assert.fail(`Unexpected RPC method ${p.method}`);
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ jsonrpc: '2.0', id: p.id, result }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const endpoint = `http://127.0.0.1:${server.address().port}`;
  const env = { ...process.env, NODE_ENV: 'test', BASE_MAINNET_RPC_URL: endpoint, BASE_SEPOLIA_RPC_URL: endpoint,
    MAINNET_RPC_IP_FAMILY: '4', MAINNET_DEPLOYER_ADDRESS: OWNER, MAINNET_PLATFORM_WALLET: PLATFORM,
    MAINNET_REFEREE_ADDRESS: REFEREE, MAINNET_BOUNTY_ADDRESS: BOUNTY,
    NEXT_PUBLIC_NETWORK: 'mainnet', NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS: BOUNTY,
    NEXT_PUBLIC_USDC_ADDRESS: USDC, SIMULATE_BOUNTIES: 'false', NEXT_PUBLIC_SIMULATE_BOUNTIES: 'false' };
  const run = async (changes = {}, script = 'mainnet-preflight.mjs', args = ['--post-deploy']) => {
    try {
      const result = await runFile(process.execPath, [`scripts/${script}`, ...args], { env: { ...env, ...changes }, timeout: 15_000 });
      return { code: 0, ...result };
    } catch (error) {
      if (error.killed) throw error;
      return { code: error.code, stdout: error.stdout, stderr: error.stderr };
    }
  };
  return { run, methods };
}

test('post-deploy check compares actual owner, token, roles and fees using only reads', async t => {
  const { run, methods } = await fixture(t);
  const r = await run();
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /\[PASS\] Mainnet bounty owner/);
  assert.match(r.stdout, /not prove signing/);
  assert.ok(methods.every(m => ['eth_chainId', 'eth_call', 'eth_getCode'].includes(m)));
});

test('a wrong owner blocks cutover even when token, referee and fees match', async t => {
  const { run } = await fixture(t, { owner: PLATFORM });
  const r = await run();
  assert.equal(r.code, 1);
  assert.match(r.stdout, /\[BLOCK\] Mainnet bounty owner/);
});

test('RPC failure cannot produce a successful pre-deploy report', async t => {
  const { run } = await fixture(t);
  const r = await run({ BASE_MAINNET_RPC_URL: 'http://127.0.0.1:1/private-test-key', MAINNET_BOUNTY_ADDRESS: '', NEXT_PUBLIC_NETWORK: 'sepolia' }, 'mainnet-preflight.mjs', []);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /\[BLOCK\] Base mainnet RPC/);
  assert.ok(!(r.stdout + r.stderr).includes('private-test-key'));
});

test('post-deploy mode requires a deployed bounty address', async t => {
  const { run } = await fixture(t);
  const r = await run({ MAINNET_BOUNTY_ADDRESS: '', NEXT_PUBLIC_NETWORK: 'sepolia' });
  assert.equal(r.code, 1);
  assert.match(r.stdout, /\[BLOCK\] Post-deploy bounty verification/);
  const invalid = await run({ MAINNET_BOUNTY_ADDRESS: 'invalid' });
  assert.equal(invalid.code, 1);
  assert.match(invalid.stdout, /\[BLOCK\] Post-deploy bounty verification/);
});

test('invalid simulation values are never interpreted as false', async t => {
  const { run } = await fixture(t);
  const r = await run({ SIMULATE_BOUNTIES: 'disabled' });
  assert.equal(r.code, 1);
  assert.match(r.stdout, /\[BLOCK\] Simulation flags/);
});

test('owner and referee must differ, and a bad explicit treasury cannot fall back to a default', async t => {
  const { run } = await fixture(t);
  const same = await run({ MAINNET_REFEREE_ADDRESS: OWNER });
  assert.equal(same.code, 1); assert.match(same.stdout, /\[BLOCK\] Wallet role separation/);
  const bad = await run({ MAINNET_PLATFORM_WALLET: 'invalid' });
  assert.equal(bad.code, 1); assert.match(bad.stdout, /\[BLOCK\] Mainnet platform wallet/);
});

test('wrong chain, escrow, token, roles or fee schedule each block cutover', async t => {
  for (const [overrides, label] of [
    [{ chainId: '0x14a34' }, 'Base mainnet RPC'], [{ noBountyCode: true }, 'Mainnet bounty bytecode'],
    [{ USDC: PLATFORM }, 'Mainnet bounty USDC binding'], [{ decimals: 18 }, 'Base mainnet USDC decimals'],
    [{ PLATFORM_WALLET: OWNER }, 'Mainnet bounty platform wallet'], [{ AI_REFEREE_ADDRESS: OWNER }, 'Mainnet bounty referee'],
    [{ totalFeePercent: 11 }, 'Mainnet bounty fee schedule'],
  ]) {
    const { run } = await fixture(t, overrides);
    const r = await run();
    assert.equal(r.code, 1); assert.ok(r.stdout.includes(`[BLOCK] ${label}`), r.stdout);
  }
});

test('unsigned plan reports reserve shortfall and never signs or sends a transaction', async t => {
  const { run, methods } = await fixture(t);
  const r = await run({}, 'prepare-mainnet-deployment.mjs', []);
  assert.equal(r.code, 0, r.stderr);
  const plan = JSON.parse(r.stdout);
  assert.equal(plan.mode, 'READ_ONLY_PLAN');
  assert.equal(plan.pendingNonce, 2); assert.equal(plan.deployerReserveMet, false);
  assert.equal(plan.deployerReserveShortfallEth, '0.004');
  assert.equal(plan.platformPercent, 4); assert.equal(plan.creatorPercent, 96);
  assert.ok(plan.deploymentDataHash.startsWith('0x'));
  assert.ok(!methods.some(m => /send|sign/i.test(m)));
});

test('a private-key-shaped address mistake is rejected without echoing the value', async t => {
  const { run, methods } = await fixture(t);
  const keyShaped = '0x' + 'ab'.repeat(32);
  const r = await run({ MAINNET_DEPLOYER_ADDRESS: keyShaped }, 'prepare-mainnet-deployment.mjs', []);
  assert.equal(r.code, 1); assert.ok(!(r.stdout + r.stderr).includes(keyShaped));
  assert.deepEqual(methods, []);
});
