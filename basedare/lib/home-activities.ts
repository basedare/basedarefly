import type { LivePlan } from './live-plans';
import { assessRecommendation, destinationHour, solarElevation } from './recommendation-policy';

export const SIARGAO_ACTIVITY_AREA = { lat: 9.7905, lng: 126.158, label: 'General Luna, Siargao', timeZone: 'Asia/Manila' };
export type ActivityArea = { lat: number; lng: number; label: string; timeZone?: string };
export type ActivityFilter = 'ALL' | 'PLAY' | 'MEET' | 'EARN';
export const ADVENTURE_TIME_OPTIONS = [10, 15, 30, 60, 120] as const;
export const ADVENTURE_MOODS = [
  { id: 'any', label: 'Anything' },
  { id: 'explore', label: 'Explore' },
  { id: 'create', label: 'Create' },
  { id: 'unwind', label: 'Unwind' },
] as const;
export type AdventureMood = typeof ADVENTURE_MOODS[number]['id'];
export type AdventurePreferences = { minutes: typeof ADVENTURE_TIME_OPTIONS[number]; mood: AdventureMood };
export const DEFAULT_ADVENTURE_PREFERENCES: AdventurePreferences = { minutes: 30, mood: 'any' };

/** Shared links accept only authored preference values, never arbitrary filters. */
export function readAdventurePreferences(query: Pick<URLSearchParams, 'get'>): AdventurePreferences {
  const minutes = ADVENTURE_TIME_OPTIONS.find((value) => String(value) === query.get('minutes'));
  const mood = ADVENTURE_MOODS.find((value) => value.id === query.get('mood'))?.id;
  return { minutes: minutes ?? DEFAULT_ADVENTURE_PREFERENCES.minutes, mood: mood ?? DEFAULT_ADVENTURE_PREFERENCES.mood };
}
export type HomeLocalPost = {
  id: string; title: string; notes: string; venueName: string; venueSlug: string; city: string;
  startsAt: string | null; endsAt: string | null; updatedAt: string; distanceKm: number | null;
  sourceAttribution: string; postType: string;
};

export function visibleHomePosts(posts: HomeLocalPost[], now: Date, radiusKm = 25) {
  return posts.filter((post) => {
    if (post.distanceKm == null || !Number.isFinite(post.distanceKm) || post.distanceKm > radiusKm) return false;
    const start = post.startsAt ? Date.parse(post.startsAt) : null;
    const end = post.endsAt ? Date.parse(post.endsAt) : start != null ? start + 4 * 3600000 : Date.parse(post.updatedAt) + 7 * 86400000;
    return Number.isFinite(end) && end > now.getTime()
      && (start == null || (Number.isFinite(start) && start <= now.getTime() + 72 * 3600000));
  }).slice(0, 3);
}
export type ActivitySuggestion = {
  id: string; title: string; summary: string; minutes: number; steps: string[];
  moods: Exclude<AdventureMood, 'any'>[];
  daylight?: boolean; evening?: boolean;
};

// Authored activities, never synthetic events, attendance, rewards or venue hours.
export const ACTIVITY_SUGGESTIONS: ActivitySuggestion[] = [
  { id: 'little-local-loop', moods: ['explore'], title: 'Take the three-stop discovery loop', summary: 'A short walk, three small discoveries, one story to take home.', minutes: 30, daylight: true,
    steps: ['Choose an accessible public starting point on the map. Notice one detail you would usually walk past.',
      'Take a short walk along a public path to a second spot: find something handmade, growing or locally distinctive. Turn back if the route is inaccessible.',
      'Return by a comfortable public route and choose a third detail. Tell a friend what you found or keep a private note. No purchase or photo required.'] },
  { id: 'three-details', moods: ['explore', 'create'], title: 'Three details you never noticed', summary: 'Turn a familiar street into a tiny photo hunt.', minutes: 15, daylight: true,
    steps: ['Choose a public street you can comfortably walk.', 'Find a surprising colour, a texture and a handmade detail. Take one photo of each.', 'Pick your favourite and show a friend. Ask before photographing people.'] },
  { id: 'light-hunt', moods: ['explore', 'create'], title: 'Find the best glow on the block', summary: 'Make a three-photo story from lights and reflections.', minutes: 15, evening: true,
    steps: ['Choose a familiar, well-lit public spot that is accessible now.', 'Find a light, its reflection and one small detail. Stay on the public path.', 'Arrange your three photos into a story. Keep other people out unless they agree.'] },
  { id: 'one-minute-story', moods: ['create'], title: 'Tell a place’s story in one minute', summary: 'Make a mini travel diary wherever you are.', minutes: 10,
    steps: ['Choose a place you visited today, or somewhere you can access now.', 'Pick three details that made it memorable. Use your own photos or words.', 'Record a one-minute story for yourself or a friend. Public posting is optional.'] },
  { id: 'soundtrack', moods: ['unwind'], title: 'Give today a soundtrack', summary: 'Pick three songs that capture your day.', minutes: 10,
    steps: ['Think of one place you explored today.', 'Pick a song for arriving, being there and heading home.', 'Share the playlist privately with a friend, or keep it as your travel diary.'] },
  { id: 'tomorrow-pick', moods: ['explore'], title: 'Pick tomorrow’s mini adventure', summary: 'Make one easy plan you’ll actually want to do.', minutes: 10,
    steps: ['Open the map and choose one place that interests you.', 'Check access and choose a suitable time. Keep daylight activities for daytime.', 'Invite a friend yourself or save the plan. Nobody is automatically invited or joined.'] },
  { id: 'postcard', moods: ['create', 'unwind'], title: 'Make a postcard from today', summary: 'One photo, one sentence, one person to send it to.', minutes: 10,
    steps: ['Choose one of your own photos from today.', 'Write a sentence about what surprised you.', 'Send it to someone you know. You can also keep it private.'] },
];

