'use client';

import { useLayoutEffect, useState } from 'react';
import ProtocolLoader from './ProtocolLoader';

let hasProtocolLoadedInMemory = false;

export default function ClientLoader({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  useLayoutEffect(() => {
    if (hasProtocolLoadedInMemory || typeof window === 'undefined') {
      if (hasProtocolLoadedInMemory) {
        window.queueMicrotask(() => setIsLoading(false));
      }
      return;
    }

    const hasBeenLoaded = window.sessionStorage.getItem('protocol-loaded') === 'true';
    if (hasBeenLoaded) {
      hasProtocolLoadedInMemory = true;
      window.queueMicrotask(() => setIsLoading(false));
    }
  }, []);

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
