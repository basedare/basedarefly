import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getPlayableRoute } from '@/lib/playable-routes';
import { RoutePlayer } from './RoutePlayer';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const route = await getPlayableRoute(slug);
  return route ? { title: `${route.title} | BaseDare route`, description: route.description } : { title: 'Route unavailable | BaseDare' };
}

export default async function PlayableRoutePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const route = await getPlayableRoute(slug);
  if (!route) notFound();
  return <main className="min-h-screen bg-[radial-gradient(circle_at_12%_5%,rgba(63,223,255,.08),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(159,93,255,.13),transparent_32%),#07070b] px-4 py-16 text-white sm:px-6">
    <div className="mx-auto max-w-4xl">
      <Link href="/map" className="text-xs font-black uppercase tracking-[0.16em] text-white/45">← Back to map</Link>
      <header className="mt-5 rounded-[32px] border border-[#ffe36a]/20 bg-gradient-to-br from-[#251d09]/55 to-[#101018] p-7 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ffe36a]">Playable route · {route.stops.length} stops</p><span className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100">{route.mode === 'ORDERED' ? 'In order' : 'Free play'}</span></div>
        <h1 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">{route.title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">{route.description}</p>
        {route.loreIntro ? <p className="mt-4 rounded-2xl border border-purple-300/15 bg-purple-300/[0.06] p-4 text-sm italic leading-6 text-purple-100/75">{route.loreIntro}</p> : null}
        <RoutePlayer route={{ id: route.id, slug: route.slug, title: route.title, description: route.description, loreIntro: route.loreIntro, mode: route.mode, stops: route.stops.map((stop) => ({ id: stop.id, ordinal: stop.ordinal, loreTitle: stop.loreTitle, loreBody: stop.loreBody, venue: { slug: stop.venue.slug, name: stop.venue.name, address: stop.venue.address, latitude: stop.venue.latitude, longitude: stop.venue.longitude } })) }} />
      </header>
      <p className="mt-5 text-center text-xs leading-5 text-white/35">Directions help you travel; they do not complete a stop. Only a confirmed venue QR + GPS check-in becomes route proof.</p>
    </div>
  </main>;
}
