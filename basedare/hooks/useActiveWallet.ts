'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useAccount } from 'wagmi';

type WalletBackedSession = {
  walletAddress?: string | null;
  user?: {
    walletAddress?: string | null;
  } | null;
};

function normalizeWallet(value?: string | null) {
  const wallet = value?.trim();
  return wallet ? wallet.toLowerCase() : null;
}

export function useActiveWallet() {
  const { address: wagmiAddress, isConnected: wagmiConnected, status: wagmiStatus } = useAccount();
  const { data: session, status: sessionStatus } = useSession();

  const sessionWallet = useMemo(() => {
    const walletSession = session as WalletBackedSession | null;
    return (
      normalizeWallet(walletSession?.walletAddress) ??
      normalizeWallet(walletSession?.user?.walletAddress)
    );
  }, [session]);

  const liveWallet = normalizeWallet(wagmiAddress);
  const address = liveWallet ?? sessionWallet;
  const isResolving =
    sessionStatus === 'loading' || wagmiStatus === 'connecting' || wagmiStatus === 'reconnecting';

  return {
    address,
    liveWallet,
    sessionWallet,
    isConnected: Boolean(address),
    isLiveWalletConnected: wagmiConnected && Boolean(liveWallet),
    isResolving,
    sessionStatus,
    wagmiStatus,
  };
}