export function suggestionsForArea(area: ActivityArea, now: Date, rotation = 0) {
  const hour = destinationHour(now, area.lng, area.timeZone);
  const daylight = (solarElevation(now, area.lat, area.lng) ?? -90) > 0
    && (solarElevation(new Date(now.getTime() + 45 * 60000), area.lat, area.lng) ?? -90) > 0;
  const eligible = ACTIVITY_SUGGESTIONS.filter((item) => (!item.daylight || daylight)
    && (!item.evening || (!daylight && hour >= 17 && hour < 23)));
  const day = Math.floor((now.getTime() + area.lng * 240000) / 86400000);
  const offset = ((day + rotation) % eligible.length + eligible.length) % eligible.length;
  return [...eligible.slice(offset), ...eligible.slice(0, offset)];
}

/** Apply local-time eligibility first, then preferences; never fill a short list with mismatches. */
export function matchingAdventureSuggestions(area: ActivityArea, now: Date, preferences: AdventurePreferences, rotation = 0) {
  const matches = suggestionsForArea(area, now).filter((item) => item.minutes <= preferences.minutes
    && (preferences.mood === 'any' || item.moods.includes(preferences.mood)));
  if (!matches.length) return matches;
  const offset = ((rotation % matches.length) + matches.length) % matches.length;
  return [...matches.slice(offset), ...matches.slice(0, offset)];
}

export function visibleHomePlans(plans: LivePlan[], area: ActivityArea, now: Date, filter: ActivityFilter) {
  const seen = new Set<string>();
  return plans.filter((plan) => {
    if (seen.has(plan.id)) return false;
    seen.add(plan.id);
    if (filter === 'PLAY' && plan.type !== 'community_spark') return false;
    if (filter === 'MEET' && !['boat', 'meetup', 'venue_event'].includes(plan.type)) return false;
    if (filter === 'EARN' && plan.type !== 'paid_dare') return false;
    if (/CANCELLED|CANCELED|EXPIRED|FAILED|COMPLETE|VERIFIED|REFUNDED/.test(plan.status.key)) return false;
    const start = plan.startsAt ? Date.parse(plan.startsAt) : null;
    if (start !== null && start > now.getTime() + 72 * 3600000) return false;
    return assessRecommendation({
      title: plan.title, kind: plan.type === 'boat' ? 'boat' : 'activity',
      latitude: plan.place.lat, longitude: plan.place.lng, startsAt: plan.startsAt, endsAt: plan.endsAt,
    }, { now, window: 'browse', timeZone: area.timeZone }).eligible;
  }).sort((a, b) => {
    const rank = (p: LivePlan) => p.viewer.isNextMove ? -1 : p.type === 'venue_event' ? 0 : p.type === 'meetup' || p.type === 'boat' ? 1 : 2;
    const future = (p: LivePlan) => p.startsAt && Date.parse(p.startsAt) > now.getTime() + 2 * 3600000 ? 1 : 0;
    return future(a) - future(b) || rank(a) - rank(b) || (a.startsAt ?? '').localeCompare(b.startsAt ?? '');
  });
}

export function homePlanTime(plan: LivePlan, now: Date, timeZone?: string) {
  if (!plan.startsAt) return 'Available · see brief';
  const start = Date.parse(plan.startsAt);
  if (start <= now.getTime()) return plan.endsAt ? 'Started · check details' : 'Recently started · check details';
  return new Intl.DateTimeFormat('en', { timeZone: timeZone ?? 'UTC', weekday: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(start));
}

export type SavedActivity = { id: string; startedAt: number; completedAt?: number };
export function readSavedActivity(value: unknown, now = Date.now()): SavedActivity | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as SavedActivity;
  if (!ACTIVITY_SUGGESTIONS.some((s) => s.id === item.id) || !Number.isFinite(item.startedAt)
    || item.startedAt > now || now - item.startedAt >= 24 * 3600000
    || (item.completedAt !== undefined && (!Number.isFinite(item.completedAt) || item.completedAt < item.startedAt || item.completedAt > now))) return null;
  return item;
}
