import Link from 'next/link';
import { prisma } from '@/lib/prisma';
export const metadata = { title: 'Find your next move | BaseDare', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default async function UnavailableQr({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const place = typeof query.place === 'string' && /^[a-z0-9-]{1,191}$/.test(query.place) ? await prisma.venue.findFirst({ where: { slug: query.place, status: 'ACTIVE' }, select: { slug: true, name: true } }).catch(() => null) : null;
  const heading = query.reason === 'expired' ? 'This invitation has ended.' : query.reason === 'paused' ? 'This invitation is paused.' : 'This invitation isn’t available right now.';
  return <main className="mx-auto min-h-[70svh] max-w-xl px-5 pb-20 pt-32 text-white"><section className="bd-panel p-6 sm:p-8">
    <p className="text-sm font-bold uppercase tracking-widest text-amber-200">Keep exploring</p><h1 className="mt-4 text-3xl font-black">{heading}</h1>
    <p className="mt-4 leading-7 text-white/65">Plans change. You can still explore nearby places or try a free adventure. You don’t need an account to look around.</p>
    <div className="mt-6 flex flex-wrap gap-3">{place ? <Link className="bd-action min-h-11" href={'/venues/' + encodeURIComponent(place.slug)}>Explore {place.name}</Link> : null}
      <Link className="bd-action min-h-11" href={place ? '/map?place=' + encodeURIComponent(place.slug) : '/map'}>Open the map</Link><Link className="bd-action min-h-11" href={place ? '/adventures?place=' + encodeURIComponent(place.slug) : '/adventures'}>Try something free</Link></div>
  </section></main>;
}
