import 'server-only';
import { createPublicClient, erc20Abi, http, type Address } from 'viem';
import { getBaseChain, getBaseRpcUrl } from '@/lib/base-chain';

import { NATIVE_BASE_USDC, type WalletBalances } from '@/lib/wallet-balance-types';

// Read on the server so browser wallet RPC/CORS restrictions cannot stall this panel.
// Each endpoint must confirm the chain before any amount is accepted.
export async function readWalletBalances(address: Address): Promise<WalletBalances> {
  const chain = getBaseChain();
  const result: WalletBalances = { chainId: chain.id, usdc: null, eth: null };
  const urls = [...new Set([getBaseRpcUrl(), chain.rpcUrls.default.http[0]])];
  for (const url of urls) {
    const client = createPublicClient({ chain, transport: http(url, { timeout: 2_000, retryCount: 0 }) });
    try {
      if (await client.getChainId() !== chain.id) continue;
      const [usdc, eth] = await Promise.allSettled([
        result.usdc === null
          ? client.readContract({ address: NATIVE_BASE_USDC[chain.id], abi: erc20Abi, functionName: 'balanceOf', args: [address] })
          : Promise.resolve(BigInt(result.usdc)),
        result.eth === null ? client.getBalance({ address }) : Promise.resolve(BigInt(result.eth)),
      ]);
      if (usdc.status === 'fulfilled') result.usdc = usdc.value.toString();
      if (eth.status === 'fulfilled') result.eth = eth.value.toString();
      if (result.usdc !== null && result.eth !== null) break;
    } catch {
      // Try the public chain endpoint without leaking provider URLs or credentials.
    }
  }
  return result;
}
