import { calculateDistance } from "./geo";
import {
  isValidTimeZone,
  parseUtcOffsetMinutes,
  tonightWindow,
} from "./tonight";

export const DISCOVERY_INTENTS = [
  "explore",
  "adventure",
  "meet",
  "music",
  "earn",
  "stories",
  "surf",
  "food",
] as const;
export type DiscoveryIntent = (typeof DISCOVERY_INTENTS)[number];
export type DiscoveryWhen =
  | "browse"
  | "now"
  | "next2h"
  | "tonight"
  | "tomorrow";
export type DiscoveryAreaInput = {
  lat: number;
  lng: number;
  radiusKm: number;
  label: string;
  timeZone?: string;
};
export type DiscoveryInterpretation = {
  intent: DiscoveryIntent;
  when: DiscoveryWhen;
  maxBudgetPhp: number | null;
  maxMinutes: number | null;
  company: "any" | "solo" | "group";
  terms: string[];
  summary: string;
  notices: string[];
};
export type DiscoveryResult = {
  kind:
    | "PLACE"
    | "ADVENTURE"
    | "EVENT"
    | "MEETUP"
    | "MOMENT"
    | "STORY"
    | "MISSION"
    | "CHALLENGE";
  key: string;
  title: string;
  summary: string;
  label: string;
  reason: string;
  href: string;
  actionLabel: string;
  pricePhp: number | null;
  priceLabel: string;
  minutes: number | null;
  startsAt?: string;
  endsAt?: string;
  at?: string;
  place?: { slug: string; name: string; lat: number; lng: number };
  distanceKm: number | null;
  categories: string[];
};
export type DiscoveryResponse = {
  area: DiscoveryAreaInput;
  interpretation: DiscoveryInterpretation;
  results: DiscoveryResult[];
  complete: boolean;
  notices: string[];
};

