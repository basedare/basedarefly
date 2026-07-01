/**
 * Paid-mission predicate — the single source of truth for "is this a funded
 * venue/brand mission?" (as opposed to a consumer/community dare).
 *
 * Why it exists: a paid mission carries the receipt promise — it settles against
 * the mission's agreed proof standard, never against generic auto-approval or
 * crowd opinion. So a paid mission must ALWAYS route to referee/admin review,
 * regardless of bounty size, and must never reach `finalizeVerifiedDare` from the
 * low-value auto-approve path.
 *
 * Enforced at the verify-proof gate, so every dare-creation route is covered at
 * once. Do NOT re-implement the venue/brand/campaign test inline anywhere else —
 * import `isPaidMission` instead.
 */

export type PaidMissionShape = {
  /** Set when a dare is tied to a venue (venue-funded / venue-linked). */
  venueId?: string | null;
  /** Dare mission tag — `brand-campaign` (and `brand-*`) mark brand/venue campaigns. */
  tag?: string | null;
};

/** Tags that mark a brand/venue-funded campaign dare. */
const BRAND_MISSION_TAGS = new Set(['brand-campaign', 'venue-campaign', 'brand']);

/** True when the dare's tag marks it as a paid brand/venue campaign. */
export function isBrandMissionTag(tag?: string | null): boolean {
  if (!tag) return false;
  const normalized = tag.trim().toLowerCase();
  return BRAND_MISSION_TAGS.has(normalized) || normalized.startsWith('brand-');
}

/**
 * A dare is a "paid mission" when it is venue-linked or a brand/venue campaign.
 * Campaign dares created via `createDatabaseBackedBounty` carry both a `venueId`
 * (when place-scoped) and `tag: 'brand-campaign'`, so this catches them off the
 * dare row alone — no extra query needed at verify time.
 */
export function isPaidMission(dare: PaidMissionShape): boolean {
  return Boolean(dare.venueId) || isBrandMissionTag(dare.tag);
}
