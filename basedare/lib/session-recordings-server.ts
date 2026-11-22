import "server-only";
import { sessionSourceCurrent } from "./local-economy-server";
import { prisma } from "./prisma";
import { requireEconomy as need } from "./local-economy";
import { momentReleaseOptions } from "./moment-release";
import { socialContext, hiddenPerson } from "./social-targets-server";
export const BASECLIPS_MEDIA_SCHEMA = "baseclips.basedare.media.v1";
export const BASECLIPS_BASEDARE_CHANNEL = "1ba3b9da8b3d4bb7a5ffa920618d43c9";
/** Actual v1 process payload. A local operator transfers the original by its SHA256;
 * this endpoint never sends media, calls a provider, approves an edit or publishes. */
export async function sessionRecordingPayload(id: string, wallet: string) {
  const g = await prisma.sessionRecordingGrant.findUnique({
    where: { id },
    include: {
      submission: true,
      session: { include: { meetup: true, node: true } },
    },
  });
  need(
    g && g.wallet === wallet,
    "Only the original contributor can export processing permission.",
    403
  );
  need(
    momentReleaseOptions(process.env, wallet).originalMedia,
    "Original media processing is not open for this account.",
    503
  );
  need(
    !g.withdrawnAt &&
      g.expiresAt > new Date() &&
      g.processing &&
      g.hostApprovedAt &&
      g.rightsConfirmed,
    "Processing needs current contributor permission and host approval."
  );
  need(
    g.session.meetup.status === "active" &&
      g.session.recordingPolicy === "SEPARATE_CONSENT",
    "Session recording is unavailable."
  );
  const venue = await prisma.venue.findFirst({
    where: { id: g.session.meetup.venueId!, status: "ACTIVE" },
  });
  need(venue, "Venue is unavailable.");
  need(
    await sessionSourceCurrent(g.sessionId),
    "Session host authority is no longer current."
  );
  const host = await prisma.streamerTag.findFirst({
    where: {
      id: g.session.hostTagId,
      walletAddress: { equals: g.session.hostWallet, mode: "insensitive" },
      status: { in: ["ACTIVE", "VERIFIED"] },
      revokedAt: null,
    },
  });
  need(
    host &&
      !hiddenPerson(await socialContext(wallet), host.id, host.walletAddress),
    "Host is unavailable."
  );
  if (g.session.node)
    need(
      g.session.node.status === "PUBLISHED" && g.session.node.publicConsent,
      "Node is unavailable."
    );
  need(
    g.submission.sessionId === g.sessionId &&
      g.submission.wallet.toLowerCase() === wallet &&
      g.submission.sourceKey === g.sourceSha256 &&
      g.submission.privateMediaCid &&
      ["PENDING", "APPROVED"].includes(g.submission.status),
    "The source was withdrawn, changed or rejected."
  );
  const tenant = process.env.BASEDARE_MEDIA_TENANT;
  need(
    tenant && /^[A-Za-z0-9_-]{1,100}$/.test(tenant),
    "Configure the existing BaseClips tenant before exporting.",
    503
  );
  return {
    schema: BASECLIPS_MEDIA_SCHEMA,
    payload: {
      action: "process",
      tenant_id: tenant,
      request_id: g.id,
      channel_id: BASECLIPS_BASEDARE_CHANNEL,
      target: { type: "moment", id: g.submissionId, revision: 1 },
      media_sha256: g.sourceSha256,
      grant: {
        id: g.id,
        version: 1,
        source_sha256: g.sourceSha256,
        processing: true,
        publication: g.publication,
        evaluation: false,
        training: false,
        destinations: g.destinations,
        expires_at: g.expiresAt.toISOString(),
        revoked: false,
        required_credit: g.requiredCredit,
      },
      title: g.submission.caption.slice(0, 200),
      max_seconds: 60,
    },
    originalHref: `/api/adventure-submissions/${g.submissionId}/media?wallet=${wallet}`,
    withdrawal: {
      action: "revoke",
      tenant_id: tenant,
      grant_id: g.id,
      version: 1,
    },
    instruction:
      "Use the existing BaseClips local client to sign this payload and transfer the owned original by SHA256. Recheck permission before processing or publishing; export is not an approved edit or publication receipt.",
  };
}

export async function recordingWithdrawalPayload(id: string, wallet: string) {
  const g = await prisma.sessionRecordingGrant.findUnique({ where: { id } });
  need(
    g && g.wallet === wallet && g.withdrawnAt,
    "Only the original contributor can export a withdrawn grant.",
    403
  );
  const tenant = process.env.BASEDARE_MEDIA_TENANT;
  need(
    tenant && /^[A-Za-z0-9_-]{1,100}$/.test(tenant),
    "Configure the existing BaseClips tenant.",
    503
  );
  return {
    schema: BASECLIPS_MEDIA_SCHEMA,
    payload: {
      action: "revoke",
      tenant_id: tenant,
      grant_id: g.id,
      version: 1,
    },
    instruction:
      "Apply with the existing local BaseClips signing client. BaseDare withdrawal alone does not prove an exported local job stopped.",
  };
}
