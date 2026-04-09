'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useFeedback } from '@/hooks/useFeedback';

const CONNECTOR_META: Record<string, { label: string; icon: string }> = {
  injected: { label: 'Browser Wallet (MetaMask/Brave)', icon: '🦊' },
  metaMask: { label: 'MetaMask', icon: '🦊' },
  brave: { label: 'Brave Wallet', icon: '🦁' },
  uniswap: { label: 'Uniswap Extension', icon: '🦄' },
  coinbaseWalletSDK: { label: 'Coinbase Smart Wallet', icon: '🔵' },
  walletConnect: { label: 'WalletConnect', icon: '🔗' },
};

type ConnectorLike = {
  id: string;
  name: string;
};

function getConnectorMeta(connector: ConnectorLike) {
  const id = connector.id.toLowerCase();
  const name = connector.name.toLowerCase();

  if (id.includes('coinbase') || name.includes('coinbase')) {
    return { key: 'coinbase', label: CONNECTOR_META.coinbaseWalletSDK.label, icon: CONNECTOR_META.coinbaseWalletSDK.icon };
  }

  if (id.includes('walletconnect') || name.includes('walletconnect')) {
    return { key: 'walletconnect', label: CONNECTOR_META.walletConnect.label, icon: CONNECTOR_META.walletConnect.icon };
  }

  if (id.includes('uniswap') || name.includes('uniswap')) {
    return { key: 'uniswap', label: CONNECTOR_META.uniswap.label, icon: CONNECTOR_META.uniswap.icon };
  }

  if (id.includes('brave') || name.includes('brave')) {
    return { key: 'brave', label: CONNECTOR_META.brave.label, icon: CONNECTOR_META.brave.icon };
  }

  if (id.includes('metamask') || name.includes('metamask')) {
    return { key: 'metamask', label: CONNECTOR_META.metaMask.label, icon: CONNECTOR_META.metaMask.icon };
  }

  if (id.includes('injected') || name.includes('browser wallet')) {
    return { key: 'injected', label: CONNECTOR_META.injected.label, icon: CONNECTOR_META.injected.icon };
  }

  return { key: `${id}:${name}`, label: connector.name, icon: '💼' };
}

export function IdentityButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const walletPickerRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 8 });
  const { trigger } = useFeedback();

  const updateMenuPosition = useCallback(() => {
    if (!dropdownRef.current || typeof window === 'undefined') return;
    const rect = dropdownRef.current.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 8,
      right: Math.max(window.innerWidth - rect.right, 8),
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: PointerEvent) {
      const target = event.target as Node;
      const clickedTrigger = dropdownRef.current?.contains(target);
      const clickedAccountMenu = accountMenuRef.current?.contains(target);
      const clickedWalletPicker = walletPickerRef.current?.contains(target);

      if (!clickedTrigger && !clickedAccountMenu && !clickedWalletPicker) {
        setShowDropdown(false);
        setShowWalletPicker(false);
      }
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showDropdown && !showWalletPicker) return;
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [showDropdown, showWalletPicker, updateMenuPosition]);

  // Filter and deduplicate connectors to ensure a clean UI.
  // Multiple injected providers can surface at once; normalize them into
  // distinct brand rows so the picker does not show duplicate generic entries.
  const uniqueConnectors = Array.from(
    new Map(
      connectors.map((connector) => {
        const meta = getConnectorMeta(connector);
        return [meta.key, { connector, meta }] as const;
      })
    ).values()
  );

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

  const accountMenu = showDropdown && isConnected ? (
    <div
      ref={accountMenuRef}
      className="fixed w-48 bg-[#0a0a0f] border border-white/10 backdrop-blur-3xl rounded-xl overflow-hidden shadow-2xl z-[200]"
      style={{ top: menuPosition.top, right: menuPosition.right }}
    >
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
  ) : null;

  const walletPicker = showWalletPicker && !isConnected ? (
    <div
      ref={walletPickerRef}
      className="fixed w-64 bg-[#0a0a0f]/95 border border-white/10 backdrop-blur-3xl rounded-xl overflow-hidden shadow-2xl z-[200]"
      style={{ top: menuPosition.top, right: menuPosition.right }}
    >
      <div className="px-4 py-3 border-b border-white/[0.06] bg-black/40">
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black text-center">Select Vault</p>
      </div>
      <div className="flex flex-col p-2 gap-1">
        {uniqueConnectors.length === 0 && (
          <div className="px-3 py-4 text-center text-xs text-white/50">
            No wallet providers detected. Install a wallet extension or open in a wallet browser.
          </div>
        )}
        {uniqueConnectors.map(({ connector, meta }) => {
          const finalMeta = meta;

          return (
            <button
              key={`${meta.key}:${connector.id}`}
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
  ) : null;

  return (
    <>
      <div className="relative group p-[1.5px] rounded-2xl overflow-hidden shadow-2xl z-50 transition-all duration-500" ref={dropdownRef}>
        <div
          className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#1a1a1a_0%,#737373_20%,#fff_25%,#737373_30%,#1a1a1a_50%,#737373_70%,#fff_75%,#737373_80%,#1a1a1a_100%)] group-hover:animate-[spin_3s_linear_infinite] transition-all duration-500"
          aria-hidden="true"
        />

        <button
          onClick={handleClick}
          className="relative w-full h-full flex items-center justify-center bg-[#050505] backdrop-blur-3xl px-3 py-2 md:px-5 md:py-2.5 rounded-[12px] md:rounded-[15px]"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none" />
          <span className="relative z-10 flex items-center justify-center gap-1.5 md:gap-2 font-black italic uppercase text-[9px] sm:text-[10px] md:text-xs tracking-[0.1em] sm:tracking-[0.15em] md:tracking-[0.3em] transition-all duration-500 text-white group-hover:tracking-[0.2em] md:group-hover:tracking-[0.35em] whitespace-nowrap">
            {isConnected ? (
              <>
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-400 shrink-0" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.8)' }} />
                <span className="truncate">{truncatedAddress}</span>
              </>
            ) : 'Enter Arena'}
          </span>
          <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none rounded-[12px] md:rounded-[15px]" />
        </button>

      </div>
      {typeof document !== 'undefined' && accountMenu ? createPortal(accountMenu, document.body) : null}
      {typeof document !== 'undefined' && walletPicker ? createPortal(walletPicker, document.body) : null}
    </>
  );
}
