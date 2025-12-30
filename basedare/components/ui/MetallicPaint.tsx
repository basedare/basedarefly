'use client';

import { cn } from "@/lib/utils";

interface MetallicPaintProps {
  children: React.ReactNode;
  className?: string;
}

export default function MetallicPaint({ children, className }: MetallicPaintProps) {
  return (
    <h1 className={cn("relative font-black tracking-tighter", className)}>
      {/* 1. The Shimmering Liquid Layer (Top) */}
      <span 
        className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-[#FACC15] to-purple-600 animate-shimmer bg-[length:200%_auto] opacity-80 mix-blend-overlay" 
        aria-hidden="true"
      >
        {children}
      </span>
      
      {/* 2. The Base Metal Layer (Bottom) */}
      <span className="relative text-transparent bg-clip-text bg-gradient-to-b from-[#FACC15] via-[#FFF] to-[#B45309] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        {children}
      </span>
    </h1>
  );
}
