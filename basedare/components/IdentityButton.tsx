'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useRef, useEffect } from 'react';
import { Wallet } from 'lucide-react';

export function IdentityButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClick = () => {
    if (isConnected) {
      setShowDropdown(!showDropdown);
    } else {
      const connector = connectors[0];
      if (connector) {
        connect({ connector });
      }
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
              onClick={() => { disconnect(); setShowDropdown(false); }}
              className="w-full px-4 py-3 text-left text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* ============================================
          MOBILE - Premium Liquid Metal Chrome Button
          ============================================ */}
      <div className="md:hidden relative" ref={!showDropdown ? dropdownRef : undefined}>
        <button
          type="button"
          onClick={handleClick}
          className="relative flex items-center justify-center gap-2 px-5 py-3 rounded-xl overflow-hidden transition-all active:scale-95 touch-manipulation select-none cursor-pointer"
          style={{
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            WebkitTapHighlightColor: 'transparent',
            minHeight: '44px',
          }}
        >
          {/* Liquid metal base - brighter chrome */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(160deg, #3a3a42 0%, #28282e 25%, #1e1e24 50%, #28282e 75%, #3a3a42 100%)',
            }}
          />
          {/* Top highlight band */}
          <div
            className="absolute inset-x-0 top-0 h-[2px] pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.4) 50%, transparent 90%)',
            }}
          />
          {/* Inner top shine */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 40%)',
            }}
          />
          {/* Bottom shadow for depth */}
          <div
            className="absolute inset-x-0 bottom-0 h-[1px] pointer-events-none"
            style={{
              background: 'rgba(0,0,0,0.4)',
            }}
          />
          {/* Chrome border */}
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          />

          {/* Content */}
          <div className="relative flex items-center gap-2.5">
            {isConnected ? (
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.7)]" />
            ) : (
              <Wallet className="w-4 h-4 text-zinc-300" />
            )}
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">
              {isConnected ? truncatedAddress : 'Login'}
            </span>
          </div>
        </button>

        {showDropdown && isConnected && (
          <div
            className="absolute top-full right-0 mt-2 w-44 rounded-xl overflow-hidden z-50"
            style={{
              background: 'linear-gradient(180deg, rgba(20, 20, 25, 0.98) 0%, rgba(15, 15, 20, 0.99) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="px-3 py-2.5 border-b border-white/5">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Connected</p>
              <p className="text-xs text-white font-mono mt-0.5">{truncatedAddress}</p>
            </div>
            <button
              onClick={() => { disconnect(); setShowDropdown(false); }}
              className="w-full px-3 py-2.5 text-left text-xs text-zinc-500 hover:text-white hover:bg-white/[0.03] transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    </>
  );
}
