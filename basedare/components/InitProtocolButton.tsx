'use client';

import React from 'react';
import { cn } from "@/lib/utils";
import { Zap } from 'lucide-react';

export default function InitProtocolButton({ className }: { className?: string }) {
  return (
    <button className={cn(
      "relative group w-full md:w-auto min-w-[200px] h-16 px-8 bg-black rounded-xl flex items-center justify-center overflow-hidden transition-transform active:scale-95",
      className
    )}>
      
      {/* 1. Outer Gold Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-[#FFD700] to-[#B8860B] rounded-xl blur opacity-20 group-hover:opacity-60 transition duration-500 group-hover:duration-200" />
      
      {/* 2. Spinning Gold Chrome Border */}
      <div className="absolute inset-0 rounded-xl overflow-hidden p-[2px]">
        <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#422006_0%,#B8860B_20%,#FFD700_35%,#fff_45%,#B8860B_60%,#422006_80%,#422006_100%)] animate-[spin_3s_linear_infinite] blur-[1px] contrast-125 group-hover:contrast-150" />
      </div>

      {/* 3. Inner Button (Dark Gold/Black) */}
      <div className="absolute inset-[2px] bg-[#120a00] rounded-[10px] flex items-center justify-center border border-[#FFD700]/20">
        
        {/* Shine Sweep Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 translate-x-[-200%] group-hover:animate-shine pointer-events-none" />
        
        <div className="relative flex items-center gap-2 text-[#FFD700] font-black text-sm md:text-base tracking-widest uppercase leading-none drop-shadow-[0_2px_10px_rgba(255,215,0,0.3)]">
          <Zap className="fill-[#FFD700] w-4 h-4 md:w-5 md:h-5" /> 
          INIT PROTOCOL
        </div>
      </div>
    </button>
  );
}
