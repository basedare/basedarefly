'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useWallet } from '@/context/WalletContext';

const NAV_ITEMS = [
  { name: 'HOME', path: '/' },
  { name: 'CREATE', path: '/create' },
  { name: 'VERIFY', path: '/verify' },
  { name: 'DASHBOARD', path: '/dashboard' },
  { name: 'ABOUT', path: '/about' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { isConnected, address, connect, disconnect } = useWallet();

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] hidden md:flex">
      <nav 
        className="w-max max-w-fit glass-surface glass-surface--svg p-1.5 flex items-center gap-1 rounded-full"
        style={{
          '--glass-frost': '0.02',
          '--glass-saturation': '1.8',
        } as React.CSSProperties}
      >
        
        {/* NAV LINKS */}
        <div className="flex items-center">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.name} 
                href={item.path}
                className="relative px-5 py-2.5 rounded-full text-[10px] font-black tracking-[0.2em] text-gray-400 hover:text-white transition-colors z-10"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-white/10 rounded-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 mix-blend-overlay">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* DIVIDER */}
        <div className="w-px h-5 bg-white/10 mx-3" />

                {/* CONNECT BUTTON */}
                {isConnected ? (
                  <button 
                    onClick={disconnect}
                    className="group relative pl-4 pr-5 py-2 bg-green-900/20 hover:bg-green-900/30 border border-green-500/50 rounded-full flex items-center gap-2 transition-all duration-300"
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full z-10 shadow-[0_0_8px_rgba(34,197,94,1)]" />
                    </div>
                    <span className="text-[10px] font-black text-white tracking-[0.15em] uppercase">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </button>
                ) : (
                  <button 
                    onClick={connect}
                    className="group relative pl-4 pr-5 py-2 bg-black/40 hover:bg-black/60 border border-white/10 rounded-full flex items-center gap-2 transition-all duration-300"
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full z-10 shadow-[0_0_8px_rgba(250,204,21,1)]" />
                      <div className="absolute w-full h-full bg-yellow-400 rounded-full animate-ping opacity-75" />
                    </div>
                    <span className="text-[10px] font-black text-white tracking-[0.15em] uppercase">
                      Connect
                    </span>
                  </button>
                )}

      </nav>
    </div>
  );
}
