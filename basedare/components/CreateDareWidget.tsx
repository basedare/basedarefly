'use client';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function CreateDareWidget() {
  return (
    <Link href="/create" className="group relative h-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 hover:border-purple-400/50 rounded-3xl backdrop-blur-md transition-all duration-300 overflow-hidden flex flex-col items-center justify-center p-8">
      {/* GLOW EFFECT */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="mt-auto relative z-10">
        <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(168,85,247,0.4)] group-hover:scale-110 transition-transform">
          <Plus className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-3xl font-black text-white italic uppercase leading-none mb-2">
          Create<br/>New Dare
        </h3>
        <p className="text-sm text-purple-300/60 font-mono">
          DEPLOY SMART CONTRACT -&gt;
        </p>
      </div>
    </Link>
  );
}

