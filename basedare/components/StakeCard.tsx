"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function StakeCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  // --- PHYSICS ENGINE (The Math) ---
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    setIsInteracting(true);

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate percentages
    const px = x / rect.width;
    const py = y / rect.height;

    const mx = px * 100;
    const my = py * 100;

    // Calculate rotation (Sensitivity tuned for "Heavy Card" feel)
    const rx = ((py - 0.5) * -20).toFixed(2); // Tilt X
    const ry = ((px - 0.5) * 20).toFixed(2);  // Tilt Y

    const card = cardRef.current;
    card.style.setProperty("--mx", `${mx}%`);
    card.style.setProperty("--my", `${my}%`);
    card.style.setProperty("--rx", `${rx}deg`);
    card.style.setProperty("--ry", `${ry}deg`);
    card.style.setProperty("--posx", `${50 + (px - 0.5) * 50}%`);
    card.style.setProperty("--posy", `${50 + (py - 0.5) * 50}%`);
    card.style.setProperty("--o", "1"); // Opacity of shine
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    setIsInteracting(false);
    const card = cardRef.current;
    
    // Reset position smoothly
    card.style.setProperty("--o", "0");
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  };

  return (
    <div className="flex items-center justify-center p-10 perspective-[1000px]">
      <div
        ref={cardRef}
        className={cn("holo-card w-[350px] h-[550px]", isInteracting && "interacting")}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="holo-card__translater">
          <div className="holo-card__rotator relative">
            
            {/* --- CARD CONTENT (The UI Texture Recreated) --- */}
            <div className="holo-card__front flex flex-col p-6 relative bg-black/80">
              
              {/* Neon Border Glow (Inset) */}
              <div className="absolute inset-0 rounded-[20px] border border-purple-500/50 shadow-[inset_0_0_20px_rgba(168,85,247,0.2)] pointer-events-none" />
              
              {/* Honey Drip Graphic (Top Right) */}
              <div className="absolute top-0 right-0 w-[120px] h-[120px] pointer-events-none z-10">
                 <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                    <path d="M50 0H100V60C100 60 95 80 85 70C75 60 70 40 70 40C70 40 65 85 55 80C45 75 50 0 50 0Z" fill="#EAB308" className="opacity-90"/>
                    <path d="M70 0H90V40C90 40 85 55 80 50C75 45 70 0 70 0Z" fill="#FACC15" />
                 </svg>
              </div>

              {/* Header / Logo */}
              <div className="flex items-center gap-3 mb-8 z-10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-700 shadow-lg flex items-center justify-center border border-white/20">
                   <span className="text-xl">🐻</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-widest drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]">
                  STAKE
                </h2>
              </div>

              {/* Form Fields */}
              <div className="space-y-6 z-10 mt-4">
                
                {/* Stake Amount Input */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Stake Amount ($BARE)</label>
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-purple-500/20 blur opacity-50 group-hover:opacity-100 transition duration-500" />
                        <Input 
                            type="number" 
                            placeholder="1000"
                            className="relative bg-black/50 border-purple-500/30 text-yellow-400 font-mono text-lg h-12 focus:border-yellow-400/80 focus:ring-yellow-400/20 backdrop-blur-md transition-all"
                        />
                    </div>
                </div>

                {/* Dare Details Input */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Dare Details</label>
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-yellow-400/20 blur opacity-50 group-hover:opacity-100 transition duration-500" />
                        <textarea 
                            className="flex w-full rounded-md border border-purple-500/30 bg-black/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/20 focus-visible:border-yellow-400/80 disabled:cursor-not-allowed disabled:opacity-50 relative text-white min-h-[80px] backdrop-blur-md resize-none"
                            placeholder="E.g. Drink a raw egg..."
                        />
                    </div>
                </div>

                {/* Slider */}
                <div className="space-y-4 pt-2">
                     <div className="flex justify-between text-xs text-gray-500">
                        <span>Min: $5</span>
                        <span>Max: $10k</span>
                     </div>
                     <Slider 
                        defaultValue={[50]} 
                        max={100} 
                        step={1} 
                        className="cursor-pointer"
                     />
                     <div className="text-center text-[10px] text-purple-300/60 font-mono uppercase tracking-widest">
                        10% Rake Taken Instantly
                     </div>
                </div>

              </div>

              {/* Action Button */}
              <div className="mt-auto pt-6 z-10">
                 <Button className="w-full h-14 relative overflow-hidden group bg-transparent border border-purple-500/50 hover:border-yellow-400/80 transition-all duration-300">
                    {/* Inner Gradient Mesh */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-900/40 via-purple-600/20 to-yellow-500/10 opacity-80 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Text Glow */}
                    <span className="relative z-10 font-black text-xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-200 group-hover:from-yellow-200 group-hover:to-yellow-500 drop-shadow-[0_2px_10px_rgba(168,85,247,0.5)]">
                        STAKE DARE
                    </span>
                 </Button>
              </div>

            </div>

            {/* --- HOLOGRAPHIC LAYERS --- */}
            <div className="holo-card__shine" />
            <div className="holo-card__glare" />
            
          </div>
        </div>
      </div>
    </div>
  );
}


