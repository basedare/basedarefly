'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useRef, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import { useFeedback } from '@/hooks/useFeedback';

const CONNECTOR_META: Record<string, { label: string; icon: string }> = {
  injected: { label: 'MetaMask', icon: '🦊' },
  coinbaseWalletSDK: { label: 'Coinbase', icon: '🔵' },
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
    } else {
      trigger('connect');
      setShowWalletPicker(!showWalletPicker);
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

  return (
    <>
      {/* ============================================
          DESKTOP - Premium Liquid Metal Spinning Border
          ============================================ */}
      <div className="hidden md:block relative group p-[1.5px] rounded-xl overflow-hidden shadow-2xl" ref={dropdownRef}>
        {/* Spinning liquid metal border */}
        <div
          className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#1a1a1a_0%,#737373_20%,#fff_25%,#737373_30%,#1a1a1a_50%,#737373_70%,#fff_75%,#737373_80%,#1a1a1a_100%)] opacity-100 group-hover:animate-[spin_3s_linear_infinite] transition-all duration-500"
          aria-hidden="true"
        />

        <button
          onClick={handleClick}
          className="relative flex items-center justify-center bg-[#050505] backdrop-blur-3xl px-5 py-2.5 rounded-[10px] w-full h-full"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none rounded-[10px]" />
          <span className="relative z-10 text-[10px] font-black tracking-[0.3em] uppercase text-white transition-all duration-300 group-hover:tracking-[0.35em]">
            {isConnected ? truncatedAddress : 'Enter Colosseum'}
          </span>
          <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none rounded-[10px]" />
        </button>

        {showDropdown && isConnected && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-[#0a0a0f] border border-white/10 backdrop-blur-2xl rounded-xl overflow-hidden z-50 shadow-2xl">
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-xs text-gray-500">Connected</p>
              <p className="text-sm text-white font-mono">{truncatedAddress}</p>
            </div>
            <button
              onClick={() => { trigger('click'); disconnect(); setShowDropdown(false); }}
              className="w-full px-4 py-3 text-left text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}

        {showWalletPicker && !isConnected && (
          <div className="absolute top-full right-0 mt-2 w-56 bg-[#0a0a0f]/95 border border-white/10 backdrop-blur-2xl rounded-xl overflow-hidden z-50 shadow-2xl">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Connect Wallet</p>
            </div>
            {connectors.map(connector => {
              const meta = CONNECTOR_META[connector.id] || { label: connector.name, icon: '💼' };
              return (
                <button
                  key={connector.id}
                  onClick={() => handleConnectWallet(connector.id)}
                  className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:text-white hover:bg-white/[0.05] transition-colors flex items-center gap-3"
                >
                  <span className="text-lg">{meta.icon}</span>
                  <span className="font-medium">{meta.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================
          MOBILE - Pure Glass Pill Button
          ============================================ */}
      <div className="md:hidden relative" ref={!showDropdown ? dropdownRef : undefined}>
        {/* Tap target wrapper for extended hit area */}
        <div
          className="touch-manipulation cursor-pointer select-none"
          style={{
            padding: '8px 12px 16px 12px',
            margin: '-8px -12px -16px -12px',
            WebkitTapHighlightColor: 'transparent',
          }}
          onClick={handleClick}
        >
        <div
          className="relative flex items-center justify-center gap-2 px-6 py-3 rounded-full overflow-hidden transition-all duration-200 active:scale-95"
          style={{
            minHeight: '44px',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: `
              0 4px 24px rgba(0, 0, 0, 0.15),
              0 1px 2px rgba(0, 0, 0, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.2),
              inset 0 -1px 0 rgba(0, 0, 0, 0.1)
            `,
          }}
        >
          {/* Top highlight - glass reflection */}
          <div
            className="absolute inset-x-0 top-0 h-1/2 pointer-events-none rounded-t-full"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
            }}
          />

          {/* Top edge bright line */}
          <div
            className="absolute inset-x-6 top-0 h-[1px] pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
            }}
          />

          {/* Glossy spot - top right */}
          <div
            className="absolute top-1 right-4 w-6 h-2 pointer-events-none rounded-full"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.25) 0%, transparent 70%)',
              filter: 'blur(1px)',
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex items-center gap-2">
            {isConnected ? (
              <div
                className="w-2 h-2 rounded-full bg-green-400"
                style={{
                  boxShadow: '0 0 6px rgba(74,222,128,0.8)'
                }}
              />
            ) : (
              <Wallet className="w-4 h-4 text-white/80" />
            )}
            <span className="text-[11px] font-medium text-white/90 uppercase tracking-wider">
              {isConnected ? truncatedAddress : 'Connect'}
            </span>
          </div>
        </div>
        </div>

        {showDropdown && isConnected && (
          <div
            className="absolute top-full right-0 mt-2 w-44 rounded-2xl overflow-hidden z-50"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-[10px] text-white/50 uppercase tracking-wide">Connected</p>
              <p className="text-xs text-white/90 font-mono mt-0.5">{truncatedAddress}</p>
            </div>
            <button
              onClick={() => { trigger('click'); disconnect(); setShowDropdown(false); }}
              className="w-full px-4 py-3 text-left text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}

        {showWalletPicker && !isConnected && (
          <div
            className="absolute top-full right-0 mt-2 w-52 rounded-2xl overflow-hidden z-50"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-[10px] text-white/50 uppercase tracking-wide font-bold">Connect Wallet</p>
            </div>
            {connectors.map(connector => {
              const meta = CONNECTOR_META[connector.id] || { label: connector.name, icon: '💼' };
              return (
                <button
                  key={connector.id}
                  onClick={() => handleConnectWallet(connector.id)}
                  className="w-full px-4 py-3 text-left text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                >
                  <span className="text-base">{meta.icon}</span>
                  <span className="font-medium">{meta.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
