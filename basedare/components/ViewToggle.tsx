'use client';
import React from 'react';

interface ViewToggleProps {
  view: 'FAN' | 'BUSINESS';
  setView: (view: 'FAN' | 'BUSINESS') => void;
}

export default function ViewToggle({ view, setView }: ViewToggleProps) {
  const isControl = view === 'BUSINESS';

  return (
    <div className="fixed top-24 right-6 z-[90]">
      {/* Premium Neumorphic Switch */}
      <div className="relative flex items-center gap-4">
        {/* CHAOS Label */}
        <span className={`text-xs font-black uppercase tracking-widest transition-all duration-500 ${
          !isControl ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'text-zinc-600'
        }`}>
          CHAOS
        </span>

        {/* The Switch Track */}
        <button
          onClick={() => setView(isControl ? 'FAN' : 'BUSINESS')}
          className="relative cursor-pointer flex items-center w-[180px] h-[72px] rounded-full focus:outline-none"
          style={{
            background: 'linear-gradient(145deg, #0a0a0f, #15151f)',
            boxShadow: `
              inset 4px 4px 8px rgba(0, 0, 0, 0.8),
              inset -4px -4px 8px rgba(40, 40, 60, 0.4),
              0 0 20px rgba(0, 0, 0, 0.5)
            `
          }}
          aria-label={isControl ? 'Switch to Chaos mode' : 'Switch to Control mode'}
        >
          {/* Left Indicator (CHAOS/Purple) */}
          <div
            className="absolute left-[8%] w-[36%] h-[55%] rounded-l-full overflow-hidden transition-all duration-500"
            style={{
              background: !isControl
                ? 'linear-gradient(180deg, #E9D5FF 10%, #C084FC 30%, #A855F7 60%, #9333EA 75%, #7C3AED)'
                : 'linear-gradient(180deg, #1a1a2e, #0f0f1a 60%, #1a1a2e)',
              boxShadow: !isControl
                ? 'inset 0 0 2px rgba(168, 85, 247, 0.6), inset 0 0 8px rgba(168, 85, 247, 0.4), 0 0 20px rgba(168, 85, 247, 0.5)'
                : 'inset 0 0 10px rgba(0, 0, 0, 0.9), inset 8px 8px 12px rgba(0, 0, 0, 0.8)'
            }}
          >
            {/* Noise texture overlay */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScyMDAnIGhlaWdodD0nMjAwJz48ZmlsdGVyIGlkPSduJyB4PScwJyB5PScwJz48ZmVUdXJidWxlbmNlIHR5cGU9J2ZyYWN0YWxOb2lzZScgYmFzZUZyZXF1ZW5jeT0nMC43JyBudW1PY3RhdmVzPSczJyBzdGl0Y2hUaWxlcz0nc3RpdGNoJy8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9JzIwMCcgaGVpZ2h0PScyMDAnIGZpbHRlcj0ndXJsKCNuKScgb3BhY2l0eT0nMC41Jy8+PC9zdmc+")`
              }}
            />
          </div>

          {/* Right Indicator (CONTROL/Gold) */}
          <div
            className="absolute right-[8%] w-[36%] h-[55%] rounded-r-full overflow-hidden transition-all duration-500"
            style={{
              background: isControl
                ? 'linear-gradient(180deg, #FEF9C3 10%, #FDE047 30%, #FACC15 60%, #EAB308 75%, #CA8A04)'
                : 'linear-gradient(180deg, #1a1a2e, #0f0f1a 60%, #1a1a2e)',
              boxShadow: isControl
                ? 'inset 0 0 2px rgba(250, 204, 21, 0.6), inset 0 0 8px rgba(250, 204, 21, 0.4), 0 0 20px rgba(250, 204, 21, 0.5)'
                : 'inset 0 0 10px rgba(0, 0, 0, 0.9), inset -8px 8px 12px rgba(0, 0, 0, 0.8)'
            }}
          >
            {/* Noise texture overlay */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScyMDAnIGhlaWdodD0nMjAwJz48ZmlsdGVyIGlkPSduJyB4PScwJyB5PScwJz48ZmVUdXJidWxlbmNlIHR5cGU9J2ZyYWN0YWxOb2lzZScgYmFzZUZyZXF1ZW5jeT0nMC43JyBudW1PY3RhdmVzPSczJyBzdGl0Y2hUaWxlcz0nc3RpdGNoJy8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9JzIwMCcgaGVpZ2h0PScyMDAnIGZpbHRlcj0ndXJsKCNuKScgb3BhY2l0eT0nMC41Jy8+PC9zdmc+")`
              }}
            />
          </div>

          {/* The Sliding Button */}
          <div
            className="absolute z-10 w-[50%] h-[75%] rounded-full transition-all duration-500 ease-[cubic-bezier(1,0,1,1)]"
            style={{
              left: isControl ? '45%' : '5%',
              background: 'linear-gradient(160deg, #e8e8f0 40%, #a0a0b0 70%)',
              boxShadow: `
                2px 2px 4px rgba(0, 0, 0, 0.6),
                4px 4px 8px rgba(0, 0, 0, 0.4),
                8px 12px 16px rgba(0, 0, 0, 0.5),
                inset 0 2px 4px rgba(255, 255, 255, 0.4)
              `
            }}
          >
            {/* Left circle detail */}
            <div
              className="absolute left-[8%] top-[12%] w-[38%] h-[76%] rounded-full"
              style={{
                background: 'linear-gradient(-50deg, #f0f0f5 20%, #c8c8d0 80%)',
                boxShadow: 'inset 1px 1px 3px rgba(255, 255, 255, 0.8)'
              }}
            />
            {/* Right circle detail */}
            <div
              className="absolute right-[8%] top-[12%] w-[38%] h-[76%] rounded-full"
              style={{
                background: 'linear-gradient(-50deg, #f0f0f5 20%, #b8b8c5 80%)',
                boxShadow: 'inset 1px 1px 2px rgba(255, 255, 255, 0.6)'
              }}
            />
          </div>
        </button>

        {/* CONTROL Label */}
        <span className={`text-xs font-black uppercase tracking-widest transition-all duration-500 ${
          isControl ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'text-zinc-600'
        }`}>
          CONTROL
        </span>
      </div>
    </div>
  );
}