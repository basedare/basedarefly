import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import {
  DEFAULT_SCOUT_REWARD_SHARE_PCT,
  SCOUT_CREATOR_LEAD_EVENT_TYPE,
  SCOUT_CREATOR_LEAD_STATUS_LABELS,
  SCOUT_CREATOR_LEAD_STATUSES,
  SCOUT_CREATOR_PLATFORM_LABELS,
  SCOUT_RELATIONSHIP_STRENGTH_LABELS,
  buildCaptainMissionActivationHref,
  buildCaptainMissionPacket,
  buildCaptainMissionPath,
  buildVenuePitchPacket,
  estimateScoutReward,
  isRecord,
  normalizeScoutCreatorLeadStatus,
  numberValue,
  stringValue,
  type ScoutCreatorLeadStatus,
} from '@/lib/scout-creator-leads';
import { alertScoutCreatorLeadStatusUpdate } from '@/lib/telegram';

const ScoutLeadStatusSchema = z.enum(SCOUT_CREATOR_LEAD_STATUSES);
const ScoutLeadUpdateSchema = z.object({
  id: z.string().min(1),
  status: ScoutLeadStatusSchema.optional(),
  action: z.enum(['launch_mission', 'venue_pitch_ready', 'activation_opened']).optional(),
  operatorNote: z.string().max(1200).nullable().optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
  rewardSharePct: z.number().min(0).max(100).nullable().optional(),
  creatorEarningsUsd: z.number().min(0).max(1_000_000).nullable().optional(),
  rewardAmountUsd: z.number().min(0).max(1_000_000).nullable().optional(),
  rewardTxHash: z.string().max(180).nullable().optional(),
  rewardPaidAt: z.string().datetime().nullable().optional(),
});

type MetadataRecord = Record<string, unknown>;

function asRecord(value: unknown): MetadataRecord {
  return isRecord(value) ? value : {};
}

function cleanOptional(value: string | null | undefined) {
  const clean = value?.replace(/\s+/g, ' ').trim() || '';
  return clean || null;
}

