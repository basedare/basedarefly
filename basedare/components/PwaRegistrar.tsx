'use client';

import { useEffect } from 'react';
import { getClientPerformanceHints, runAfterFirstInteraction, runAfterPageIdle } from '@/lib/client-performance';

export default function PwaRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let started = false;
    let disposed = false;
    let cancelUpdateCheck = () => {};

    const register = async () => {
      if (started || disposed) return;
      started = true;

      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        // Check for a newer worker quietly. It should activate on the next normal page load,
        // not force a mid-session refresh while the homepage is still settling.
        cancelUpdateCheck = runAfterPageIdle(() => {
          if (!disposed && document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        }, 12_000);
      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    };

    const hints = getClientPerformanceHints();
    const cancelInteraction = runAfterFirstInteraction(() => {
      void register();
    });
    const cancelIdle = hints.saveData
      ? () => {}
      : runAfterPageIdle(() => {
          void register();
        }, hints.isMobileViewport ? 7000 : 3500);

    return () => {
      disposed = true;
      cancelInteraction();
      cancelIdle();
      cancelUpdateCheck();
    };
  }, []);

  return null;
}
