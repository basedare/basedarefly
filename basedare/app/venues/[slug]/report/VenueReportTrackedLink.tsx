'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  buildTrackedVenueReportHref,
  trackVenueReportEvent,
  type VenueReportAudience,
  type VenueReportEventType,
} from '@/lib/venue-report-client';

export default function VenueReportTrackedLink({
  href,
  venueSlug,
  audience,
  eventType,
  className,
  children,
}: {
  href: string;
  venueSlug: string;
  audience: VenueReportAudience;
  eventType?: VenueReportEventType;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const trackedHref = useMemo(
    () => buildTrackedVenueReportHref({ href, venueSlug, audience }),
    [audience, href, venueSlug]
  );

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        if (eventType) {
          await trackVenueReportEvent({
            venueSlug,
            audience,
            eventType,
          });
        }
        router.push(trackedHref);
      }}
    >
      {children}
    </button>
  );
}
