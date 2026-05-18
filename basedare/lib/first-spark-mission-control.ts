import 'server-only';

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { getActiveVenuePerk } from '@/lib/venue-perks';
import { buildVenueGuestMission } from '@/lib/venue-guest-missions';
import {
  buildVenueActivationCreateHref,
} from '@/lib/venue-launch';
import { toDisplayCreatorHandle } from '@/lib/creator-stats';
import type {
  FirstSparkCreatorReliability,
  FirstSparkGuestPerkRow,
  FirstSparkMissionControlReport,
  FirstSparkMissionRow,
  FirstSparkMissionStatus,
  FirstSparkRunSheet,
  FirstSparkRunStage,
  FirstSparkPilotTarget,
  FirstSparkRecapPreview,
  MissionControlTone,
} from '@/lib/first-spark-mission-control-types';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 14;
export const FIRST_SPARK_RUN_SHEET_EVENT = 'FIRST_SPARK_RUN_SHEET';
const LIVE_DARE_STATUSES = ['PENDING', 'AWAITING_CLAIM', 'PENDING_REVIEW', 'PENDING_PAYOUT'];
const REVIEW_DARE_STATUSES = ['PENDING_REVIEW', 'PENDING_PAYOUT'];
const SETTLED_DARE_STATUSES = ['VERIFIED', 'PAID', 'COMPLETED'];
const FAILED_DARE_STATUSES = ['FAILED', 'EXPIRED'];
const ACTIVE_LEAD_STATUSES = ['NEW', 'FOLLOWING_UP', 'WAITING'];

type BuildOptions = {
  periodDays?: number;
};

type VenueRow = Awaited<ReturnType<typeof fetchSiargaoVenueRows>>[number];
type CreatorAccumulator = {
  tag: string;
  missionsAccepted: number;
  completedMissions: number;
  proofsAccepted: number;
  noShowRisk: number;
  placeMarks: number;
  venueSlugs: Set<string>;
  latestSignalAt: Date | null;
};

function startOfWindow(periodDays: number) {
  return new Date(Date.now() - periodDays * DAY_MS);
}

function toneForMission(status: FirstSparkMissionStatus): MissionControlTone {
  if (status === 'live') return 'active';
  if (status === 'proof-review') return 'warning';
  if (status === 'repeat') return 'positive';
  if (status === 'recap') return 'positive';
  return 'neutral';
}

function missionStatusLabel(status: FirstSparkMissionStatus) {
  if (status === 'pilot-ready') return 'Pilot ready';
  if (status === 'scheduled') return 'Scheduled';
  if (status === 'live') return 'Live';
  if (status === 'proof-review') return 'Proof review';
  if (status === 'recap') return 'Recap';
  return 'Repeat ask';
}

function runStageLabel(stage: FirstSparkRunStage) {
  if (stage === 'draft') return 'Draft';
  if (stage === 'scheduled') return 'Scheduled';
  if (stage === 'live') return 'Live';
  if (stage === 'proof-review') return 'Proof review';
  if (stage === 'recap-sent') return 'Recap sent';
  return 'Repeat ask';
}

function runStageTone(stage: FirstSparkRunStage): MissionControlTone {
  if (stage === 'live') return 'active';
  if (stage === 'proof-review') return 'warning';
  if (stage === 'recap-sent' || stage === 'repeat-ask') return 'positive';
  return 'neutral';
}

function runStageFromMissionStatus(status: FirstSparkMissionStatus): FirstSparkRunStage {
  if (status === 'scheduled') return 'scheduled';
  if (status === 'live') return 'live';
  if (status === 'proof-review') return 'proof-review';
  if (status === 'recap') return 'recap-sent';
  if (status === 'repeat') return 'repeat-ask';
  return 'draft';
}

function missionStatusFromRunStage(stage: FirstSparkRunStage): FirstSparkMissionStatus {
  if (stage === 'scheduled') return 'scheduled';
  if (stage === 'live') return 'live';
  if (stage === 'proof-review') return 'proof-review';
  if (stage === 'recap-sent') return 'recap';
  if (stage === 'repeat-ask') return 'repeat';
  return 'pilot-ready';
}

