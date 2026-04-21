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
  intent,
  className,
  children,
}: {
  href: string;
  venueSlug: string;
  audience: VenueReportAudience;
  eventType?: VenueReportEventType;
  intent?: 'claim' | 'activation' | 'repeat' | null;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const trackedHref = useMemo(
    () => buildTrackedVenueReportHref({ href, venueSlug, audience, intent }),
    [audience, href, intent, venueSlug]
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
