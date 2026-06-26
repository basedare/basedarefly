// Pack Mark v0 — client-safe constants / types / helpers (no server-only imports).

export const FOUNDING_CAP = 50; // while a pack has <= this many members, the board is "Founding Pack"

export type BoardRow = { handle: string; points: number; rank: number; founding: boolean };

export type ClaimResult = {
  handle: string;
  points: number; // the member's running total
  rank: number;
  founding: boolean;
  alreadyClaimed: boolean;
  markName: string;
  board: BoardRow[];
};

/** Normalize a handle: strip @, lowercase, spaces→_, keep [a-z0-9_], cap length. */
export function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30);
}

export function displayHandle(handle: string): string {
  return handle.startsWith('@') ? handle : `@${handle}`;
}
