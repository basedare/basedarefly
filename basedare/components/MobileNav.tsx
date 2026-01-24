"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Home, PlusCircle, Target, Trophy, Zap, LogOut, User, HelpCircle } from "lucide-react";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

export default function MobileNav({ isOpen, onClose, user }: MobileNavProps) {
  const pathname = usePathname();

  const handleLogout = () => {
    window.location.reload();
  };

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/create", icon: PlusCircle, label: "Create Dare" },
    { href: "/verify", icon: Target, label: "Verify" },
    { href: "/dashboard", icon: Trophy, label: "Dashboard" },
    { href: "/about", icon: Zap, label: "About" },
    { href: "/faq", icon: HelpCircle, label: "FAQ" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[90] transition-all duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        onClick={onClose}
      />

      {/* Sidebar - Premium Glass */}
      <div
        className={`fixed top-0 left-0 h-full w-[280px] z-[100] transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'linear-gradient(180deg, rgba(12, 12, 16, 0.98) 0%, rgba(8, 8, 12, 0.99) 100%)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '20px 0 60px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div className="flex flex-col h-full">

          {/* Header */}
          <div
            className="flex items-center justify-between p-5"
            style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
          >
            <img
              src="/assets/BASEDAREGOO.png"
              alt="BASEDARE"
              className="h-8 w-auto object-contain"
            />
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-500 hover:text-white transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href;

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className="relative block rounded-xl overflow-hidden transition-all duration-200 active:scale-[0.98]"
                >
                  {/* Active state - Liquid Metal Chrome */}
                  {isActive && (
                    <>
                      {/* Base chrome gradient */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(135deg, #2a2a30 0%, #1a1a1e 40%, #252528 70%, #1e1e22 100%)',
                        }}
                      />
                      {/* Top shine */}
                      <div
                        className="absolute inset-x-0 top-0 h-[1px]"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                        }}
                      />
                      {/* Inner glow */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 40%)',
                        }}
                      />
                    </>
                  )}

                  {/* Hover state for inactive */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-transparent hover:bg-white/[0.02] transition-colors" />
                  )}

                  {/* Content */}
                  <div className={`relative flex items-center gap-3 px-4 py-3.5 ${
                    isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}>
                    <Icon className="w-5 h-5" />
                    <span className="font-medium text-[15px]">{label}</span>

                    {/* Active indicator */}
                    {isActive && (
                      <div className="ml-auto w-1 h-4 rounded-full bg-gradient-to-b from-white/60 to-white/20" />
                    )}
                  </div>
                </Link>
              );
            })}

            {/* CTA - Premium Gold */}
            <div className="pt-5 mt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <Link
                href="/streamers"
                onClick={onClose}
                className="relative block rounded-xl overflow-hidden active:scale-[0.98] transition-transform"
              >
                {/* Gold base */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(145deg, #FACC15 0%, #EAB308 50%, #CA8A04 100%)',
                  }}
                />
                {/* Shine */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
                  }}
                />
                {/* Content */}
                <div className="relative flex items-center justify-center gap-2 px-4 py-3.5">
                  <Zap className="w-4 h-4 text-black" />
                  <span className="font-bold text-sm text-black">Streamers: Earn $$$</span>
                </div>
              </Link>
            </div>
          </nav>

          {/* User Profile */}
          {user && (
            <div className="p-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: '#A855F7',
                  }}
                >
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {user.full_name || 'Streamer'}
                  </p>
                  <p className="text-zinc-600 text-xs truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2.5 mt-2 text-zinc-600 hover:text-white hover:bg-white/[0.02] rounded-lg transition-all text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          <div className="h-6" />
        </div>
      </div>
    </>
  );
}
