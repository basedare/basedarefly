'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ChromeTextProps {
  text: string;
  className?: string;
}

export default function ChromeText({ text, className = '' }: ChromeTextProps) {
  return (
    <div className={cn("relative w-full text-center", className)}>
      {/* MOBILE: Clean, readable, fast */}
      <h1
        className="
          block md:hidden
          font-display font-black italic tracking-tighter
          text-[13vw] leading-none
          text-transparent bg-clip-text
          bg-gradient-to-b from-white to-gray-400
          select-none
        "
        aria-hidden="false"
      >
        {text}
      </h1>

      {/* DESKTOP: Full liquid chrome magic */}
      <h1
        className="
          hidden md:block
          font-display font-black italic tracking-tighter
          text-7xl lg:text-8xl xl:text-9xl leading-tight
          text-transparent bg-clip-text
          select-none
          drop-shadow-2xl
        "
        style={{
          backgroundImage:
            'conic-gradient(from 180deg at 50% 50%, #ffffff 0deg, #c0c8d8 30deg, #64748b 50deg, #e2e8f0 70deg, #ffffff 100deg, #94a3b8 180deg, #ffffff 360deg)',
          backgroundSize: '200% 200%',
          animation: 'chromeFlow 16s ease-in-out infinite',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
        }}
        aria-hidden="true"
      >
        {text}
      </h1>
    </div>
  );
}

