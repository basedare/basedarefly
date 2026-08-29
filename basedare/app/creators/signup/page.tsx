import { redirect } from 'next/navigation';

export default async function CreatorSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city } = await searchParams;
  const query = new URLSearchParams({ alerts: '1', source: 'legacy-creator-signup' });
  if (city?.trim()) query.set('city', city.trim());
  redirect(`/earn?${query.toString()}#mission-alerts`);
}
