import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { Prisma, type FounderEvent } from "@prisma/client";
import { momentCreditAllowed, publicMomentAllowed } from "./adventure-evidence";
import { publicSocialPost } from "./social-post-url";
import { prisma } from "./prisma";
import {
  contributionPilotEnabled,
  pilotCommandSchema,
  pilotPolicySchema,
  pilotSourceKey,
  pilotWindowOpen,
  PILOT_AUDIT_EVENT,
  PILOT_AWARD_EVENT,
  PILOT_CAMPAIGN_EVENT,
  PILOT_LIMIT,
  PILOT_NOTICE,
  PILOT_XP_AWARD,
  PILOT_XP_REVERSAL,
  type PilotAdminSnapshot,
  type PilotAward,
  type PilotCampaign,
  type PilotPolicy,
  type PilotSourceKind,
  type PublicPilot,
} from "./contribution-pilot";

type Tx = Prisma.TransactionClient;
type AwardMetadata = {
  version: 1;
  policyVersion: 1;
  campaignId: string;
  sourceKind: PilotSourceKind;
  sourceId: string;
  wallet: string;
  identityId: string;
  identityTag: string;
  publicLeaderboardConsent: boolean;
  xp: number;
  pointsId: string;
  recognitionKey: string;
};
export class PilotError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}
const bad = (message = "This contribution is not eligible.") =>
  new PilotError(409, message);
