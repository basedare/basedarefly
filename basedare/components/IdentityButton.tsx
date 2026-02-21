'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useRef, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import { useFeedback } from '@/hooks/useFeedback';

const CONNECTOR_META: Record<string, { label: string; icon: string }> = {
  injected: { label: 'Browser Wallet (MetaMask/Brave)', icon: '🦊' },
  coinbaseWalletSDK: { label: 'Coinbase Smart Wallet', icon: '🔵' },
  walletConnect: { label: 'WalletConnect', icon: '🔗' },
};

export function IdentityButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { trigger } = useFeedback();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowWalletPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClick = () => {
    if (isConnected) {
      trigger('click');
      setShowDropdown(!showDropdown);
      setShowWalletPicker(false);
    } else {
      trigger('connect');
      setShowWalletPicker(!showWalletPicker);
      setShowDropdown(false);
    }
  };

  const handleConnectWallet = (connectorId: string) => {
    const connector = connectors.find(c => c.id === connectorId);
    if (connector) {
      connect({ connector });
      setShowWalletPicker(false);
    }
  };

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  // Filter and deduplicate connectors to ensure a clean UI
  // Wagmi sometimes injects multiple 'injected' connectors depending on the browser
  const uniqueConnectors = Array.from(new Map(connectors.map(c => [
    c.id === 'injected' || c.id === 'metaMask' ? 'injected' : c.id,
    c
  ])).values());

  return (
    <>
      <div className="relative group p-[1.5px] rounded-2xl overflow-hidden shadow-2xl z-50 transition-all duration-500" ref={dropdownRef}>
        <div
          className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#1a1a1a_0%,#737373_20%,#fff_25%,#737373_30%,#1a1a1a_50%,#737373_70%,#fff_75%,#737373_80%,#1a1a1a_100%)] group-hover:animate-[spin_3s_linear_infinite] transition-all duration-500"
          aria-hidden="true"
        />

        <button
          onClick={handleClick}
          className="relative w-full h-full flex items-center justify-center bg-[#050505] backdrop-blur-3xl px-5 py-2.5 rounded-[15px]"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none" />
          <span className="relative z-10 flex items-center justify-center gap-2 font-black italic uppercase text-[10px] md:text-xs tracking-[0.2em] md:tracking-[0.3em] transition-all duration-500 text-white group-hover:tracking-[0.25em] md:group-hover:tracking-[0.35em]">
            {isConnected ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.8)' }} />
                {truncatedAddress}
              </>
            ) : 'Enter Colosseum'}
          </span>
          <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none rounded-[15px]" />
        </button>

        {showDropdown && isConnected && (
          <div className="absolute top-[calc(100%+8px)] right-0 w-48 bg-[#0a0a0f] border border-white/10 backdrop-blur-3xl rounded-xl overflow-hidden shadow-2xl z-[100]">
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Connected As</p>
              <p className="text-sm text-white font-mono">{truncatedAddress}</p>
            </div>
            <button
              onClick={() => { trigger('click'); disconnect(); setShowDropdown(false); }}
              className="w-full px-4 py-3 text-left text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors font-medium border-t border-white/5"
            >
              Disconnect
            </button>
          </div>
        )}

        {showWalletPicker && !isConnected && (
          <div className="absolute top-[calc(100%+8px)] right-0 w-64 bg-[#0a0a0f]/95 border border-white/10 backdrop-blur-3xl rounded-xl overflow-hidden shadow-2xl z-[100]">
            <div className="px-4 py-3 border-b border-white/[0.06] bg-black/40">
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black text-center">Select Vault</p>
            </div>
            <div className="flex flex-col p-2 gap-1">
              {uniqueConnectors.map(connector => {
                const meta = CONNECTOR_META[connector.id] || { label: connector.name, icon: '💼' };
                // Also fallback to mapped injected if meta is missing
                const finalMeta = connector.id.toLowerCase().includes('injected') || connector.id.toLowerCase().includes('metamask')
                  ? CONNECTOR_META['injected']
                  : meta;

                return (
                  <button
                    key={connector.id}
                    onClick={() => handleConnectWallet(connector.id)}
                    className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all flex items-center gap-3 border border-transparent hover:border-white/10 group/btn"
                  >
                    <span className="text-xl group-hover/btn:scale-110 transition-transform">{finalMeta.icon}</span>
                    <span className="font-semibold">{finalMeta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
