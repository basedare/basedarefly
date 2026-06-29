import type { Metadata } from 'next';
import MarketsSection from '@/components/home/MarketsSection';

export const metadata: Metadata = {
  title: 'Markets — BaseDare',
  description:
    'Where BaseDare missions happen, city by city. Siargao is the live founding market; Bali, Manila, and Sydney are scouting. Creators earn and venues launch local missions.',
  openGraph: {
    title: 'BaseDare Markets — Choose your scene',
    description:
      'Creators earn and venues launch missions, city by city. Siargao live now; more cities scouting.',
    url: 'https://www.basedare.xyz/markets',
    siteName: 'BaseDare',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BaseDare Markets — Choose your scene',
    description: 'Creators earn and venues launch missions, city by city. Siargao live now.',
  },
  alternates: { canonical: '/markets' },
};

export default function MarketsRoutePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030305] pb-10 pt-24 text-white">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_1px_1px,rgba(185,127,255,0.1)_1px,transparent_0)] [background-size:112px_112px]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_14%_8%,rgba(255,213,74,0.1),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(154,82,255,0.14),transparent_30%),linear-gradient(180deg,#05040a_0%,#07020f_48%,#000_100%)]" />
      <div className="relative z-10">
        <MarketsSection />
      </div>
    </main>
  );
}
