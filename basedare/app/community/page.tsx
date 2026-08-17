import type { Metadata } from 'next';

import CommunityHubClient from '@/components/community/CommunityHubClient';

export const metadata: Metadata = {
  title: 'Live Plans & Community | BaseDare',
  description: 'Join boats, meetups, venue events, Sparks and Dares—or start a place-bound Rally and fill the crew.',
};

export default function CommunityPage() {
  return <CommunityHubClient />;
}
