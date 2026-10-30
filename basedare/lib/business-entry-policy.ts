/** Keep all existing targeted workspace links on their original authenticated tools. */
export function businessWorkspaceRequested(
  query: Record<string, string | string[] | undefined>,
) {
  return (
    query.workspace === "1" ||
    [
      "venue",
      "campaign",
      "compose",
      "creator",
      "tier",
      "payout",
      "title",
      "objective",
      "syncTime",
      "reportSource",
      "reportAudience",
      "reportSessionKey",
      "reportIntent",
    ].some((key) => typeof query[key] === "string" && Boolean(query[key]))
  );
}
export function isGeneralBusinessEntry(
  query: Record<string, string | string[] | undefined>,
) {
  return ![
    "packageId",
    "budgetRange",
    "goal",
    "buyerType",
    "creatorSlots",
    "payout",
    "timeWindow",
    "proofRequired",
    "contentRequired",
    "missionType",
    "offer",
    "creator",
    "streamer",
    "venue",
    "venueName",
    "venueId",
    "venueSlug",
    "auditBrief",
    "missionTitle",
    "guestMission",
    "perkLabel",
  ].some((key) => Boolean(query[key]));
}
