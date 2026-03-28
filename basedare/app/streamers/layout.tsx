import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BaseDare Creators',
  description: 'Legacy creators route for BaseDare.',
  alternates: {
    canonical: '/creators',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function StreamersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
