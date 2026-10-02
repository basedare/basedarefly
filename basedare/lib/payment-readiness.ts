import { isAddress, parseAbi, zeroAddress, type Address } from 'viem';

export const PAYMENT_READ_ABI = parseAbi([
  'function USDC() view returns (address)',
  'function PLATFORM_WALLET() view returns (address)',
  'function AI_REFEREE_ADDRESS() view returns (address)',
  'function platformFeePercent() pure returns (uint256)',
  'function referralFeePercent() pure returns (uint256)',
  'function totalFeePercent() pure returns (uint256)',
  'function decimals() view returns (uint8)',
]);

export type PaymentConfig = {
  chainId: number;
  bounty: string;
  usdc: string;
  platform: string;
  referee: string;
};

export type PaymentReader = {
  getChainId(): Promise<number>;
  getBytecode(args: { address: Address }): Promise<string | undefined>;
  readContract(args: { address: Address; abi: typeof PAYMENT_READ_ABI; functionName: 'USDC' | 'PLATFORM_WALLET' | 'AI_REFEREE_ADDRESS' | 'platformFeePercent' | 'referralFeePercent' | 'totalFeePercent' | 'decimals' }): Promise<unknown>;
  getBalance(args: { address: Address }): Promise<bigint>;
};

export const PAYMENT_UNAVAILABLE = 'Paid dares are temporarily unavailable while we verify the payment setup. No payment has been requested.';

export async function checkPaymentReadiness(client: PaymentReader, config: PaymentConfig) {
  const blocked = (reason: string) => ({ ready: false as const, reason });
  const same = (a: unknown, b: string) => String(a).toLowerCase() === b.toLowerCase();
  const expectedUsdc = config.chainId === 8453
    ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    : config.chainId === 84532 ? '0x036CbD53842c5426634e7929541eC2318f3dCF7e' : null;
  if (!expectedUsdc || !same(config.usdc, expectedUsdc)) return blocked('WRONG_USDC');
  if ([config.bounty, config.usdc, config.platform, config.referee].some(a => !isAddress(a) || same(a, zeroAddress))) return blocked('INVALID_CONFIG');
  if (same(config.platform, config.referee)) return blocked('WALLET_ROLES_OVERLAP');
  try {
    if (await client.getChainId() !== config.chainId) return blocked('WRONG_CHAIN');
    const codes = await Promise.all([config.bounty, config.usdc].map(address => client.getBytecode({ address: address as Address })));
    if (codes.some(code => !code || code === '0x')) return blocked('MISSING_CONTRACT');
    const read = (functionName: Parameters<PaymentReader['readContract']>[0]['functionName'], address = config.bounty) => client.readContract({ address: address as Address, abi: PAYMENT_READ_ABI, functionName });
    const [usdc, platform, referee, fee, referral, total, decimals, gas] = await Promise.all([
      read('USDC'), read('PLATFORM_WALLET'), read('AI_REFEREE_ADDRESS'),
      read('platformFeePercent'), read('referralFeePercent'), read('totalFeePercent'),
      read('decimals', config.usdc), client.getBalance({ address: config.referee as Address }),
    ]);
    if (!same(usdc, config.usdc) || Number(decimals) !== 6) return blocked('TOKEN_MISMATCH');
    if (!same(platform, config.platform)) return blocked('PLATFORM_MISMATCH');
    if (!same(referee, config.referee)) return blocked('REFEREE_MISMATCH');
    if (Number(fee) !== 4 || Number(referral) !== 0 || Number(total) !== 4) return blocked('FEE_MISMATCH');
    if (gas === BigInt(0)) return blocked('REFEREE_NEEDS_GAS');
    return { ready: true as const, reason: null };
  } catch {
    return blocked('CHAIN_CHECK_UNAVAILABLE');
  }
}