function uniqueCount(values: Array<string | null | undefined>) {
  return new Set(values.filter(Boolean).map((value) => String(value).toLowerCase())).size;
}

function safeDateMax(current: Date | null, next: Date | null | undefined) {
  if (!next) return current;
  if (!current || next.getTime() > current.getTime()) return next;
  return current;
}

function normalizeCreatorTag(value: string | null | undefined) {
  const display = toDisplayCreatorHandle(value);
  return display?.toLowerCase() ?? null;
}

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function nullableStringValue(value: unknown) {
  const next = stringValue(value);
  return next || null;
}

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value === 'string') {
    const next = Number.parseInt(value, 10);
    if (Number.isFinite(next)) return Math.max(0, next);
  }
  return null;
}

function normalizeRunStage(value: unknown, fallback: FirstSparkRunStage): FirstSparkRunStage {
  if (
    value === 'draft' ||
    value === 'scheduled' ||
    value === 'live' ||
    value === 'proof-review' ||
    value === 'recap-sent' ||
    value === 'repeat-ask'
  ) {
    return value;
  }

  return fallback;
}

function hasProofSignal(dare: Pick<VenueRow['dares'][number], 'videoUrl' | 'imageUrl' | 'proofCid' | 'proof_media'>) {
  return Boolean(dare.videoUrl || dare.imageUrl || dare.proofCid || dare.proof_media);
}

function hasAcceptedSignal(dare: Pick<VenueRow['dares'][number], 'claimedBy' | 'claimRequestStatus' | 'targetWalletAddress' | 'streamerHandle'>) {
  return Boolean(
    dare.claimedBy ||
      dare.targetWalletAddress ||
      dare.streamerHandle ||
      dare.claimRequestStatus === 'APPROVED'
  );
}

function scoreVenue(row: VenueRow) {
  const checkIns = row.checkIns.length;
  const proofs = row.placeTags.length + row.dares.filter(hasProofSignal).length;
  const acceptedProofs =
    row.placeTags.filter((tag) => tag.status === 'APPROVED').length +
    row.dares.filter((dare) => SETTLED_DARE_STATUSES.includes(dare.status)).length;
  const liveDares = row.dares.filter((dare) => LIVE_DARE_STATUSES.includes(dare.status)).length;
  const leads = row.reportLeads.filter((lead) => ACTIVE_LEAD_STATUSES.includes(lead.followUpStatus)).length;
  const activePerk = getActiveVenuePerk(row.metadataJson);
  const recentMemory = row.memories[0];

  return (
    liveDares * 30 +
    acceptedProofs * 18 +
    proofs * 10 +
    checkIns * 5 +
    leads * 8 +
    (activePerk ? 10 : 0) +
    (row.isPartner ? 8 : 0) +
    (recentMemory?.perkRedemptionCount ?? 0) * 8
  );
}

function deriveMissionStatus(row: VenueRow): FirstSparkMissionStatus {
  const hasReview = row.dares.some((dare) => REVIEW_DARE_STATUSES.includes(dare.status));
  const hasLive = row.dares.some((dare) => LIVE_DARE_STATUSES.includes(dare.status));
  const hasAcceptedProof =
    row.placeTags.some((tag) => tag.status === 'APPROVED') ||
    row.dares.some((dare) => SETTLED_DARE_STATUSES.includes(dare.status));
  const hasActiveLead = row.reportLeads.some((lead) => ACTIVE_LEAD_STATUSES.includes(lead.followUpStatus));

  if (hasReview) return 'proof-review';
  if (hasLive) return 'live';
  if (hasAcceptedProof && hasActiveLead) return 'repeat';
  if (hasAcceptedProof) return 'recap';
  return hasActiveLead ? 'scheduled' : 'pilot-ready';
}

function buildNextAction(input: {
  status: FirstSparkMissionStatus;
  checkIns: number;
  proofs: number;
  hasPerk: boolean;
}) {
  if (input.status === 'proof-review') return 'Review proof and close the recap';
  if (input.status === 'live') return 'Fill slots and watch check-ins';
  if (input.status === 'repeat') return 'Ask for the next paid repeat';
  if (input.status === 'recap') return 'Send recap before pitching repeat';
  if (!input.hasPerk) return 'Add one simple perk before launch';
  if (input.checkIns === 0 && input.proofs === 0) return 'Run the first proof night';
  return 'Invite creators and start the pilot';
}

