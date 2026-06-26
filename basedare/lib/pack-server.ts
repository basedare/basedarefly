import 'server-only';
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { FOUNDING_CAP, type BoardRow } from '@/lib/pack';

/** Normalize a mark's secret word for hashing/comparison (case + whitespace insensitive). */
export function normalizeMarkWord(word: string): string {
  return word.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Hash a mark word. We store + compare the hash only — never plaintext, never returned by any API. */
export function hashMarkWord(word: string): string {
  return createHash('sha256').update(normalizeMarkWord(word)).digest('hex');
}

/** Pack board = SUM(points) per member, ranked. Derived, never a stored counter. */
export async function getPackBoard(packId: string, limit = 50): Promise<BoardRow[]> {
  const grouped = await prisma.packClaim.groupBy({
    by: ['packMemberId'],
    where: { packId },
    _sum: { points: true },
    _min: { createdAt: true },
    orderBy: [
      { _sum: { points: 'desc' } },
      { _min: { createdAt: 'asc' } }, // stable tie-break: earliest claimer ranks higher (rewards being early)
    ],
    take: limit,
  });
  if (grouped.length === 0) return [];

  const members = await prisma.packMember.findMany({
    where: { id: { in: grouped.map((g) => g.packMemberId) } },
    select: { id: true, handle: true },
  });
  const handleById = new Map(members.map((m) => [m.id, m.handle]));
  const totalMembers = await prisma.packMember.count({ where: { packId } });
  const founding = totalMembers <= FOUNDING_CAP;

  return grouped.map((g, index) => ({
    handle: handleById.get(g.packMemberId) ?? 'unknown',
    points: g._sum.points ?? 0,
    rank: index + 1,
    founding,
  }));
}
