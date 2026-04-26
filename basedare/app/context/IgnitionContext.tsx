'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { triggerHaptic } from '@/lib/mobile-haptics';

interface IgnitionContextType {
  ignitionActive: boolean;
  triggerIgnition: () => void;
}

const IgnitionContext = createContext<IgnitionContextType>({ 
  ignitionActive: false, 
  triggerIgnition: () => {} 
});

export const IgnitionProvider = ({ children }: { children: React.ReactNode }) => {
  const [ignitionActive, setIgnitionActive] = useState(false);

  const triggerIgnition = useCallback(() => {
    setIgnitionActive(true);
    triggerHaptic('impact');
    
    setTimeout(() => setIgnitionActive(false), 1200);
  }, []);

  return (
    <IgnitionContext.Provider value={{ ignitionActive, triggerIgnition }}>
      {children}
    </IgnitionContext.Provider>
  );
};

export const useIgnition = () => useContext(IgnitionContext);
