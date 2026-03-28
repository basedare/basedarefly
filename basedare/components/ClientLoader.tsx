'use client';

import { useState, useEffect } from 'react';
import ProtocolLoader from './ProtocolLoader';

export default function ClientLoader({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if loader has already run (stored in sessionStorage)
    // Only check on client side
    if (typeof window !== 'undefined') {
      const hasBeenLoaded = sessionStorage.getItem('protocol-loaded');
      if (hasBeenLoaded === 'true') {
        const timeoutId = window.setTimeout(() => setIsLoading(false), 0);
        return () => window.clearTimeout(timeoutId);
      }
    }
  }, []);

  const handleComplete = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('protocol-loaded', 'true');
    }
    setIsLoading(false);
  };

  return (
    <>
      {children}
      {isLoading ? <ProtocolLoader onComplete={handleComplete} variant="overlay" /> : null}
    </>
  );
}
