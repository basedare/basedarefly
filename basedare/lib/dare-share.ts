export const PUBLIC_DARE_ORIGIN = 'https://www.basedare.xyz';

/** Printed and public links must never contain an invite, wallet or session query. */
export function publicDareUrl(shortId: string) {
  if (!/^[A-Za-z0-9_-]{1,191}$/.test(shortId)) throw new Error('A valid Dare ID is required.');
  return `${PUBLIC_DARE_ORIGIN}/dare/${encodeURIComponent(shortId)}`;
}
