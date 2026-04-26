'use client';

import dynamic from 'next/dynamic';

const HyperspaceBackground = dynamic(() => import('@/components/HyperspaceBackground'), {
  ssr: false,
  loading: () => null, // No loading placeholder - prevents black box overlay
});

const CosmicLayer = dynamic(() => import('@/components/CosmicLayer'), { ssr: false });

export default function BackgroundLayers() {
  return (
    <div className="bd-background-root fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <CosmicLayer />
      <HyperspaceBackground />
    </div>
  );
}
