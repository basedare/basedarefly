export type DiscoveryArea = { lat: number; lng: number; timeZone?: string; radiusKm: number; label: string; participation: 'all' | 'play' | 'meet' | 'earn'; mode: 'NOW' | 'NEXT_2H' | 'TONIGHT' | 'ALL' };
export const DEFAULT_DISCOVERY: DiscoveryArea = { lat: 9.7905, lng: 126.158, radiusKm: 25, label: 'General Luna, Siargao', participation: 'all', mode: 'NOW' };
export function readDiscovery(params: URLSearchParams, previous = DEFAULT_DISCOVERY): DiscoveryArea {
  const lat = params.has('lat') ? Number(params.get('lat')) : NaN;
  const lng = params.has('lng') ? Number(params.get('lng')) : NaN;
  const valid = Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lng) && Math.abs(lng) <= 180;
  const radius = Number(params.get('radiusKm'));
  const participation = params.get('participation');
  const mode = (params.get('when') ?? params.get('mode'))?.toUpperCase();
  return { ...previous,
    ...(valid ? { lat, lng, label: Math.abs(lat - 9.79) < .2 && Math.abs(lng - 126.16) < .2 ? 'General Luna, Siargao' : 'Selected map area' } : {}),
    radiusKm: radius > 0 && radius <= 100 ? radius : previous.radiusKm,
    participation: ['all','play','meet','earn'].includes(participation ?? '') ? participation as DiscoveryArea['participation'] : previous.participation,
    mode: ['NOW','NEXT_2H','TONIGHT','ALL'].includes(mode ?? '') ? mode as DiscoveryArea['mode'] : previous.mode,
  };
}
export function discoveryHref(href: string, area: DiscoveryArea) {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const url = new URL(href, 'https://basedare.invalid');
  if (!['/','/now','/map','/board','/community','/community/rally/new','/adventures'].includes(url.pathname)) return href;
  const values = { lat: String(area.lat), lng: String(area.lng), radiusKm: String(area.radiusKm), participation: area.participation, [url.pathname === '/' ? 'when' : 'mode']: area.mode.toLowerCase() };
  for (const [key, value] of Object.entries(values)) if (!url.searchParams.has(key)) url.searchParams.set(key, value);
  return url.pathname + url.search + url.hash;
}
