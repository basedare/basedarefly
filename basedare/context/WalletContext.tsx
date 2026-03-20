'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAccount, useBalance, useConnect, useDisconnect } from 'wagmi';
import { base } from 'viem/chains';
import { formatUnits } from 'viem';

const IS_SIMULATION_MODE = process.env.NEXT_PUBLIC_SIMULATE_BOUNTIES === 'true';

type WalletState = {
  isConnected: boolean;
  address: string | null;
  balance: string;
  reputation: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
};

const WalletContext = createContext<WalletState>({} as WalletState);

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const { address, isConnected } = useAccount();
  const { data: balanceData } = useBalance({
    address,
    chainId: base.id,
    query: { enabled: !IS_SIMULATION_MODE && !!address },
  });
  const { isPending: isConnecting } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const [reputation, setReputation] = useState(0);

  // Fetch user reputation from API when connected
  useEffect(() => {
    if (!address) return;

    fetch(`/api/users/${address}/reputation`)
      .then((res) => res.ok ? res.json() : { reputation: 0 })
      .then((data) => setReputation(data.reputation || 0))
      .catch(() => setReputation(0));
  }, [address]);

  const connect = async () => {
    // The actual connection logic is now handled correctly in IdentityButton
    // using Wagmi's built-in connectors map, instead of hardcoding Coinbase.
    console.warn('[WalletContext] connect() called directly. UI should prefer IdentityButton.');
  };

  const disconnect = async () => {
    try {
      await disconnectAsync();
    } catch (err) {
      console.error('[WalletContext] Disconnect failed:', err);
    }
  };

  const formattedBalance = balanceData
    ? parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(4)
    : '0.00';

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address: address || null,
        balance: formattedBalance,
        reputation: address ? reputation : 0,
        connect,
        disconnect,
        isConnecting,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);

