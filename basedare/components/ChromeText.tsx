'use client';

import { cn } from "@/lib/utils";

interface ChromeTextProps {
  text: string;
  className?: string;
}

export default function ChromeText({ text, className }: ChromeTextProps) {
  return (
    <div className={cn("relative flex justify-center items-center w-full max-w-full overflow-hidden", className)}>
      {/* 1. THE CHROME LAYER (Main Text) */}
      <h1 
        className="
          relative z-10 
          font-black italic tracking-tighter 
          text-transparent bg-clip-text 
          select-none
          pb-2 /* Prevent clip cut-off at bottom */
          [text-shadow:_0_4px_20px_rgba(168,85,247,0.4)]
        "
        style={{
          // Complex metallic gradient that shifts slowly
          backgroundImage: `
            conic-gradient(
              from 180deg at 50% 50%,
              #ffffff 0deg,
              #c0c8d8 30deg,
              #64748b 50deg,
              #e2e8f0 70deg,
              #ffffff 100deg,
              #94a3b8 180deg,
              #ffffff 360deg
            )
          `,
          backgroundSize: '200% 200%',
          WebkitBackgroundClip: 'text',
          animation: 'chromeFlow 8s ease-in-out infinite',
        } as React.CSSProperties}
      >
        {text}
      </h1>

      {/* 2. THE SHINE LAYER (Sweeping light reflection) */}
      <span 
        className="absolute inset-0 z-20 font-black italic tracking-tighter text-transparent bg-clip-text animate-chrome-shine pointer-events-none pb-2"
        style={{
          backgroundImage: 'linear-gradient(90deg, transparent 40%, rgba(255,255,255,0.9) 50%, transparent 60%)',
          backgroundSize: '300% 100%',
          WebkitBackgroundClip: 'text',
        } as React.CSSProperties}
        aria-hidden="true"
      >
        {text}
      </span>

      {/* 3. THE GLOW LAYER (Atmospheric reflection behind) */}
      <h1 
        className="absolute inset-0 z-0 font-black italic tracking-tighter text-transparent bg-clip-text blur-2xl opacity-40 select-none pb-2"
        style={{
          backgroundImage: 'linear-gradient(180deg, #A855F7, #3B82F6)',
          WebkitBackgroundClip: 'text',
        } as React.CSSProperties}
        aria-hidden="true"
      >
        {text}
      </h1>
    </div>
  );
}

