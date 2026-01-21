'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

type ViewMode = 'FAN' | 'BUSINESS';

interface ViewContextType {
  view: ViewMode;
  setView: (view: ViewMode) => void;
  isControlMode: boolean;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

// Routes that are always Control mode (B2B pages)
const CONTROL_MODE_ROUTES = ['/brands/portal', '/scouts/dashboard'];

export function ViewProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [view, setView] = useState<ViewMode>('FAN');

  // Auto-detect Control mode from route
  const isControlRoute = CONTROL_MODE_ROUTES.some(route => pathname?.startsWith(route));

  // Control mode is active if either:
  // 1. User toggled to BUSINESS view
  // 2. User is on a Control mode route
  const isControlMode = view === 'BUSINESS' || isControlRoute;

  return (
    <ViewContext.Provider value={{ view, setView, isControlMode }}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
}
