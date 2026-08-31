/**
 * BaseDare markets — the city cells where missions can happen.
 * Single source of truth for the homepage Markets section and city-aware
 * contributor/buyer entry links.
 *
 * Honesty rule (see docs/PHILOSOPHY.md — one city, one loop, real proof):
 * exactly ONE market is `live` (Siargao, the founding beachhead). Everything
 * else is honestly `scouting` / waitlist — never fake "active jobs" counts.
 * Client-safe (no server imports) so any surface can read it.
 */

export type Market = {
  slug: string;
  /** Display name shown on the card (city cell). */
  name: string;
  /** Honest status chip label. */
  status: string;
  /** Only Siargao is live; others are scouting/waitlist. */
  live: boolean;
  /** Short scene description. */
  blurb: string;
  /** Tailwind gradient classes for the card cover (dark, on-brand — no stock photos). */
  gradient: string;
  /** Accent color class for icon + status chip. */
  accent: string;
  /** Contributor-side CTA label. Identity is optional and never gates paid work. */
  contributorCta: string;
};

export const MARKETS: Market[] = [
  {
    slug: 'siargao',
    name: 'Siargao / General Luna',
    status: 'Founding market · live',
    live: true,
    blurb: 'Live paid missions around General Luna, plus local surf crews and venue events.',
    gradient: 'from-[#0d2b2b] via-[#0a1a1e] to-[#070f14]',
    accent: 'text-[#f5c518]',
    contributorCta: 'Find paid missions',
  },
  {
    slug: 'bali',
    name: 'Bali',
    status: 'Scouting interest',
    live: false,
    blurb: 'Beach clubs, cafés and travel communities we are considering next.',
    gradient: 'from-[#0d2a1a] via-[#0a1a16] to-[#06110d]',
    accent: 'text-emerald-300',
    contributorCta: 'Get mission alerts',
  },
  {
    slug: 'manila',
    name: 'Manila',
    status: 'Scouting now',
    live: false,
    blurb: 'Nightlife, campuses and food scenes we are scouting for future missions.',
    gradient: 'from-[#241040] via-[#180e29] to-[#0b0716]',
    accent: 'text-fuchsia-300',
    contributorCta: 'Get mission alerts',
  },
  {
    slug: 'sydney',
    name: 'Sydney / Bondi',
    status: 'Scouting now',
    live: false,
    blurb: 'Run clubs, beaches and cafés we are scouting for future missions.',
    gradient: 'from-[#0a1f3a] via-[#0a1626] to-[#060f1a]',
    accent: 'text-cyan-300',
    contributorCta: 'Get mission alerts',
  },
];

/** Look up a market by slug (e.g. from a `?city=` param). Case-insensitive. */
export function getMarket(slug?: string | null): Market | undefined {
  if (!slug) return undefined;
  const key = slug.trim().toLowerCase();
  return MARKETS.find((m) => m.slug === key);
}

export type MarketAction = {
  label: string;
  href: string;
};

/**
 * Keep role and destination aligned:
 * - contributors inspect value before identity;
 * - buyers fund the actual paid-mission builder;
 * - @tag remains an optional public identity step;
 * - scouting markets collect honest mission alerts, not fake sign-ups.
 */
export function getMarketActions(market: Market): {
  contributor: MarketAction;
  buyer: MarketAction | null;
  community: MarketAction | null;
  identity: MarketAction | null;
} {
  const city = encodeURIComponent(market.slug);

  if (!market.live) {
    return {
      contributor: {
        label: market.contributorCta,
        href: `/earn?alerts=1&city=${city}&source=markets#mission-alerts`,
      },
      buyer: null,
      community: null,
      identity: null,
    };
  }

  return {
    contributor: {
      label: market.contributorCta,
      href: `/earn?city=${city}&source=markets`,
    },
    buyer: {
      label: 'Fund a mission',
      href: `/create?city=${city}&source=markets`,
    },
    community: {
      label: 'Open Community',
      href: `/community?city=${city}&source=markets`,
    },
    identity: {
      label: 'Claim your @tag',
      href: `/claim-tag?city=${city}&source=markets`,
    },
  };
}
