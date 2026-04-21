import WaitlistClient from './waitlist-client';

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{
    topic?: string;
    venue?: string;
    city?: string;
    venueSlug?: string;
    source?: string;
    audience?: string;
    intent?: string;
    reportSessionKey?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <WaitlistClient
      initialTopic={resolvedSearchParams.topic ?? null}
      initialVenue={resolvedSearchParams.venue ?? null}
      initialCity={resolvedSearchParams.city ?? null}
      initialVenueSlug={resolvedSearchParams.venueSlug ?? null}
      initialSource={resolvedSearchParams.source ?? null}
      initialAudience={resolvedSearchParams.audience ?? null}
      initialIntent={resolvedSearchParams.intent ?? null}
      initialReportSessionKey={resolvedSearchParams.reportSessionKey ?? null}
    />
  );
}
