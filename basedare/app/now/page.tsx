import type { Metadata } from 'next';

import LivePlansClient from '@/components/live-plans/LivePlansClient';
import { parseParticipationFilter } from '@/lib/participation-filter';
import {
  normalizeWorldPulseCenter,
  normalizeWorldPulseRadius,
  parseWorldPulseMode,
} from '@/lib/world-pulse';

export const metadata: Metadata = {
  title: 'Things to do nearby | BaseDare',
  description: 'Find local plans, start a free adventure or arrange a meetup. See what is happening in your selected area on BaseDare.',
  alternates: { canonical: '/now' },
};

export default async function LivePlansPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string;
    lat?: string;
    lng?: string;
    radiusKm?: string;
    plan?: string;
    needs?: string;
    participation?: string;
  }>;
}) {
  const params = await searchParams;
  const center = normalizeWorldPulseCenter(params.lat, params.lng);
  const selectedPlanId = typeof params.plan === 'string' && params.plan.length <= 160
    ? params.plan
    : null;
  return (
    <LivePlansClient
      initialCenter={center}
      initialMode={parseWorldPulseMode(params.mode)}
      initialRadiusKm={normalizeWorldPulseRadius(params.radiusKm)}
      initialSelectedPlanId={selectedPlanId}
      initialNeedsPeople={params.needs === '1'}
      initialParticipation={parseParticipationFilter(params.participation)}
    />
  );
}
