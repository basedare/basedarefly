'use client';
import Link from 'next/link';
export default function LoadError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-xl px-5 py-12 text-white"><section className="rounded-[28px] border border-white/10 bg-black/30 p-6"><h1 className="text-2xl font-black">We couldn’t load this event.</h1><p className="mt-3 text-white/65">Please try again. Your saved work hasn’t changed.</p><div className="mt-5 flex flex-wrap gap-3"><button className="bd-action bd-action--gold" onClick={reset}>Try again</button><Link className="bd-action" href="/events">Browse events</Link></div></section></main>;
}
