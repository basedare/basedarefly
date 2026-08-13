import type { Metadata } from 'next';

import CommunityHubClient from '@/components/community/CommunityHubClient';

export const metadata: Metadata = {
  title: 'Community Around You | BaseDare',
  description: 'Source-checked venue events, meetups, place rooms, and short-lived local asks and offers on the BaseDare map.',
};

export default function CommunityPage() {
  return <CommunityHubClient />;
}
