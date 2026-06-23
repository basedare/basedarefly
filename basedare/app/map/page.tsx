import Link from 'next/link';
import { Radio } from 'lucide-react';
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
    url: 'https://www.basedare.xyz/map',
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
      {/* Lightweight entry to The Board — the map's living layer (flyers + receipts). */}
      <Link
        href="/board"
        prefetch={false}
        className="fixed bottom-6 left-1/2 z-[35] inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[#f5c518]/30 bg-[#0a0913]/85 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#f8dd72] shadow-[0_12px_34px_rgba(0,0,0,0.55)] backdrop-blur-md transition hover:border-[#f5c518]/55 hover:text-white"
      >
        <Radio className="h-3.5 w-3.5" />
        The Board
      </Link>
    </div>
  );
}
