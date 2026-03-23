import type { ReactNode } from 'react';
import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import BackToMapButton from './BackToMapButton';

export default function VenuePageShell({
  children,
  mapHref = '/map',
}: {
  children: ReactNode;
  mapHref?: string;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-white font-display">
      <LiquidBackground />
      <div className="pointer-events-none fixed inset-0 z-10 hidden md:block">
        <GradualBlurOverlay />
      </div>
      <div className="fixed inset-x-0 top-[max(env(safe-area-inset-top),0.85rem)] z-[80] px-4 sm:px-6 lg:top-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <BackToMapButton mapHref={mapHref} />
        </div>
      </div>
      <div className="relative z-20">{children}</div>
    </div>
  );
}
