import type { Metadata } from 'next';
import { getVenueDetailBySlug } from '@/lib/venues';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenueDetailBySlug(slug);

  if (!venue) {
    return {
      title: 'BaseDare Venue',
      description: 'Explore live BaseDare venue activity, marks, and active challenges.',
    };
  }

  const title = `${venue.name} — BaseDare Venue | Active Dares`;
  const location = [venue.city, venue.country].filter(Boolean).join(', ');
  const activeCount = venue.activeDares.length;
  const description = venue.description
    ? `${venue.description} Explore ${activeCount} active dare${activeCount === 1 ? '' : 's'}${location ? ` at ${location}` : ''}.`
    : `${venue.name}${location ? ` in ${location}` : ''} is on the BaseDare grid with ${activeCount} active dare${activeCount === 1 ? '' : 's'}, place memory, and on-chain proof.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://basedare.xyz/venues/${slug}`,
      siteName: 'BaseDare',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `/venues/${slug}`,
    },
  };
}

export default function VenueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
