'use client';

import dynamic from 'next/dynamic';

const HyperspaceBackground = dynamic(() => import('@/components/HyperspaceBackground'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-[#060010]" />,
});

const CosmicLayer = dynamic(() => import('@/components/CosmicLayer'), { ssr: false });

export default function BackgroundLayers() {
  return (
    <>
      <CosmicLayer />
      <HyperspaceBackground />
    </>
  );
}

