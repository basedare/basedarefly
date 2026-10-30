import { privateKeyToAccount } from "viem/accounts";
import { prisma } from "@/lib/prisma";
import { adventureHashtag } from "@/lib/adventure-sharing";
const target = new URL(process.env.DATABASE_URL || "");
if (
  target.hostname !== "127.0.0.1" ||
  target.pathname !== "/basedare_moment_browser_test"
)
  throw Error("Disposable local browser database required.");
async function seed() {
  const wallet = privateKeyToAccount(
    ("0x" + "1".repeat(64)) as `0x${string}`,
  ).address.toLowerCase();
  const host = await prisma.streamerTag.create({
    data: {
      tag: "@fixture-meetup-host",
      walletAddress: "0x2222222222222222222222222222222222222222",
      status: "ACTIVE",
      verificationMethod: "local-fixture",
    },
  });
  await prisma.streamerTag.create({
    data: {
      tag: "@fixture-participant",
      walletAddress: wallet,
      status: "ACTIVE",
      verificationMethod: "local-fixture",
    },
  });
  await prisma.meetup.create({
    data: {
      id: "moment-browser-meetup",
      creatorBaretagId: host.id,
      title: "Local verification fixture meetup — not a real event",
      type: "custom",
      placeLabel: "Fixture public meeting place",
      approxLat: 9.79,
      approxLng: 126.15,
      startTime: new Date(Date.now() + 7200000),
      note: "Local verification only. No actual participants or hosted activity.",
      rsvps: { create: { baretagId: host.id } },
    },
  });

  await prisma.adventureSubmission.createMany({
    data: [
      {
        id: "moment-browser-approved",
        wallet: "0x1111111111111111111111111111111111111111",
        activityId: "wave-or-ex",
        runId: "browser-approved-run",
        caption:
          "Local verification fixture — not a real participant. A take on Wave or Ex?",
        hashtag: adventureHashtag("wave-or-ex"),
        socialUrl: "https://www.instagram.com/reel/Fixture01/",
        socialPlatform: "INSTAGRAM",
        mediaType: "SOCIAL",
        publicConsentVersion: "adventure-display-v2",
        creatorCreditConsent: false,
        status: "APPROVED",
        reviewedAt: new Date(),
      },
      {
        id: "moment-browser-fresh",
        wallet: "0x2222222222222222222222222222222222222222",
        activityId: "coconut-ceo",
        runId: "browser-fresh-run",
        caption:
          "Local verification fixture — not a real participant. A Coconut CEO pitch.",
        hashtag: adventureHashtag("coconut-ceo"),
        socialUrl: "https://www.instagram.com/reel/FixtureFresh01/",
        socialPlatform: "INSTAGRAM",
        mediaType: "SOCIAL",
        publicConsentVersion: "adventure-display-v2",
        creatorCreditConsent: false,
        status: "APPROVED",
        reviewedAt: new Date(),
      },
      {
        id: "moment-browser-pending",
        wallet: "0x1111111111111111111111111111111111111111",
        activityId: "wave-or-ex",
        runId: "browser-pending-run",
        caption: "PRIVATE PENDING FIXTURE — must not appear publicly.",
        hashtag: adventureHashtag("wave-or-ex"),
        socialUrl: "https://www.instagram.com/reel/Fixture02/",
        socialPlatform: "INSTAGRAM",
        mediaType: "SOCIAL",
        publicConsentVersion: "adventure-display-v2",
        status: "PENDING",
      },
    ],
  });
}
seed().finally(() => prisma.$disconnect());
