import type { Metadata } from 'next';
import CreatorsPage from '@/components/creators/PublicCreators';

export const metadata: Metadata = {
  title: 'BaseDare Creators — Local Contributor Directory',
  description:
    'Browse BaseDare contributors by completed work, place activity, and local experience.',
  openGraph: {
    title: 'BaseDare Creators — Local Contributor Directory',
    description:
      'Browse BaseDare contributors by completed work, place activity, and local experience.',
    url: 'https://www.basedare.xyz/creators',
    siteName: 'BaseDare',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BaseDare Creators — Local Contributor Directory',
    description:
      'Browse BaseDare contributors by completed work, place activity, and local experience.',
  },
  alternates: {
    canonical: '/creators',
  },
};

export default function CreatorsRoutePage() {
  return <CreatorsPage />;
}
