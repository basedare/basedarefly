'use client';
import React from 'react';

interface ViewToggleProps {
  view: 'FAN' | 'BUSINESS';
  setView: (view: 'FAN' | 'BUSINESS') => void;
}

export default function ViewToggle({ view, setView }: ViewToggleProps) {
  return (
    <div className="fixed top-24 right-6 z-[90] flex gap-2 bg-black/80 backdrop-blur-sm border border-white/10 rounded-full p-1">
      <button
        onClick={() => setView('FAN')}
        className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
          view === 'FAN' 
            ? 'bg-purple-500 text-white' 
            : 'text-gray-400 hover:text-white'
        }`}
      >
        CHAOS
      </button>
      <button
        onClick={() => setView('BUSINESS')}
        className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
          view === 'BUSINESS' 
            ? 'bg-[#FFD700] text-black' 
            : 'text-gray-400 hover:text-white'
        }`}
      >
        CONTROL
      </button>
    </div>
  );
}


