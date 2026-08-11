import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import BoatCrewShareClient from '@/components/community/BoatCrewShareClient';
import { getPublicBoatCrew } from '@/lib/surf-boat-board-server';
import { BOAT_DESTINATIONS, getBoatCrewSharePath, getOptionLabel } from '@/lib/surf-boat-board';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const crew = await getPublicBoatCrew(id).catch(() => null);
  if (!crew) return { title: 'Surf Boat Crew | BaseDare' };
  const destination = getOptionLabel(BOAT_DESTINATIONS, crew.destination);
  return {
    title: `${destination} Surf Boat · ${crew.confirmedCount} Going | BaseDare`,
    description: `Join a shared surf boat from Kanaway. ${crew.confirmedCount} going, about ₱${crew.projectedSharePhp} each.`,
    alternates: { canonical: getBoatCrewSharePath(crew.id) },
  };
}

export default async function BoatCrewSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const crew = await getPublicBoatCrew(id).catch(() => null);
  if (!crew) notFound();
  return <BoatCrewShareClient initialCrew={crew} />;
}
