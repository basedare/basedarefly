import { getPublicBoatCrew } from '@/lib/surf-boat-board-server';
import {
  BOAT_DESTINATIONS,
  BOAT_TIME_WINDOWS,
  getBoatCrewCountLabel,
  getOptionLabel,
} from '@/lib/surf-boat-board';
import { OG_ALT, OG_CONTENT_TYPE, OG_SIZE, renderProofCard } from '@/lib/og-proof-card';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = OG_ALT;
export const runtime = 'nodejs';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const crew = await getPublicBoatCrew(id).catch(() => null);
  if (!crew) {
    return renderProofCard({
      eyebrow: 'KANAWAY BOAT BOARD',
      title: 'Find a surf crew',
      stats: [
        { value: '4+', label: 'to launch' },
        { value: '3', label: 'reef options' },
        { value: '1 link', label: 'to join' },
      ],
      badge: 'OPEN',
      badgeTone: 'gold',
    });
  }
  return renderProofCard({
    eyebrow: 'SURF BOAT · KANAWAY',
    title: getOptionLabel(BOAT_DESTINATIONS, crew.destination),
    location: getOptionLabel(BOAT_TIME_WINDOWS, crew.timeWindow),
    stats: [
      { value: getBoatCrewCountLabel(crew), label: 'going' },
      { value: `₱${crew.projectedSharePhp}`, label: 'about each' },
      { value: String(crew.boardCount), label: 'boards needed' },
    ],
    badge: crew.status === 'READY' ? 'BOAT READY' : 'JOIN CREW',
    badgeTone: crew.status === 'READY' ? 'emerald' : 'gold',
  });
}
