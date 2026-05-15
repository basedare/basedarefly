'use client';

import { useEffect, useRef } from 'react';
import { useAccount, useReconnect } from 'wagmi';
import { getClientPerformanceHints, runAfterFirstInteraction, runAfterPageIdle } from '@/lib/client-performance';

const RECONNECT_COOLDOWN_MS = 2500;

function hasRecentConnector() {
  if (typeof window === 'undefined') return false;

  try {
    return Boolean(window.localStorage.getItem('wagmi.recentConnectorId'));
  } catch {
    return false;
  }
}

export default function WalletAutoReconnect() {
  const { isConnected } = useAccount();
  const { reconnect, isPending } = useReconnect();
  const lastAttemptRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const attemptReconnect = () => {
      if (isConnected || isPending || !hasRecentConnector()) return;

      const now = Date.now();
      if (now - lastAttemptRef.current < RECONNECT_COOLDOWN_MS) return;

      lastAttemptRef.current = now;
      reconnect();
    };

    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        attemptReconnect();
      }
    };

    const hints = getClientPerformanceHints();
    const cancelBoot = hints.saveData
      ? runAfterFirstInteraction(attemptReconnect)
      : runAfterPageIdle(attemptReconnect, hints.isMobileViewport ? 4200 : 1600);

    window.addEventListener('focus', attemptReconnect);
    window.addEventListener('pageshow', attemptReconnect);
    window.addEventListener('online', attemptReconnect);
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      cancelBoot();
      window.removeEventListener('focus', attemptReconnect);
      window.removeEventListener('pageshow', attemptReconnect);
      window.removeEventListener('online', attemptReconnect);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [isConnected, isPending, reconnect]);

  return null;
}
