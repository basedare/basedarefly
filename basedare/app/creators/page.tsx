import type { Metadata } from 'next';
import CreatorsPage from '@/app/streamers/page';

export const metadata: Metadata = {
  title: 'BaseDare Creators — Get Paid for IRL and Online Dares',
  description:
    'Claim your tag, verify your identity, and earn from BaseDare completions across IRL missions and online dares.',
  openGraph: {
    title: 'BaseDare Creators — Get Paid for IRL and Online Dares',
    description:
      'Claim your tag, verify your identity, and earn from BaseDare completions across IRL missions and online dares.',
    url: 'https://basedare.xyz/creators',
    siteName: 'BaseDare',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BaseDare Creators — Get Paid for IRL and Online Dares',
    description:
      'Claim your tag, verify your identity, and earn from BaseDare completions across IRL missions and online dares.',
  },
  alternates: {
    canonical: '/creators',
  },
};

export default function CreatorsRoutePage() {
  return <CreatorsPage />;
}
