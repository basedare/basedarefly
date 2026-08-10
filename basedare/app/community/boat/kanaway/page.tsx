import type { Metadata } from 'next';

import KanawayBoatBoardClient from '@/components/community/KanawayBoatBoardClient';

export const metadata: Metadata = {
  title: 'Kanaway Boat Board | BaseDare',
  description: "Find compatible surfers to share a boat to Rock Island, Stimpy's, or Bumee/Bomi.",
};

export default function KanawayBoatBoardPage() {
  return <KanawayBoatBoardClient />;
}
