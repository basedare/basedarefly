'use client';

import React, { useRef, useState, useCallback } from 'react';
import { QrCode, Fingerprint, Ban } from 'lucide-react';

interface HoloCardProps {
  streamer: string;
  badge?: string;
  title: string;
  bounty: string;
  time: string;
  isMinted?: boolean;     // Artifact Mode (Gold)
  isShame?: boolean;      // Shame Mode (Red)
  serial?: string;        // e.g. "BD-25-LEG-#042"
  className?: string;
}

export default function HoloCard({
  streamer, badge = "LIVE", title, bounty, time,
  isMinted = false, isShame = false, serial = "PENDING", className = ""
}: HoloCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  // Dynamic Styles
  const borderColor = isShame ? 'border-red-600/50' : isMinted ? 'border-[#FFD700]/50' : 'border-purple-500/50';
  const glowColor = isShame ? 'from-red-900/40' : isMinted ? 'from-yellow-900/20' : 'from-purple-900/20';
  const badgeStyle = isShame 
    ? "border-red-600 text-red-600 bg-red-900/20 animate-pulse" 
    : isMinted 
      ? "border-[#FFD700] text-[#FFD700] bg-[#FFD700]/10" 
      : "border-purple-500 text-purple-400";

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isFlipped) return;
    const rect = cardRef.current.getBoundingClientRect();
    const rx = (0.5 - (e.clientY - rect.top) / rect.height) * 15; 
    const ry = ((e.clientX - rect.left) / rect.width - 0.5) * 15; 
    cardRef.current.style.setProperty("--rx", `${rx}deg`);
    cardRef.current.style.setProperty("--ry", `${ry}deg`);
  }, [isFlipped]);

  return (
    <div className={`group relative perspective-1000 ${className}`} onClick={() => setIsFlipped(!isFlipped)}>
      <div 
        ref={cardRef} onMouseMove={onMouseMove} onMouseLeave={() => cardRef.current?.style.setProperty("--rx", "0deg")}
        className={`relative w-full h-full transition-all duration-700 ease-out transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
        style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateX(var(--rx)) rotateY(var(--ry))' }}
      >
        {/* FRONT */}
        <div className="absolute inset-0 backface-hidden">
            <div className={`absolute inset-0 bg-[#050505] rounded-xl border ${borderColor} overflow-hidden shadow-2xl`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${glowColor} via-black to-black opacity-60`} />
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-purple-500/50 rounded-xl transition-all duration-300" />
              
              <div className="relative z-10 h-full flex flex-col justify-between p-6">
                <div className="flex justify-between items-start">
                   <div>
                     <span className="text-[10px] text-gray-500 font-mono tracking-widest">{isMinted ? "ARTIFACT ID" : "TARGET"}</span>
                     <div className="flex items-center gap-1">
                       <span className={`text-lg font-black ${isShame ? 'text-red-500' : 'text-[#FFD700]'}`}>$</span>
                       <span className={`text-lg font-bold uppercase ${isShame ? 'text-red-400 line-through decoration-2' : 'text-cyan-400'}`}>
                         {streamer.replace(/[$@]/g, '')}
                       </span>
                     </div>
                   </div>
                   <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border rounded ${badgeStyle}`}>{badge}</span>
                </div>

                <div className="my-auto relative">
                  <h3 className={`text-3xl font-black italic uppercase leading-[0.9] drop-shadow-md ${isShame ? 'text-gray-500 blur-[0.5px]' : 'text-white'}`}>{title}</h3>
                  {isShame && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 border-4 border-red-600 text-red-600 font-black text-4xl px-4 py-1 mix-blend-color-dodge">VOID</div>}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-white/10 pb-4">
                    <span className="text-gray-500 text-[10px] font-mono tracking-widest">{isMinted ? "FINAL PAYOUT" : "BOUNTY POT"}</span>
                    <span className={`text-3xl font-black tracking-tighter ${isShame ? 'text-gray-600' : 'text-[#FFD700]'}`}>{isShame ? "RETURNED" : bounty}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] text-gray-600 uppercase tracking-widest">{isMinted ? "VERIFIED ASSET" : "OPEN CONTRACT"}</span>
                    <span className="font-mono text-[9px] text-white/30 tracking-[0.2em] border border-white/10 px-2 py-0.5 rounded">{serial}</span>
                  </div>
                </div>
              </div>
            </div>
        </div>

        {/* BACK (Certificate) */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
            <div className={`absolute inset-0 bg-[#0a0a0a] rounded-xl border ${borderColor} overflow-hidden shadow-2xl p-6 flex flex-col justify-between`}>
              <div className="relative z-10 text-center space-y-2">
                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center border mb-4 ${isShame ? 'border-red-600 bg-red-900/20 text-red-600' : 'border-[#FFD700]/50 bg-[#FFD700]/10 text-[#FFD700]'}`}>
                  {isShame ? <Ban className="w-6 h-6"/> : <Fingerprint className="w-6 h-6"/>}
                </div>
                <h4 className={`font-black uppercase text-lg tracking-widest ${isShame ? 'text-red-600' : 'text-[#FFD700]'}`}>{isShame ? "VOID" : "CERTIFICATE"}</h4>
              </div>
              <div className="relative z-10 space-y-4 border-t border-white/10 pt-4">
                <div className="flex justify-between items-center text-xs"><span className="text-gray-500 font-mono">SERIAL</span><span className="text-white font-mono">{serial}</span></div>
                <div className="flex justify-between items-center text-xs"><span className="text-gray-500 font-mono">DATE</span><span className="text-white font-mono">{time}</span></div>
              </div>
              <div className="relative z-10 flex items-center gap-4 border-t border-white/10 pt-4"><div className="bg-white p-1 rounded"><QrCode className="text-black w-10 h-10" /></div><div className="text-[9px] text-gray-400 font-mono">SCAN TO VERIFY<br/>OWNERSHIP</div></div>
            </div>
        </div>
      </div>
    </div>
  );
}
