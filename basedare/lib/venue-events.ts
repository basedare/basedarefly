export const VENUE_EVENT_SOURCE_KINDS = [
  "SOCIAL_POST",
  "FLYER",
  "CALENDAR",
  "EVENTBRITE",
  "COMMUNITY",
] as const;

export const VENUE_EVENT_TRUST_LEVELS = [
  "SOURCE_CHECKED",
  "VENUE_CONFIRMED",
  "VENUE_POSTED",
] as const;

export const VENUE_EVENT_CATEGORIES = [
  "music",
  "food",
  "market",
  "wellness",
  "surf",
  "sports",
  "nightlife",
  "community",
  "other",
] as const;

export type VenueEventSourceKind = (typeof VENUE_EVENT_SOURCE_KINDS)[number];
export type VenueEventTrustLevel = (typeof VENUE_EVENT_TRUST_LEVELS)[number];
export type VenueEventCategory = (typeof VENUE_EVENT_CATEGORIES)[number];
export type VenueEventRsvpStatus = "INTERESTED" | "GOING";

export type VenueEventDraft = {
  title: string;
  category: VenueEventCategory;
  priceLabel: string | null;
  dateMention: string | null;
  timeMention: string | null;
  confidence: number;
};

const CATEGORY_TERMS: Array<[VenueEventCategory, RegExp]> = [
  ["surf", /\b(surf|longboard|shortboard|wave|board swap)\b/i],
  ["music", /\b(djs?|vinyl|live music|band|acoustic|open mic|jam session)\b/i],
  ["market", /\b(market|makers|pop[- ]?up|bazaar|stalls?)\b/i],
  ["wellness", /\b(yoga|breathwork|sound bath|meditation|wellness|pilates)\b/i],
  ["sports", /\b(padel|football|volleyball|run club|fitness|tournament)\b/i],
  ["food", /\b(brunch|dinner|tasting|barbecue|bbq|food|chef|buffet)\b/i],
  ["nightlife", /\b(party|afterparty|happy hour|cocktail|bar crawl|dance)\b/i],
  ["community", /\b(community|cleanup|meetup|fundraiser|trivia|quiz)\b/i],
];

const DATE_MENTION =
  /\b(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b[^\n,]*/i;
const TIME_MENTION =
  /\b(?:(?:[01]?\d|2[0-3]):[0-5]\d\s?(?:am|pm)?|(?:[1-9]|1[0-2])\s?(?:am|pm))\b/i;

function compactLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function inferTitle(rawText: string) {
  const lines = rawText
    .split(/\r?\n/)
    .map(compactLine)
    .filter((line) => line.length >= 3 && !/^https?:\/\//i.test(line));
  const candidate =
    lines.find((line) => !DATE_MENTION.test(line) && !/^[@#]/.test(line)) ??
    lines[0] ??
    "";
  return candidate.replace(/^[^\p{L}\p{N}]+/u, "").slice(0, 120);
}

export function inferVenueEventDraft(rawText: string): VenueEventDraft {
  const normalized = rawText.trim();
  const category =
    CATEGORY_TERMS.find(([, pattern]) => pattern.test(normalized))?.[0] ??
    "other";
  const free = /\bfree(?: entry| admission)?\b/i.test(normalized);
  const price = normalized.match(/(?:₱|php\s*)[\d,.]+/i)?.[0] ?? null;
  const dateMention = normalized.match(DATE_MENTION)?.[0]?.trim() ?? null;
  const timeMention = normalized.match(TIME_MENTION)?.[0]?.trim() ?? null;
  const title = inferTitle(normalized);
  const confidence = Math.min(
    0.95,
    0.2 +
      (title ? 0.25 : 0) +
      (dateMention ? 0.2 : 0) +
      (timeMention ? 0.2 : 0) +
      (category !== "other" ? 0.1 : 0)
  );

  return {
    title,
    category,
    priceLabel: free ? "Free" : price,
    dateMention,
    timeMention,
    confidence: Math.round(confidence * 100) / 100,
  };
}

export function normalizeVenueEventSourceUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    return url.toString().slice(0, 2000);
  } catch {
    return null;
  }
}

export function getVenueEventTrustLabel(level: VenueEventTrustLevel) {
  if (level === "VENUE_CONFIRMED") return "Venue confirmed";
  if (level === "VENUE_POSTED") return "Venue posted";
  return "Source checked";
}

export function getVenueEventSourceLabel(
  kind: VenueEventSourceKind,
  account?: string | null
) {
  const trimmedAccount = account?.trim();
  if (trimmedAccount) return trimmedAccount.slice(0, 80);
  if (kind === "CALENDAR") return "Public venue calendar";
  if (kind === "EVENTBRITE") return "Eventbrite organizer page";
  if (kind === "FLYER") return "Public event flyer";
  if (kind === "COMMUNITY") return "Community-submitted source";
  return "Public venue post";
}

export function validateVenueEventWindow(
  startsAt: Date,
  endsAt: Date | null,
  now = new Date()
) {
  if (!Number.isFinite(startsAt.getTime())) return "Start time is invalid.";
  if (endsAt && !Number.isFinite(endsAt.getTime()))
    return "End time is invalid.";
  if (endsAt && endsAt <= startsAt) return "End time must be after the start.";
  if (startsAt.getTime() < now.getTime() - 6 * 60 * 60 * 1000)
    return "The event is already too far in the past.";
  if (startsAt.getTime() > now.getTime() + 366 * 24 * 60 * 60 * 1000)
    return "The event is too far in the future.";
  return null;
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return (
    Date.UTC(
      value("year"),
      value("month") - 1,
      value("day"),
      value("hour"),
      value("minute"),
      value("second")
    ) - date.getTime()
  );
}

/** Interpret an operator-entered wall clock in the venue's timezone. */
export function parseVenueLocalDateTime(value: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  } catch {
    return null;
  }
  const wallClockUtc = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5])
  );
  let result = new Date(wallClockUtc);
  for (let index = 0; index < 3; index += 1)
    result = new Date(wallClockUtc - timeZoneOffsetMs(result, timeZone));
  return Number.isFinite(result.getTime()) ? result : null;
}

export function resolveVenueEventExpiry(startsAt: Date, endsAt: Date | null) {
  return new Date(
    (endsAt?.getTime() ?? startsAt.getTime() + 6 * 60 * 60 * 1000) +
      12 * 60 * 60 * 1000
  );
}

export function isVenueEventLiveNow(
  input: { startsAt: Date; endsAt: Date | null },
  now = new Date()
) {
  const end =
    input.endsAt?.getTime() ?? input.startsAt.getTime() + 4 * 60 * 60 * 1000;
  return input.startsAt.getTime() <= now.getTime() && end >= now.getTime();
}

export function slugifyVenueEvent(
  title: string,
  venueSlug: string,
  startsAt: Date,
  signalId: string
) {
  const base = `${venueSlug}-${title}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  const date = startsAt.toISOString().slice(0, 10);
  return `${base || "island-pulse"}-${date}-${signalId
    .slice(-6)
    .toLowerCase()}`;
}
