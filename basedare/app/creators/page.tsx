import type { Metadata } from 'next';
import CreatorsPage from '@/components/creators/PublicCreators';

export const metadata: Metadata = {
  title: 'BaseDare Creators — Paid Missions and Proof Records',
  description:
    'Find live BaseDare missions, submit verified proof, and build a proof record that unlocks better work.',
  openGraph: {
    title: 'BaseDare Creators — Paid Missions and Proof Records',
    description:
      'Find live BaseDare missions, submit verified proof, and build a proof record that unlocks better work.',
    url: 'https://www.basedare.xyz/creators',
    siteName: 'BaseDare',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BaseDare Creators — Paid Missions and Proof Records',
    description:
      'Find live BaseDare missions, submit verified proof, and build a proof record that unlocks better work.',
  },
  alternates: {
    canonical: '/creators',
  },
};

export default function CreatorsRoutePage() {
  return <CreatorsPage />;
}
