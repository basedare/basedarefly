'use client';
import { Upload } from 'lucide-react';

export default function SubmitEvidence() {
  return (
    <div className="group relative h-full bg-white/5 border-2 border-dashed border-white/10 hover:border-cyan-400/50 rounded-3xl backdrop-blur-md transition-all duration-300 overflow-hidden">
      {/* SCANNING LASER EFFECT */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" />
      
      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 group-hover:border-cyan-400 transition-all duration-300">
          <Upload className="w-6 h-6 text-gray-400 group-hover:text-cyan-400" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-wider mb-1">Submit Evidence</h3>
          <p className="text-xs font-mono text-gray-500 max-w-[200px]">
            DRAG VIDEO FILE HERE OR CLICK TO BROWSE SECURE STORAGE
          </p>
        </div>
        <div className="px-3 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
          zkML Verification Ready
        </div>
      </div>

      {/* CORNER ACCENTS */}
      <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-white/20" />
      <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-white/20" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-white/20" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-white/20" />
    </div>
  );
}

