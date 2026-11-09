import { createDiscoveryQr, updateDiscoveryQr } from '@/lib/discovery-qr-server';
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
  const followedWallet = privateKeyToAccount(('0x' + '2'.repeat(64)) as `0x${string}`).address.toLowerCase();
  const followed = await prisma.streamerTag.create({ data: { id: 'local-following-person', tag: '@fixture-followed', walletAddress: followedWallet, status: 'ACTIVE', verificationMethod: 'local-fixture' } });
  const followedVenue = await prisma.venue.create({ data: { id: 'local-following-venue', slug: 'local-following-place', name: 'Local social fixture place', city: 'General Luna', latitude: 9.79, longitude: 126.15, timezone: 'Asia/Manila', claimedBy: followedWallet, claimedAt: new Date(), claimRequestStatus: 'APPROVED' } });
  await prisma.founderEvent.create({ data: { id: 'local-following-story', eventType: 'LOCAL_SIGNAL', subjectType: 'community_story', subjectId: followed.id, dedupeKey: 'local-following-story', title: 'Local social fixture — no real participant', status: 'APPROVED', venueId: followedVenue.id, venueSlug: followedVenue.slug, metadataJson: { postType: 'story', authorTagId: followed.id, authorWallet: followedWallet, publicConsentVersion: 'community-story-display-v1', notes: 'A disposable place-linked story for browser verification.', venueName: followedVenue.name, city: 'General Luna', latitude: 9.79, longitude: 126.15 } } });
  await prisma.venueEvent.create({ data: { id: 'local-following-event', slug: 'local-following-event', venueId: followedVenue.id, title: 'Local social fixture event — not a real gathering', category: 'music', startsAt: new Date(Date.now() + 7200000), endsAt: new Date(Date.now() + 10800000), timezone: 'Asia/Manila', sourceLabel: 'Disposable fixture only', trustLevel: 'VENUE_POSTED', lastConfirmedAt: new Date(), expiresAt: new Date(Date.now() + 14400000) } });
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
  const qr = await createDiscoveryQr({ slug: 'local-fixture-qr', creatorCode: 'basedare', contentCode: 'local-fixture-placement', campaignCode: 'local-fixture-only', placementPermissionConfirmed: true, discoveryQr: { kind: 'ADVENTURE', key: 'postcard', hostVenueSlug: 'local-following-place', expiresInDays: 7 } }, 'local-fixture');
  await updateDiscoveryQr({ linkId: qr.id, active: true }, 'local-fixture');
  const week = spotlightWeek();
  await prisma.founderEvent.create({ data: { eventType: WEEKLY_SPOTLIGHT_EVENT, dedupeKey: spotlightKey(week.key), subjectType: "ADVENTURE_SUBMISSION", subjectId: "moment-browser-approved", status: "SELECTED", source: "local-fixture", title: "Local fixture selection only", metadataJson: { week: week.key, startsAt: week.startsAt, endsAt: week.endsAt, momentId: "moment-browser-approved" } } });
}
seed().finally(() => prisma.$disconnect());