function buildRunSheetNextAction(runSheet: Pick<FirstSparkRunSheet, 'stage' | 'acceptedCreators' | 'creatorSlots' | 'proofsAccepted' | 'recapSentAt' | 'repeatOutcome'>) {
  if (runSheet.stage === 'draft') return 'Set date and invite creators';
  if (runSheet.stage === 'scheduled') return 'Fill creator slots';
  if (runSheet.stage === 'live') return 'Watch check-ins and proof';
  if (runSheet.stage === 'proof-review') return 'Approve proof and send recap';
  if (runSheet.stage === 'recap-sent' && runSheet.repeatOutcome === 'none') return 'Ask for the repeat';
  if (runSheet.stage === 'repeat-ask') return 'Close won, interested, or lost';
  return runSheet.proofsAccepted > 0 ? 'Keep the venue moving' : 'Tighten the proof route';
}

function buildRunSheet(input: {
  venue: VenueRow;
  fallbackStatus: FirstSparkMissionStatus;
  metrics: {
    checkIns: number;
    acceptedProofs: number;
    activeCreators: number;
    perkRedemptions: number;
  };
}): FirstSparkRunSheet {
  const event = input.venue.founderEvents[0] ?? null;
  const metadata = asRecord(event?.metadataJson);
  const fallbackStage = runStageFromMissionStatus(input.fallbackStatus);
  const stage = normalizeRunStage(metadata.stage, fallbackStage);
  const repeatOutcome = normalizeRepeatOutcome(metadata.repeatOutcome);
  const runSheet: FirstSparkRunSheet = {
    id: event?.id ?? null,
    persisted: Boolean(event),
    stage,
    stageLabel: runStageLabel(stage),
    tone: runStageTone(stage),
    scheduledAt: nullableStringValue(metadata.scheduledAt),
    creatorSlots: numberValue(metadata.creatorSlots) ?? 3,
    invitedCreators: numberValue(metadata.invitedCreators) ?? input.metrics.activeCreators,
    acceptedCreators: numberValue(metadata.acceptedCreators) ?? input.metrics.activeCreators,
    showedCreators: numberValue(metadata.showedCreators) ?? (input.metrics.checkIns > 0 || input.metrics.acceptedProofs > 0 ? input.metrics.activeCreators : 0),
    proofsAccepted: numberValue(metadata.proofsAccepted) ?? input.metrics.acceptedProofs,
    guestCheckIns: numberValue(metadata.guestCheckIns) ?? input.metrics.checkIns,
    perkRedemptions: numberValue(metadata.perkRedemptions) ?? input.metrics.perkRedemptions,
    opsMinutes: numberValue(metadata.opsMinutes) ?? 0,
    recapSentAt: nullableStringValue(metadata.recapSentAt),
    repeatOutcome,
    note: nullableStringValue(metadata.note),
    nextAction: 'Set date and invite creators',
    updatedAt: event?.updatedAt?.toISOString() ?? null,
  };

  return {
    ...runSheet,
    nextAction: buildRunSheetNextAction(runSheet),
  };
}

function normalizeRepeatOutcome(value: unknown): FirstSparkRunSheet['repeatOutcome'] {
  if (value === 'asked' || value === 'interested' || value === 'won' || value === 'lost') return value;
  return 'none';
}

