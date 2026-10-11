export const NATIVE_BASE_USDC = {
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
} as const;

export type WalletBalances = { chainId: number; usdc: string | null; eth: string | null };
