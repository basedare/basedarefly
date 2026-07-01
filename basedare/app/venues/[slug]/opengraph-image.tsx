import { getVenueDetailBySlug } from '@/lib/venues';
import { OG_ALT, OG_CONTENT_TYPE, OG_SIZE, renderProofCard } from '@/lib/og-proof-card';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = OG_ALT;
export const runtime = 'nodejs';

// Venue share card — evergreen brand framing (no zeros), so a fresh venue link
// still unfurls strong before it has any activity.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const venue = await getVenueDetailBySlug(slug);

  if (!venue) {
    return renderProofCard({
      eyebrow: 'VERIFIED HUMAN ACTION',
      title: 'BaseDare',
      stats: [
        { value: '#HumanOnly', label: 'unfakeable' },
        { value: 'QR + GPS', label: 'verified proof' },
        { value: '0', label: 'middlemen' },
      ],
      badge: 'LIVE',
      badgeTone: 'gold',
    });
  }

  const location = [venue.city, venue.country].filter(Boolean).join(' · ');

  return renderProofCard({
    eyebrow: 'PROVE IT HERE',
    title: venue.name,
    location: location || undefined,
    stats: [
      { value: '#HumanOnly', label: 'unfakeable' },
      { value: 'QR + GPS', label: 'verified proof' },
      { value: '0', label: 'middlemen' },
    ],
    badge: 'ON THE MAP',
    badgeTone: 'gold',
  });
}
