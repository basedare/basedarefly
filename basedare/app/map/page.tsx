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
        className="fixed bottom-6 left-1/2 z-[35] inline-flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-[#f5c518]/40 bg-[linear-gradient(180deg,rgba(245,197,24,0.16)_0%,rgba(10,9,19,0.92)_58%,rgba(6,5,12,0.96)_100%)] px-7 py-3.5 text-xs font-black uppercase tracking-[0.22em] text-[#f8dd72] shadow-[0_18px_44px_rgba(0,0,0,0.6),0_0_24px_rgba(245,197,24,0.14),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#f5c518]/70 hover:text-white"
      >
        <Radio className="h-4 w-4" />
        The Board
      </Link>
    </div>
  );
}
