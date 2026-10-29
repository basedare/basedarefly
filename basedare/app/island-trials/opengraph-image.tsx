import { adventureOg } from '@/lib/adventure-og';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'BaseDare Island Trials — Stop voting. Start proving.';
export default function Image() { return adventureOg({ title: 'Stop voting. Start proving.', eyebrow: 'BASEDARE ISLAND TRIALS', invitation: 'Siargao. El Nido. Boracay. Think your island is the best? Show us why.', footer: 'Free adventures · no account or public post required' }); }
