import 'server-only';
import { prisma } from '@/lib/prisma';
import { DROPS, type GamePref, type RosterView } from '@/lib/drops';

const DEFAULT_CAPACITY = 12;

/**
 * Roster view for a Drop. Returns ONLY public fields (handle + game pref) —
 * private contact info (WhatsApp/IG) is never selected, so it can't leak.
 */
export async function getRosterView(dropSlug: string): Promise<RosterView> {
  const capacity = DROPS[dropSlug]?.capacity ?? DEFAULT_CAPACITY;
  const unlockAt = DROPS[dropSlug]?.unlockAt ?? capacity;

  const rows = await prisma.dropRsvp.findMany({
    where: { dropSlug },
    orderBy: { createdAt: 'asc' },
    select: { handle: true, gamePref: true, status: true },
  });

  const joined = rows.filter((row) => row.status === 'joined');
  const waitlist = rows.filter((row) => row.status === 'waitlist');
  const joinedCount = joined.length;

  return {
    joined: joinedCount,
    capacity,
    spotsLeft: Math.max(0, capacity - joinedCount),
    waitlist: waitlist.length,
    unlocked: joinedCount >= unlockAt,
    toUnlock: Math.max(0, unlockAt - joinedCount),
    roster: joined.map((row) => ({ handle: row.handle, gamePref: row.gamePref as GamePref })),
  };
}

/** Group-chat invite — chat-app agnostic (WhatsApp / Telegram / Messenger, set per
 * Drop via env). Server-only; the route returns it only for confirmed ('joined') RSVPs. */
export function getDropGroupUrl(): string {
  return process.env.DROP_GROUP_URL?.trim() || '';
}
