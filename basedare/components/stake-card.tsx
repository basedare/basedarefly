"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import DareGenerator from "@/components/DareGenerator";

export function StakeCard() {
  const [amount, setAmount] = useState("");
  const [dareDescription, setDareDescription] = useState("");

  return (
    <div className="flex items-center justify-center p-10">
      
      {/* THE STATIC HOLO CARD 
         - We keep the 'holo-card' classes for the visual style (borders/glows).
         - We REMOVED the onMouseMove handlers so it never tilts.
         - CSS vars for rotation are fixed to 0.
      */}
      <div
        className="holo-card w-full max-w-[480px] h-auto min-h-[600px]"
        style={{
            '--rx': '0deg',
            '--ry': '0deg',
            '--posx': '50%',
            '--posy': '50%',
            '--hyp': '0',
        } as React.CSSProperties}
      >
        <div className="holo-card__translater">
          <div className="holo-card__rotator relative">
            
            {/* --- CONTENT LAYER --- */}
            <div className="holo-card__front flex flex-col p-10 relative h-full z-20 bg-transparent">
              
              {/* 1. HEADER */}
              <div className="flex flex-col items-center gap-4 mb-8">
                {/* Peebear Head - No Circle, Just the Head, Bigger */}
                <img 
                  src="/assets/peebear-head.png" 
                  alt="PeeBear" 
                  className="w-[77px] h-[77px] md:w-96 md:h-96 object-contain drop-shadow-[0_0_30px_rgba(250,204,21,0.4)]" 
                />
                <h2 className="text-2xl font-black text-white tracking-[0.2em] font-serif uppercase">
                  Create Dare
                </h2>
              </div>

              {/* 2. THE MONEY INPUT (THE HERO) */}
              <div className="flex flex-col items-center justify-center mb-8 relative">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mb-2">
                    Total Stake
                </label>
                
                <div className="relative flex items-center justify-center w-full">
                    {/* Dollar Sign */}
                    <span className="text-4xl md:text-5xl font-serif text-[#FACC15] mr-1 align-top relative -top-1 select-none">
                        $
                    </span>
                    
                    {/* Giant Input */}
                    <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent text-center text-6xl md:text-7xl font-black text-white placeholder:text-gray-800 focus:outline-none focus:ring-0 border-none p-0 caret-[#FACC15] font-sans tracking-tighter drop-shadow-xl"
                    />
                </div>
                
                <div className="text-[10px] text-gray-600 font-mono mt-2">
                    MIN: $5 • MAX: $10,000
                </div>
              </div>

              {/* 3. AI DARE GENERATOR */}
              <DareGenerator onSelect={(text) => setDareDescription(text)} />

              {/* 4. THE DESCRIPTION INPUT */}
              <div className="w-full mb-8 relative group">
                <div className="absolute inset-0 bg-white/5 rounded-xl blur-sm transition-opacity opacity-0 group-hover:opacity-100" />
                <textarea 
                    value={dareDescription}
                    onChange={(e) => setDareDescription(e.target.value)}
                    className="relative w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-[#FACC15]/50 min-h-[100px] resize-none backdrop-blur-md transition-all text-center font-medium leading-relaxed"
                    placeholder="What must they do?"
                />
              </div>

              {/* 5. ACTION BUTTON */}
              <div className="mt-auto">
                 <Button className="w-full h-16 bg-[#FACC15] hover:bg-[#EAB308] text-black font-black text-xl tracking-wide shadow-[0_0_40px_rgba(250,204,21,0.3)] transition-all transform hover:scale-[1.01] active:scale-95 rounded-2xl border-b-[6px] border-yellow-700 active:border-b-0 active:translate-y-1 active:shadow-none">
                    STAKE NOW
                 </Button>
                 
                 <p className="text-center text-[9px] text-purple-400/60 mt-4 font-mono uppercase tracking-widest">
                    The House Always Wins • 10% Rake
                 </p>
              </div>

            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
