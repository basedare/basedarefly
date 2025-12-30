import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { PROTOCOL_ABI, USDC_ABI } from '@/abis/BaseDareProtocol';

// Contract addresses (from environment variables)
export const PROTOCOL_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PROTOCOL_CONTRACT_ADDRESS as Address;
export const BOUNTY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS as Address;
export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as Address;

// Public client for reading contract state
export const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org'),
});

// Wallet client factory (for write operations)
export function getWalletClient() {
  const privateKey = process.env.REFEREE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('REFEREE_PRIVATE_KEY not configured');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({
    account,
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org'),
  });
}

// Contract ABIs
export { PROTOCOL_ABI, USDC_ABI };

