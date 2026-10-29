import { calculateDistance } from './geo';
import {
  DEFAULT_DISCOVERY,
  readDiscovery,
  type DiscoveryArea,
} from "./discovery-context";

export type MapArea = Pick<DiscoveryArea, "lat" | "lng" | "label" | "timeZone">;
export type MapEntry = MapArea & {
  zoom: number;
  source: "link" | "saved" | "approximate" | "demo";
};
export function hasSavedMapArea(saved: URLSearchParams | null) {
  const point = saved && mapCoordinates(saved.get("lat"), saved.get("lng"));
  return Boolean(
    point &&
      (saved!.get("selected") === "1" ||
        point.lat !== DEFAULT_DISCOVERY.lat ||
        point.lng !== DEFAULT_DISCOVERY.lng)
  );
}

export function mapCoordinates(
  lat: unknown,
  lng: unknown
): { lat: number; lng: number } | null {
  if (
    lat === null ||
    lng === null ||
    lat === undefined ||
    lng === undefined ||
    String(lat).trim() === "" ||
    String(lng).trim() === ""
  )
    return null;
  const a = Number(lat),
    b = Number(lng);
  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    Math.abs(a) > 85.051129 ||
    Math.abs(b) > 180
  )
    return null;
  return { lat: a, lng: b };
}
export function approximateMapArea(headers: {
  get: (key: string) => string | null;
}): MapArea | null {
  const point = mapCoordinates(
    headers.get("x-vercel-ip-latitude"),
    headers.get("x-vercel-ip-longitude")
  );
  const city = headers.get("x-vercel-ip-city");
  if (!point || !city) return null;
  let label = city;
  try {
    label = decodeURIComponent(city);
  } catch {
    /* Keep the supplied city readable. */
  }
  label = label
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim()
    .slice(0, 80);
  if (!label) return null;
  const country = headers.get("x-vercel-ip-country");
  return {
    lat: Math.round(point.lat * 100) / 100,
    lng: Math.round(point.lng * 100) / 100,
    label: country ? `${label}, ${country.slice(0, 2)}` : label,
  };
}
/** A browsing target is never evidence of the visitor's physical location. */
export function mapEntry(
  query: URLSearchParams,
  saved: URLSearchParams | null,
  approximate: MapArea | null
): MapEntry {
  const linked = mapCoordinates(query.get("lat"), query.get("lng"));
  if (linked) {
    const zoom = Number(query.get("zoom"));
    return {
      ...linked,
      label: readDiscovery(query).label,
      ...(readDiscovery(query).timeZone ? { timeZone: readDiscovery(query).timeZone } : {}),
      zoom:
        query.has("zoom") && Number.isFinite(zoom)
          ? Math.min(18, Math.max(2, zoom))
          : 14,
      source: "link",
    };
  }
  const restored = saved && mapCoordinates(saved.get("lat"), saved.get("lng"));
  if (restored && hasSavedMapArea(saved))
    return {
      ...restored,
      label: readDiscovery(saved!).label,
      ...(readDiscovery(saved!).timeZone ? { timeZone: readDiscovery(saved!).timeZone } : {}),
      zoom: 13,
      source: "saved",
    };
  if (approximate && mapCoordinates(approximate.lat, approximate.lng))
    return { ...approximate, zoom: 12, source: "approximate" };
  return {
    lat: DEFAULT_DISCOVERY.lat,
    lng: DEFAULT_DISCOVERY.lng,
    label: DEFAULT_DISCOVERY.label,
    zoom: 14,
    source: "demo",
  };
}

/** Camera rounding within a browsing city must not erase that city’s timezone. */
export function mapViewportArea(lat: number, lng: number, browse: MapArea): MapArea {
  const local = calculateDistance(lat, lng, browse.lat, browse.lng) < 30;
  return { lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000,
    label: local ? browse.label : 'Selected map area', timeZone: local ? browse.timeZone : undefined };
}
