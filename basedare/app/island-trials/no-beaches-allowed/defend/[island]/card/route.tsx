import { adventureOg } from '@/lib/adventure-og';
import { TRIAL_ISLANDS } from '@/lib/island-trials';
export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ island: string }> }) {
  const { island } = await params;
  const choice = TRIAL_ISLANDS.find((item) => item.id === island);
  if (!choice) return new Response('Not found', { status: 404 });
  const response = await adventureOg({ title: `I DEFENDED ${choice.label.toUpperCase()}`, eyebrow: 'ISLAND TRIAL #001', invitation: 'No Beaches Allowed. Pick your island. Show what everyone missed.', footer: 'Self-reported adventure · no verified visit, winner or cash reward' });
  response.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  return response;
}
