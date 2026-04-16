'use client';

import { useLayoutEffect, useState } from 'react';
import ProtocolLoader from './ProtocolLoader';

let hasProtocolLoadedInMemory = false;

function shouldShowProtocolLoader() {
  if (typeof window === 'undefined') {
    return true;
  }

  if (hasProtocolLoadedInMemory) {
    return false;
  }

  return window.sessionStorage.getItem('protocol-loaded') !== 'true';
}

export default function ClientLoader({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(shouldShowProtocolLoader);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hasBeenLoaded = window.sessionStorage.getItem('protocol-loaded') === 'true';
    if (hasBeenLoaded) {
      hasProtocolLoadedInMemory = true;
      if (isLoading) {
        window.queueMicrotask(() => setIsLoading(false));
      }
    }
  }, [isLoading]);

  const handleComplete = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('protocol-loaded', 'true');
    }
    hasProtocolLoadedInMemory = true;
    setIsLoading(false);
  };

  return (
    <>
      {children}
      {isLoading ? <ProtocolLoader onComplete={handleComplete} variant="fullscreen" /> : null}
    </>
  );
}
