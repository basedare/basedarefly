'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import ProtocolLoader from './ProtocolLoader';
import { bypassDecorativeLoader } from '@/lib/mobile-surface-policy';

let hasProtocolLoadedInMemory = false;
const LOADER_FAILSAFE_MS = 2000;

function shouldShowProtocolLoader() {
  if (typeof window === 'undefined') {
    return true;
  }

  if (hasProtocolLoadedInMemory) {
    return false;
  }

  // The loader is lightweight CSS (no WebGL), so run it on mobile too — it was
  // previously gated to desktop, so phones only ever saw the suspense fallback.
  // It also masks the mobile hydration jank. Reduced-motion opts out.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }

  try { return window.sessionStorage.getItem('protocol-loaded') !== 'true'; }
  catch { return false; }
}

export default function ClientLoader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The original signal-lock effect remains available for a deliberate legacy
  // experience, but must never block the default Dare Loop front door.
  const isImmediateEntry = process.env.NEXT_PUBLIC_ENABLE_PROTOCOL_LOADER !== 'true' || pathname === '/' || ['/map', '/earn', '/dare', '/create', '/dashboard'].some(route => pathname === route || pathname?.startsWith(`${route}/`)) || bypassDecorativeLoader(pathname);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = useCallback(() => {
    if (typeof window !== 'undefined') {
      try { window.sessionStorage.setItem('protocol-loaded', 'true'); } catch { /* Memory keeps this visit usable. */ }
    }
    hasProtocolLoadedInMemory = true;
    setIsLoading(false);
  }, []);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setIsHydrated(true);
      if (isImmediateEntry) { setIsLoading(false); return; }

      if (shouldShowProtocolLoader()) {
        setIsLoading(true);
        return;
      }

      window.queueMicrotask(handleComplete);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [handleComplete, isImmediateEntry]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isHydrated || !isLoading) {
      return;
    }

    const timeoutId = window.setTimeout(handleComplete, LOADER_FAILSAFE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [handleComplete, isHydrated, isLoading]);

  const shouldMaskContent = !isImmediateEntry && isHydrated && isLoading;

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
