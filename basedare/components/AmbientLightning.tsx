'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getClientPerformanceHints } from '@/lib/client-performance';
import styles from './AmbientLightning.module.css';

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_AMBIENT_LIGHTNING !== 'false';
const DURATION_MS = 1700;
const DISCOVERY_ROUTES = ['/', '/dashboard', '/now', '/community', '/adventures', '/leaderboard'];
const BOLTS = [
  'M 65 -10 L 101 92 L 76 128 L 131 238 L 94 278 L 159 414 L 124 453 L 166 590 L 142 636 L 198 808',
  'M 176 -10 L 140 116 L 174 150 L 117 254 L 152 305 L 98 422 L 130 469 L 81 584 L 112 632 L 64 808',
];
type Strike = { side: 'left' | 'right'; variant: number; route: string };

/** One brief edge discharge, with no animation or WebGL work between strikes. */
export default function AmbientLightning() {
  const pathname = usePathname();
  const [strike, setStrike] = useState<Strike | null>(null);
  const allowed = DISCOVERY_ROUTES.includes(pathname) || pathname.startsWith('/adventures/');

  useEffect(() => {
    if (!ENABLED || !allowed) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let next: ReturnType<typeof setTimeout> | undefined;
    let end: ReturnType<typeof setTimeout> | undefined;
    let lastInteraction = 0;

    const quiet = () => {
      const hints = getClientPerformanceHints();
      const active = document.activeElement;
      const editing = active instanceof HTMLElement && (active.isContentEditable || active.matches('input, textarea, select'));
      const dialog = Array.from(document.querySelectorAll('[role="dialog"], dialog[open], [aria-modal="true"]'))
        .some((node) => node.getClientRects().length > 0);
      return !motion.matches && !hints.saveData && !hints.slowConnection &&
        document.visibilityState === 'visible' && document.hasFocus() && !editing && !dialog &&
        document.documentElement.dataset.bdBg !== 'light' && Date.now() - lastInteraction > 3000;
    };
    const schedule = (first = false) => {
      clearTimeout(next);
      if (motion.matches || document.visibilityState !== 'visible') return;
      next = setTimeout(() => {
        if (quiet()) {
          setStrike({ side: Math.random() < 0.5 ? 'left' : 'right', variant: Math.random() < 0.5 ? 0 : 1, route: pathname });
          end = setTimeout(() => setStrike(null), DURATION_MS);
        }
        schedule();
      }, first ? 30000 + Math.random() * 20000 : 70000 + Math.random() * 50000);
    };
    const activity = () => {
      lastInteraction = Date.now();
      clearTimeout(end);
      setStrike(null);
    };
    const reset = () => {
      clearTimeout(next); clearTimeout(end);
      setStrike(null);
      schedule(true);
    };
    const pause = () => {
      clearTimeout(next); clearTimeout(end);
      setStrike(null);
    };
    const events = ['pointerdown', 'keydown', 'scroll'] as const;
    events.forEach((event) => window.addEventListener(event, activity, { passive: true }));
    document.addEventListener('visibilitychange', reset);
    window.addEventListener('blur', pause);
    window.addEventListener('focus', reset);
    motion.addEventListener('change', reset);
    schedule(true);
    return () => {
      clearTimeout(next); clearTimeout(end);
      setStrike(null);
      events.forEach((event) => window.removeEventListener(event, activity));
      document.removeEventListener('visibilitychange', reset);
      window.removeEventListener('blur', pause);
      window.removeEventListener('focus', reset);
      motion.removeEventListener('change', reset);
    };
  }, [allowed, pathname]);

  if (!ENABLED || !allowed || !strike || strike.route !== pathname) return null;
  const path = BOLTS[strike.variant];
  return <div aria-hidden="true" className={styles.field} data-ambient-lightning data-side={strike.side}>
    <div className={styles.afterglow} />
    <svg className={styles.bolt} viewBox="0 0 300 800" preserveAspectRatio="none" fill="none">
      <path d={path} stroke="#9557ef" strokeWidth="15" opacity=".12" />
      <path d={path} stroke="#ac79ff" strokeWidth="5" opacity=".4" />
      <path d={path} stroke="#c9b6ff" strokeWidth="1.3" />
      <path d={strike.variant === 0 ? 'M 131 238 L 187 286 L 174 312 L 251 368 M 124 453 L 65 501 L 79 535 L 21 615' : 'M 117 254 L 59 293 L 72 337 L 15 395 M 130 469 L 197 510 L 179 542 L 267 617'} stroke="#ac79ff" strokeWidth="1" opacity=".45" />
    </svg>
  </div>;
}
