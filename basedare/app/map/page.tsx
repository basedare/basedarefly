import RealWorldMapClient from './RealWorldMapClient';
import MapRouteChromeGuard from './MapRouteChromeGuard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BaseDare Map — Find Live Dares Near You',
  description:
    'Explore the BaseDare map for live IRL missions, active sparks, recent marks, and place memory near you.',
  openGraph: {
    title: 'BaseDare Map — Find Live Dares Near You',
    description:
      'Explore the BaseDare map for live IRL missions, active sparks, recent marks, and place memory near you.',
    url: 'https://basedare.xyz/map',
    siteName: 'BaseDare',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BaseDare Map — Find Live Dares Near You',
    description:
      'Explore the BaseDare map for live IRL missions, active sparks, recent marks, and place memory near you.',
  },
  alternates: {
    canonical: '/map',
  },
};

export default function MapPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#02030a] font-display">
      <MapRouteChromeGuard />
      <RealWorldMapClient />
    </div>
  );
}
