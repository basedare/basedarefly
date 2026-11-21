import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "./prisma";
import { adventureTemplate } from "./adventure-sharing";
import { ACTIVITY_SUGGESTIONS } from "./home-activities";
import {
  SIARGAO_CHALLENGE_ID,
  inSiargaoChallengeArea,
  siargaoCampaignOpen,
} from "./siargao-challenge";
import { record } from "./community-stories";
import { momentAcceptanceOpen, momentReleaseOptions } from "./moment-release";
import { retentionAvailable } from "./retention-email";
import { getPaymentReadiness } from "./payment-readiness-server";
import { getBaseChain } from "./base-chain";
import { getPushClientConfig } from "./web-push";
import { loadParticipationScorecard } from "./participation-scorecard-server";
import {
  ACCEPTANCE_CHECKS,
  ACCEPTANCE_EVENT,
  AcceptanceSchema,
  PILOT_EVENT,
  PILOT_KEY,
  PilotSchema,
} from "./takeoff-pilot";

export class TakeoffConflict extends Error {}
export async function saveTakeoffPilot(raw: unknown, actor: string) {
  const data = PilotSchema.parse(raw);
  if (
    data.activityIds.some(
      (id) =>
        !adventureTemplate(id) ||
        (id === SIARGAO_CHALLENGE_ID &&
          !siargaoCampaignOpen(new Date(data.startsAt)))
    )
  )
    throw Error("Choose currently available authored activities.");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${PILOT_KEY}))::text`;
    const current = await tx.founderEvent.findUnique({
      where: { dedupeKey: PILOT_KEY },
    });
    const currentRevision = current
      ? Number(record(current.metadataJson).revision)
      : 0;
    if (currentRevision !== data.revision)
      throw new TakeoffConflict("This pilot changed. Refresh before saving.");
    const hosts = await tx.venue.findMany({
      where: {
        slug: { in: data.hosts.map((h) => h.venueSlug) },
        status: "ACTIVE",
      },
      select: { slug: true, latitude: true, longitude: true },
    });
    if (
      hosts.length !== data.hosts.length ||
      hosts.some(
        (h) => !inSiargaoChallengeArea({ lat: h.latitude, lng: h.longitude })
      )
    )
      throw Error(
        "Every permission record needs a current canonical Siargao place."
      );
    for (const tag of data.creatorTags) {
      const name = tag.replace(/^@/, "");
      if (
        !(await tx.streamerTag.findFirst({
          where: {
            OR: [
              { tag: { equals: name, mode: "insensitive" } },
              { tag: { equals: "@" + name, mode: "insensitive" } },
            ],
            status: { in: ["ACTIVE", "VERIFIED"] },
            revokedAt: null,
          },
          select: { id: true },
        }))
      )
        throw Error("Choose existing active contributor tags.");
    }
    if (
      data.businessEnquiryId &&
      !(await tx.founderEvent.findFirst({
        where: { id: data.businessEnquiryId, eventType: "ACTIVATION_INTAKE" },
        select: { id: true },
      }))
    )
      throw Error("Choose an existing business enquiry.");
    const links = await tx.creatorAttributionLink.findMany({
      where: {
        slug: { in: data.trackingSlugs },
        targetType: "PAGE",
        targetId: { in: data.activityIds },
      },
      select: { slug: true },
    });
    if (links.length !== data.trackingSlugs.length)
      throw Error("Use existing tracked links for the selected adventures.");
    const metadataJson = {
      ...data,
      revision: currentRevision + 1,
      geography: "General Luna, Siargao",
      evidence: "operator_recorded_permissions_not_participation",
      publicActivation: false,
    };
    const row = await tx.founderEvent.upsert({
      where: { dedupeKey: PILOT_KEY },
      create: {
        dedupeKey: PILOT_KEY,
        eventType: PILOT_EVENT,
        source: "takeoff",
        subjectType: "pilot",
        subjectId: "siargao",
        status: data.status,
        actor,
        title: "Siargao participation pilot",
        metadataJson,
      },
      update: { status: data.status, actor, metadataJson },
    });
    await tx.founderEvent.create({
      data: {
        eventType: "TAKEOFF_PILOT_REVISION",
        source: "takeoff",
        dedupeKey: `${PILOT_KEY}:revision:${currentRevision + 1}`,
        subjectType: "pilot",
        subjectId: row.id,
        status: data.status,
        actor,
        metadataJson,
      },
    });
    return metadataJson;
  });
}
export async function recordTakeoffAcceptance(raw: unknown, actor: string) {
  const data = AcceptanceSchema.parse(raw);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex");
  const row = await prisma.founderEvent.upsert({
    where: { dedupeKey: `takeoff-acceptance:${fingerprint}` },
    create: {
      dedupeKey: `takeoff-acceptance:${fingerprint}`,
      eventType: ACCEPTANCE_EVENT,
      source: "operator_attestation",
      subjectType: "acceptance",
      subjectId: data.check,
      status: data.result,
      actor,
      metadataJson: data,
    },
    update: {},
  });
  return {
    id: row.id,
    recordedAt: row.createdAt.toISOString(),
    evidence: "operator_attestation_not_independent_verification",
  };
}
export async function takeoffReport() {
  const now = new Date();
  const [pilot, acceptance, participation, payment] = await Promise.all([
    prisma.founderEvent.findUnique({ where: { dedupeKey: PILOT_KEY } }),
    prisma.founderEvent.findMany({
      where: { eventType: ACCEPTANCE_EVENT },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 201,
    }),
    loadParticipationScorecard(now),
    paymentDiagnostics(),
  ]);
  const releaseRevision =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.TAKEOFF_RELEASE_REVISION ||
    null;
  const checks = Object.entries(ACCEPTANCE_CHECKS).map(([id, label]) => {
    const event = acceptance.find((a) => a.subjectId === id),
      meta = record(event?.metadataJson);
    const current =
      !!event &&
      event.createdAt.getTime() >= now.getTime() - 7 * 86400000 &&
      !!releaseRevision &&
      meta.releaseRevision === releaseRevision;
    return {
      id,
      label,
      result: event?.status ?? "not_recorded",
      current,
      recordedAt: event?.createdAt.toISOString() ?? null,
      evidenceReference:
        typeof meta.evidenceReference === "string"
          ? meta.evidenceReference
          : null,
      tester: typeof meta.tester === "string" ? meta.tester : null,
      evidence: "operator_attestation_not_independent_verification",
    };
  });
  const pilotData = pilot ? record(pilot.metadataJson) : null;
  const savedPilot = pilotData
    ? Object.fromEntries(
        Object.entries(pilotData).filter(
          ([key]) =>
            !["geography", "evidence", "publicActivation"].includes(key)
        )
      )
    : null;
  const push = getPushClientConfig();
  return {
    generatedAt: now.toISOString(),
    releaseRevision,
    pilot: savedPilot,
    participation,
    configuration: {
      accountAccess:
        process.env.NEXT_PUBLIC_ACCOUNT_ACCESS_ENABLED === "true" &&
        !!process.env.NEXT_PUBLIC_PRIVY_APP_ID,
      ...momentReleaseOptions(),
      mediaAcceptance: momentAcceptanceOpen(),
      emailOptIn: retentionAvailable(),
      emailSending:
        retentionAvailable() && process.env.RETENTION_SEND_ENABLED === "true",
      pushClient: push.clientConfigured,
      pushDelivery: push.deliveryConfigured,
      growthExport: (process.env.GROWTH_BRAIN_EXPORT_SECRET?.length ?? 0) >= 32,
    },
    payment,
    checks,
    acceptanceComplete: acceptance.length <= 200,
    activities: ACTIVITY_SUGGESTIONS.filter(
      (a) => a.id !== SIARGAO_CHALLENGE_ID || siargaoCampaignOpen(now)
    ).map((a) => ({ id: a.id, title: a.title })),
    note: "Configuration and recorded acceptance are separate. This screen never activates flags, publishes activity, sends invitations, signs payments or establishes customer results. Pilot permissions are operator records; real participants and outcomes come from canonical sources.",
  };
}
async function paymentDiagnostics() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fallback = {
    ready: false,
    reason: "CHAIN_CHECK_UNAVAILABLE",
    chainId: getBaseChain().id,
  };
  const result = await Promise.race([
    getPaymentReadiness()
      .then((p) => ({
        ready: p.ready,
        reason: p.reason,
        chainId: p.config.chainId,
      }))
      .catch(() => fallback),
    new Promise<typeof fallback>((resolve) => {
      timer = setTimeout(() => resolve(fallback), 12000);
    }),
  ]).finally(() => clearTimeout(timer));
  return { ...result, nextAction: paymentNextAction(result.reason) };
}
export function paymentNextAction(reason: string | null) {
  const actions: Record<string, string> = {
    LIVE_MODE_NOT_CONFIRMED:
      "Review both simulation settings before a human-authorized mainnet cutover.",
    REFEREE_NOT_CONFIGURED:
      "Configure and validate the dedicated referee. Keep the deployer and treasury separate.",
    MISSING_CONTRACT:
      "Follow the existing human-signed mainnet deployment and address-verification runbook.",
    WRONG_USDC:
      "Use the canonical native USDC address for the selected Base network.",
    INVALID_CONFIG:
      "Validate all configured public roles and contract addresses.",
    WALLET_ROLES_OVERLAP: "Separate the referee and treasury roles.",
    WRONG_CHAIN: "Correct the configured network/RPC mismatch.",
    REFEREE_NEEDS_GAS:
      "Arrange separately authorized referee gas, then repeat the read-only check.",
    CHAIN_CHECK_UNAVAILABLE:
      "Restore the read-only RPC connection; do not bypass readiness.",
    TOKEN_MISMATCH: "Verify the escrow token and six-decimal native USDC.",
    PLATFORM_MISMATCH:
      "Reconcile the configured treasury against the actual escrow.",
    REFEREE_MISMATCH:
      "Reconcile the configured referee against the actual escrow.",
    FEE_MISMATCH: "Verify the canonical 96/4/0 contract fee policy.",
  };
  return reason
    ? actions[reason] ??
        "Inspect the existing production-safety report and keep paid work paused."
    : "Configuration checks passed. Genuine funding, payout and refund acceptance are still separate.";
}
