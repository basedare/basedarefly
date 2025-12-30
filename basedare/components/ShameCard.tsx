'use client';

import { X } from "lucide-react";

interface ShameCardProps {
  user: string;
  loss: string;
  reason: string;
  time: string;
}

export default function ShameCard({ user, loss, reason, time }: ShameCardProps) {
  return (
    <div className="relative group overflow-hidden rounded-2xl border border-[#A855F7]/50 bg-black/40 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-[#A855F7] hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]">
        {/* Background Glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity bg-gradient-to-b from-[#A855F7] to-black"></div>
        
        {/* Card Body */}
        <div className="relative p-6 h-full flex flex-col justify-between z-10">
            {/* Header: X Icon + User */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-900/50 flex items-center justify-center border border-purple-500/30 text-purple-400">
                    <X size={20} />
                </div>
                <span className="text-xl font-bold text-white tracking-wide">{user}</span>
            </div>

            {/* The Loss Amount */}
            <div className="mb-2">
                <span className="text-3xl font-black text-[#FACC15] drop-shadow-md">{loss}</span>
            </div>

            {/* Reason */}
            <p className="text-gray-400 text-sm font-medium leading-snug mb-4">
                {reason}
            </p>

            {/* Time */}
            <div className="text-xs text-gray-600 uppercase font-mono tracking-widest">
                {time}
            </div>
        </div>
    </div>
  );
}


