import { base, baseSepolia } from 'viem/chains';

const BASE_MAINNET_PUBLIC_RPC_URL = 'https://mainnet.base.org';
const BASE_SEPOLIA_PUBLIC_RPC_URL = 'https://sepolia.base.org';

export function isBaseMainnet() {
  return process.env.NEXT_PUBLIC_NETWORK === 'mainnet';
}

export function getBaseChain() {
  return isBaseMainnet() ? base : baseSepolia;
}

export function getBaseRpcUrl() {
  if (isBaseMainnet()) {
    return (
      (typeof window === 'undefined' ? process.env.BASE_MAINNET_RPC_URL : undefined) ||
      process.env.NEXT_PUBLIC_RPC_URL ||
      BASE_MAINNET_PUBLIC_RPC_URL
    );
  }

  return (
    (typeof window === 'undefined' ? process.env.BASE_SEPOLIA_RPC_URL : undefined) ||
    process.env.NEXT_PUBLIC_RPC_URL ||
    BASE_SEPOLIA_PUBLIC_RPC_URL
  );
}

export function getBaseNetworkConfig() {
  const isMainnet = isBaseMainnet();

  return {
    network: process.env.NEXT_PUBLIC_NETWORK || 'sepolia',
    isMainnet,
    chainId: isMainnet ? 8453 : 84532,
    chainName: isMainnet ? 'Base' : 'Base Sepolia',
    blockExplorer: isMainnet ? 'https://basescan.org' : 'https://sepolia.basescan.org',
  };
}
