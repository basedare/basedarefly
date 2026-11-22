"use client";
import Link from "next/link";
import { List } from "lucide-react";
import { useDiscovery } from "@/components/DiscoveryProvider";
import { worldPulseModeQuery } from "@/lib/world-pulse";

export default function MapListEntry({ queryString }: { queryString: string }) {
  const { area, ready, hasArea } = useDiscovery();
  if (!ready || !hasArea) return null;
  const query = new URLSearchParams(queryString);
  Object.entries({
    lat: String(area.lat),
    lng: String(area.lng),
    areaLabel: area.label,
    radiusKm: String(area.radiusKm),
    mode: worldPulseModeQuery(area.mode),
    participation: area.participation,
  }).forEach(([key, value]) => query.set(key, value));
  return (
    <div className="map-board-entry fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-[35] flex max-w-[95vw] -translate-x-1/2 gap-2">
    <Link
      href={`/board?${query}`}
      prefetch={false}
      className="bd-action bd-action--gold whitespace-nowrap !rounded-full !px-4 !text-xs"
    >
      <List size={16} aria-hidden="true" />
      List view
    </Link>
    <Link prefetch={false} href={`/local?${query}`} className="bd-action whitespace-nowrap !rounded-full !px-4 !text-xs">Local network</Link>
    </div>
  );
}
