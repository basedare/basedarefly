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
    <Link
      href={`/board?${query}`}
      prefetch={false}
      className="map-board-entry bd-action bd-action--gold fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-[35] whitespace-nowrap !rounded-full !px-7 !text-xs"
    >
      <List size={16} aria-hidden="true" />
      List view
    </Link>
  );
}
