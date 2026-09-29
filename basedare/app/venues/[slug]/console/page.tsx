import { notFound } from 'next/navigation';
import { getVenueDetailBySlug } from '@/lib/venues';
import VenuePageShell from '../../VenuePageShell';
import VenueConsoleClient from './venue-console-client';
import { prisma } from '@/lib/prisma';
import { normalizeVenuePerk } from '@/lib/venue-perks';

export default async function VenueConsolePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const venue = await getVenueDetailBySlug(slug);

  if (!venue) {
    notFound();
  }
  const raw = await prisma.venue.findUnique({ where: { slug }, select: { metadataJson: true } });
  const metadata = raw?.metadataJson && typeof raw.metadataJson === 'object' && !Array.isArray(raw.metadataJson) ? raw.metadataJson : {};
  const configuredPerk = normalizeVenuePerk('venuePerk' in metadata ? metadata.venuePerk : null);

  return (
    <VenuePageShell mapHref={`/map?place=${encodeURIComponent(venue.slug)}`}>
      <VenueConsoleClient venue={{ ...venue, activePerk: configuredPerk }} />
    </VenuePageShell>
  );
}
