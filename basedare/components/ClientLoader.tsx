'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import ProtocolLoader from './ProtocolLoader';
import { getClientPerformanceHints, shouldPreferLightweightClient } from '@/lib/client-performance';

let hasProtocolLoadedInMemory = false;
const LOADER_FAILSAFE_MS = 1800;

function shouldShowProtocolLoader() {
  if (typeof window === 'undefined') {
    return true;
  }

  if (hasProtocolLoadedInMemory) {
    return false;
  }

  const hints = getClientPerformanceHints();
  if (hints.isMobileViewport || shouldPreferLightweightClient()) {
    return false;
  }

  return window.sessionStorage.getItem('protocol-loaded') !== 'true';
}

export default function ClientLoader({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('protocol-loaded', 'true');
    }
    hasProtocolLoadedInMemory = true;
    setIsLoading(false);
  }, []);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setIsHydrated(true);

    if (shouldShowProtocolLoader()) {
      setIsLoading(true);
      return;
    }

    window.queueMicrotask(handleComplete);
  }, [handleComplete]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isHydrated || !isLoading) {
      return;
    }

    const timeoutId = window.setTimeout(handleComplete, LOADER_FAILSAFE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [handleComplete, isHydrated, isLoading]);

  const shouldMaskContent = isHydrated && isLoading;

  return (
    <>
      <div
        aria-hidden={shouldMaskContent}
        className={shouldMaskContent ? 'pointer-events-none opacity-0' : 'opacity-100'}
      >
        {children}
      </div>
      {shouldMaskContent ? <ProtocolLoader onComplete={handleComplete} variant="fullscreen" /> : null}
    </>
  );
}
