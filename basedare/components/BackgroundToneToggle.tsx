'use client';

import { Moon, Sun } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { useBackgroundTone } from '@/app/context/BackgroundToneContext';

const HIDDEN_ROUTES = ['/'];

function isHiddenRoute(pathname: string | null) {
  return HIDDEN_ROUTES.some((route) => pathname === route);
}

export default function BackgroundToneToggle() {
  const pathname = usePathname();
  const { isDarkTone, toggleTone } = useBackgroundTone();

  if (isHiddenRoute(pathname)) {
    return null;
  }

  const Icon = isDarkTone ? Moon : Sun;

  return (
    <div className="hidden md:block fixed top-24 right-6 z-[90]">
      <button
        type="button"
        onClick={toggleTone}
        aria-label={isDarkTone ? 'Switch background to light mode' : 'Switch background to dark mode'}
        aria-pressed={isDarkTone}
        title={isDarkTone ? 'Lighten background' : 'Darken background'}
        className={`group relative flex h-10 w-10 items-center justify-center rounded-full border text-white transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50 ${
          isDarkTone
            ? 'border-white/10 bg-[linear-gradient(145deg,rgba(4,5,12,0.94),rgba(12,12,22,0.9))] shadow-[inset_7px_7px_14px_rgba(0,0,0,0.72),inset_-4px_-4px_10px_rgba(255,255,255,0.035),0_1px_0_rgba(255,255,255,0.04)]'
            : 'border-yellow-200/24 bg-[linear-gradient(145deg,rgba(255,255,255,0.16),rgba(245,197,24,0.08)_34%,rgba(6,7,13,0.82))] shadow-[0_12px_28px_rgba(0,0,0,0.34),0_0_24px_rgba(245,197,24,0.14),inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-10px_16px_rgba(0,0,0,0.34)] hover:-translate-y-[1px]'
        }`}
      >
        <span
          className={`absolute inset-[5px] rounded-full transition-all duration-300 ${
            isDarkTone
              ? 'bg-black/26 shadow-[inset_4px_5px_9px_rgba(0,0,0,0.7)]'
              : 'bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]'
          }`}
          aria-hidden="true"
        />
        <Icon
          className={`relative h-4 w-4 transition-all duration-300 ${
            isDarkTone
              ? 'text-cyan-100/76 drop-shadow-[0_0_8px_rgba(34,211,238,0.22)]'
              : 'text-yellow-100 drop-shadow-[0_0_10px_rgba(245,197,24,0.34)]'
          }`}
        />
      </button>
    </div>
  );
}
