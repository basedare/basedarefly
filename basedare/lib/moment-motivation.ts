/** Editorial weeks use the founding market's clock, never the viewer's location. */
const DAY = 86400000;
const MANILA = 8 * 3600000;
export const WEEKLY_SPOTLIGHT_EVENT = "MOMENT_WEEKLY_SPOTLIGHT";
export function spotlightWeek(now = new Date()) {
  const local = new Date(now.getTime() + MANILA);
  const monday = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() - ((local.getUTCDay() + 6) % 7)
  );
  return weekFromMonday(new Date(monday).toISOString().slice(0, 10));
}
function weekFromMonday(key: string) {
  const startsAt = new Date(Date.parse(key + "T00:00:00Z") - MANILA);
  const endsAt = new Date(startsAt.getTime() + 7 * DAY);
  const format = (date: Date) =>
    date.toLocaleDateString("en-GB", {
      timeZone: "Asia/Manila",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return {
    key,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    label: `${format(startsAt)} – ${format(
      new Date(endsAt.getTime() - 1)
    )} · Philippine time`,
    href: "/moments/spotlight/" + key,
  };
}
export function parseSpotlightWeek(key: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const date = new Date(key + "T00:00:00Z");
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== key ||
    date.getUTCDay() !== 1
  )
    return null;
  return weekFromMonday(key);
}
export function spotlightKey(week: string) {
  return "moment-weekly-spotlight:" + week;
}
export function relatedAttempts(
  a: {
    id: string;
    activityId: string;
    wallet: string;
    parentMomentId: string | null;
  },
  b: {
    id: string;
    activityId: string;
    wallet: string;
    parentMomentId: string | null;
  }
) {
  return (
    a.id !== b.id &&
    a.activityId === b.activityId &&
    a.wallet.toLowerCase() !== b.wallet.toLowerCase() &&
    (a.parentMomentId === b.id) !== (b.parentMomentId === a.id)
  );
}
export function compareMomentHref(parent: string, reply: string) {
  return `/moments/${encodeURIComponent(parent)}/compare/${encodeURIComponent(
    reply
  )}`;
}
