import { notFound } from 'next/navigation';
import { getVenueDetailBySlug } from '@/lib/venues';
import VenueConsoleClient from './venue-console-client';

export default async function VenueConsolePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const venue = await getVenueDetailBySlug(slug);

  if (!venue) {
    notFound();
  }

  return <VenueConsoleClient venue={venue} />;
}
