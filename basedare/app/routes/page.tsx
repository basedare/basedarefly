import type { Metadata } from 'next';
import Link from 'next/link';

import { listPlayableRoutes } from '@/lib/playable-routes';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Playable routes | BaseDare',
  description: 'Short real-world adventures built from fresh, verified places.',
};

export default async function PlayableRoutesPage() {
  const routes = await listPlayableRoutes();
  return <main className="min-h-screen bg-[radial-gradient(circle_at_12%_5%,rgba(63,223,255,.08),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(159,93,255,.13),transparent_32%),#07070b] px-4 py-16 text-white sm:px-6"><div className="mx-auto max-w-5xl">
    <Link href="/map" className="text-xs font-black uppercase tracking-[0.16em] text-white/45">← Back to map</Link>
    <header className="mt-6 max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#ffe36a]">Playable discovery</p><h1 className="mt-3 text-5xl font-black sm:text-7xl">Choose a route. Enter the island story.</h1><p className="mt-4 text-sm leading-6 text-white/50">Each route contains 3–5 places with fresh accepted memory. Directions get you there; secure venue check-ins write the route receipt.</p></header>
    <section className="mt-10 grid gap-5 md:grid-cols-2">{routes.map((route) => <Link key={route.id} href={`/routes/${route.slug}`} className="group rounded-[30px] border border-white/10 bg-white/[0.035] p-6 transition hover:border-[#ffe36a]/25 hover:bg-[#ffe36a]/[0.04]"><div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">{route.stops.length} stops · {route.mode === 'ORDERED' ? 'in order' : 'free play'}</span><span className="text-white/30 transition group-hover:translate-x-1">→</span></div><h2 className="mt-4 text-2xl font-black">{route.title}</h2><p className="mt-3 text-sm leading-6 text-white/45">{route.description}</p><div className="mt-5 flex flex-wrap gap-2">{route.stops.map((stop) => <span key={stop.id} className="rounded-full border border-white/8 bg-black/30 px-3 py-1 text-[9px] font-bold text-white/45">{stop.venue.name}</span>)}</div></Link>)}</section>
    {!routes.length ? <p className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/45">No route is live yet. BaseDare only publishes a route when every stop has fresh accepted place memory.</p> : null}
  </div></main>;
}
