import RealWorldMapClient from './RealWorldMapClient';
import MapRouteChromeGuard from './MapRouteChromeGuard';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { approximateMapArea } from '@/lib/map-entry';
import MapListEntry from '@/components/maps/MapListEntry';

export const metadata: Metadata = {
  title: 'BaseDare Map — Places, Adventures & Meetups',
  description:
    'Find local places, meetups, shared adventures and available paid dares. Open a place to make a plan or join its venue chat.',
  openGraph: {
    title: 'BaseDare Map — Places, Adventures & Meetups',
    description:
      'Find local places, meetups, shared adventures and available paid dares. Open a place to make a plan or join its venue chat.',
    url: 'https://www.basedare.xyz/map',
    siteName: 'BaseDare',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BaseDare Map — Places, Adventures & Meetups',
    description:
      'Find local places, meetups, shared adventures and available paid dares. Open a place to make a plan or join its venue chat.',
  },
  alternates: {
    canonical: '/map',
  },
};

type MapSearchParams = Promise<Record<string, string | string[] | undefined>>;

const BOARD_LOCATION_PARAMS = [
  'place',
  'meetupId',
  'lat',
  'lng',
  'zoom',
  'bearing',
  'pitch',
  'radiusKm',
] as const;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MapPage({ searchParams }: { searchParams: MapSearchParams }) {
  const params = await searchParams;
  const approximateArea = approximateMapArea(await headers());
  const boardQuery = new URLSearchParams({ source: 'map' });
  for (const key of BOARD_LOCATION_PARAMS) {
    const value = firstParam(params[key]);
    if (value) boardQuery.set(key, value);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#02030a] font-display">
      <MapRouteChromeGuard />
      <RealWorldMapClient approximateArea={approximateArea} />
      {/* The Board is the list view of this map area. Preserve exact-pin context. */}
      <MapListEntry queryString={boardQuery.toString()} />
    </div>
  );
}
