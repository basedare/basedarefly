import { getVenueDetailBySlug } from '@/lib/venues';
import { OG_ALT, OG_CONTENT_TYPE, OG_SIZE, renderProofCard } from '@/lib/og-proof-card';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = OG_ALT;
export const runtime = 'nodejs';

// Receipt share card — mirrors the numbers on the recap page so the unfurl
// matches the page (consistency = credibility).
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const venue = await getVenueDetailBySlug(slug);

  if (!venue) {
    return renderProofCard({
      eyebrow: 'VERIFIED HUMAN ACTION',
      title: 'BaseDare',
      stats: [
        { value: '#HumanOnly', label: 'unfakeable' },
        { value: 'Base', label: 'onchain proof' },
        { value: '0', label: 'middlemen' },
      ],
      badge: 'LIVE',
      badgeTone: 'gold',
    });
  }

  const last7 = venue.roiSnapshot.windows.last7Days;
  const checkIns = last7.checkIns || venue.recentCheckIns.length;
  const proofMoments = venue.timelineMoments.filter(
    (moment) => moment.kind === 'DARE_COMPLETION' || Boolean(moment.mediaUrl)
  );
  const proofCount = Math.max(last7.proofs, proofMoments.length);
  const location = [venue.city, venue.country].filter(Boolean).join(' · ');

  return renderProofCard({
    eyebrow: 'PROOF OF PRESENCE',
    title: venue.name,
    location: location || undefined,
    stats: [
      { value: String(proofCount), label: proofCount === 1 ? 'verified proof' : 'verified proofs' },
      { value: String(checkIns), label: checkIns === 1 ? 'check-in' : 'check-ins' },
      { value: '#HumanOnly', label: 'unfakeable' },
    ],
  });
}
