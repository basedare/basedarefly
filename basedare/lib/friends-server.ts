import "server-only";
import { prisma } from "@/lib/prisma";
import { friendPair } from "@/lib/adventure-sharing";
export async function changeFriend(
  wallet: string,
  target: string,
  action: "request" | "accept" | "remove",
) {
  if (wallet === target) throw new Error("That is your own profile.");
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"friend-sender:" + wallet}))`;
    const pairKey = friendPair(wallet, target);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${pairKey}))`;
    const identities = await tx.streamerTag.findMany({
      where: { walletAddress: { in: [wallet, target] } },
      select: { id: true, walletAddress: true },
    });
    const ownIds = identities
      .filter((p) => p.walletAddress === wallet)
      .map((p) => p.id);
    const otherIds = identities
      .filter((p) => p.walletAddress === target)
      .map((p) => p.id);
    const blocked = await tx.meetupBlock.findFirst({
      where: {
        OR: [
          {
            blockerBaretagId: { in: ownIds },
            blockedBaretagId: { in: otherIds },
          },
          {
            blockerBaretagId: { in: otherIds },
            blockedBaretagId: { in: ownIds },
          },
        ],
      },
    });
    if (blocked) throw new Error("This connection is unavailable.");
    const existing = await tx.friendConnection.findUnique({
      where: { pairKey },
    });
    if (action === "remove") {
      if (existing)
        await tx.friendConnection.update({
          where: { pairKey },
          data: { status: "CLOSED" },
        });
      return;
    }
    if (action === "accept") {
      if (
        !existing ||
        existing.recipient !== wallet ||
        existing.status !== "PENDING"
      )
        throw new Error("This request is no longer waiting for you.");
      await tx.friendConnection.update({
        where: { pairKey },
        data: { status: "ACCEPTED" },
      });
      await tx.notification.create({
        data: {
          wallet: target,
          type: "FRIEND_ACCEPTED",
          title: "Friend request accepted",
          message: "You can find your connection in Community.",
          link: "/community?people=1",
        },
      });
      return;
    }
    if (existing) {
      if (existing.status === "CLOSED")
        throw new Error("This connection was closed. No new request was sent.");
      return;
    }
    const profiles = await tx.streamerTag.findMany({
      where: {
        walletAddress: { in: [wallet, target] },
        status: { in: ["ACTIVE", "VERIFIED"] },
      },
      select: { walletAddress: true },
    });
    if (
      !profiles.some((p) => p.walletAddress === wallet) ||
      !profiles.some((p) => p.walletAddress === target)
    )
      throw new Error("Both people need a public profile to connect.");
    if (
      (await tx.friendConnection.count({
        where: {
          requester: wallet,
          createdAt: { gte: new Date(Date.now() - 86400000) },
        },
      })) >= 20
    )
      throw new Error("Daily request limit reached.");
    await tx.friendConnection.create({
      data: { pairKey, requester: wallet, recipient: target },
    });
    await tx.notification.create({
      data: {
        wallet: target,
        type: "FRIEND_REQUEST",
        title: "New friend request",
        message: "Accept or decline in Community.",
        link: "/community?people=1",
      },
    });
  });
}
