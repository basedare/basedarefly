import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';

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
      <div className="pointer-events-none fixed inset-x-0 top-24 z-30 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href={mapHref}
            aria-label="Back to map"
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(8,8,16,0.92)_100%)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/72 shadow-[0_14px_28px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-10px_14px_rgba(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:border-cyan-300/35 hover:text-cyan-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to map
          </Link>
        </div>
      </div>
      <div className="relative z-20">{children}</div>
    </div>
  );
}
