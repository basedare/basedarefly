// Night-1 Drop invite config + shared types. CLIENT-SAFE (no server-only imports).
// "Build the invite unit, not the Drop system" — one Drop, hardcoded.
// Player-facing copy avoids the word "Drop"; internally these are Drops.

export type GamePref = 'pool' | 'darts' | 'either';

export type DropConfig = {
  slug: string;
  title: string; // player-facing — NOT "Drop"
  tagline: string;
  details: string;
  capacity: number; // max spots
  unlockAt: number; // min RSVPs to confirm the night happens ("unlocks at N")
  venue: string;
  whenLabel: string; // human label, e.g. "Thursday · 7–9pm"
};

export const GAME_OPTIONS: { value: GamePref; label: string }[] = [
  { value: 'pool', label: 'Pool' },
  { value: 'darts', label: 'Darts' },
  { value: 'either', label: 'Either' },
];

export const DROPS: Record<string, DropConfig> = {
  'hideaway-games-night': {
    slug: 'hideaway-games-night',
    title: 'Hideaway Games Night',
    tagline: "Come solo. We'll match you with a crew.",
    details: 'Pool + darts · one eligible purchase unlocks the night.',
    capacity: 12,
    unlockAt: 8,
    venue: 'Hideaway',
    whenLabel: 'This week · 7–9pm',
  },
};

export function getDrop(slug: string): DropConfig | null {
  return DROPS[slug] ?? null;
}

export function isGamePref(value: unknown): value is GamePref {
  return value === 'pool' || value === 'darts' || value === 'either';
}

export type RosterEntry = { handle: string; gamePref: GamePref };

export type RosterView = {
  joined: number;
  capacity: number;
  spotsLeft: number;
  waitlist: number;
  unlocked: boolean; // joined >= unlockAt → the night is confirmed
  toUnlock: number; // RSVPs still needed to lock it in (0 once unlocked)
  roster: RosterEntry[];
};
