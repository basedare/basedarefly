'use client';

import { useCallback, useEffect, useRef } from 'react';

// Slot-reel filter bar for mobile: options scroll horizontally with snap, the
// active one sits magnified in a gold "lens" window at center, and every
// detent ticks (haptic via onTick). Desktop keeps the flat chip row.
export type ReelOption = { value: string; label: string };

export default function LayerReelBar({
  options,
  value,
  onChange,
  onTick,
  ariaLabel = 'Map layer filter',
}: {
  options: ReelOption[];
  value: string;
  onChange: (value: string) => void;
  onTick?: () => void;
  ariaLabel?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const suppressSettleRef = useRef(false);

  const centerItem = useCallback((index: number, smooth: boolean) => {
    const scroller = scrollerRef.current;
    const item = scroller?.children[index] as HTMLElement | undefined;
    if (!scroller || !item) return;
    suppressSettleRef.current = true;
    scroller.scrollTo({
      left: item.offsetLeft - (scroller.clientWidth - item.clientWidth) / 2,
      behavior: smooth ? 'smooth' : ('instant' as ScrollBehavior),
    });
    window.setTimeout(() => {
      suppressSettleRef.current = false;
    }, smooth ? 320 : 40);
  }, []);

  // Keep the active option centered when value changes externally (or on mount).
  useEffect(() => {
    const index = options.findIndex((option) => option.value === value);
    if (index >= 0) centerItem(index, false);
  }, [value, options, centerItem]);

  // After a swipe settles, whichever option sits under the lens becomes active.
  const handleScroll = useCallback(() => {
    if (suppressSettleRef.current) return;
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const center = scroller.scrollLeft + scroller.clientWidth / 2;
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      Array.from(scroller.children).forEach((child, index) => {
        const element = child as HTMLElement;
        const mid = element.offsetLeft + element.clientWidth / 2;
        const distance = Math.abs(mid - center);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      const next = options[bestIndex];
      if (next && next.value !== value) {
        onTick?.();
        onChange(next.value);
      }
    }, 110);
  }, [options, value, onChange, onTick]);

  useEffect(() => {
    return () => {
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    };
  }, []);

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="relative w-[min(21rem,calc(100vw-5.5rem))] overflow-hidden rounded-full border border-white/12 bg-black/60 shadow-[0_10px_28px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl"
    >
      {/* the lens: fixed center window the reel snaps into */}
      <div className="pointer-events-none absolute inset-y-1 left-1/2 z-[2] w-[46%] -translate-x-1/2 rounded-full border border-[#f5c518]/45 bg-[#f5c518]/[0.07] shadow-[0_0_14px_rgba(245,197,24,0.18),inset_0_1px_0_rgba(255,255,255,0.14)]" />
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="scrollbar-hide relative z-[1] flex snap-x snap-mandatory overflow-x-auto px-[27%] py-2 [mask-image:linear-gradient(90deg,transparent,black_16%,black_84%,transparent)]"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                if (active) return;
                onTick?.();
                onChange(option.value);
              }}
              className={`shrink-0 snap-center whitespace-nowrap px-4 text-[10px] font-black uppercase tracking-[0.16em] transition-all duration-200 ${
                active ? 'scale-110 text-[#f8dd72]' : 'scale-95 text-white/45'
              }`}
            >
              <span key={active ? `on-${option.value}` : `off-${option.value}`} className={active ? 'bd-reel-tick block' : 'block'}>
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
      <style>{`
        @keyframes bdReelTick {
          0% { transform: translateY(0.55em); opacity: 0.2; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .bd-reel-tick { animation: bdReelTick 220ms cubic-bezier(0.22, 1, 0.36, 1); }
      `}</style>
    </div>
  );
}
