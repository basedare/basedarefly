'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const HyperspaceBackground = dynamic(() => import('@/components/HyperspaceBackground'), {
  ssr: false,
  loading: () => null, // No loading placeholder - prevents black box overlay
});

const CosmicLayer = dynamic(() => import('@/components/CosmicLayer'), { ssr: false });

export default function BackgroundLayers() {
  const pathname = usePathname();
  const shouldSkipAnimatedBackground =
    pathname === '/map' ||
    pathname?.startsWith('/map/') ||
    pathname === '/first-spark' ||
    pathname === '/scouts/dashboard' ||
    pathname === '/brands/portal';

  if (shouldSkipAnimatedBackground) return null;

  return (
    <div className="bd-background-root fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <CosmicLayer />
      <HyperspaceBackground />
    </div>
  );
}
