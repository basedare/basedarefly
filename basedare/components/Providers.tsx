"use client";

import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'viem/chains';
import { injected, coinbaseWallet, walletConnect } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { SessionProvider } from 'next-auth/react';
import { ReactNode, useState } from 'react';
import WalletAutoReconnect from './WalletAutoReconnect';

// Use Coinbase RPC if API key available, otherwise fallback to public
const rpcUrl = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY
  ? `https://api.developer.coinbase.com/rpc/v1/base/${process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}`
  : undefined;

const config = createConfig({
  chains: [base],
  connectors: [
    injected(), // Desktop browser wallet extensions (MetaMask, etc)
    coinbaseWallet({ appName: 'BaseDare', preference: 'all' }),
    ...(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
      ? [walletConnect({ projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID })]
      : []),
  ],
  transports: { [base.id]: http(rpcUrl) },
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const apiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_CDP_PROJECT_ID;

  if (!apiKey) console.warn('Missing OnchainKit API key!');

  return (
    <SessionProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <OnchainKitProvider
            apiKey={apiKey || ''}
            chain={base}
            projectId={projectId}
            config={{
              appearance: { mode: 'auto', theme: 'default' },
              // Paymaster for gasless tx - will work if env var is set, otherwise standard gas
              paymaster: process.env.NEXT_PUBLIC_PAYMASTER_URL,
            }}
          >
            <WalletAutoReconnect />
            {children}
          </OnchainKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </SessionProvider>
  ); 
}
