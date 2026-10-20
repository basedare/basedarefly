/* eslint-disable @typescript-eslint/no-require-imports -- Isolate external boundaries before loading the real route and readiness checks. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextRequest } from 'next/server';

const Module = require('node:module');
const originalLoad = Module._load;
const bounty = '0x1111111111111111111111111111111111111111';
const platform = '0x2222222222222222222222222222222222222222';
const referee = '0x3333333333333333333333333333333333333333';
const usdc = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const hash = `0x${'1'.repeat(64)}`;
type Row = {
  id: string; status: string; isSimulated: boolean; onChainDareId: string | null;
  claimDeadline: Date; txHash: string;
};
function row(id = 'live', isSimulated = false): Row {
  return { id, status: 'AWAITING_CLAIM', isSimulated, onChainDareId: '7', claimDeadline: new Date(Date.now() - 60_000), txHash: hash };
}
function fixture() {
  return {
    rows: [row()], updates: [] as string[], events: [] as Array<{ metadata: { simulated: boolean } }>,
    queries: 0, walletClients: 0, writes: 0, receipts: 0, codeReads: 0, alerts: 0,
    chain: 8453, code: '0x1234' as string | undefined, gas: BigInt(1), offline: false,
    missingKey: false, receiptFails: false, settlement: 'NONE',
    values: {} as Record<string, unknown>, afterUpdate: () => {},
  };
}
let state = fixture();
function reset() {
  state = fixture();
  Object.assign(process.env, {
    CRON_SECRET: 'fixture-only-refund-secret', NEXT_PUBLIC_NETWORK: 'mainnet',
    NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS: bounty, NEXT_PUBLIC_USDC_ADDRESS: usdc,
    NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS: platform,
    SIMULATE_BOUNTIES: 'false', NEXT_PUBLIC_SIMULATE_BOUNTIES: 'false',
  });
}
reset();
const client = {
  getChainId: async () => { if (state.offline) throw Error('offline fixture'); return state.chain; },
  getBytecode: async () => { state.codeReads++; return state.code; },
  getBalance: async () => state.gas,
  readContract: async ({ functionName }: { functionName: string }) => {
    if (functionName === 'bounties') return [BigInt(5_000_000), platform, referee, 'fixture', false];
    const values: Record<string, unknown> = {
      USDC: usdc, PLATFORM_WALLET: platform, AI_REFEREE_ADDRESS: referee,
      platformFeePercent: BigInt(4), referralFeePercent: BigInt(0), totalFeePercent: BigInt(4), decimals: 6,
      ...state.values,
    };
    return values[functionName];
  },
};
Module._load = function(this: unknown, name: string, ...args: unknown[]) {
  if (name === '@/lib/prisma') return { prisma: { dare: {
    findMany: async (input: { where: { status: string; claimDeadline: { lt: Date } }; take: number }) => {
      state.queries++;
      assert.equal(input.where.status, 'AWAITING_CLAIM');
      assert.ok(input.where.claimDeadline.lt instanceof Date);
      assert.equal(input.take, 50);
      return state.rows;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
      const current = state.rows.find(item => item.id === where.id)!;
      // No live terminal state may be written before a successful receipt/event.
      if (!current.isSimulated) assert.ok(state.receipts > 0 || state.settlement === 'REFUND');
      Object.assign(current, data);
      state.updates.push(current.id);
      state.afterUpdate();
      return current;
    },
  } } };
  if (name === '@/lib/referee-wallet') return { getRefereeAccount: () => {
    if (state.missingKey) throw Error('fixture has no signing account');
    return { address: referee };
  } };
  if (name === '@/lib/bounty-chain') return {
    waitForSuccessfulReceipt: async () => {
      if (state.receiptFails) throw Error('fixture receipt reverted');
      state.receipts++;
    },
    findBountySettlementEvent: async () => ({ type: state.settlement, txHash: hash, blockNumber: BigInt(1) }),
  };
  if (name === '@/lib/dare-approval') return { syncLinkedCampaignForDareState: async () => {} };
  if (name === '@/lib/founder-events') return { recordDareFounderEventSafe: async (event: { metadata: { simulated: boolean } }) => { state.events.push(event); } };
  if (name === '@/lib/telegram') return { alertError: async () => { state.alerts++; } };
  if (name === 'viem') return {
    ...originalLoad.call(this, name, ...args), http: () => 'fixture-only',
    createPublicClient: () => client,
    createWalletClient: () => {
      state.walletClients++;
      return { writeContract: async () => { state.writes++; return hash; } };
    },
  };
  return originalLoad.call(this, name, ...args);
};
const { POST } = require('../app/api/refund/expired/route');
function request(authorized = true) {
  return new NextRequest('https://fixture.invalid/api/refund/expired', {
    method: 'POST', headers: authorized ? { Authorization: 'Bearer fixture-only-refund-secret' } : {},
  });
}
async function blocked(reason: string) {
  const response = await POST(request());
  const body = await response.json();
  assert.equal(body.failed, 1);
  assert.equal(body.refunded, 0);
  assert.equal(body.results[0].error, `Live refund unavailable: ${reason}`);
  assert.equal(state.rows[0].status, 'AWAITING_CLAIM');
  assert.equal(state.updates.length, 0);
  assert.equal(state.events.length, 0);
  assert.equal(state.walletClients, 0);
  assert.equal(state.writes, 0);
  assert.equal(state.alerts, 1);
}

test('expired refunds preserve live funds when configuration or settlement is unverified', async t => {
  await t.test('cron authorization fails before any database or chain work', async () => {
    reset();
    assert.equal((await POST(request(false))).status, 401);
    delete process.env.CRON_SECRET;
    assert.equal((await POST(request())).status, 503);
    assert.equal(state.queries, 0);
    assert.equal(state.codeReads, 0);
  });
  for (const [name, server, browser] of [
    ['server simulation enabled', 'true', 'false'], ['public simulation enabled', 'false', 'true'],
    ['server flag missing', undefined, 'false'], ['public flag missing', 'false', undefined],
    ['server flag invalid', 'invalid', 'false'], ['public flag invalid', 'false', 'invalid'],
  ]) {
    await t.test(name!, async () => {
      reset();
      if (server === undefined) delete process.env.SIMULATE_BOUNTIES; else process.env.SIMULATE_BOUNTIES = server;
      if (browser === undefined) delete process.env.NEXT_PUBLIC_SIMULATE_BOUNTIES; else process.env.NEXT_PUBLIC_SIMULATE_BOUNTIES = browser;
      await blocked('LIVE_MODE_NOT_CONFIRMED');
    });
  }
  for (const address of ['', 'bad-address', `0x${'0'.repeat(40)}`]) {
    await t.test(`missing/invalid escrow: ${address || 'empty'}`, async () => {
      reset(); process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS = address;
      await blocked('INVALID_CONFIG');
    });
  }
  for (const [name, setup, reason] of [
    ['absent bytecode', () => { state.code = '0x'; }, 'MISSING_CONTRACT'],
    ['wrong network', () => { state.chain = 84532; }, 'WRONG_CHAIN'],
    ['unavailable RPC', () => { state.offline = true; }, 'CHAIN_CHECK_UNAVAILABLE'],
    ['wrong token', () => { state.values.USDC = platform; }, 'TOKEN_MISMATCH'],
    ['wrong treasury', () => { state.values.PLATFORM_WALLET = referee; }, 'PLATFORM_MISMATCH'],
    ['wrong referee', () => { state.values.AI_REFEREE_ADDRESS = platform; }, 'REFEREE_MISMATCH'],
    ['wrong fees', () => { state.values.totalFeePercent = BigInt(11); }, 'FEE_MISMATCH'],
    ['no referee gas', () => { state.gas = BigInt(0); }, 'REFEREE_NEEDS_GAS'],
    ['missing referee account', () => { state.missingKey = true; }, 'REFEREE_NOT_CONFIGURED'],
  ] as const) {
    await t.test(name, async () => { reset(); setup(); await blocked(reason); });
  }
  await t.test('only explicitly simulated records bypass chain settlement', async () => {
    reset(); state.rows = [row('simulation', true)]; state.missingKey = true;
    process.env.SIMULATE_BOUNTIES = 'true';
    const body = await (await POST(request())).json();
    assert.equal(body.results[0].status, 'simulated');
    assert.equal(state.rows[0].status, 'REFUNDED');
    assert.equal(state.events[0].metadata.simulated, true);
    assert.equal(state.codeReads, 0); assert.equal(state.writes, 0);
  });
  await t.test('a mixed batch cannot simulate its live row', async () => {
    reset(); state.rows = [row('simulation', true), row()]; process.env.SIMULATE_BOUNTIES = 'true';
    const body = await (await POST(request())).json();
    assert.equal(body.refunded, 1); assert.equal(body.failed, 1);
    assert.equal(state.rows[1].status, 'AWAITING_CLAIM');
    assert.deepEqual(state.updates, ['simulation']); assert.equal(state.writes, 0);
  });
  await t.test('missing chain mapping never submits a refund', async () => {
    reset(); state.rows[0].onChainDareId = null;
    const body = await (await POST(request())).json();
    assert.equal(body.failed, 1); assert.equal(state.writes, 0); assert.equal(state.updates.length, 0);
  });
  await t.test('live refund is recorded only after a successful receipt', async () => {
    reset(); const body = await (await POST(request())).json();
    assert.equal(body.refunded, 1); assert.equal(body.results[0].txHash, hash);
    assert.equal(state.rows[0].status, 'REFUNDED'); assert.equal(state.receipts, 1);
    assert.equal(state.writes, 1); assert.equal(state.events[0].metadata.simulated, false);
  });
  await t.test('reverted/unverified transfer leaves the live row unsettled', async () => {
    reset(); state.receiptFails = true;
    const body = await (await POST(request())).json();
    assert.equal(body.failed, 1); assert.equal(body.refunded, 0);
    assert.equal(state.rows[0].status, 'AWAITING_CLAIM');
    assert.equal(state.updates.length, 0); assert.equal(state.events.length, 0);
  });
  await t.test('existing confirmed refund event can reconcile a lost response', async () => {
    reset(); state.receiptFails = true; state.settlement = 'REFUND';
    const body = await (await POST(request())).json();
    assert.equal(body.refunded, 1); assert.equal(body.results[0].txHash, hash);
    assert.equal(state.rows[0].status, 'REFUNDED');
    assert.equal(state.events[0].metadata.simulated, false);
  });
  await t.test('readiness is refreshed for each live row', async () => {
    reset(); state.rows = [row('first'), row('second')];
    state.afterUpdate = () => { state.code = '0x'; };
    const body = await (await POST(request())).json();
    assert.equal(body.refunded, 1); assert.equal(body.failed, 1);
    assert.equal(state.rows[1].status, 'AWAITING_CLAIM');
    assert.equal(state.writes, 1); assert.deepEqual(state.updates, ['first']);
  });
});
