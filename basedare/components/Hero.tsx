'use client';
import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center pt-24 pb-12 px-4 overflow-hidden">
      
      {/* BACKGROUND: Static gradient instead of heavy video to stop flashing */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-black to-black z-0" />
      
      <div className="relative z-10 w-full max-w-4xl mx-auto text-center flex flex-col items-center">
        
        {/* PEEBEAR HEAD: Optimized & Stable */}
        <div className="relative w-[77px] h-[77px] md:w-[115px] md:h-[115px] mb-6">
            <div className="absolute inset-0 bg-[#FFD700] rounded-full blur-[50px] opacity-20 animate-pulse" />
            {/* Standard img tag is more stable for simple assets than Next/Image with complex props */}
            <img 
              src="/assets/peebear-head.png" 
              alt="Peebear" 
              className="w-full h-full object-contain relative z-10 drop-shadow-2xl"
            />
        </div>

        {/* HEADLINE */}
        <h1 className="text-5xl md:text-8xl font-black text-white italic tracking-tighter uppercase mb-6 leading-[0.9]">
          Dare <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-yellow-600">Anything.</span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Get Paid.</span>
        </h1>

        {/* INPUT: Fixed height to prevent layout shifts (Glitch Fix) */}
        <div className="w-full max-w-md mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#FFD700] to-purple-600 rounded-2xl opacity-75 group-hover:opacity-100 blur transition duration-200" />
            <div className="relative flex items-center bg-black rounded-xl p-2 border border-white/10">
                <span className="pl-4 text-gray-500 font-mono text-lg font-bold select-none">I dare @</span>
                <input 
                    type="text" 
                    placeholder="elonmusk to buy mcdonalds..." 
                    className="flex-1 bg-transparent border-none text-white placeholder-gray-600 focus:ring-0 text-lg font-bold px-2 py-2 outline-none"
                />
                <button className="bg-[#FFD700] hover:bg-[#ffed4a] text-black p-3 rounded-lg transition-transform hover:scale-105 active:scale-95">
                    <ArrowRight className="w-5 h-5 font-bold" />
                </button>
            </div>
        </div>

        {/* LIVE POT: Simplified (No rapid re-renders) */}
        <div className="mt-12 flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Live Pot:</span>
            <span className="text-[#FFD700] font-mono font-black text-xl">$86,227.42</span>
        </div>

      </div>
    </section>
  );
}