function stringArrayValue(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function hoursSince(value: Date) {
  return Math.max(0, Math.round((Date.now() - value.getTime()) / (1000 * 60 * 60)));
}

function formatLabel<T extends string>(labels: Record<T, string>, value: string) {
  return labels[value as T] || value || 'Unknown';
}

function buildInviteDraft(input: {
  creatorHandle: string;
  creatorCity: string;
  scoutCode: string;
  captainInviteUrl: string;
}) {
  const cityLine = input.creatorCity ? ` in ${input.creatorCity}` : '';
  return [
    `Yo ${input.creatorHandle || 'there'} - BaseDare is selecting founding Dare Captains${cityLine}.`,
    'Captains get routed into real-world missions with proof, venue heat, and paid creator opportunities.',
    `Your invite is tagged to scout code ${input.scoutCode}:`,
    input.captainInviteUrl,
  ].join('\n');
}

function mapScoutLeadEvent(event: {
  id: string;
  title: string | null;
  status: string | null;
  actor: string | null;
  href: string | null;
  metadataJson: Prisma.JsonValue | null;
  occurredAt: Date;
  updatedAt: Date;
}) {
  const metadata = asRecord(event.metadataJson);
  const score = asRecord(metadata.score);
  const reward = asRecord(metadata.reward);
  const operator = asRecord(metadata.operator);
  const mission = asRecord(metadata.mission);
  const missionPacket = asRecord(mission.packet);
  const latestProof = asRecord(mission.latestProof);
  const pitchPacket = asRecord(mission.pitchPacket);
  const status = normalizeScoutCreatorLeadStatus(event.status);
  const scoutCode = stringValue(metadata.scoutCode);
  const creatorHandle = stringValue(metadata.creatorHandle);
  const captainInvitePath = stringValue(metadata.captainInvitePath) || `/captains?scout=${encodeURIComponent(scoutCode)}`;
  const captainInviteUrl =
    stringValue(metadata.captainInviteUrl) ||
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://basedare.xyz'}${captainInvitePath}`;
  const creatorPlatform = stringValue(metadata.creatorPlatform);
  const relationshipStrength = stringValue(metadata.relationshipStrength);
  const rewardSharePct = numberValue(reward.rewardSharePct) || DEFAULT_SCOUT_REWARD_SHARE_PCT;
  const creatorEarningsUsd = numberValue(reward.creatorEarningsUsd);
  const estimatedRewardUsd =
    numberValue(reward.estimatedRewardUsd) ||
    estimateScoutReward({
      creatorEarningsUsd,
      rewardSharePct,
    });

  return {
    id: event.id,
    title: event.title || `${creatorHandle || 'Creator'} scout lead`,
    status,
    statusLabel: SCOUT_CREATOR_LEAD_STATUS_LABELS[status],
    scoutName: stringValue(metadata.scoutName),
    scoutHandle: stringValue(metadata.scoutHandle),
    scoutWallet: stringValue(metadata.scoutWallet),
    scoutCode,
    creatorHandle,
    creatorName: stringValue(metadata.creatorName),
    creatorPlatform,
    creatorPlatformLabel: formatLabel(SCOUT_CREATOR_PLATFORM_LABELS, creatorPlatform),
    creatorCity: stringValue(metadata.creatorCity),
    creatorLink: stringValue(metadata.creatorLink),
    relationshipStrength,
    relationshipStrengthLabel: formatLabel(SCOUT_RELATIONSHIP_STRENGTH_LABELS, relationshipStrength),
    fitReason: stringValue(metadata.fitReason),
    notes: stringValue(metadata.notes),
    score: {
      value: numberValue(score.score),
      reasons: Array.isArray(score.reasons) ? score.reasons.filter((item): item is string => typeof item === 'string') : [],
    },
    reward: {
      rewardSharePct,
      creatorEarningsUsd,
      estimatedRewardUsd,
      rewardAmountUsd: numberValue(reward.rewardAmountUsd),
      rewardTxHash: stringValue(reward.rewardTxHash),
      rewardPaidAt: stringValue(reward.rewardPaidAt),
      policy: stringValue(reward.policy),
    },
    operator: {
      operatorNote: stringValue(operator.operatorNote),
      nextActionAt: stringValue(operator.nextActionAt),
      updatedBy: stringValue(operator.updatedBy),
      updatedAt: stringValue(operator.updatedAt),
    },
    captainApplicationId: stringValue(metadata.captainApplicationId),
    captainAppliedAt: stringValue(metadata.captainAppliedAt),
    mission: {
      token: stringValue(mission.token),
      status: stringValue(mission.status),
      missionPath: stringValue(mission.missionPath),
      missionUrl: stringValue(mission.missionUrl),
      launchedAt: stringValue(mission.launchedAt),
      launchedBy: stringValue(mission.launchedBy),
      proofSubmittedAt: stringValue(mission.proofSubmittedAt),
      activationOpenedAt: stringValue(mission.activationOpenedAt),
      packet: {
        title: stringValue(missionPacket.title),
        objective: stringValue(missionPacket.objective),
        prompts: stringArrayValue(missionPacket.prompts),
        proofChecklist: stringArrayValue(missionPacket.proofChecklist),
        captionDraft: stringValue(missionPacket.captionDraft),
        referralAsk: stringValue(missionPacket.referralAsk),
        safetyRules: stringArrayValue(missionPacket.safetyRules),
      },
      latestProof: {
        bestVenueName: stringValue(latestProof.bestVenueName),
        city: stringValue(latestProof.city),
        proofLinks: stringArrayValue(latestProof.proofLinks),
        whyGoodFit: stringValue(latestProof.whyGoodFit),
        momentDescription: stringValue(latestProof.momentDescription),
        perkIdea: stringValue(latestProof.perkIdea),
        ownerIntroStatus: stringValue(latestProof.ownerIntroStatus),
        submittedAt: stringValue(latestProof.submittedAt),
      },
      pitchPacket: {
        headline: stringValue(pitchPacket.headline),
        buyerPitch: stringValue(pitchPacket.buyerPitch),
        outreachDraft: stringValue(pitchPacket.outreachDraft),
        activationHref: stringValue(pitchPacket.activationHref),
        receiptBullets: stringArrayValue(pitchPacket.receiptBullets),
        venueName: stringValue(pitchPacket.venueName),
        city: stringValue(pitchPacket.city),
      },
    },
    ageHours: hoursSince(event.occurredAt),
    occurredAt: event.occurredAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    links: {
      captainInvitePath,
      captainInviteUrl,
      captainApplicationHref: stringValue(metadata.captainApplicationId)
        ? `/admin/creator-captains?applicationId=${encodeURIComponent(stringValue(metadata.captainApplicationId))}`
        : null,
      creatorSearchHref: creatorHandle ? `/creators?search=${encodeURIComponent(creatorHandle.replace(/^@/, ''))}` : '/creators',
    },
    inviteDraft: buildInviteDraft({
      creatorHandle,
      creatorCity: stringValue(metadata.creatorCity),
      scoutCode,
      captainInviteUrl,
    }),
  };
}

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const events = await prisma.founderEvent.findMany({
      where: {
        eventType: SCOUT_CREATOR_LEAD_EVENT_TYPE,
      },
      orderBy: {
        occurredAt: 'desc',
      },
      take: 160,
      select: {
        id: true,
        title: true,
        status: true,
        actor: true,
        href: true,
        metadataJson: true,
        occurredAt: true,
        updatedAt: true,
      },
    });

    const leads = events.map(mapScoutLeadEvent);
    const byStatus = SCOUT_CREATOR_LEAD_STATUSES.reduce(
      (acc, status) => ({
        ...acc,
        [status]: leads.filter((lead) => lead.status === status).length,
      }),
      {} as Record<ScoutCreatorLeadStatus, number>
    );

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total: leads.length,
          active: leads.filter((lead) => !['REWARD_PAID', 'REJECTED'].includes(lead.status)).length,
          applied: byStatus.CREATOR_APPLIED,
          missionSent: byStatus.MISSION_SENT,
          proofSubmitted: byStatus.PROOF_SUBMITTED,
          pitchReady: byStatus.VENUE_PITCH_READY,
          activationOpened: byStatus.ACTIVATION_OPENED,
          rewardDue: byStatus.REWARD_DUE,
          rewardPaid: byStatus.REWARD_PAID,
          highScore: leads.filter((lead) => lead.score.value >= 70).length,
          byStatus,
        },
        leads,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_SCOUTS] Fetch failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to load scout creator leads' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const body = await request.json();
    const validation = ScoutLeadUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const input = validation.data;
    const event = await prisma.founderEvent.findFirst({
      where: {
        id: input.id,
        eventType: SCOUT_CREATOR_LEAD_EVENT_TYPE,
      },
      select: {
        id: true,
        status: true,
        metadataJson: true,
      },
    });

    if (!event) {
      return NextResponse.json({ success: false, error: 'Scout creator lead not found' }, { status: 404 });
    }

    const currentStatus = normalizeScoutCreatorLeadStatus(event.status);
    let nextStatus = input.status ?? currentStatus;
    const metadata = asRecord(event.metadataJson);
    const existingOperator = asRecord(metadata.operator);
    const existingReward = asRecord(metadata.reward);
    const existingMission = asRecord(metadata.mission);
    const nextOperator: MetadataRecord = {
      ...existingOperator,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.walletAddress,
    };
    const nextReward: MetadataRecord = {
      ...existingReward,
    };

    if (input.operatorNote !== undefined) nextOperator.operatorNote = cleanOptional(input.operatorNote);
    if (input.nextActionAt !== undefined) nextOperator.nextActionAt = input.nextActionAt;
    if (input.rewardSharePct !== undefined) nextReward.rewardSharePct = input.rewardSharePct;
    if (input.creatorEarningsUsd !== undefined) nextReward.creatorEarningsUsd = input.creatorEarningsUsd;
    if (input.rewardAmountUsd !== undefined) nextReward.rewardAmountUsd = input.rewardAmountUsd;
    if (input.rewardTxHash !== undefined) nextReward.rewardTxHash = cleanOptional(input.rewardTxHash);
    if (input.rewardPaidAt !== undefined) nextReward.rewardPaidAt = input.rewardPaidAt;

    nextReward.estimatedRewardUsd = estimateScoutReward({
      creatorEarningsUsd: numberValue(nextReward.creatorEarningsUsd),
      rewardSharePct: numberValue(nextReward.rewardSharePct) || DEFAULT_SCOUT_REWARD_SHARE_PCT,
    });

    const creatorHandle = stringValue(metadata.creatorHandle);
    const creatorCity = stringValue(metadata.creatorCity);
    const scoutCode = stringValue(metadata.scoutCode);
    const existingLatestProof = asRecord(existingMission.latestProof);
    let nextMission: MetadataRecord = {
      ...existingMission,
    };

    if (input.action === 'launch_mission') {
      const token = stringValue(existingMission.token) || randomUUID().replace(/-/g, '');
      const missionPath = buildCaptainMissionPath({ token });
      const missionUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://basedare.xyz'}${missionPath}`;
      nextMission = {
        ...nextMission,
        token,
        missionPath,
        missionUrl,
        status: 'MISSION_SENT',
        launchedAt: stringValue(existingMission.launchedAt) || new Date().toISOString(),
        launchedBy: auth.walletAddress,
        packet: buildCaptainMissionPacket({
          creatorHandle,
          creatorCity,
          scoutCode,
        }),
      };
      nextStatus = input.status ?? 'MISSION_SENT';
    }

    if (input.action === 'venue_pitch_ready') {
      const pitchPacket = buildVenuePitchPacket({
        creatorHandle,
        creatorCity: stringValue(existingLatestProof.city) || creatorCity,
        venueName: stringValue(existingLatestProof.bestVenueName),
        venueAddress: stringValue(existingLatestProof.venueAddress),
        venueWebsite: stringValue(existingLatestProof.venueWebsite),
        venueInstagram: stringValue(existingLatestProof.venueInstagram),
        whyGoodFit: stringValue(existingLatestProof.whyGoodFit),
        momentDescription: stringValue(existingLatestProof.momentDescription),
        perkIdea: stringValue(existingLatestProof.perkIdea),
        ownerIntroStatus: stringValue(existingLatestProof.ownerIntroStatus),
      });

      nextMission = {
        ...nextMission,
        status: 'VENUE_PITCH_READY',
        pitchPacket,
        pitchReadyAt: new Date().toISOString(),
        pitchReadyBy: auth.walletAddress,
      };
      nextStatus = input.status ?? 'VENUE_PITCH_READY';
    }

    if (input.action === 'activation_opened') {
      const existingPitch = asRecord(nextMission.pitchPacket);
      const activationHref =
        stringValue(existingPitch.activationHref) ||
        buildCaptainMissionActivationHref({
          creatorHandle,
          venueName: stringValue(existingLatestProof.bestVenueName),
          city: stringValue(existingLatestProof.city) || creatorCity,
          source: 'captain-mission-admin',
        });

      nextMission = {
        ...nextMission,
        status: 'ACTIVATION_OPENED',
        activationHref,
        activationOpenedAt: new Date().toISOString(),
        activationOpenedBy: auth.walletAddress,
      };
      nextStatus = input.status ?? 'ACTIVATION_OPENED';
    }

    const statusHistory = Array.isArray(metadata.statusHistory) ? metadata.statusHistory : [];
    const nextMetadata = JSON.parse(
      JSON.stringify({
        ...metadata,
        operator: nextOperator,
        reward: nextReward,
        mission: nextMission,
        statusHistory:
          nextStatus !== currentStatus
            ? [
                ...statusHistory.slice(-12),
                {
                  from: currentStatus,
                  to: nextStatus,
                  at: new Date().toISOString(),
                  by: auth.walletAddress,
                },
              ]
            : statusHistory,
      })
    ) as Prisma.InputJsonValue;

    const updated = await prisma.founderEvent.update({
      where: { id: event.id },
      data: {
        status: nextStatus,
        href: '/admin/scouts',
        metadataJson: nextMetadata,
      },
      select: {
        id: true,
        title: true,
        status: true,
        actor: true,
        href: true,
        metadataJson: true,
        occurredAt: true,
        updatedAt: true,
      },
    });

    const mapped = mapScoutLeadEvent(updated);
    if (nextStatus !== currentStatus) {
      void alertScoutCreatorLeadStatusUpdate({
        leadId: mapped.id,
        creatorHandle: mapped.creatorHandle,
        scoutCode: mapped.scoutCode,
        status: mapped.status,
        operatorNote: mapped.operator.operatorNote,
        updatedBy: auth.walletAddress,
      }).catch((error) => {
        console.error('[ADMIN_SCOUTS] Telegram status alert failed:', error);
      });
    }

    return NextResponse.json({
      success: true,
      data: mapped,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_SCOUTS] Update failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to update scout creator lead' }, { status: 500 });
  }
}
