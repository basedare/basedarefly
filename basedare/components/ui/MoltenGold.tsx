'use client';

import { cn } from "@/lib/utils";

interface MoltenGoldProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'gold' | 'purple'; // <--- THIS IS REQUIRED
}

export default function MoltenGold({ children, className, variant = 'gold' }: MoltenGoldProps) {
  const isGold = variant === 'gold';
  
  const ghostGradient = isGold 
    ? "from-yellow-700 to-yellow-900" 
    : "from-purple-700 to-purple-900";

  const mainGradient = isGold
    ? "from-[#FBF5B7] via-[#BF953F] to-[#AA771C]" 
    : "from-[#E9D5FF] via-[#A855F7] to-[#6B21A8]";

  return (
    <div className={cn("relative inline-block", className)}>
      <h1 className={cn(
          "absolute inset-0 text-transparent bg-clip-text bg-gradient-to-b blur-[2px] opacity-50 translate-y-1 select-none pointer-events-none",
          ghostGradient
      )}>
        {children}
      </h1>

      <h1
        className={cn(
            "relative z-10 font-display font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]",
            mainGradient
        )}
        data-text={children}
      >
        {children}
        <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shine bg-[length:200%_100%] pointer-events-none mix-blend-overlay" aria-hidden="true">
            {children}
        </span>
      </h1>
      
      <style jsx>{`
        @keyframes shine-sweep {
          0% { background-position: -150% 0; }
          20% { background-position: 150% 0; }
          100% { background-position: 150% 0; }
        }
        .animate-shine {
          animation: shine-sweep 4s infinite linear;
        }
      `}</style>
    </div>
  );
}
