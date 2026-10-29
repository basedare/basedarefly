import { Suspense } from 'react';
import type { Metadata } from 'next';
import IslandTrialsHub from '@/components/adventures/IslandTrialsHub';
export const metadata: Metadata = {
  title: 'Island Trials | BaseDare', description: 'Think your island is the best? Show us why. Pick an island, try a free adventure and dare a friend.',
  alternates: { canonical: '/island-trials' },
  openGraph: { title: 'Stop voting. Start proving. | BaseDare Island Trials', description: 'Siargao, El Nido or Boracay? No Beaches Allowed. Try the first free Island Trial.', url: '/island-trials' },
  twitter: { card: 'summary_large_image' },
};
export default function Page() { return <Suspense fallback={<p className="bd-page-top p-6 text-white">Opening Island Trials…</p>}><IslandTrialsHub /></Suspense>; }
