'use client';
import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { DEFAULT_DISCOVERY, readDiscovery, type DiscoveryArea } from '@/lib/discovery-context';
const KEY = 'basedare:discovery:v1';
const Context = createContext<{ area: DiscoveryArea; ready: boolean; updateArea: (patch: Partial<DiscoveryArea>) => void }>({ area: DEFAULT_DISCOVERY, ready: false, updateArea: () => {} });
function QuerySync({ restore }: { restore: () => void }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(restore, [pathname, search, restore]);
  return null;
}
export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const [area, setArea] = useState(DEFAULT_DISCOVERY);
  const [ready, setReady] = useState(false);
  const updateArea = useCallback((patch: Partial<DiscoveryArea>) => setArea(previous => {
    const next = { ...previous, ...patch };
    return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
  }), []);
  const restore = useCallback(() => {
      let saved = DEFAULT_DISCOVERY;
      try { saved = readDiscovery(new URLSearchParams(sessionStorage.getItem(KEY) ?? '')); } catch { /* Optional session memory. */ }
      const next = readDiscovery(new URLSearchParams(window.location.search), saved);
      setArea(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      setReady(true);
  }, []);
  useEffect(() => {
    window.addEventListener('popstate', restore);
    window.addEventListener('basedare:plan-area-updated', restore);
    return () => { window.removeEventListener('popstate', restore); window.removeEventListener('basedare:plan-area-updated', restore); };
  }, [restore]);
  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(KEY, new URLSearchParams({ lat: String(area.lat), lng: String(area.lng), radiusKm: String(area.radiusKm), mode: area.mode, participation: area.participation }).toString()); } catch { /* URL links still carry context. */ }
  }, [area, ready]);
  const value = useMemo(() => ({ area, ready, updateArea }), [area, ready, updateArea]);
  return <Context.Provider value={value}><Suspense fallback={null}><QuerySync restore={restore} /></Suspense>{children}</Context.Provider>;
}
export const useDiscovery = () => useContext(Context);
