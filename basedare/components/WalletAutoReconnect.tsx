'use client';

import { useEffect, useRef } from 'react';
import { useAccount, useReconnect } from 'wagmi';

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

    const bootId = window.setTimeout(attemptReconnect, 180);

    window.addEventListener('focus', attemptReconnect);
    window.addEventListener('pageshow', attemptReconnect);
    window.addEventListener('online', attemptReconnect);
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      window.clearTimeout(bootId);
      window.removeEventListener('focus', attemptReconnect);
      window.removeEventListener('pageshow', attemptReconnect);
      window.removeEventListener('online', attemptReconnect);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [isConnected, isPending, reconnect]);

  return null;
}
