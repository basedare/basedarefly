import { readContentDelivery } from './content-delivery';

export function buildContentReorderHref(input: {
  title: string; bounty: number; venueId?: string | null; locationLabel?: string | null; outcomeContractSnapshot?: unknown;
}, now = Date.now()): string | null {
  const brief = readContentDelivery(input.outcomeContractSnapshot);
  // A label alone must not silently relocate the next mission to the buyer.
  if (!brief || !input.venueId) return null;
  const params = new URLSearchParams({
    title: input.title, amount: String(input.bounty), mode: 'venue-challenge', source: 'content-repeat',
    contentBrief: JSON.stringify({ ...brief, deadline: new Date(now + 48 * 3600000).toISOString() }),
  });
  if (input.venueId) params.set('venueId', input.venueId);
  if (input.locationLabel) params.set('venueName', input.locationLabel);
  return `/create?${params.toString()}`;
}
