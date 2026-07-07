import WaitlistClient from '@/app/waitlist/waitlist-client';
import ContactClient from './contact-client';

type ContactSearchParams = {
  topic?: string;
  venue?: string;
  city?: string;
  venueSlug?: string;
  source?: string;
  audience?: string;
  intent?: string;
  reportSessionKey?: string;
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<ContactSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  // Venue claim/partnership/report flows deep-link here with intake params —
  // those must keep landing on the intake form, not the contact cards.
  const wantsIntakeForm = Boolean(
    resolvedSearchParams.topic ||
      resolvedSearchParams.venue ||
      resolvedSearchParams.venueSlug ||
      resolvedSearchParams.intent ||
      resolvedSearchParams.reportSessionKey
  );

  if (wantsIntakeForm) {
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

  return <ContactClient />;
}