function buildMissionRows(venues: VenueRow[]): FirstSparkMissionRow[] {
  return venues
    .map((venue) => {
      const activePerk = getActiveVenuePerk(venue.metadataJson);
      const guestMission = buildVenueGuestMission({
        venueName: venue.name,
        categories: venue.categories,
        activePerk,
        liveSession: venue.qrSessions[0] ?? null,
        hasActiveDrops: venue.dares.some((dare) => LIVE_DARE_STATUSES.includes(dare.status)),
      });
      const fallbackStatus = deriveMissionStatus(venue);
      const checkIns = venue.checkIns.length;
      const proofs = venue.placeTags.length + venue.dares.filter(hasProofSignal).length;
      const acceptedProofs =
        venue.placeTags.filter((tag) => tag.status === 'APPROVED').length +
        venue.dares.filter((dare) => SETTLED_DARE_STATUSES.includes(dare.status)).length;
      const liveDares = venue.dares.filter((dare) => LIVE_DARE_STATUSES.includes(dare.status)).length;
      const activeCreators = uniqueCount([
        ...venue.placeTags.map((tag) => tag.creatorTag),
        ...venue.checkIns.map((checkIn) => checkIn.tag),
        ...venue.dares.map((dare) => dare.streamerHandle),
      ]);
      const perkRedemptions = venue.memories.reduce((sum, memory) => sum + memory.perkRedemptionCount, 0);
      const leadCount = venue.reportLeads.filter((lead) => ACTIVE_LEAD_STATUSES.includes(lead.followUpStatus)).length;
      const score = scoreVenue(venue);
      const runSheet = buildRunSheet({
        venue,
        fallbackStatus,
        metrics: {
          checkIns,
          acceptedProofs,
          activeCreators,
          perkRedemptions,
        },
      });
      const status = missionStatusFromRunStage(runSheet.stage);

      return {
        id: venue.id,
        venue: {
          id: venue.id,
          slug: venue.slug,
          name: venue.name,
          city: venue.city,
          categories: venue.categories.slice(0, 4),
          isPartner: venue.isPartner,
        },
        status,
        statusLabel: runSheet.stageLabel || missionStatusLabel(status),
        tone: runSheet.tone || toneForMission(status),
        missionTitle: guestMission.missionTitle,
        guestMission: guestMission.guestMission,
        perkLabel: activePerk?.title ?? guestMission.perkLabel,
        proofLabel: guestMission.proofLabel,
        score,
        runSheet,
        metrics: {
          checkIns,
          uniqueVisitors: uniqueCount(venue.checkIns.map((checkIn) => checkIn.walletAddress)),
          proofs,
          acceptedProofs,
          liveDares,
          activeCreators,
          perkRedemptions,
          leadCount,
        },
        nextAction: runSheet.persisted
          ? runSheet.nextAction
          : buildNextAction({
              status,
              checkIns,
              proofs,
              hasPerk: Boolean(activePerk),
            }),
        links: {
          venue: `/venues/${venue.slug}`,
          create: buildVenueActivationCreateHref({
            venueId: venue.id,
            venueName: venue.name,
            venueSlug: venue.slug,
            title: guestMission.missionTitle,
            payout: 50,
            creatorTag: '@everyone',
            objective: guestMission.guestMission,
          }),
          guestMission: `/venues/${venue.slug}/guest-mission`,
          recap: `/venues/${venue.slug}/recap`,
          console: `/venues/${venue.slug}/console`,
        },
      } satisfies FirstSparkMissionRow;
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);
}

function addCreatorSignal(
  creators: Map<string, CreatorAccumulator>,
  tag: string | null,
  input: {
    accepted?: boolean;
    completed?: boolean;
    proofAccepted?: boolean;
    noShowRisk?: boolean;
    placeMark?: boolean;
    venueSlug?: string;
    at?: Date | null;
  }
) {
  if (!tag) return;

  const current = creators.get(tag) ?? {
    tag,
    missionsAccepted: 0,
    completedMissions: 0,
    proofsAccepted: 0,
    noShowRisk: 0,
    placeMarks: 0,
    venueSlugs: new Set<string>(),
    latestSignalAt: null,
  };

  if (input.accepted) current.missionsAccepted += 1;
  if (input.completed) current.completedMissions += 1;
  if (input.proofAccepted) current.proofsAccepted += 1;
  if (input.noShowRisk) current.noShowRisk += 1;
  if (input.placeMark) current.placeMarks += 1;
  if (input.venueSlug) current.venueSlugs.add(input.venueSlug);
  current.latestSignalAt = safeDateMax(current.latestSignalAt, input.at);

  creators.set(tag, current);
}

function buildCreatorReliability(venues: VenueRow[]): FirstSparkCreatorReliability[] {
  const creators = new Map<string, CreatorAccumulator>();

  for (const venue of venues) {
    for (const dare of venue.dares) {
      const tag = normalizeCreatorTag(dare.streamerHandle ?? dare.claimRequestTag);
      const completed = SETTLED_DARE_STATUSES.includes(dare.status);
      const proofAccepted = completed || (dare.status === 'PENDING_PAYOUT' && hasProofSignal(dare));
      const noShowRisk = FAILED_DARE_STATUSES.includes(dare.status) && hasAcceptedSignal(dare);

      addCreatorSignal(creators, tag, {
        accepted: hasAcceptedSignal(dare),
        completed,
        proofAccepted,
        noShowRisk,
        venueSlug: venue.slug,
        at: dare.verifiedAt ?? dare.completed_at ?? dare.updatedAt ?? dare.createdAt,
      });
    }

    for (const tag of venue.placeTags) {
      addCreatorSignal(creators, normalizeCreatorTag(tag.creatorTag), {
        placeMark: true,
        proofAccepted: tag.status === 'APPROVED',
        venueSlug: venue.slug,
        at: tag.reviewedAt ?? tag.submittedAt,
      });
    }

    for (const checkIn of venue.checkIns) {
      addCreatorSignal(creators, normalizeCreatorTag(checkIn.tag), {
        venueSlug: venue.slug,
        at: checkIn.scannedAt,
      });
    }
  }

  return [...creators.values()]
    .map((creator) => {
      const score =
        creator.completedMissions * 4 +
        creator.proofsAccepted * 3 +
        creator.placeMarks * 2 +
        creator.venueSlugs.size -
        creator.noShowRisk * 5;
      const tone: MissionControlTone =
        creator.noShowRisk > 0 ? 'warning' : creator.proofsAccepted + creator.completedMissions > 1 ? 'positive' : 'neutral';
      const statusLabel = creator.noShowRisk > 0
        ? 'Follow up'
        : creator.proofsAccepted + creator.completedMissions > 1
          ? 'Reliable'
          : 'Warm';

      return {
        score,
        data: {
          tag: creator.tag,
          tone,
          statusLabel,
          missionsAccepted: creator.missionsAccepted,
          completedMissions: creator.completedMissions,
          proofsAccepted: creator.proofsAccepted,
          noShowRisk: creator.noShowRisk,
          placeMarks: creator.placeMarks,
          venueReach: creator.venueSlugs.size,
          latestSignalAt: creator.latestSignalAt?.toISOString() ?? null,
          nextAction: creator.noShowRisk > 0 ? 'Confirm before inviting' : 'Invite to next proof night',
          links: {
            passport: `/creator/${encodeURIComponent(creator.tag.replace(/^@/, ''))}`,
            invite: `/activations?source=mission-control&creatorRoute=${encodeURIComponent(creator.tag)}#activation-intake`,
          },
        } satisfies FirstSparkCreatorReliability,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map((creator) => creator.data);
}

function buildGuestPerks(missions: FirstSparkMissionRow[]): FirstSparkGuestPerkRow[] {
  return missions
    .map((mission) => {
      const hasPerk = !['Local status stamp', 'Crowd unlock', 'Entry/status perk'].includes(mission.perkLabel);
      const hasRedemptions = mission.metrics.perkRedemptions > 0;
      const tone: MissionControlTone = hasRedemptions ? 'positive' : hasPerk ? 'active' : 'warning';

      return {
        id: mission.id,
        venueSlug: mission.venue.slug,
        venueName: mission.venue.name,
        tone,
        statusLabel: hasRedemptions ? 'Redeeming' : hasPerk ? 'Perk live' : 'Needs perk',
        perkLabel: mission.perkLabel,
        checkIns: mission.metrics.checkIns,
        redemptions: mission.metrics.perkRedemptions,
        guestMission: mission.guestMission,
        nextAction: hasPerk ? 'Watch redemptions' : 'Add a simple access/status perk',
        links: {
          venue: mission.links.venue,
          console: mission.links.console,
          guestMission: mission.links.guestMission,
        },
      };
    })
    .sort((left, right) => {
      const toneWeight = { warning: 4, active: 3, positive: 2, neutral: 1, critical: 5 };
      return toneWeight[right.tone] - toneWeight[left.tone] || right.checkIns - left.checkIns;
    })
    .slice(0, 6);
}

function buildRecapPreview(missions: FirstSparkMissionRow[]): FirstSparkRecapPreview | null {
  const mission = missions.find((row) => row.status === 'repeat' || row.status === 'recap') ?? missions[0];
  if (!mission) return null;

  const usefulActions = Math.max(1, mission.metrics.checkIns + mission.metrics.acceptedProofs + mission.metrics.perkRedemptions);
  const estimatedSpend = mission.metrics.liveDares > 0 || mission.metrics.acceptedProofs > 0 ? 250 : 0;
  const costPerUsefulAction = estimatedSpend > 0 ? `$${Math.round(estimatedSpend / usefulActions)}` : 'Not funded yet';

  return {
    venueName: mission.venue.name,
    venueSlug: mission.venue.slug,
    missionTitle: mission.missionTitle,
    statusLabel: mission.statusLabel,
    participants: mission.metrics.activeCreators + mission.metrics.uniqueVisitors,
    checkIns: mission.metrics.checkIns,
    proofs: mission.metrics.proofs,
    acceptedProofs: mission.metrics.acceptedProofs,
    contentLinks: mission.metrics.proofs,
    perkRedemptions: mission.metrics.perkRedemptions,
    noShowRisk: Math.max(0, mission.metrics.liveDares - mission.metrics.acceptedProofs),
    costPerUsefulAction,
    recommendedNextMission:
      mission.metrics.checkIns > mission.metrics.acceptedProofs
        ? 'Turn guest check-ins into one creator proof route'
        : 'Repeat this mission with one clearer perk',
    links: {
      recap: mission.links.recap,
      repeat: mission.links.create,
    },
  };
}

function buildPilotTargets(input: {
  venues: number;
  creators: number;
  missions: number;
  paidPilots: number;
  repeatBuyers: number;
  publicRecaps: number;
}): FirstSparkPilotTarget[] {
  const rows = [
    { id: 'venues', label: 'Venues', current: input.venues, target: 5, detail: 'dense local targets' },
    { id: 'creators', label: 'Creators', current: input.creators, target: 30, detail: 'usable supply' },
    { id: 'missions', label: 'Missions', current: input.missions, target: 10, detail: 'proof nights run' },
    { id: 'paid-pilots', label: 'Paid pilots', current: input.paidPilots, target: 3, detail: 'real buyer signal' },
    { id: 'repeat', label: 'Repeat buyer', current: input.repeatBuyers, target: 1, detail: 'renewal proof' },
    { id: 'recap', label: 'Public recap', current: input.publicRecaps, target: 1, detail: 'show the receipt' },
  ];

  return rows.map((row) => ({
    ...row,
    tone: row.current >= row.target ? 'positive' : row.current > 0 ? 'active' : 'neutral',
  }));
}

async function fetchSiargaoVenueRows(periodStart: Date) {
  return prisma.venue.findMany({
    where: {
      status: { not: 'ARCHIVED' },
      OR: [
        { city: { contains: 'General Luna', mode: 'insensitive' } },
        { city: { contains: 'Siargao', mode: 'insensitive' } },
        { address: { contains: 'Siargao', mode: 'insensitive' } },
        { address: { contains: 'General Luna', mode: 'insensitive' } },
        { country: { contains: 'Philippines', mode: 'insensitive' } },
      ],
    },
    orderBy: [{ isPartner: 'desc' }, { updatedAt: 'desc' }],
    take: 40,
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      country: true,
      categories: true,
      isPartner: true,
      metadataJson: true,
      checkIns: {
        where: { scannedAt: { gte: periodStart } },
        orderBy: { scannedAt: 'desc' },
        select: {
          id: true,
          walletAddress: true,
          tag: true,
          scannedAt: true,
        },
      },
      memories: {
        where: { bucketStartAt: { gte: periodStart } },
        orderBy: { bucketStartAt: 'desc' },
        take: 6,
        select: {
          checkInCount: true,
          uniqueVisitorCount: true,
          completedDareCount: true,
          proofCount: true,
          perkRedemptionCount: true,
          bucketStartAt: true,
        },
      },
      placeTags: {
        where: { submittedAt: { gte: periodStart } },
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          creatorTag: true,
          status: true,
          submittedAt: true,
          reviewedAt: true,
        },
      },
      qrSessions: {
        where: { status: { in: ['LIVE', 'PAUSED'] } },
        orderBy: { startedAt: 'desc' },
        take: 1,
        select: {
          status: true,
        },
      },
      dares: {
        where: {
          OR: [
            { createdAt: { gte: periodStart } },
            { updatedAt: { gte: periodStart } },
            { verifiedAt: { gte: periodStart } },
            { completed_at: { gte: periodStart } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          shortId: true,
          title: true,
          bounty: true,
          status: true,
          streamerHandle: true,
          claimedBy: true,
          claimRequestStatus: true,
          claimRequestTag: true,
          targetWalletAddress: true,
          videoUrl: true,
          imageUrl: true,
          proofCid: true,
          proof_media: true,
          createdAt: true,
          updatedAt: true,
          verifiedAt: true,
          completed_at: true,
        },
      },
      reportLeads: {
        where: { createdAt: { gte: periodStart } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          intent: true,
          followUpStatus: true,
          createdAt: true,
        },
      },
      founderEvents: {
        where: { eventType: FIRST_SPARK_RUN_SHEET_EVENT },
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: {
          id: true,
          status: true,
          metadataJson: true,
          occurredAt: true,
          updatedAt: true,
        },
      },
    },
  });
}

export async function buildFirstSparkMissionControlReport(
  options: BuildOptions = {}
): Promise<FirstSparkMissionControlReport> {
  const periodDays = Math.min(Math.max(options.periodDays ?? DEFAULT_WINDOW_DAYS, 7), 30);
  const periodStart = startOfWindow(periodDays);
  const venues = await fetchSiargaoVenueRows(periodStart);
  const missions = buildMissionRows(venues);
  const creators = buildCreatorReliability(venues);
  const guestPerks = buildGuestPerks(missions);
  const recap = buildRecapPreview(missions);
  const liveOrReviewMissions = missions.filter((mission) =>
    mission.status === 'live' || mission.status === 'proof-review'
  ).length;
  const acceptedProofs = missions.reduce((sum, mission) => sum + mission.metrics.acceptedProofs, 0);
  const checkIns = missions.reduce((sum, mission) => sum + mission.metrics.checkIns, 0);
  const repeatReadyVenues = missions.filter((mission) =>
    mission.status === 'repeat' || mission.status === 'recap'
  ).length;
  const activeLeadCount = venues.reduce(
    (sum, venue) => sum + venue.reportLeads.filter((lead) => ACTIVE_LEAD_STATUSES.includes(lead.followUpStatus)).length,
    0
  );
  const trackedRuns = missions.filter((mission) => mission.runSheet.persisted);
  const recapSentCount = missions.filter((mission) => Boolean(mission.runSheet.recapSentAt)).length;
  const repeatWonCount = missions.filter((mission) => mission.runSheet.repeatOutcome === 'won').length;

  return {
    generatedAt: new Date().toISOString(),
    market: {
      label: 'Siargao beachhead',
      city: 'General Luna, Philippines',
      targetWindow: `${periodDays}d`,
    },
    command: {
      title: liveOrReviewMissions > 0 ? 'Close the live loop' : 'Launch the next proof night',
      nextAction: recap?.recommendedNextMission ?? 'Pick one venue and run a tiny mission',
      detail: 'One dense local market. One repeatable venue mission loop.',
    },
    summary: {
      venues: missions.length,
      liveOrReviewMissions,
      readyCreators: creators.length,
      checkIns,
      acceptedProofs,
      repeatReadyVenues,
    },
    missions,
    recap,
    creators,
    guestPerks,
    pilotTargets: buildPilotTargets({
      venues: missions.length,
      creators: creators.length,
      missions: Math.max(
        trackedRuns.length,
        missions.filter((mission) => mission.metrics.liveDares > 0 || mission.metrics.proofs > 0).length
      ),
      paidPilots: Math.max(activeLeadCount, trackedRuns.filter((mission) => mission.runSheet.stage !== 'draft').length),
      repeatBuyers: Math.max(repeatWonCount, missions.filter((mission) => mission.status === 'repeat').length),
      publicRecaps: Math.max(recapSentCount, repeatReadyVenues),
    }),
  };
}
