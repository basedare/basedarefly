import type { Metadata } from 'next';
import { Suspense } from 'react';

import RallyComposerClient from '@/components/live-plans/RallyComposerClient';

export const metadata: Metadata = {
  title: 'Start a Rally | BaseDare',
  description: 'Start a real-world plan, invite people and fill the crew.',
};

export default function NewRallyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <RallyComposerClient />
    </Suspense>
  );
}
