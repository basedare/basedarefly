'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';

type BackgroundTone = 'dark' | 'light';

interface BackgroundToneContextType {
  tone: BackgroundTone;
  isDarkTone: boolean;
  setTone: (tone: BackgroundTone) => void;
  toggleTone: () => void;
}

const STORAGE_KEY = 'basedare-background-tone';
const DEFAULT_TONE: BackgroundTone = 'dark';

const BackgroundToneContext = createContext<BackgroundToneContextType | undefined>(undefined);
const listeners = new Set<() => void>();

function isBackgroundTone(value: string | null): value is BackgroundTone {
  return value === 'dark' || value === 'light';
}

function applyBackgroundTone(tone: BackgroundTone) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.bdBg = tone;
  document.body.dataset.bdBg = tone;
}

function readStoredTone(): BackgroundTone {
  if (typeof window === 'undefined') return DEFAULT_TONE;

  try {
    const storedTone = window.localStorage.getItem(STORAGE_KEY);
    if (isBackgroundTone(storedTone)) {
      return storedTone;
    }
  } catch {
    // Local storage can be unavailable in private or embedded browsers. Default tone still applies.
  }

  return DEFAULT_TONE;
}

function notifyToneListeners() {
  listeners.forEach((listener) => listener());
}

function subscribeToTone(listener: () => void) {
  listeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener('storage', handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
  };
}

export function BackgroundToneProvider({ children }: { children: ReactNode }) {
  const tone = useSyncExternalStore(subscribeToTone, readStoredTone, () => DEFAULT_TONE);

  useEffect(() => {
    applyBackgroundTone(tone);
  }, [tone]);

  const setTone = useCallback((nextTone: BackgroundTone) => {
    applyBackgroundTone(nextTone);

    try {
      window.localStorage.setItem(STORAGE_KEY, nextTone);
    } catch {
      // Non-critical preference persistence.
    }

    notifyToneListeners();
  }, []);

  const toggleTone = useCallback(() => {
    setTone(tone === 'dark' ? 'light' : 'dark');
  }, [setTone, tone]);

  const value = useMemo(
    () => ({
      tone,
      isDarkTone: tone === 'dark',
      setTone,
      toggleTone,
    }),
    [setTone, toggleTone, tone]
  );

  return (
    <BackgroundToneContext.Provider value={value}>
      {children}
    </BackgroundToneContext.Provider>
  );
}

export function useBackgroundTone() {
  const context = useContext(BackgroundToneContext);
  if (!context) {
    throw new Error('useBackgroundTone must be used within a BackgroundToneProvider');
  }
  return context;
}
