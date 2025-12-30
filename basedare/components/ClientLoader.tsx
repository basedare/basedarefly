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
        setIsLoading(false);
      }
    }
  }, []);

  const handleComplete = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('protocol-loaded', 'true');
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return <ProtocolLoader onComplete={handleComplete} />;
  }

  return <>{children}</>;
}

