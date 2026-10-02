'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getClientPerformanceHints } from '@/lib/client-performance';
import styles from './AmbientLightning.module.css';
import Lightning from './Lightning';

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_AMBIENT_LIGHTNING !== 'false';
const DURATION_MS = 2400;
const DISCOVERY_ROUTES = ['/', '/dashboard', '/now', '/community', '/adventures', '/leaderboard'];
type Strike = { side: 'left' | 'right'; variant: number; route: string };

/** One short shader burst; no mounted canvas or WebGL work between strikes. */
export default function AmbientLightning() {
  const pathname = usePathname();
  const [strike, setStrike] = useState<Strike | null>(null);
  // Keep the appointment across discovery routes instead of restarting on every visit.
  const dueAt = useRef<number | null>(null);
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
      return !motion.matches && !hints.isLowMemory && !document.documentElement.hasAttribute('data-bd-effects-over-budget') && !hints.saveData && !hints.slowConnection &&
        document.visibilityState === 'visible' && document.hasFocus() && !editing && !dialog &&
        document.documentElement.dataset.bdBg !== 'light' && Date.now() - lastInteraction > 3000;
    };
    const schedule = () => {
      clearTimeout(next);
      if (motion.matches || document.visibilityState !== 'visible') return;
      if (dueAt.current === null) dueAt.current = Date.now() + 14000 + Math.random() * 8000;
      next = setTimeout(() => {
        if (quiet()) {
          setStrike({ side: Math.random() < 0.5 ? 'left' : 'right', variant: Math.random() < 0.5 ? 0 : 1, route: pathname });
          end = setTimeout(() => setStrike(null), DURATION_MS);
          dueAt.current = Date.now() + 75000 + Math.random() * 45000;
        }
        // A busy page defers the due strike until quiet; it does not lose an entire cycle.
        schedule();
      }, Math.max(1500, dueAt.current - Date.now()));
    };
    const activity = () => {
      lastInteraction = Date.now();
      clearTimeout(end);
      setStrike(null);
    };
    const reset = () => {
      clearTimeout(next); clearTimeout(end);
      setStrike(null);
      schedule();
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
    schedule();
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
  return <div aria-hidden="true" className={styles.field} data-ambient-lightning data-side={strike.side}>
    <Lightning hue={strike.variant === 0 ? 265 : 225} speed={0.65} intensity={0.85} size={1.1} />
  </div>;
}
