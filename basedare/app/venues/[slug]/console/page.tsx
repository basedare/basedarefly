import { notFound } from 'next/navigation';
import { getVenueDetailBySlug } from '@/lib/venues';
import VenuePageShell from '../../VenuePageShell';
import VenueConsoleClient from './venue-console-client';

export default async function VenueConsolePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const venue = await getVenueDetailBySlug(slug);

  if (!venue) {
    notFound();
  }

  return (
    <VenuePageShell mapHref={`/map?place=${encodeURIComponent(venue.slug)}`}>
      <VenueConsoleClient venue={venue} />
    </VenuePageShell>
  );
}