function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
function draftKey(actor: string, policy: PilotPolicy) {
  // Parsed fields have a stable order; activity membership and time instants
  // remain the same policy when input order or UTC notation changes.
  const canonical = {
    actor: actor.trim().toLowerCase(),
    policy: {
      ...policy,
      startsAt: new Date(policy.startsAt).toISOString(),
      endsAt: new Date(policy.endsAt).toISOString(),
      activityIds: [...policy.activityIds].sort(),
    },
  };
  return `contribution-pilot:campaign:v1:${createHash("sha256").update(JSON.stringify(canonical)).digest("hex")}`;
}
function awardMetadata(row: FounderEvent): AwardMetadata | null {
  const m = row.metadataJson as Partial<AwardMetadata> | null;
  return m?.version === 1 &&
    m.policyVersion === 1 &&
    typeof m.campaignId === "string" &&
    ["VENUE_CHECK_IN", "REVIEWED_CREATION"].includes(m.sourceKind ?? "") &&
    typeof m.sourceId === "string" &&
    typeof m.wallet === "string" &&
    typeof m.identityId === "string" &&
    typeof m.identityTag === "string" &&
    typeof m.publicLeaderboardConsent === "boolean" &&
    Number.isSafeInteger(m.xp) &&
    (m.xp ?? 0) > 0 &&
    typeof m.pointsId === "string" &&
    typeof m.recognitionKey === "string"
    ? (m as AwardMetadata)
    : null;
}
function campaign(row: FounderEvent | null): PilotCampaign | null {
  const parsed = pilotPolicySchema.safeParse(row?.metadataJson);
  return row?.eventType === PILOT_CAMPAIGN_EVENT && parsed.success
    ? {
        id: row.id,
        status: row.status ?? "DRAFT",
        policy: parsed.data,
        createdAt: row.createdAt.toISOString(),
      }
    : null;
}
async function lock(tx: Tx) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('contribution-pilot:v1'))::text`;
}
async function currentCampaign(tx: Tx, id: string) {
  const c = campaign(await tx.founderEvent.findUnique({ where: { id } }));
  if (!c) throw new PilotError(404, "Campaign unavailable.");
  return c;
}
async function venueCurrent(tx: Tx, policy: PilotPolicy) {
  if (!policy.venueId) return null;
  const venue = await tx.venue.findFirst({
    where: { id: policy.venueId, status: "ACTIVE" },
    select: { id: true, name: true, slug: true },
  });
  if (!venue) throw bad("The campaign place is unavailable.");
  return venue;
}
async function audit(
  tx: Tx,
  actor: string,
  action: string,
  campaignId: string,
  extra: object = {}
) {
  await tx.founderEvent.create({
    data: {
      eventType: PILOT_AUDIT_EVENT,
      subjectType: "contribution_pilot",
      subjectId: campaignId,
      dedupeKey: `contribution-pilot:audit:${randomUUID()}`,
      actor,
      status: "RECORDED",
      metadataJson: json({ version: 1, action, campaignId, ...extra }),
    },
  });
}
async function evidence(
  tx: Tx,
  kind: PilotSourceKind,
  id: string,
  policy: PilotPolicy,
  now: Date,
  forAward = false
) {
  if (id.startsWith("seed-")) return null;
  if (forAward && policy.venueId)
    await tx.$queryRaw`SELECT id FROM "Venue" WHERE id = ${policy.venueId} FOR SHARE`;
  let wallet: string, at: Date, recognitionKey: string;
  if (kind === "VENUE_CHECK_IN") {
    if (!policy.venueId || policy.xp.venueVisit === 0) return null;
    if (forAward)
      await tx.$queryRaw`SELECT id FROM "VenueCheckIn" WHERE id = ${id} FOR SHARE`;
    const row = await tx.venueCheckIn.findUnique({
      where: { id },
      include: { venue: true, session: true },
    });
    if (
      !row ||
      row.status !== "CONFIRMED" ||
      row.proofLevel !== "QR_AND_GPS" ||
      row.source !== "VENUE_QR" ||
      !row.venueSessionId ||
      !row.qrTokenHash ||
      row.geoDistanceMeters == null ||
      row.geoDistanceMeters < 0 ||
      row.geoDistanceMeters > row.venue.checkInRadiusMeters ||
      row.venue.status !== "ACTIVE" ||
      row.venueId !== policy.venueId ||
      !row.session ||
      row.session.venueId !== row.venueId ||
      row.session.scope !== "VENUE_CHECKIN" ||
      row.scannedAt < row.session.startedAt ||
      (row.session.endsAt && row.scannedAt >= row.session.endsAt)
    )
      return null;
    wallet = row.walletAddress.toLowerCase();
    at = row.scannedAt;
    recognitionKey = `visit:${row.venueId}`;
  } else {
    if (policy.xp.reviewedCreation === 0) return null;
    if (forAward)
      await tx.$queryRaw`SELECT id FROM "AdventureSubmission" WHERE id = ${id} FOR SHARE`;
    const row = await tx.adventureSubmission.findUnique({
      where: { id },
      include: { venue: true },
    });
    if (
      !row ||
      !publicMomentAllowed(row) ||
      !momentCreditAllowed(row) ||
      !row.reviewedAt ||
      row.reviewedAt > now ||
      !row.reviewedBy ||
      !policy.activityIds.includes(row.activityId) ||
      (policy.venueId && row.venue?.id !== policy.venueId)
    )
      return null;
    if (forAward && row.venue) {
      await tx.$queryRaw`SELECT id FROM "Venue" WHERE id = ${row.venue.id} FOR SHARE`;
      if (
        !(await tx.venue.findFirst({
          where: { id: row.venue.id, status: "ACTIVE" },
          select: { id: true },
        }))
      )
        return null;
    }
    let legacyMedia = false;
    try {
      const url = new URL(row.mediaUrl ?? "");
      legacyMedia = url.protocol === "https:" && !url.username && !url.password;
    } catch {
      /* No fabricated media. */
    }
    if (
      !row.privateMediaCid &&
      !publicSocialPost(row.socialUrl) &&
      !legacyMedia
    )
      return null;
    wallet = row.wallet.toLowerCase();
    at = row.createdAt;
    recognitionKey = `creation:${row.activityId}`;
  }
  if (
    !/^0x[0-9a-f]{40}$/.test(wallet) ||
    !pilotWindowOpen(policy, at) ||
    at > now
  )
    return null;
  if (forAward) {
    await tx.$queryRaw`SELECT id FROM "StreamerTag" WHERE lower("walletAddress") = ${wallet} FOR SHARE`;
  }
  const identity = await tx.streamerTag.findFirst({
    where: {
      walletAddress: { equals: wallet, mode: "insensitive" },
      status: { in: ["ACTIVE", "VERIFIED"] },
      revokedAt: null,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, tag: true },
  });
  if (!identity || !/^@[a-zA-Z0-9_.-]{1,64}$/.test(identity.tag)) return null;
  return {
    wallet,
    identityId: identity.id,
    identityTag: identity.tag,
    recognitionKey,
  };
}
async function reversed(tx: Tx, id: string) {
  return Boolean(
    await tx.founderEvent.findUnique({
      where: { dedupeKey: `contribution-pilot:reverse:${id}` },
      select: { id: true },
    })
  );
}
async function leaderboardWithdrawn(
  tx: Tx,
  campaignId: string,
  wallet: string
) {
  return Boolean(
    await tx.founderEvent.findUnique({
      where: {
        dedupeKey: `contribution-pilot:leaderboard-withdraw:${campaignId}:${wallet}`,
      },
      select: { id: true },
    })
  );
}
async function currentAward(
  tx: Tx,
  row: FounderEvent,
  policy: PilotPolicy,
  now: Date
) {
  const m = awardMetadata(row);
  if (!m || (await reversed(tx, row.id))) return null;
  const source = await evidence(tx, m.sourceKind, m.sourceId, policy, now);
  if (
    !source ||
    source.wallet !== m.wallet ||
    source.identityId !== m.identityId ||
    source.identityTag !== m.identityTag
  )
    return null;
  const points = await tx.pointsEvent.findFirst({
    where: {
      id: m.pointsId,
      walletAddress: m.wallet,
      type: PILOT_XP_AWARD,
      sourceId: pilotSourceKey(m.sourceKind, m.sourceId),
      points: m.xp,
    },
    select: { id: true },
  });
  return points ? m : null;
}

/** Only server/admin evidence decisions write. Global lock is intentionally conservative for the small pilot. */
export async function applyPilotCommand(raw: unknown, actor: string) {
  const command = pilotCommandSchema.parse(raw);
  return prisma.$transaction(
    async (tx) => {
      await lock(tx);
      const now = new Date();
      if (command.action === "create") {
        const dedupeKey = draftKey(actor, command.policy);
        const priorRow = await tx.founderEvent.findUnique({ where: { dedupeKey } });
        if (priorRow) {
          const prior = campaign(priorRow);
          if (!prior) throw bad("The existing campaign requires review.");
          // A retry never changes status, including expired or CLOSED campaigns.
          return { campaignId: prior.id, status: prior.status, duplicate: true };
        }
        if (Date.parse(command.policy.endsAt) <= now.getTime())
          throw bad("Use an unexpired campaign window.");
        await venueCurrent(tx, command.policy);
        const row = await tx.founderEvent.create({
          data: {
            eventType: PILOT_CAMPAIGN_EVENT,
            subjectType: "contribution_pilot",
            dedupeKey,
            status: "DRAFT",
            actor,
            title: command.policy.title,
            metadataJson: json(command.policy),
          },
        });
        await audit(tx, actor, "create", row.id);
        return { campaignId: row.id, status: "DRAFT", duplicate: false };
      }
      if (
        command.action === "reverse" ||
        command.action === "withdrawLeaderboardConsent"
      ) {
        const row = await tx.founderEvent.findFirst({
          where: { id: command.awardId, eventType: PILOT_AWARD_EVENT },
        });
        const m = row && awardMetadata(row);
        if (!row || !m) throw new PilotError(404, "Award unavailable.");
        if (command.action === "withdrawLeaderboardConsent") {
          if (await leaderboardWithdrawn(tx, m.campaignId, m.wallet))
            return {
              awardId: row.id,
              leaderboardConsentWithdrawn: true,
              duplicate: true,
            };
          await tx.founderEvent.create({
            data: {
              eventType: PILOT_AUDIT_EVENT,
              subjectType: "contribution_pilot",
              subjectId: m.campaignId,
              dedupeKey: `contribution-pilot:leaderboard-withdraw:${m.campaignId}:${m.wallet}`,
              actor,
              status: "CONSENT_WITHDRAWN",
              metadataJson: json({
                version: 1,
                action: command.action,
                campaignId: m.campaignId,
                wallet: m.wallet,
                reason: command.reason,
              }),
            },
          });
          return {
            awardId: row.id,
            leaderboardConsentWithdrawn: true,
            duplicate: false,
          };
        }
        if (await reversed(tx, row.id))
          return { awardId: row.id, reversed: true, duplicate: true };
        const original = await tx.pointsEvent.findFirst({
          where: {
            id: m.pointsId,
            walletAddress: m.wallet,
            type: PILOT_XP_AWARD,
            sourceId: pilotSourceKey(m.sourceKind, m.sourceId),
            points: m.xp,
          },
        });
        if (!original) throw bad("The original XP record is unavailable.");
        const reversal = await tx.pointsEvent.create({
          data: {
            walletAddress: original.walletAddress,
            type: PILOT_XP_REVERSAL,
            sourceId: original.id,
            points: -original.points,
          },
        });
        await tx.founderEvent.create({
          data: {
            eventType: PILOT_AUDIT_EVENT,
            subjectType: "contribution_pilot",
            subjectId: m.campaignId,
            dedupeKey: `contribution-pilot:reverse:${row.id}`,
            actor,
            status: "REVERSED",
            metadataJson: json({
              version: 1,
              action: "reverse",
              campaignId: m.campaignId,
              awardId: row.id,
              pointsId: reversal.id,
              reason: command.reason,
            }),
          },
        });
        return { awardId: row.id, reversed: true, duplicate: false };
      }
      const c = await currentCampaign(tx, command.campaignId);
      if (command.action !== "award") {
        const next =
          command.action === "activate"
            ? "ACTIVE"
            : command.action === "pause"
            ? "PAUSED"
            : "CLOSED";
        if (c.status === "CLOSED" && next !== "CLOSED")
          throw bad("Closed campaigns cannot reopen; create a new draft.");
        if (next === "ACTIVE") {
          if (!contributionPilotEnabled())
            throw bad("The contribution pilot is disabled.");
          if (Date.parse(c.policy.endsAt) <= now.getTime())
            throw bad("This campaign has ended.");
          await venueCurrent(tx, c.policy);
        }
        if (c.status !== next) {
          await tx.founderEvent.update({
            where: { id: c.id },
            data: { status: next },
          });
          await audit(tx, actor, command.action, c.id, {
            from: c.status,
            to: next,
          });
        }
        return { campaignId: c.id, status: next };
      }
      if (
        !contributionPilotEnabled() ||
        c.status !== "ACTIVE" ||
        !pilotWindowOpen(c.policy, now)
      )
        throw bad("This campaign is not accepting contributions.");
      await venueCurrent(tx, c.policy);
      const source = await evidence(
        tx,
        command.sourceKind,
        command.sourceId,
        c.policy,
        now,
        true
      );
      if (!source) throw bad();
      if (
        command.publicLeaderboardConsent &&
        (await leaderboardWithdrawn(tx, c.id, source.wallet))
      )
        throw bad(
          "Leaderboard consent was withdrawn for this campaign. Recognize the contribution privately."
        );
      const key = pilotSourceKey(command.sourceKind, command.sourceId);
      const prior = await tx.founderEvent.findUnique({
        where: { dedupeKey: `contribution-pilot:award:${key}` },
      });
      if (prior) {
        const priorMeta = awardMetadata(prior);
        if (
          !priorMeta ||
          priorMeta.campaignId !== c.id ||
          priorMeta.wallet !== source.wallet ||
          (await reversed(tx, prior.id))
        )
          throw bad(
            "This evidence has already been recognized and cannot be re-awarded."
          );
        return { awardId: prior.id, duplicate: true };
      }
      const previous = await tx.founderEvent.findMany({
        where: {
          eventType: PILOT_AWARD_EVENT,
          subjectId: c.id,
          actor: source.wallet,
        },
        take: 101,
      });
      const rows = previous.map(awardMetadata);
      const xp =
        command.sourceKind === "VENUE_CHECK_IN"
          ? c.policy.xp.venueVisit
          : c.policy.xp.reviewedCreation;
      if (
        previous.length > 100 ||
        rows.some((m) => !m) ||
        rows.some((m) => m?.recognitionKey === source.recognitionKey) ||
        rows.reduce((sum, m) => sum + (m?.xp ?? 0), 0) + xp >
          c.policy.xp.maxPerPerson
      )
        throw bad(
          "The campaign recognition limit for this participant has been reached. Reversal does not reset it."
        );
      const points = await tx.pointsEvent.create({
        data: {
          walletAddress: source.wallet,
          type: PILOT_XP_AWARD,
          sourceId: key,
          points: xp,
        },
      });
      const metadata: AwardMetadata = {
        version: 1,
        policyVersion: c.policy.version,
        campaignId: c.id,
        sourceKind: command.sourceKind,
        sourceId: command.sourceId,
        ...source,
        publicLeaderboardConsent: command.publicLeaderboardConsent,
        xp,
        pointsId: points.id,
      };
      const row = await tx.founderEvent.create({
        data: {
          eventType: PILOT_AWARD_EVENT,
          subjectType: "contribution_pilot",
          subjectId: c.id,
          dedupeKey: `contribution-pilot:award:${key}`,
          actor: source.wallet,
          status: "AWARDED",
          metadataJson: json(metadata),
        },
      });
      await audit(tx, actor, "award", c.id, {
        awardId: row.id,
        policyVersion: c.policy.version,
      });
      return { awardId: row.id, duplicate: false };
    },
    { maxWait: 15000, timeout: 20000 }
  );
}

export async function getPilotAdminSnapshot(): Promise<PilotAdminSnapshot> {
  return prisma.$transaction(
    async (tx) => {
      const campaigns = await tx.founderEvent.findMany({
        where: { eventType: PILOT_CAMPAIGN_EVENT },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        take: 51,
      });
      const visible = campaigns.slice(0, 50).flatMap((row) => {
        const c = campaign(row);
        return c ? [c] : [];
      });
      const byId = new Map(visible.map((c) => [c.id, c]));
      const rows = await tx.founderEvent.findMany({
        where: {
          eventType: PILOT_AWARD_EVENT,
          subjectId: { in: visible.map((c) => c.id) },
        },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        take: PILOT_LIMIT + 1,
      });
      const awards: PilotAward[] = [];
      for (const row of rows.slice(0, PILOT_LIMIT)) {
        const m = awardMetadata(row),
          c = m && byId.get(m.campaignId);
        if (!m || !c) continue;
        awards.push({
          id: row.id,
          campaignId: c.id,
          sourceKind: m.sourceKind,
          sourceId: m.sourceId,
          xp: m.xp,
          label:
            m.sourceKind === "VENUE_CHECK_IN"
              ? "Confirmed QR + GPS visit"
              : "Reviewed creation — not attendance",
          publicLeaderboardConsent: m.publicLeaderboardConsent,
          leaderboardConsentWithdrawn: await leaderboardWithdrawn(
            tx,
            c.id,
            m.wallet
          ),
          reversed: await reversed(tx, row.id),
          current: Boolean(await currentAward(tx, row, c.policy, new Date())),
          createdAt: row.createdAt.toISOString(),
        });
      }
      return {
        enabled: contributionPilotEnabled(),
        campaigns: visible,
        campaignsLimited: campaigns.length > 50,
        awards,
        awardsLimited: rows.length > PILOT_LIMIT,
        notice: PILOT_NOTICE,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: 20000,
    }
  );
}

/** Whitelisted public fields only; no source IDs, wallets, private proof or exact visit timestamps. */
export async function getPublicPilot(id: string): Promise<PublicPilot | null> {
  if (!contributionPilotEnabled()) return null;
  return prisma.$transaction(
    async (tx) => {
      const now = new Date(),
        c = campaign(await tx.founderEvent.findUnique({ where: { id } }));
      if (!c || c.status !== "ACTIVE" || !pilotWindowOpen(c.policy, now))
        return null;
      let venue;
      try {
        venue = await venueCurrent(tx, c.policy);
      } catch {
        return null;
      }
      const rows = await tx.founderEvent.findMany({
        where: { eventType: PILOT_AWARD_EVENT, subjectId: c.id },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: PILOT_LIMIT + 1,
      });
      const available = rows.length <= PILOT_LIMIT;
      const people = new Map<
        string,
        { tag: string; xp: number; contributions: number }
      >();
      if (available)
        for (const row of rows) {
          const m = await currentAward(tx, row, c.policy, now);
          if (
            !m?.publicLeaderboardConsent ||
            (await leaderboardWithdrawn(tx, c.id, m.wallet))
          )
            continue;
          const person = people.get(m.wallet) ?? {
            tag: m.identityTag,
            xp: 0,
            contributions: 0,
          };
          person.xp += m.xp;
          person.contributions += 1;
          people.set(m.wallet, person);
        }
      const standings = [...people.values()]
        .sort(
          (a, b) => b.xp - a.xp || (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0)
        )
        .map((p, index) => ({
          rank: index + 1,
          ...p,
          profileHref: `/creator/${encodeURIComponent(
            p.tag.replace(/^@/, "")
          )}`,
        }));
      return {
        id: c.id,
        title: c.policy.title,
        description: c.policy.description,
        startsAt: c.policy.startsAt,
        endsAt: c.policy.endsAt,
        activityIds: c.policy.activityIds,
        venue: venue
          ? {
              name: venue.name,
              href: `/venues/${encodeURIComponent(venue.slug)}`,
            }
          : null,
        rules: {
          venueVisitXp: c.policy.xp.venueVisit,
          reviewedCreationXp: c.policy.xp.reviewedCreation,
          maxXpPerPerson: c.policy.xp.maxPerPerson,
          repeatRule:
            "At most one visit per place and one reviewed creation per activity in a campaign. Evidence is recognized once across pilots. Reversal does not reset limits.",
        },
        standings: available ? standings : null,
        standingsAvailable: available,
        asOf: now.toISOString(),
        notice: PILOT_NOTICE,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: 20000,
    }
  );
}
