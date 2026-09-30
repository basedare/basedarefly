import type { Metadata } from 'next';
import { Suspense } from 'react';

import RallyComposerClient from '@/components/live-plans/RallyComposerClient';

export const metadata: Metadata = {
  title: 'Start a meetup | BaseDare',
  description: 'Choose a place and time, then invite people to a meetup.',
};

export default function NewRallyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <RallyComposerClient />
    </Suspense>
  );
}
