'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

type WalletState = {
  isConnected: boolean;
  address: string | null;
  balance: string;
  reputation: number;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletState>({} as WalletState);

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState("0.00");
  const [reputation, setReputation] = useState(0);

  // Simulate connection delay
  const connect = async () => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setIsConnected(true);
        setAddress("0x71C...9A2");
        setBalance("4.20"); // 4.20 ETH, naturally
        setReputation(850);
        resolve();
      }, 1000);
    });
  };

  const disconnect = () => {
    setIsConnected(false);
    setAddress(null);
    setBalance("0.00");
  };

  return (
    <WalletContext.Provider value={{ isConnected, address, balance, reputation, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);



