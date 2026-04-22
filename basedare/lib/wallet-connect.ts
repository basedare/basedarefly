import type { Connector } from 'wagmi';

export function getPreferredWalletConnector(connectors: readonly Connector[]) {
  return (
    connectors.find((connector) => connector.id.toLowerCase().includes('coinbase')) ??
    connectors.find((connector) => connector.id.toLowerCase().includes('walletconnect')) ??
    connectors[0]
  );
}
