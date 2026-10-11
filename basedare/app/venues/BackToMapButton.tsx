'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function BackToMapButton({ mapHref }: { mapHref: string }) {
  return (
    <Link
      href={mapHref}
      prefetch
      aria-label="Back to map"
      className="bd-back pointer-events-auto touch-manipulation"
    >
      <span className="bd-back__icon"><ArrowLeft className="h-4 w-4" aria-hidden="true" /></span>
      Back to map
    </Link>
  );
}
