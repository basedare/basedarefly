'use client';

import ClaimVenueButton from '@/components/venues/ClaimVenueButton';
import { trackVenueReportEvent, type VenueReportAudience } from '@/lib/venue-report-client';

export default function VenueReportClaimButton({
  venueSlug,
  venueName,
  audience,
  className,
  pendingClassName,
  requireAuthClassName,
  pending,
}: {
  venueSlug: string;
  venueName: string;
  audience: VenueReportAudience;
  className?: string;
  pendingClassName?: string;
  requireAuthClassName?: string;
  pending?: boolean;
}) {
  return (
    <ClaimVenueButton
      venueSlug={venueSlug}
      venueName={venueName}
      className={className}
      pendingClassName={pendingClassName}
      requireAuthClassName={requireAuthClassName}
      pending={pending}
      onClaimSubmitted={() => {
        void trackVenueReportEvent({
          venueSlug,
          audience,
          eventType: 'CLAIM_STARTED',
        });
      }}
    />
  );
}
