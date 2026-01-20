"use client";

import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'viem/chains';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { ReactNode, useState } from 'react';

const config = createConfig({
  chains: [base],
  connectors: [
    injected(), // Uses browser wallet extension directly - no popup overlay
  ],
  transports: { [base.id]: http() },
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const apiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY;

  if (!apiKey) console.warn('Missing OnchainKit API key!');

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider 
          apiKey={apiKey || ''} 
          chain={base}
          config={{ 
            appearance: { mode: 'auto', theme: 'default' }, 
            // Paymaster for gasless tx - will work if env var is set, otherwise standard gas
            paymaster: process.env.NEXT_PUBLIC_PAYMASTER_URL,
          }}
        > 
          {children} 
        </OnchainKitProvider> 
      </QueryClientProvider> 
    </WagmiProvider> 
  ); 
}