const INTENT_WORDS: Array<[DiscoveryIntent, RegExp]> = [
  ["earn", /\b(paid|earn|reward|funded|creator opportunit|creator brief)/],
  ["music", /\b(music|gig|concert|band|dj|performance|jam session)\b/],
  ["surf", /\b(surf|surfing|waves)\b/],
  ["food", /\b(food|coffee|cafe|café|eat|breakfast|dinner)\b/],
  ["stories", /\b(moment|moments|stories|story|hidden spots)\b/],
  ["adventure", /\b(adventure|adventurous|challenge|dare|dares|play|quest)\b/],
  ["meet", /\b(meet|company|travellers|travelers|friends|social|group|crew)\b/],
];
const STOP_WORDS = new Set(
  "a an the i me my we us our it is are am be do can could want would like find show give something anything somewhere near nearby around in at on to for of with without under below less than budget php pesos free tonight tomorrow today now right next hour hours minute minutes two one what whats happening up available easy any some and or live local real world places place people solo together should you your fun interesting worthwhile worth doing go good best have got please".split(
    " "
  )
);
export function interpretDiscoveryIntent(
  query: string
): DiscoveryInterpretation {
  const q = query
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const intent =
    INTENT_WORDS.find(([, pattern]) => pattern.test(q))?.[0] ?? "explore";
  const when: DiscoveryWhen = /\btonight\b/.test(q)
    ? "tonight"
    : /\btomorrow\b/.test(q)
    ? "tomorrow"
    : /\b(next\s+(?:2|two)\s*(?:h|hours?)|two hours? free)\b/.test(q)
    ? "next2h"
    : /\b(now|right now)\b/.test(q)
    ? "now"
    : "browse";
  const budgetToken =
    /(?:under|below|less than|budget(?: of)?)\s*(?:₱|php\s*|pesos?\s*)?([\d,.]+)/
      .exec(q)?.[1]
      .replace(/\.$/, "");
  const budget =
    budgetToken &&
    /^(?:\d{1,7}|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(budgetToken)
      ? Number(budgetToken.replaceAll(",", ""))
      : null;
  const duration = /\b(\d{1,3}|one|two)\s*(minutes?|mins?|hours?|hrs?)\b/.exec(
    q
  );
  const amount = duration
    ? duration[1] === "one"
      ? 1
      : duration[1] === "two"
      ? 2
      : Number(duration[1])
    : null;
  const maxMinutes =
    amount == null
      ? null
      : Math.min(480, amount * (/^h/.test(duration![2]) ? 60 : 1));
  const maxBudgetPhp =
    /\bfree\b/.test(q) && !/\b(?:hours?|minutes?) free\b/.test(q) ? 0 : budget;
  const company = /\b(solo|alone|by myself)\b/.test(q)
    ? "solo"
    : /\b(with friends|company|meet|together|group|crew)\b/.test(q)
    ? "group"
    : "any";
  // Query text stays in this request. Neither it nor arbitrary words enter telemetry.
  const terms = [
    ...new Set(
      q
        .replace(/[^\p{L}\p{N}\s-]/gu, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 3 && !STOP_WORDS.has(t) && !/^\d+$/.test(t))
    ),
  ].slice(0, 12);
  const names: Record<DiscoveryIntent, string> = {
    explore: "Things to explore",
    adventure: "Adventures and challenges",
    meet: "Meet people",
    music: "Live music and performances",
    earn: "Paid creator opportunities",
    stories: "Community stories",
    surf: "Surf",
    food: "Food and coffee",
  };
  const notices = [];
  if (budgetToken && budget === null)
    notices.push(
      "That budget could not be interpreted. Try a PHP amount such as under ₱1,000."
    );
  if (maxBudgetPhp !== null)
    notices.push(
      "Only results with a stated PHP price within your budget are included. Unconfirmed prices stay out."
    );
  if (maxMinutes !== null)
    notices.push(
      "Duration is an estimate. Results without a stated duration stay out of your time budget."
    );
  if (/\b(open now|opening hours)\b/.test(q))
    notices.push(
      "Venue opening hours are not confirmed here. Check the place before travelling."
    );
  if (/\$|\busd\b|\beur\b/.test(q))
    notices.push(
      "Currency conversion is unavailable. Budget filters use stated PHP prices only."
    );
  if (
    /\b(weekend|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\d{4}-\d{2}-\d{2}/.test(
      q
    )
  )
    notices.push(
      "That date is not interpreted yet. Use tonight, tomorrow or the next two hours, and check the displayed event date."
    );
  const summary = [
    names[intent],
    when === "browse"
      ? "Upcoming and available"
      : when === "next2h"
      ? "Next two hours"
      : when[0].toUpperCase() + when.slice(1),
    maxBudgetPhp === null
      ? ""
      : maxBudgetPhp === 0
      ? "Free"
      : `Up to ₱${maxBudgetPhp}`,
    maxMinutes ? `Up to ${maxMinutes} min` : "",
    company === "solo"
      ? "Self-guided options"
      : company === "group"
      ? "Company welcome"
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    intent,
    when,
    maxBudgetPhp,
    maxMinutes,
    company,
    terms,
    summary,
    notices,
  };
}

/** Exact stated entry prices only; do not guess a range, minimum spend or converted currency. */
export function discoveryPrice(
  label: string | null | undefined
): number | null {
  const s = label?.trim() ?? "";
  if (/^(free|free entry|no entry fee)$/i.test(s)) return 0;
  const match =
    /^(?:₱|PHP\s*)(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?:\s*(?:per person|\/\s*person|entry))?$/i.exec(
      s
    );
  return match ? Number(match[1].replaceAll(",", "")) : null;
}
function localDayHour(
  now: Date,
  timeZone: string,
  dayOffset: number,
  hour = 0
) {
  const local = new Date(
    now.getTime() + parseUtcOffsetMinutes(now, timeZone) * 60000
  );
  const wall = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + dayOffset,
    hour
  );
  let utc = new Date(wall);
  for (let n = 0; n < 3; n++)
    utc = new Date(wall - parseUtcOffsetMinutes(utc, timeZone) * 60000);
  return utc.getTime();
}
export function discoveryWindow(
  when: DiscoveryWhen,
  now: Date,
  timeZone?: string
) {
  const tz = timeZone && isValidTimeZone(timeZone) ? timeZone : "UTC";
  if (when === "tomorrow")
    return { from: localDayHour(now, tz, 1), to: localDayHour(now, tz, 2) };
  if (when === "tonight") {
    const evening = localDayHour(now, tz, 0, 17);
    const end = tonightWindow(now, tz).endUtc.getTime();
    // Before 04:00 the active night has already begun.
    return {
      from:
        now.getTime() < end && end - now.getTime() < 4 * 3600000
          ? now.getTime()
          : Math.max(now.getTime(), evening),
      to: end,
    };
  }
  return {
    from: now.getTime(),
    to:
      now.getTime() +
      (when === "now" ? 0.5 : when === "next2h" ? 2 : 168) * 3600000,
  };
}
export function rankDiscoveryResults(
  candidates: DiscoveryResult[],
  interpretation: DiscoveryInterpretation,
  area: DiscoveryAreaInput,
  now: Date
) {
  const { from, to } = discoveryWindow(interpretation.when, now, area.timeZone);
  const seen = new Set<string>();
  return candidates
    .flatMap((result) => {
      const id = result.kind + ":" + result.key;
      if (seen.has(id)) return [];
      seen.add(id);
      if (
        result.place &&
        calculateDistance(
          area.lat,
          area.lng,
          result.place.lat,
          result.place.lng
        ) > area.radiusKm
      )
        return [];
      if (
        interpretation.maxBudgetPhp !== null &&
        (result.pricePhp === null ||
          result.pricePhp > interpretation.maxBudgetPhp)
      )
        return [];
      if (
        interpretation.maxMinutes !== null &&
        (result.minutes === null || result.minutes > interpretation.maxMinutes)
      )
        return [];
      if (interpretation.company === "solo" && result.kind === "MEETUP")
        return [];
      const historical = result.kind === "MOMENT" || result.kind === "STORY";
      if (
        historical &&
        ["now", "next2h", "tonight", "tomorrow"].includes(
          interpretation.when
        ) &&
        interpretation.intent !== "stories"
      )
        return [];
      if (result.endsAt && Date.parse(result.endsAt) <= from) return [];
      if (
        result.startsAt &&
        (Date.parse(result.startsAt) >= to ||
          (!result.endsAt && Date.parse(result.startsAt) < from))
      )
        return [];
      if (interpretation.when === "tomorrow" && !result.startsAt && !historical)
        return [];
      if (
        interpretation.when === "tonight" &&
        !result.startsAt &&
        !["ADVENTURE", "MISSION", "CHALLENGE"].includes(result.kind) &&
        interpretation.intent !== "stories"
      )
        return [];
      const text = [result.title, result.summary, ...result.categories]
        .join(" ")
        .toLowerCase();
      const matching = interpretation.terms.filter((t) => text.includes(t));
      const match =
        interpretation.intent === "explore"
          ? !interpretation.terms.length || matching.length > 0
          : interpretation.intent === "earn"
          ? result.kind === "MISSION"
          : interpretation.intent === "adventure"
          ? ["ADVENTURE", "CHALLENGE"].includes(result.kind)
          : interpretation.intent === "meet"
          ? result.kind === "MEETUP" || result.kind === "EVENT"
          : interpretation.intent === "stories"
          ? historical
          : interpretation.intent === "music"
          ? result.kind === "EVENT" &&
            /\b(music|gig|concert|dj|band|performance|jam)\b/.test(text)
          : interpretation.intent === "surf"
          ? /\b(surf|surfing|wave|waves)\b/.test(text)
          : /\b(food|coffee|cafe|café|restaurant|breakfast|dinner)\b/.test(
              text
            );
      if (!match) return [];
      const score =
        matching.length * 5 +
        (result.kind === "ADVENTURE" ? 4 : 0) +
        (result.kind === "EVENT" || result.kind === "MEETUP" ? 6 : 0) +
        (result.distanceKm !== null
          ? Math.max(0, 5 - result.distanceKm / 5)
          : 0) +
        (result.at && now.getTime() - Date.parse(result.at) < 7 * 86400000
          ? 2
          : 0);
      return [{ result, score }];
    })
    .sort(
      (a, b) => b.score - a.score || a.result.key.localeCompare(b.result.key)
    )
    .map((x) => x.result);
}
