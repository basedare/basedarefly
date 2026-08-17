import type { Metadata } from 'next';

import LivePlansClient from '@/components/live-plans/LivePlansClient';

export const metadata: Metadata = {
  title: 'Live Plans Near You | BaseDare',
  description: 'See what is happening, join in, fill a crew and go together on the BaseDare live map.',
  alternates: { canonical: '/now' },
};

export default function LivePlansPage() {
  return <LivePlansClient />;
}
