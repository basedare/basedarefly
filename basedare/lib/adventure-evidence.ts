/** Independent claims, not a ladder. A creative review never asserts physical presence. */
export const MOMENT_REVIEW_LABEL = "Reviewed creation";
export const MOMENT_REVIEW_DETAIL =
  "Accepted for public display. This review doesn’t verify the social account, physical presence or a paid task.";
export function momentCreditAllowed(post: {
  creatorCreditConsent?: boolean | null;
  publicConsentVersion: string;
}) {
  return (
    post.creatorCreditConsent === true ||
    (post.creatorCreditConsent == null &&
      post.publicConsentVersion === "adventure-display-v1")
  );
}
export function publicMomentAllowed(post: {
  status: string;
  publicConsentVersion: string;
  venueSlug?: string | null;
  venue?: { status?: string } | null;
  mediaUrl?: string | null;
  privateMediaCid?: string | null;
  socialUrl?: string | null;
}) {
  return (
    post.status === "APPROVED" &&
    ["adventure-display-v1", "adventure-display-v2"].includes(
      post.publicConsentVersion,
    ) &&
    (!post.venueSlug || post.venue?.status === "ACTIVE") &&
    Boolean(post.mediaUrl || post.privateMediaCid || post.socialUrl)
  );
}
