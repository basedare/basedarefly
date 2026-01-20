'use client';

import dynamic from 'next/dynamic';

const HyperspaceBackground = dynamic(() => import('@/components/HyperspaceBackground'), {
  ssr: false,
  loading: () => null, // No loading placeholder - prevents black box overlay
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

