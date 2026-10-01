"use client";
import { useEffect, useState, type RefObject } from "react";
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import type { AdventurePost } from "@/lib/adventure-sharing";
export function useSharedAdventureMap(
  mapRef: RefObject<MapLibreMap | null>,
  ready: boolean,
  enabled: boolean,
) {
  const [count, setCount] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !enabled) {
      setCount(0);
      return;
    }
    let markers: maplibregl.Marker[] = [];
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout>;
    let disposed = false;
    const load = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        controller?.abort();
        const requestController = new AbortController();
        controller = requestController;
        try {
          const center = map.getCenter();
          const r = await fetch(
            `/api/adventure-submissions?lat=${center.lat}&lng=${center.lng}&radiusKm=40`,
            { signal: requestController.signal, cache: "no-store" },
          );
          const b = await r.json();
          if (!r.ok) throw Error();
          if (disposed || requestController.signal.aborted) return;
          markers.forEach((m) => m.remove());
          markers = [];
          const seen = new Set<string>();
          for (const post of b.data as AdventurePost[]) {
            if (seen.has(post.venue.slug)) continue;
            seen.add(post.venue.slug);
            const el = document.createElement("button");
            el.type = "button";
            el.textContent = "B";
            el.title = "Shared adventures · " + post.venue.name;
            el.setAttribute("aria-label", el.title);
            Object.assign(el.style, {
              width: "38px",
              height: "38px",
              borderRadius: "50% 50% 50% 8px",
              border: "2px solid #e9bdff",
              background: "linear-gradient(145deg,#8637bf,#22103f)",
              color: "#ffe76b",
              fontWeight: "900",
              fontSize: "23px",
              boxShadow: "0 3px 12px #000a, inset 0 2px 4px #ffffff55",
              cursor: "pointer",
            });
            el.onclick = (e) => {
              e.stopPropagation();
              window.location.assign(
                "/adventures?place=" +
                  encodeURIComponent(post.venue.slug) +
                  "&shared=public",
              );
            };
            markers.push(
              new maplibregl.Marker({
                element: el,
                anchor: "bottom",
                offset: [22, -20],
              })
                .setLngLat([post.venue.longitude, post.venue.latitude])
                .addTo(map),
            );
          }
          setCount(seen.size);
          setFailed(false);
        } catch {
          if (!requestController.signal.aborted && !disposed) {
            markers.forEach((m) => m.remove());
            markers = [];
            setCount(0);
            setFailed(true);
          }
        }
      }, 350);
    };
    map.on("moveend", load);
    window.addEventListener("focus", load);
    load();
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
      map.off("moveend", load);
      window.removeEventListener("focus", load);
      markers.forEach((m) => m.remove());
    };
  }, [mapRef, ready, enabled]);
  return { count, failed };
}
