import { CHAOS_QUESTS } from './chaos-quests';
/** No query strings (GPS, wallet, tokens), hash fragments or private record IDs in analytics URLs. */
export function analyticsPath(input: string) {
  let path: string;
  try { path = new URL(input, 'https://www.basedare.xyz').pathname; } catch { return '/'; }
  if (/^\/(?:inbox|messages|notifications|account|profile|admin|api|checkout|check-in|checkin)(?:\/|$)/.test(path)) return '/' + path.split('/')[1];
  if (/^\/(?:dare|dares|missions|mission-pass|passes|proof|operator)(?:\/|$)/.test(path)) return '/' + path.split('/')[1];
  if (/^\/community\/(?:meet|boat)\//.test(path)) return '/' + path.split('/').slice(1, 3).join('/');
  const parts = path.split('/').filter(Boolean);
  if (parts.length <= 1) return path;
  if (parts[0] === 'island-trials' && parts[1] === 'no-beaches-allowed' && parts.length === 2) return path;
  if (parts[0] === 'venues') return path; // Public place slugs.
  if (parts[0] === 'adventures' && ['passport', 'little-local-loop', 'three-details', 'light-hunt', 'one-minute-story', 'soundtrack', 'tomorrow-pick', 'postcard', 'siargao-verdict', 'no-beaches-allowed', ...CHAOS_QUESTS.map((item) => item.id)].includes(parts[1]) && parts.length === 2) return path;
  return '/' + parts[0];
}
export function privateAnalyticsPayload(payload: Record<string, string | number | boolean | null | undefined>) {
  return Object.fromEntries(Object.entries(payload).flatMap(([key, value]) => {
    if (key.endsWith('_id') && key !== 'activity_id') return [];
    if (/(?:wallet|email|token|signature|redemption|latitude|longitude|^lat$|^lng$|run_id|participant_key)/i.test(key)) return [];
    if (typeof value === 'string' && /(?:path|url|href)$/i.test(key)) return [[key, analyticsPath(value)]];
    return [[key, value]];
  }));
}
