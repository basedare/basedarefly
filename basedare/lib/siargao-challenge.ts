/** Authored free pilot. Coordinates describe the area, never a venue or a person's location. */
export const SIARGAO_CHALLENGE_ID = 'siargao-verdict';
export const SIARGAO_CHALLENGE_AREA = { lat: 9.7905, lng: 126.158, label: 'General Luna, Siargao', timeZone: 'Asia/Manila' };
export const SIARGAO_CHALLENGE_START = '2026-10-28T00:00:00+08:00';
export const SIARGAO_CHALLENGE_END = '2026-11-16T00:00:00+08:00';
export const SIARGAO_VERDICTS = [
  { id: 'worth-it', label: 'Worth the hype', headline: 'SIARGAO IS WORTH THE HYPE.', invitation: 'That’s my take. What’s yours?' },
  { id: 'overrated', label: 'Overrated', headline: 'I SAY SIARGAO IS OVERRATED.', invitation: 'Think I’m wrong? Take the challenge.' },
  { id: 'complicated', label: 'It’s complicated', headline: 'SIARGAO? IT’S COMPLICATED.', invitation: 'Take a look beyond the waves. What’s your verdict?' },
] as const;
export type SiargaoVerdict = typeof SIARGAO_VERDICTS[number]['id'];

export function readSiargaoVerdict(value: unknown): SiargaoVerdict | undefined {
  return SIARGAO_VERDICTS.find((item) => item.id === value)?.id;
}
export function siargaoCampaignOpen(now: Date) {
  return now.getTime() >= Date.parse(SIARGAO_CHALLENGE_START) && now.getTime() < Date.parse(SIARGAO_CHALLENGE_END);
}
export function inSiargaoChallengeArea(area: { lat: number; lng: number }) {
  // A small destination rectangle, not proof that a participant is physically here.
  return area.lat >= 9.70 && area.lat <= 9.90 && area.lng >= 126.05 && area.lng <= 126.23;
}
export function siargaoChallengeHref(verdict?: SiargaoVerdict) {
  return `/adventures/${SIARGAO_CHALLENGE_ID}${verdict ? `/verdict/${verdict}` : ''}`;
}
