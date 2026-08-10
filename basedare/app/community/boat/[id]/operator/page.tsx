import type { Metadata } from 'next';

import BoatOperatorConfirmClient from '@/components/community/BoatOperatorConfirmClient';

export const metadata: Metadata = {
  title: 'Confirm Surf Boat | BaseDare',
  description: 'Confirm final boat details for a BaseDare surf crew.',
  robots: { index: false, follow: false },
};

export default async function BoatOperatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ id }, { token }] = await Promise.all([params, searchParams]);
  return <BoatOperatorConfirmClient crewId={id} token={token ?? ''} />;
}
