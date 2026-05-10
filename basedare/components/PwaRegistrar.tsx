'use client';

import { useEffect } from 'react';

const SW_RELOAD_KEY = 'basedare:sw-controller-reload-at';
const SW_RELOAD_COOLDOWN_MS = 30_000;

export default function PwaRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let shouldReloadOnControllerChange = Boolean(navigator.serviceWorker.controller);

    const handleControllerChange = () => {
      if (!shouldReloadOnControllerChange) {
        shouldReloadOnControllerChange = true;
        return;
      }

      const now = Date.now();
      const lastReload = Number(window.sessionStorage.getItem(SW_RELOAD_KEY) || 0);
      if (Number.isFinite(lastReload) && now - lastReload < SW_RELOAD_COOLDOWN_MS) {
        return;
      }

      window.sessionStorage.setItem(SW_RELOAD_KEY, String(now));
      window.location.reload();
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        const activateWaitingWorker = () => {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        };

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed') {
              activateWaitingWorker();
            }
          });
        });

        if (registration.waiting) {
          activateWaitingWorker();
        }

        registration.update().catch(() => {});
      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    void register();

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return null;
}
