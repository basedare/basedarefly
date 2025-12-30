'use client';
import React, { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

const SUGGESTIONS = {
  "CHAOS": [
    "Call your ex and ask for a $50 loan",
    "Delete your main WoW character",
    "Tweet your browser search history",
    "Eat a raw onion like an apple",
    "Let chat pick your outfit for a date"
  ],
  "SKILL": [
    "Win a Warzone match using only a pistol",
    "Speedrun Minecraft in under 20 mins",
    "Hit a 360 no-scope blindfolded",
    "Complete Dark Souls boss without rolling",
    "Win a chess game in under 15 moves"
  ],
  "IRL": [
    "Order a pizza to a stranger's house",
    "Do 50 pushups in a crowded Walmart",
    "Wear a clown suit to the gym",
    "Busker performance until you earn $10",
    "Ask 10 strangers for a high-five"
  ]
};

interface GeneratorProps {
  onSelect: (text: string) => void;
}

export default function DareGenerator({ onSelect }: GeneratorProps) {
  const [category, setCategory] = useState<"CHAOS" | "SKILL" | "IRL">("CHAOS");
  const [suggestion, setSuggestion] = useState(SUGGESTIONS["CHAOS"][0]);
  const [isAnimating, setIsAnimating] = useState(false);

  const generate = () => {
    setIsAnimating(true);
    let shuffles = 0;
    const interval = setInterval(() => {
      const random = SUGGESTIONS[category][Math.floor(Math.random() * SUGGESTIONS[category].length)];
      setSuggestion(random);
      shuffles++;
      if (shuffles > 15) {
        clearInterval(interval);
        setIsAnimating(false);
        onSelect(random);
      }
    }, 50);
  };

  return (
    <div className="p-6 bg-purple-900/10 border border-purple-500/30 rounded-2xl mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <h3 className="text-purple-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#FFD700]" /> AI Mission Generator
        </h3>
        
        <div className="flex gap-2">
          {(Object.keys(SUGGESTIONS) as Array<keyof typeof SUGGESTIONS>).map(cat => (
            <button 
              key={cat}
              onClick={() => setCategory(cat)}
              className={`text-[10px] px-3 py-1.5 rounded-full font-bold border transition-all ${
                category === cat 
                  ? 'bg-purple-500 text-black border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                  : 'border-white/10 text-gray-500 hover:border-white/30 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex gap-4">
        <div className="flex-1 bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-white text-sm md:text-lg flex items-center shadow-inner relative overflow-hidden">
          <span className="text-gray-500 mr-2">{">"}</span>
          <span className="relative z-10">{suggestion}</span>
          {/* Scanning Line Effect */}
          {isAnimating && (
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
              style={{
                animation: 'shine-scan 0.5s infinite'
              }}
            />
          )}
        </div>
        
        <button 
          onClick={generate}
          disabled={isAnimating}
          className="bg-[#FFD700] hover:bg-yellow-400 text-black rounded-xl w-14 flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-[0_0_20px_rgba(255,215,0,0.2)]"
        >
          <RefreshCw className={`w-6 h-6 ${isAnimating ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}
