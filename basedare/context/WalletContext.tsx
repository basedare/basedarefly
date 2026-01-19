'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAccount, useBalance, useConnect, useDisconnect } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';
import { base } from 'viem/chains';
import { formatUnits } from 'viem';

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
  const { data: balanceData } = useBalance({ address, chainId: base.id });
  const { connectAsync, isPending: isConnecting } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const [reputation, setReputation] = useState(0);

  // Fetch user reputation from API when connected
  useEffect(() => {
    if (address) {
      fetch(`/api/users/${address}/reputation`)
        .then((res) => res.ok ? res.json() : { reputation: 0 })
        .then((data) => setReputation(data.reputation || 0))
        .catch(() => setReputation(0));
    } else {
      setReputation(0);
    }
  }, [address]);

  const connect = async () => {
    try {
      await connectAsync({
        connector: coinbaseWallet({
          appName: 'BaseDare',
          preference: 'smartWalletOnly',
        }),
      });
    } catch (err) {
      console.error('[WalletContext] Connect failed:', err);
    }
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
        reputation,
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



