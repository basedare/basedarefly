'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Plus, Shield, LayoutDashboard } from 'lucide-react';

export default function MobileNavbar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] md:hidden">
      <div className="liquid-glass px-6 py-3 flex items-center gap-8">
        {/* HOME */}
        <Link href="/" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/') ? 'text-[#FFD700]' : 'text-gray-500'}`}>
          <Home className="w-5 h-5" />
        </Link>
        
        {/* VERIFY */}
        <Link href="/verify" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/verify') ? 'text-[#FFD700]' : 'text-gray-500'}`}>
          <Shield className="w-5 h-5" />
        </Link>
        
        {/* CREATE (Center Action) */}
        <Link href="/create">
          <div className="relative -top-5">
            <div className="w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center border-4 border-[#020202] shadow-[0_0_20px_rgba(168,85,247,0.5)]">
              <Plus className="w-8 h-8 text-white" />
            </div>
          </div>
        </Link>
        
        {/* DASHBOARD */}
        <Link href="/dashboard" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/dashboard') ? 'text-[#FFD700]' : 'text-gray-500'}`}>
          <LayoutDashboard className="w-5 h-5" />
        </Link>
        
        {/* ABOUT/MENU */}
        {/* You could add a profile or wallet menu here later */}
        <div className="w-5 h-5 rounded-full bg-white/10" />
      </div>
    </div>
  );
}



