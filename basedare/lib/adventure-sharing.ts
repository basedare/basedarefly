import { ACTIVITY_SUGGESTIONS, type ActivitySuggestion } from "@/lib/home-activities";
export const SESSION_RECORDING_CONSENT = "session-original-review-v1";
export const ADVENTURE_DISPLAY_CONSENT = "adventure-display-v2";
export const ADVENTURE_MEDIA_LIMIT = 4 * 1024 * 1024;
export function adventureHashtag(activityId: string) {
  return "basedare" + activityId.toLowerCase().replace(/[^a-z0-9]/g, "");
}
export function adventureTemplate(id: string): ActivitySuggestion | undefined {
  if (id === 'session-recording') return { id, title: 'A permissioned Session recording', summary: 'Contribute an original recording with permission for people and music.', minutes: 10, moods: ['create'], steps: ['Check the host allows recording.', 'Get permission from featured people and the music rights holders.', 'Submit your original video for review; processing permission is separate.'] };
  return ACTIVITY_SUGGESTIONS.find((a) => a.id === id);
}
export function friendPair(a: string, b: string) {
  return [a.toLowerCase(), b.toLowerCase()].sort().join(":");
}
export type AdventurePost = {
  id: string;
  activityId: string;
  caption: string;
  hashtag: string;
  mediaUrl: string | null;
  socialUrl?: string | null;
  socialPlatform?: string | null;
  momentHref?: string;
  featured?: boolean;
  parentMomentId?: string | null;
  creatorCreditConsent?: boolean;
  mediaType: string;
  status: string;
  reviewReason?: string | null;
  creatorTag: string | null;
  createdAt: string;
  venue: { slug: string; name: string; latitude: number; longitude: number } | null;
};

/** Public challenge context only; never transfer a private run, notes or completion state. */
export function momentSubmissionHref(activityId: string, parentId?: string | null, placeSlug?: string) {
  if (!adventureTemplate(activityId)) return '/adventures';
  const query = new URLSearchParams();
  if (parentId && /^[a-zA-Z0-9-]{8,80}$/.test(parentId)) query.set('moment', parentId);
  if (placeSlug && /^[a-z0-9][a-z0-9-]{0,179}$/.test(placeSlug)) query.set('place', placeSlug);
  return `/adventures/${encodeURIComponent(activityId)}/submit${query.size ? '?' + query : ''}`;
}
