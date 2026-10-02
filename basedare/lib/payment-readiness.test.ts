import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkPaymentReadiness, type PaymentConfig, type PaymentReader } from './payment-readiness.ts';

const config: PaymentConfig = {
  chainId: 8453, bounty: '0x1111111111111111111111111111111111111111',
  usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  platform: '0x2222222222222222222222222222222222222222',
  referee: '0x3333333333333333333333333333333333333333',
};
function reader(overrides: Partial<PaymentReader> = {}, values: Record<string, unknown> = {}): PaymentReader {
  const results: Record<string, unknown> = { USDC: config.usdc, PLATFORM_WALLET: config.platform, AI_REFEREE_ADDRESS: config.referee,
    platformFeePercent: BigInt(4), referralFeePercent: BigInt(0), totalFeePercent: BigInt(4), decimals: 6, ...values };
  return { getChainId: async () => 8453, getBytecode: async () => '0x1234', getBalance: async () => BigInt(100000000000000),
    readContract: async ({ functionName }) => results[functionName], ...overrides };
}
test('valid chain, token, recipient roles, 96/4 fees and funded referee permit funding', async () => {
  assert.equal((await checkPaymentReadiness(reader(), config)).ready, true);
});
for (const [label, overrides, values, reason] of [
  ['empty mainnet address', { getBytecode: async () => '0x' }, {}, 'MISSING_CONTRACT'],
  ['wrong RPC network', { getChainId: async () => 84532 }, {}, 'WRONG_CHAIN'],
  ['unavailable RPC', { getChainId: async () => { throw Error('offline'); } }, {}, 'CHAIN_CHECK_UNAVAILABLE'],
  ['no referee gas', { getBalance: async () => BigInt(0) }, {}, 'REFEREE_NEEDS_GAS'],
  ['wrong escrow token', {}, { USDC: config.platform }, 'TOKEN_MISMATCH'],
  ['wrong token precision', {}, { decimals: 18 }, 'TOKEN_MISMATCH'],
  ['wrong fee destination', {}, { PLATFORM_WALLET: config.referee }, 'PLATFORM_MISMATCH'],
  ['wrong payout signer', {}, { AI_REFEREE_ADDRESS: config.platform }, 'REFEREE_MISMATCH'],
  ['legacy fee contract', {}, { platformFeePercent: BigInt(10) }, 'FEE_MISMATCH'],
] as const) {
  test(`blocks ${label}`, async () => assert.equal((await checkPaymentReadiness(reader(overrides, values), config)).reason, reason));
}
test('rejects testnet USDC and overlapping wallet roles', async () => {
  assert.equal((await checkPaymentReadiness(reader(), { ...config, usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' })).reason, 'WRONG_USDC');
  assert.equal((await checkPaymentReadiness(reader(), { ...config, referee: config.platform })).reason, 'WALLET_ROLES_OVERLAP');
});
