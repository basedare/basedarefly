'use client';
import React, { createContext, useContext, useCallback, useRef, useState } from 'react';
import { triggerHaptic } from '@/lib/mobile-haptics';

interface IgnitionContextType {
  ignitionActive: boolean;
  ignitionId: number;
  triggerIgnition: () => void;
}

const IgnitionContext = createContext<IgnitionContextType>({ 
  ignitionActive: false, 
  ignitionId: 0,
  triggerIgnition: () => {} 
});

export const IgnitionProvider = ({ children }: { children: React.ReactNode }) => {
  const [ignitionActive, setIgnitionActive] = useState(false);
  const [ignitionId, setIgnitionId] = useState(0);
  const ignitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerIgnition = useCallback(() => {
    if (ignitionTimeoutRef.current) {
      clearTimeout(ignitionTimeoutRef.current);
    }

    setIgnitionId((current) => current + 1);
    setIgnitionActive(true);
    triggerHaptic('launch');
    
    ignitionTimeoutRef.current = setTimeout(() => {
      setIgnitionActive(false);
      ignitionTimeoutRef.current = null;
    }, 1350);
  }, []);

  return (
    <IgnitionContext.Provider value={{ ignitionActive, ignitionId, triggerIgnition }}>
      {children}
    </IgnitionContext.Provider>
  );
};

export const useIgnition = () => useContext(IgnitionContext);
