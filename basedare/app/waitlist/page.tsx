import WaitlistClient from './waitlist-client';

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{
    topic?: string;
    venue?: string;
    city?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <WaitlistClient
      initialTopic={resolvedSearchParams.topic ?? null}
      initialVenue={resolvedSearchParams.venue ?? null}
      initialCity={resolvedSearchParams.city ?? null}
    />
  );
}
