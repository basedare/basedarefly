import { Suspense } from 'react';
import type { Metadata } from 'next';
import AdventureHub from '@/components/adventures/AdventureHub';
import { ISLAND_TRIAL_ID } from '@/lib/island-trials';
export const metadata: Metadata = {
  title: 'No Beaches Allowed — Island Trial #001 | BaseDare', description: 'Defend Siargao, El Nido or Boracay without showing a beach. A story, photo or optional clip. Free to try, no account required.',
  alternates: { canonical: '/island-trials/no-beaches-allowed' },
  openGraph: { title: 'No Beaches Allowed | BaseDare Island Trials', description: 'Pick your island. Find one moment beyond the shoreline. Dare a friend.', url: '/island-trials/no-beaches-allowed' },
  twitter: { card: 'summary_large_image' },
};
export default function Page() { return <Suspense fallback={<p className="bd-page-top p-6 text-white">Opening your island dare…</p>}><AdventureHub activityId={ISLAND_TRIAL_ID} /></Suspense>; }
