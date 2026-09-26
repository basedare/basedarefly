'use client';

import { useRef, useState, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { triggerHaptic } from '@/lib/mobile-haptics';

/** Keep the existing swipe-and-detent experience; desktop remains a card grid. */
export default function ActivityRail({ children, count }: { children: ReactNode; count: number }) {
  const rail = useRef<HTMLDivElement>(null);
  const settled = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [index, setIndex] = useState(0);
  const measure = () => {
    const node = rail.current;
    if (!node) return;
    const cards = Array.from(node.children) as HTMLElement[];
    const first = cards[0]?.offsetLeft ?? 0;
    let closest = 0;
    cards.forEach((card, i) => {
      if (Math.abs(card.offsetLeft - first - node.scrollLeft) < Math.abs(cards[closest].offsetLeft - first - node.scrollLeft)) closest = i;
    });
    setIndex(closest);
    if (settled.current !== closest) triggerHaptic('selection');
    settled.current = closest;
  };
  return <>
    <div className="live-around-mobile__rail-shell" data-has-next={index < count - 1}>
      <div ref={(node) => {
        rail.current = node;
        if (!node && timer.current) clearTimeout(timer.current);
      }} className="home-activity-rail live-around-mobile__rail grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        onScroll={() => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(measure, 100);
        }}>
        {children}
      </div>
      <button aria-label="Next activity" disabled={index >= count - 1} className="live-around-mobile__next md:hidden" onClick={() => {
        const node = rail.current;
        const card = node?.children[index + 1] as HTMLElement | undefined;
        if (node && card) node.scrollTo({ left: card.offsetLeft - (node.children[0] as HTMLElement).offsetLeft, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      }}><ArrowRight size={16} /></button>
    </div>
    <p className="mt-2 text-xs text-white/45 md:hidden" aria-live="polite">{index + 1} / {count} · Swipe for more</p>
  </>;
}
