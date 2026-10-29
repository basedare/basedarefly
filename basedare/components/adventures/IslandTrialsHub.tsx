'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { useDiscovery } from '@/components/DiscoveryProvider';
import { useRecommendationClock } from '@/hooks/useRecommendationClock';
import AdventureCard from './AdventureCard';
import FeaturedSiargaoChallenge from './FeaturedSiargaoChallenge';
import { ISLAND_TRIAL_ID, NO_BEACHES_TRIAL } from '@/lib/island-trials';

const SharedAdventures = dynamic(() => import('./SharedAdventures'), { loading: () => <p role="status" className="mt-4 text-white/65">Opening reviewed island stories…</p> });
export default function IslandTrialsHub() {
  const { area, ready } = useDiscovery();
  const now = useRecommendationClock();
  const [showStories, setShowStories] = useState(false);
  return <main className="bd-page-top relative min-h-screen px-4 pb-32 text-white sm:px-6"><div className="mx-auto max-w-3xl">
    <Link href="/adventures" className="inline-flex min-h-11 items-center text-sm font-bold text-cyan-100">← Free adventures</Link>
    <p className="mt-5 text-sm font-bold text-violet-200">BaseDare Island Trials</p>
    <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Stop voting.<br /><span className="text-amber-200">Start proving.</span></h1>
    <p className="mt-4 max-w-xl text-lg leading-8 text-white/75">Think your island is the best? Show us why. Tiny adventures, big local pride. Choose a side and find something worth sharing.</p>
    <div className="mt-7"><AdventureCard activity={NO_BEACHES_TRIAL} href="/island-trials/no-beaches-allowed" featured /></div>
    <section className="bd-well mt-5 p-5" aria-label="How Island Trials works"><h2 className="text-xl font-black">Pick. Explore. Defend.</h2><ol className="mt-3 space-y-3 text-base leading-7 text-white/75"><li>1. Pick an island and accept the free dare.</li><li>2. Find your moment. A few words count just as much as a clip.</li><li>3. Keep your result or dare a friend to defend their own island.</li></ol><p className="mt-4 text-sm leading-6 text-white/60">No account or public post needed. Your own attempt isn’t a verified visit, competition win or cash reward.</p></section>
    {ready ? <div className="mt-5"><FeaturedSiargaoChallenge area={area} now={now} /></div> : null}
    <section className="mt-8"><h2 className="text-2xl font-black">The island’s best storytellers? You.</h2><p className="mt-3 text-base leading-7 text-white/65">Little discoveries, local stories and original clips. Shared with permission and reviewed before they appear here.</p><button type="button" className="bd-action mt-4 !text-sm" aria-expanded={showStories} onClick={() => setShowStories((value) => !value)}>{showStories ? 'Hide community stories' : 'See reviewed island stories'}</button>{showStories ? <SharedAdventures activityId={ISLAND_TRIAL_ID} /> : null}</section>
    <div className="bd-card mt-7 p-5"><h2 className="text-xl font-black">Want to start the next island story?</h2><p className="mt-2 text-base leading-7 text-white/65">Creators can propose a trial. Businesses can ask about supporting one. We’ll agree the scope together; applying doesn’t book work or grant content rights.</p><div className="mt-3 flex flex-wrap gap-3"><Link href="/creators" className="bd-action !text-sm">Creator opportunities →</Link><Link href="/activations?missionType=activity-brief&goal=other&budgetRange=discuss&packageId=pilot-drop&source=island-trials" className="bd-action !text-sm">Explore a business collaboration →</Link></div></div>
  </div></main>;
}
