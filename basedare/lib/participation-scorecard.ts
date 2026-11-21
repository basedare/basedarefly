/** Aggregates canonical, currently eligible actions. Wallet accounts are not unique humans. */
export const PARTICIPATION_KINDS = [
  "reviewed_story",
  "reviewed_moment",
  "confirmed_qr_visit",
] as const;
export type ParticipationKind = (typeof PARTICIPATION_KINDS)[number];
export type ParticipationAction = {
  account: string;
  sourceId: string;
  kind: ParticipationKind;
  occurredAt: string;
};
const DAY = 86400000;
export function participationWindow(now = new Date()) {
  // Asia/Manila has a fixed UTC+8 offset. Only complete local days enter the comparison.
  const end =
    Math.floor((now.getTime() + 8 * 3600000) / DAY) * DAY - 8 * 3600000;
  if (!Number.isFinite(end)) throw Error("Invalid observation time.");
  return {
    previousStart: new Date(end - 14 * DAY).toISOString(),
    currentStart: new Date(end - 7 * DAY).toISOString(),
    end: new Date(end).toISOString(),
    timezone: "Asia/Manila" as const,
  };
}
export function participationScorecard(
  actions: ParticipationAction[] | null,
  now = new Date()
) {
  const window = participationWindow(now);
  const empty = {
    activeAccounts: null,
    reviewedCreators: null,
    qrVisitorAccounts: null,
    actions: null,
    previousActiveAccounts: null,
    returningAccounts: null,
    returnRate: null,
  };
  if (actions === null)
    return {
      window,
      complete: false,
      metrics: empty,
      note: "Source unavailable or limit reached. No partial totals or inferred zeroes.",
    };
  const start = Date.parse(window.currentStart),
    previousStart = Date.parse(window.previousStart),
    end = Date.parse(window.end);
  const unique = new Map<string, ParticipationAction>();
  for (const action of actions) {
    const at = Date.parse(action.occurredAt),
      account = action.account.toLowerCase();
    if (
      !/^0x[a-f0-9]{40}$/.test(account) ||
      !action.sourceId ||
      !PARTICIPATION_KINDS.includes(action.kind) ||
      !Number.isFinite(at)
    )
      throw Error("Invalid participation source.");
    const key = action.kind + ":" + action.sourceId;
    const existing = unique.get(key);
    if (
      existing &&
      (existing.account.toLowerCase() !== account ||
        existing.occurredAt !== action.occurredAt)
    )
      throw Error("Conflicting participation source.");
    if (at >= previousStart && at < end)
      unique.set(key, { ...action, account });
  }
  const rows = [...unique.values()],
    current = rows.filter((a) => Date.parse(a.occurredAt) >= start);
  const previous = new Set(
    rows.filter((a) => Date.parse(a.occurredAt) < start).map((a) => a.account)
  );
  const active = new Set(current.map((a) => a.account));
  const returning = [...active].filter((a) => previous.has(a)).length;
  return {
    window,
    complete: true,
    metrics: {
      activeAccounts: active.size,
      reviewedCreators: new Set(
        current
          .filter((a) => a.kind !== "confirmed_qr_visit")
          .map((a) => a.account)
      ).size,
      qrVisitorAccounts: new Set(
        current
          .filter((a) => a.kind === "confirmed_qr_visit")
          .map((a) => a.account)
      ).size,
      actions: current.length,
      previousActiveAccounts: previous.size,
      returningAccounts: returning,
      returnRate: previous.size ? returning / previous.size : null,
    },
    note: "Two completed seven-day windows in Asia/Manila. Currently eligible creations are dated by submission, QR visits by scan. Accounts may overlap across action types and are not unique people. Week-to-week return is descriptive; it is not exact-day D7 retention, attendance from a post, or causal campaign lift. Withdrawal/source changes can revise these counts.",
  };
}
