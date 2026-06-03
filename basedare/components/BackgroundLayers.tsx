'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const HyperspaceBackground = dynamic(() => import('@/components/HyperspaceBackground'), {
  ssr: false,
  loading: () => null, // No loading placeholder - prevents black box overlay
});

const CosmicLayer = dynamic(() => import('@/components/CosmicLayer'), { ssr: false });

const NO_GLOBAL_BACKGROUND_CLASS = 'bd-route-no-global-bg';

function shouldSkipGlobalBackground(pathname: string | null) {
  return (
    pathname === '/map' ||
    pathname?.startsWith('/map/') ||
    pathname === '/first-spark' ||
    pathname === '/scouts/dashboard' ||
    pathname === '/brands/portal'
  );
}

export default function BackgroundLayers() {
  const pathname = usePathname();
  const shouldSkipAnimatedBackground = shouldSkipGlobalBackground(pathname);

  useEffect(() => {
    const targets = [document.documentElement, document.body];

    for (const target of targets) {
      if (shouldSkipAnimatedBackground) {
        target.classList.add(NO_GLOBAL_BACKGROUND_CLASS);
      } else {
        target.classList.remove(NO_GLOBAL_BACKGROUND_CLASS);
      }
    }
  }, [shouldSkipAnimatedBackground]);

  if (shouldSkipAnimatedBackground) return null;

  return (
    <div className="bd-background-root fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <CosmicLayer />
      <HyperspaceBackground />
    </div>
  );
}
