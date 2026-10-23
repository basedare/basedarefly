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
  { id: 'little-local-loop', moods: ['explore'], title: 'Take the scenic way back', summary: 'Swap the usual route for a short wander. Find three little things worth pointing out.', minutes: 30, daylight: true,
    steps: ['Pick a public starting spot on the map that’s easy for you to reach. Look for one thing you’d normally walk past.',
      'Follow a public path for a few minutes. Find something made, grown or painted here. If the route gets awkward, turn back.',
      'Head back along a comfortable public route and spot one last detail. Tell a friend or keep it to yourself. No photos or purchases needed.'] },
  { id: 'three-details', moods: ['explore', 'create'], title: 'Find the shot everyone walks past', summary: 'A splash of colour, a curious texture, something made by hand. What catches your eye?', minutes: 15, daylight: true,
    steps: ['Pick a public street you can comfortably explore. Slow down a little: this is about the small stuff.', 'Find a colour that pops, an interesting texture and something handmade. Take a photo of each.', 'Pick your favourite shot. Show a friend or keep it for yourself. Ask first if you want someone in the photo.'] },
  { id: 'light-hunt', moods: ['explore', 'create'], title: 'Chase the evening glow', summary: 'Signs, lamplight, reflections. Turn a well-lit corner into a three-photo story.', minutes: 15, evening: true,
    steps: ['Choose a familiar, well-lit public spot you can safely reach now. A shopfront or a lively street corner works.', 'Find a light, its reflection and one little detail nearby. Take a photo of each from the public path.', 'Put your three shots together. Which one steals the show? Keep people out of the frame unless they’re happy to be photographed.'] },
  { id: 'one-minute-story', moods: ['create'], title: 'Give a friend the one-minute tour', summary: 'Loved a place today? Tell someone what made it worth the stop.', minutes: 10,
    steps: ['Think of a place you visited today, or choose somewhere you can visit now. What would you tell a friend about it?', 'Pick three things that stuck with you: a sound, a view, a funny little moment. Use your own photos or words.', 'Record a quick one-minute story. Send it to a friend or keep it for yourself. You don’t have to post it anywhere.'] },
  { id: 'soundtrack', moods: ['unwind'], title: 'Give your trip a soundtrack', summary: 'Three songs. One day you’ll want to remember. Make a tiny playlist that takes you back.', minutes: 10,
    steps: ['Pick a place you explored today. Picture arriving there: what song fits that feeling?', 'Add two more songs: one for being there and one for the journey back. Go with your taste, not anyone else’s.', 'Give your playlist a name you’ll remember. Send it to a friend or save it for the next time you miss this place.'] },
  { id: 'tomorrow-pick', moods: ['explore'], title: 'Find tomorrow’s little escape', summary: 'Find one place you’re curious about and give tomorrow something to look forward to.', minutes: 10,
    steps: ['Open the map and pick somewhere that makes you think “I’d go there.” Keep it easy enough to fit into your day.', 'Check that you can visit and pick a good time to go. Save outdoor daylight adventures for daytime.', 'Save the idea for yourself, or send it to a friend and agree a time together. Sending an invitation doesn’t book a place or sign anyone up.'] },
  { id: 'postcard', moods: ['create', 'unwind'], title: 'Send a little “wish you were here”', summary: 'One photo and a few words for someone back home. The messy, funny bits count too.', minutes: 10,
    steps: ['Choose one of your own photos from today. It doesn’t need to be perfect: pick the one with a story.', 'Add a sentence about something that surprised you or made you smile. Write it like you’d say it to a friend.', 'Send your little postcard to someone you know. Rather keep the moment to yourself? Save it as a private memory.'] },
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
