'use client';

import { Moon, Sun } from 'lucide-react';

import { useBackgroundTone } from '@/app/context/BackgroundToneContext';

export default function BackgroundToneToggle({ className = '' }: { className?: string }) {
  const { isDarkTone, toggleTone } = useBackgroundTone();

  const Icon = isDarkTone ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={toggleTone}
      aria-label={isDarkTone ? 'Switch background to light mode' : 'Switch background to dark mode'}
      aria-pressed={!isDarkTone}
      title={isDarkTone ? 'Lighten background' : 'Darken background'}
      className={`group relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-white transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50 md:h-11 md:w-11 ${
        isDarkTone
          ? 'border-white/10 bg-[linear-gradient(145deg,rgba(4,5,12,0.96),rgba(14,14,25,0.92))] shadow-[inset_8px_8px_16px_rgba(0,0,0,0.76),inset_-4px_-4px_10px_rgba(255,255,255,0.04),0_1px_0_rgba(255,255,255,0.04)]'
          : 'border-yellow-200/30 bg-[linear-gradient(145deg,rgba(255,255,255,0.22),rgba(245,197,24,0.13)_36%,rgba(11,12,22,0.78))] shadow-[0_12px_28px_rgba(0,0,0,0.36),0_0_28px_rgba(245,197,24,0.2),inset_0_1px_0_rgba(255,255,255,0.32),inset_0_-10px_16px_rgba(0,0,0,0.32)] hover:-translate-y-[1px]'
      } ${className}`}
    >
      <span
        className={`absolute inset-[5px] rounded-full transition-all duration-300 ${
          isDarkTone
            ? 'bg-black/30 shadow-[inset_4px_5px_9px_rgba(0,0,0,0.74)]'
            : 'bg-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]'
        }`}
        aria-hidden="true"
      />
      <span
        className={`absolute h-2 w-2 rounded-full transition-all duration-300 ${
          isDarkTone
            ? 'right-2 top-2 bg-cyan-200/40 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
            : 'left-2 top-2 bg-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.8)]'
        }`}
        aria-hidden="true"
      />
      <Icon
        className={`relative h-4 w-4 transition-all duration-300 md:h-[18px] md:w-[18px] ${
          isDarkTone
            ? 'text-cyan-100/78 drop-shadow-[0_0_8px_rgba(34,211,238,0.22)]'
            : 'text-yellow-50 drop-shadow-[0_0_12px_rgba(245,197,24,0.42)]'
        }`}
      />
    </button>
  );
}
