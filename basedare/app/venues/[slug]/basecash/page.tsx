import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { getBaseCashVenueBySlug } from '@/lib/basecash';
import VenuePageShell from '../../VenuePageShell';
import BaseCashVenueCreditClient from './BaseCashVenueCreditClient';

export default async function VenueBaseCashPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const venue = await getBaseCashVenueBySlug(slug);

  if (!venue) {
    notFound();
  }

  return (
    <VenuePageShell mapHref={`/map?place=${encodeURIComponent(venue.slug)}`}>
      <main className="relative mx-auto max-w-6xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/venues/${encodeURIComponent(venue.slug)}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/62 transition hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Venue
          </Link>
          <span className="rounded-full border border-cyan-300/16 bg-cyan-500/[0.07] px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-100/80">
            {venue.city ?? 'Siargao'} pilot
          </span>
        </div>
        <BaseCashVenueCreditClient venue={venue} />
      </main>
    </VenuePageShell>
  );
}
