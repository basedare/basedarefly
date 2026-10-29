import { ACTIVITY_SUGGESTIONS } from "@/lib/home-activities";
export const ADVENTURE_DISPLAY_CONSENT = "adventure-display-v2";
export const ADVENTURE_MEDIA_LIMIT = 4 * 1024 * 1024;
export function adventureHashtag(activityId: string) {
  return "basedare" + activityId.toLowerCase().replace(/[^a-z0-9]/g, "");
}
export function adventureTemplate(id: string) {
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
