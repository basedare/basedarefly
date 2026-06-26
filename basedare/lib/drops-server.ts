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

  const rows = await prisma.dropRsvp.findMany({
    where: { dropSlug },
    orderBy: { createdAt: 'asc' },
    select: { handle: true, gamePref: true, status: true },
  });

  const joined = rows.filter((row) => row.status === 'joined');
  const waitlist = rows.filter((row) => row.status === 'waitlist');

  return {
    joined: joined.length,
    capacity,
    spotsLeft: Math.max(0, capacity - joined.length),
    waitlist: waitlist.length,
    roster: joined.map((row) => ({ handle: row.handle, gamePref: row.gamePref as GamePref })),
  };
}

/** WhatsApp group invite — server-only env, revealed only after a successful RSVP. */
export function getDropWhatsappUrl(): string {
  return process.env.DROP_WHATSAPP_URL?.trim() || '';
}
