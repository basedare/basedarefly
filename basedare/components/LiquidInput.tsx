'use client';

import React from 'react';
import { cn } from "@/lib/utils";

interface LiquidInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefix?: string;
}

export function LiquidInput({ className, prefix, ...props }: LiquidInputProps) {
  return (
    <div className="relative group w-full max-w-xl mx-auto">
      {/* 1. The Liquid Glow Container (Purple/Blue) */}
      <div className="absolute -inset-[3px] bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 rounded-xl blur-md opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 pointer-events-none" />
      
      {/* 2. The Spinning Liquid Border */}
      <div className="absolute -inset-[1px] rounded-xl overflow-hidden pointer-events-none">
        <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#000_0%,#000_20%,#A855F7_35%,#fff_45%,#3B82F6_60%,#000_80%,#000_100%)] animate-[spin_4s_linear_infinite] opacity-100 blur-[2px] contrast-150" />
      </div>

      {/* 3. The Input Itself (Black Glass) */}
      <div className="relative bg-black rounded-xl p-[1px] backface-hidden transform translate-z-0">
        <div className="relative bg-[#050505] rounded-xl flex items-center h-16 px-6 border border-white/5 shadow-2xl">
          {prefix && (
            <span className="mr-2 text-[#FFD700] font-black text-2xl select-none drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
              {prefix}
            </span>
          )}
          <input
            {...props}
            className={cn(
              "w-full bg-transparent border-none text-xl font-bold text-white placeholder:text-gray-600 focus:ring-0 focus:outline-none font-mono tracking-wide",
              className
            )}
          />
        </div>
      </div>
    </div>
  );
}
