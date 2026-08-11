import type { Metadata } from 'next';
import { Suspense } from 'react';

import KanawayBoatBoardClient from '@/components/community/KanawayBoatBoardClient';

export const metadata: Metadata = {
  title: 'Siargao Boat Board | BaseDare',
  description: "Find compatible surfers to share a boat from Kanaway or to Cemetery from Siargao Beach Club.",
};

export default function KanawayBoatBoardPage() {
  return (
    <Suspense fallback={null}>
      <KanawayBoatBoardClient />
    </Suspense>
  );
}
