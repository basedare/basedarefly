'use client';
import React from 'react';
import HoloCard from '@/components/ui/holo-card';

const LEGENDS = [
  { streamer: "$xQc", dare: "EAT REAPER CHIP", bounty: "15,000 BD", date: "OCT 12", mint: "#042" },
  { streamer: "$Kai", dare: "CALL EX GIRLFRIEND", bounty: "25,000 BD", date: "NOV 01", mint: "#088" },
  { streamer: "$Speed", dare: "BARK AT POLICE", bounty: "50,000 BD", date: "DEC 05", mint: "#102" }
];

// The Electric Rope SVG Component
const LightningRope = ({ className }: { className?: string }) => (
  <svg className={`absolute top-1/2 left-0 w-full -translate-y-1/2 pointer-events-none z-0 ${className}`} height="100" viewBox="0 0 1000 100" preserveAspectRatio="none">
    <path 
      d="M0,50 Q250,0 500,50 T1000,50" 
      fill="none" 
      stroke="#A855F7" 
      strokeWidth="2"
      className="electric-link opacity-50"
    />
    <path 
      d="M0,50 Q250,100 500,50 T1000,50" 
      fill="none" 
      stroke="#FFD700" 
      strokeWidth="1"
      className="electric-link opacity-30 delay-75"
    />
  </svg>
);

export default function HallOfFame() {
  return (
    <div className="w-full py-32 relative overflow-hidden">
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center mb-20">
          <h2 className="text-4xl md:text-6xl font-black italic text-white uppercase tracking-tighter drop-shadow-lg">
            THE VAULT
          </h2>
          <div className="h-1 w-24 bg-[#FFD700] mt-6 rounded-full shadow-[0_0_20px_#FFD700]" />
        </div>

        {/* The Grid with Ropes */}
        <div className="relative">
          
          {/* THE ELECTRIC ROPE (Connecting the cards horizontally) */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 -translate-y-1/2 h-20 w-full z-0">
             <LightningRope />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 justify-items-center relative z-10">
            {LEGENDS.map((legend, i) => (
              <div key={i} className="transform hover:-translate-y-4 transition-transform duration-500">
                <div className="relative w-80 h-[420px]">
                  <HoloCard
                    isMinted={true}
                    streamer={legend.streamer}
                    title={legend.dare}
                    bounty={legend.bounty}
                    time={legend.date}
                    className="w-full h-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
