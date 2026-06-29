/**
 * BaseDare markets — the city cells where missions can happen.
 * Single source of truth for the homepage Markets section, the /markets route,
 * and the city-aware /creators/signup landing.
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
  /** Creator-side CTA label (Sign Up when live, Join waitlist when scouting). */
  creatorCta: string;
};

export const MARKETS: Market[] = [
  {
    slug: 'siargao',
    name: 'Siargao / General Luna',
    status: 'Founding market · live',
    live: true,
    blurb: 'Beach bars, hostel nights, surf crews, and the first verified creator missions.',
    gradient: 'from-[#0d2b2b] via-[#0a1a1e] to-[#070f14]',
    accent: 'text-[#f5c518]',
    creatorCta: 'Creator Sign Up',
  },
  {
    slug: 'bali',
    name: 'Bali',
    status: 'Coming next · scouting',
    live: false,
    blurb: 'Beach clubs, cafés, creator routes, and travel crowds.',
    gradient: 'from-[#0d2a1a] via-[#0a1a16] to-[#06110d]',
    accent: 'text-emerald-300',
    creatorCta: 'Join waitlist',
  },
  {
    slug: 'manila',
    name: 'Manila',
    status: 'Scouting now',
    live: false,
    blurb: 'Nightlife, campus energy, food missions, and brand activations.',
    gradient: 'from-[#241040] via-[#180e29] to-[#0b0716]',
    accent: 'text-fuchsia-300',
    creatorCta: 'Join waitlist',
  },
  {
    slug: 'sydney',
    name: 'Sydney / Bondi',
    status: 'Scouting now',
    live: false,
    blurb: 'Run clubs, beach routes, cafés, and local proof missions.',
    gradient: 'from-[#0a1f3a] via-[#0a1626] to-[#060f1a]',
    accent: 'text-cyan-300',
    creatorCta: 'Join waitlist',
  },
];

/** Look up a market by slug (e.g. from a `?city=` param). Case-insensitive. */
export function getMarket(slug?: string | null): Market | undefined {
  if (!slug) return undefined;
  const key = slug.trim().toLowerCase();
  return MARKETS.find((m) => m.slug === key);
}
