"use client";

import React from "react";
import Link from "next/link";
import { X, Home, PlusCircle, Target, Trophy, Zap, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

export default function MobileNav({ isOpen, onClose, user }: MobileNavProps) {
  const handleLogout = () => {
    // Mock logout
    window.location.reload();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div 
        className={`fixed top-0 left-0 h-full w-80 bg-background border-r border-white/10 z-[100] transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <img 
                src="/bear-mascot.png"
                alt="BASEDARE Bear"
                className="w-8 h-8 object-contain"
              />
              <span className="text-xl font-bold text-[#FFB800]">BASEDARE</span>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 p-6 space-y-2">
            <Link 
              href="/"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-[#FFB800] hover:bg-[#FFB800]/10 rounded-lg transition-all"
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Home</span>
            </Link>

            <Link 
              href="/create"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-[#FFB800] hover:bg-[#FFB800]/10 rounded-lg transition-all"
            >
              <PlusCircle className="w-5 h-5" />
              <span className="font-medium">Create Dare</span>
            </Link>

            <Link 
              href="/my-dares"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-[#FFB800] hover:bg-[#FFB800]/10 rounded-lg transition-all"
            >
              <Target className="w-5 h-5" />
              <span className="font-medium">My Dares</span>
            </Link>

            <Link 
              href="/leaderboard"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-[#FFB800] hover:bg-[#FFB800]/10 rounded-lg transition-all"
            >
              <Trophy className="w-5 h-5" />
              <span className="font-medium">Leaderboard</span>
            </Link>

            <Link 
              href="/about"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-[#FFB800] hover:bg-[#FFB800]/10 rounded-lg transition-all"
            >
              <Zap className="w-5 h-5" />
              <span className="font-medium">About</span>
            </Link>

            <div className="pt-6 mt-6 border-t border-white/10">
              <Link 
                href="/streamers"
                onClick={onClose}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-bold rounded-lg hover:scale-105 transition-transform"
              >
                <Zap className="w-4 h-4" />
                <span>Streamers: Earn $5k-$50k</span>
              </Link>
            </div>
          </nav>

          {/* User Profile / Logout */}
          {user && (
            <div className="p-6 border-t border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="w-10 h-10 bg-gradient-to-br from-[#FFB800] to-[#FF6B00]">
                  <AvatarFallback className="bg-transparent text-white font-semibold">
                    {user.full_name?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {user.full_name || 'Streamer'}
                  </p>
                  <p className="text-gray-400 text-xs truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2 text-gray-300 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium text-sm">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}


