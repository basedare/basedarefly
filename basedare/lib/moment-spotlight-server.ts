import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getPublicMoment, momentInclude, momentPosts } from "./moment-server";
import {
  compareMomentHref,
  parseSpotlightWeek,
  relatedAttempts,
  spotlightKey,
  spotlightWeek,
  WEEKLY_SPOTLIGHT_EVENT,
} from "./moment-motivation";

export async function removeWeeklySpotlights(
  tx: Prisma.TransactionClient,
  id: string
) {
  await tx.founderEvent.updateMany({
    where: {
      eventType: WEEKLY_SPOTLIGHT_EVENT,
      subjectId: id,
      status: "SELECTED",
    },
    data: { status: "REMOVED" },
  });
}
export async function getWeeklySpotlight(
  key = spotlightWeek().key,
  now = new Date()
) {
  const week = parseSpotlightWeek(key);
  if (!week || week.key > spotlightWeek(now).key) return null;
  const selection = await prisma.founderEvent.findUnique({
    where: { dedupeKey: spotlightKey(key) },
  });
  if (
    !selection ||
    selection.eventType !== WEEKLY_SPOTLIGHT_EVENT ||
    selection.status !== "SELECTED" ||
    !selection.subjectId
  )
    return null;
  const meta = selection.metadataJson as Record<string, unknown> | null;
  if (
    meta?.week !== key ||
    meta?.startsAt !== week.startsAt ||
    meta?.endsAt !== week.endsAt ||
    meta?.momentId !== selection.subjectId
  )
    return null;
  const post = await getPublicMoment(selection.subjectId);
  // Approval, current display/spotlight/credit permissions and active creator identity
  // are re-evaluated for every page/card. A historical selection is never authority.
  if (!post?.featured || !post.creatorTag) return null;
  return { week, post, current: spotlightWeek(now).key === week.key };
}
export async function getMomentComparison(first: string, second: string) {
  if (
    ![first, second].every((id) => /^[a-zA-Z0-9-]{8,80}$/.test(id)) ||
    first === second
  )
    return null;
  const rows = await prisma.adventureSubmission.findMany({
    where: { id: { in: [first, second] }, status: "APPROVED" },
    include: momentInclude,
  });
  if (rows.length !== 2 || !relatedAttempts(rows[0], rows[1])) return null;
  const parent = rows.find((row) =>
    rows.some((other) => other.parentMomentId === row.id)
  )!;
  const reply = rows.find((row) => row.id !== parent.id)!;
  const posts = await momentPosts([parent, reply]);
  if (posts.length !== 2) return null;
  return {
    left: posts[0],
    right: posts[1],
    href: compareMomentHref(parent.id, reply.id),
  };
}
