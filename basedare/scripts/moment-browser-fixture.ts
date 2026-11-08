import { privateKeyToAccount } from "viem/accounts";
import { prisma } from "@/lib/prisma";
import { adventureHashtag } from "@/lib/adventure-sharing";
import { spotlightKey, spotlightWeek, WEEKLY_SPOTLIGHT_EVENT } from "@/lib/moment-motivation";
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
  await prisma.streamerTag.create({ data: { tag: "@fixture-first-take", walletAddress: "0x1111111111111111111111111111111111111111", status: "ACTIVE", verificationMethod: "local-fixture" } });
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
  const storyAuthor = await prisma.streamerTag.findFirstOrThrow({ where: { walletAddress: wallet } });
  const storyVenue = await prisma.venue.create({ data: { slug: 'local-story-browser-place', name: 'Local fixture place', city: 'General Luna', latitude: 9.79, longitude: 126.15 } });
  await prisma.founderEvent.create({ data: { id: 'local-story-browser-fixture', eventType: 'LOCAL_SIGNAL', subjectType: 'community_story', subjectId: storyAuthor.id, dedupeKey: 'local-story-browser-fixture', title: 'Local story fixture — not a real participant', status: 'APPROVED', venueId: storyVenue.id, venueSlug: storyVenue.slug, metadataJson: { postType: 'story', category: 'community', authorTagId: storyAuthor.id, authorWallet: wallet, publicConsentVersion: 'community-story-display-v1', notes: 'Three little details worth looking at. Disposable local browser verification only.', venueName: storyVenue.name, city: 'General Luna', latitude: 9.79, longitude: 126.15, startsAt: new Date().toISOString() } } });

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
        creatorCreditConsent: true,
        spotlightConsent: true,
        featuredAt: new Date(),
        status: "APPROVED",
        reviewedAt: new Date(),
      },
      {
        id: "moment-browser-reply",
        wallet: "0x2222222222222222222222222222222222222222",
        activityId: "wave-or-ex",
        runId: "browser-reply-run",
        parentMomentId: "moment-browser-approved",
        caption: "Local verification fixture — not a real participant. A different dramatic take.",
        hashtag: adventureHashtag("wave-or-ex"),
        socialUrl: "https://www.instagram.com/reel/FixtureReply01/",
        mediaType: "SOCIAL",
        publicConsentVersion: "adventure-display-v2",
        creatorCreditConsent: true,
        status: "APPROVED",
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
  const week = spotlightWeek();
  await prisma.founderEvent.create({ data: { eventType: WEEKLY_SPOTLIGHT_EVENT, dedupeKey: spotlightKey(week.key), subjectType: "ADVENTURE_SUBMISSION", subjectId: "moment-browser-approved", status: "SELECTED", source: "local-fixture", title: "Local fixture selection only", metadataJson: { week: week.key, startsAt: week.startsAt, endsAt: week.endsAt, momentId: "moment-browser-approved" } } });
}
seed().finally(() => prisma.$disconnect());
