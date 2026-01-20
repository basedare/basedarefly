'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useRef, useEffect } from 'react';

export function IdentityButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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
      // Connect with first available connector (injected wallet)
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
    <div className="relative group p-[1.5px] rounded-xl overflow-hidden shadow-2xl" ref={dropdownRef}>
      {/* Spinning border effect */}
      <div
        className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#1a1a1a_0%,#737373_20%,#fff_25%,#737373_30%,#1a1a1a_50%,#737373_70%,#fff_75%,#737373_80%,#1a1a1a_100%)] opacity-100 group-hover:animate-[spin_3s_linear_infinite] transition-all duration-500"
        aria-hidden="true"
      />

      {/* Main button */}
      <button
        onClick={handleClick}
        className="relative flex items-center justify-center bg-[#050505] backdrop-blur-3xl px-5 py-2 rounded-[10px] w-full h-full"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none rounded-[10px]" />

        <span className="relative z-10 text-[10px] font-black tracking-[0.3em] uppercase text-white transition-all duration-300 group-hover:tracking-[0.35em] group-hover:text-white">
          {isConnected ? (
            <span>{truncatedAddress}</span>
          ) : (
            <>
              <span className="hidden md:inline">Enter Colosseum</span>
              <span className="md:hidden">Login</span>
            </>
          )}
        </span>

        <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none rounded-[10px]" />
      </button>

      {/* Dropdown menu */}
      {showDropdown && isConnected && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-[#050505] border border-white/10 backdrop-blur-2xl rounded-xl overflow-hidden z-50 shadow-2xl">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs text-gray-400">Connected</p>
            <p className="text-sm text-white font-mono">{truncatedAddress}</p>
          </div>
          <button
            onClick={() => {
              disconnect();
              setShowDropdown(false);
            }}
            className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-white/5 transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
