'use client';
import React from 'react';
import HoloCard from '@/components/ui/holo-card';
const SHAME = [{s:"$Ninja",d:"SHAVE HEAD",b:"100k BD",t:"DEC 20"},{s:"$Poki",d:"EAT ONION",b:"5k BD",t:"NOV 15"}];
export default function HallOfShame() {
  return (
    <div className="w-full py-24 relative overflow-hidden border-t border-red-900/30 bg-gradient-to-b from-black via-red-950/10 to-black">
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center mb-16"><h2 className="text-4xl md:text-5xl font-black italic text-red-600 uppercase tracking-tighter drop-shadow-lg">THE GRAVEYARD</h2><div className="h-1 w-24 bg-red-600 mt-4 rounded-full shadow-[0_0_20px_#DC2626]" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-items-center opacity-80 hover:opacity-100 transition-opacity">
          {SHAME.map((d,i)=><div key={i} className="w-80 h-[450px]"><HoloCard isShame={true} badge="COWARD" streamer={d.s} title={d.d} bounty={d.b} time={d.t} serial={`BD-SHAME-${i}`} className="w-full h-full grayscale hover:grayscale-0 transition-all" /></div>)}
        </div>
      </div>
    </div>
  );
}
