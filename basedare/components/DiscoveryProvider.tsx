"use client";
import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  DEFAULT_DISCOVERY,
  readDiscovery,
  type DiscoveryArea,
} from "@/lib/discovery-context";
import { hasSavedMapArea, mapCoordinates } from "@/lib/map-entry";
const KEY = "basedare:discovery:v1";
const Context = createContext<{
  area: DiscoveryArea;
  ready: boolean;
  hasArea: boolean;
  updateArea: (patch: Partial<DiscoveryArea>) => void;
}>({
  area: DEFAULT_DISCOVERY,
  ready: false,
  hasArea: false,
  updateArea: () => {},
});
function QuerySync({ restore }: { restore: () => void }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(restore, [pathname, search, restore]);
  return null;
}
export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const [area, setArea] = useState(DEFAULT_DISCOVERY);
  const [ready, setReady] = useState(false);
  const [hasArea, setHasArea] = useState(false);
  const updateArea = useCallback((patch: Partial<DiscoveryArea>) => {
    if (patch.lat !== undefined && patch.lng !== undefined) setHasArea(true);
    setArea((previous) => {
      const next = { ...previous, ...patch };
      return JSON.stringify(previous) === JSON.stringify(next)
        ? previous
        : next;
    });
  }, []);
  const restore = useCallback(() => {
    let saved = DEFAULT_DISCOVERY;
    let savedParams: URLSearchParams | null = null;
    try {
      savedParams = new URLSearchParams(sessionStorage.getItem(KEY) ?? "");
      saved = readDiscovery(savedParams);
    } catch {
      /* Optional session memory. */
    }
    const query = new URLSearchParams(window.location.search);
    const next = readDiscovery(query, saved);
    setHasArea(
      Boolean(mapCoordinates(query.get("lat"), query.get("lng"))) ||
        hasSavedMapArea(savedParams)
    );
    setArea((previous) =>
      JSON.stringify(previous) === JSON.stringify(next) ? previous : next
    );
    setReady(true);
  }, []);
  useEffect(() => {
    window.addEventListener("popstate", restore);
    window.addEventListener("basedare:plan-area-updated", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      window.removeEventListener("basedare:plan-area-updated", restore);
    };
  }, [restore]);
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(
        KEY,
        new URLSearchParams({
          lat: String(area.lat),
          lng: String(area.lng),
          areaLabel: area.label,
          selected: hasArea ? "1" : "0",
          radiusKm: String(area.radiusKm),
          mode: area.mode,
          participation: area.participation,
        }).toString()
      );
    } catch {
      /* URL links still carry context. */
    }
  }, [area, hasArea, ready]);
  const value = useMemo(
    () => ({ area, ready, hasArea, updateArea }),
    [area, ready, hasArea, updateArea]
  );
  return (
    <Context.Provider value={value}>
      <Suspense fallback={null}>
        <QuerySync restore={restore} />
      </Suspense>
      {children}
    </Context.Provider>
  );
}
export const useDiscovery = () => useContext(Context);
