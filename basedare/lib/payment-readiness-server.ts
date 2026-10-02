import 'server-only';
import { createPublicClient, http } from 'viem';
import { getBaseChain, getBaseRpcUrl } from '@/lib/base-chain';
import { getRefereeAccount } from '@/lib/referee-wallet';
import { checkPaymentReadiness } from '@/lib/payment-readiness';

// Fresh checks for every funding attempt. Do not cache an earlier green result.
export async function getPaymentReadiness() {
  const chain = getBaseChain();
  const config = {
    chainId: chain.id,
    bounty: process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS || '',
    usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS || '',
    platform: process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS || '',
    referee: '',
  };
  try {
    if (process.env.SIMULATE_BOUNTIES !== 'false' || process.env.NEXT_PUBLIC_SIMULATE_BOUNTIES !== 'false') {
      return { ready: false, reason: 'LIVE_MODE_NOT_CONFIRMED', config };
    }
    config.referee = getRefereeAccount(config.platform).address;
    const client = createPublicClient({ chain, transport: http(getBaseRpcUrl(), { timeout: 8000, retryCount: 1 }) });
    return { ...await checkPaymentReadiness(client, config), config };
  } catch {
    return { ready: false, reason: 'REFEREE_NOT_CONFIGURED', config };
  }
}
