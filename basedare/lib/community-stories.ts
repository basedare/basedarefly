import 'server-only';
import type { FounderEvent } from '@prisma/client';
import { prisma } from './prisma';
import { serializeLocalSignal, LOCAL_SIGNAL_EVENT_TYPE } from './local-signals';
export const STORY_CONSENT = 'community-story-display-v1';
export const record = (v: unknown) => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
export const isStory = (event: FounderEvent) => record(event.metadataJson).postType === 'story';
/** Both Pulse and map read this projection. Private author/review/contact fields never leave it. */
export async function publicLocalSignalItems(events: FounderEvent[], origin?: { latitude: number; longitude: number } | null) {
  const ids = events.filter(isStory).map(e => String(record(e.metadataJson).authorTagId));
  const [authors, venues] = await Promise.all([
    prisma.streamerTag.findMany({ where: { id: { in: ids }, status: { in: ['ACTIVE', 'VERIFIED'] } }, select: { id: true, tag: true, walletAddress: true } }),
    prisma.venue.findMany({ where: { id: { in: events.flatMap(e => e.venueId ? [e.venueId] : []) }, status: 'ACTIVE' }, select: { id: true } }),
  ]);
  const tags = new Map(authors.map(a => [a.id, a])), places = new Set(venues.map(v => v.id));
  return events.flatMap(event => {
    if (event.status !== 'APPROVED' || (event.venueId && !places.has(event.venueId))) return [];
    const data = record(event.metadataJson), story = isStory(event);
    const author = tags.get(String(data.authorTagId));
    if (story && (data.publicConsentVersion !== STORY_CONSENT || !author || typeof data.authorWallet !== 'string' || author.walletAddress.toLowerCase() !== data.authorWallet)) return [];
    const item = serializeLocalSignal(event, origin);
    // Explicit public projection, rather than returning the operator serializer.
    return [{ id: item.id, title: item.title, status: item.status, category: item.category, postType: item.postType, venueId: item.venueId, venueSlug: item.venueSlug, venueName: item.venueName, city: item.city, notes: item.notes, sourceUrl: /^https?:\/\//i.test(item.sourceUrl) ? item.sourceUrl : '', sourceAttribution: item.sourceAttribution, startsAt: item.startsAt, endsAt: item.endsAt, latitude: item.latitude, longitude: item.longitude, distanceKm: item.distanceKm, distanceDisplay: item.distanceDisplay, submittedBy: story ? '@' + tags.get(String(data.authorTagId))!.tag.replace(/^@/, '') : item.submittedBy, createdAt: item.createdAt, updatedAt: item.updatedAt }];
  });
}
export async function publicStory(id: string) {
  const row = await prisma.founderEvent.findFirst({ where: { id, eventType: LOCAL_SIGNAL_EVENT_TYPE, status: 'APPROVED' } });
  return row && isStory(row) ? (await publicLocalSignalItems([row]))[0] ?? null : null;
}
