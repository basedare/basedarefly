import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BaseDare Truth Protocol — Community Verification',
  description:
    'Review proof, feed referee signal, and help route valid BaseDare completions toward settlement.',
  openGraph: {
    title: 'BaseDare Truth Protocol — Community Verification',
    description:
      'Review proof, feed referee signal, and help route valid BaseDare completions toward settlement.',
    url: 'https://basedare.xyz/verify',
    siteName: 'BaseDare',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BaseDare Truth Protocol — Community Verification',
    description:
      'Review proof, feed referee signal, and help route valid BaseDare completions toward settlement.',
  },
  alternates: {
    canonical: '/verify',
  },
};

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
