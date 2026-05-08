import 'server-only';

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import {
  SCOUT_CREATOR_LEAD_EVENT_TYPE,
  isRecord,
  stringValue,
} from '@/lib/scout-creator-leads';

type MetadataRecord = Record<string, unknown>;

function asRecord(value: unknown): MetadataRecord {
  return isRecord(value) ? value : {};
}

function stringArrayValue(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function cleanToken(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 96);
}

export function mapCaptainMissionEvent(event: {
  id: string;
  title: string | null;
  status: string | null;
  metadataJson: Prisma.JsonValue | null;
  occurredAt: Date;
  updatedAt: Date;
}) {
  const metadata = asRecord(event.metadataJson);
  const mission = asRecord(metadata.mission);
  const packet = asRecord(mission.packet);
  const latestProof = asRecord(mission.latestProof);
  const pitchPacket = asRecord(mission.pitchPacket);

  return {
    id: event.id,
    title: event.title || 'Captain mission',
    status: event.status || 'MISSION_SENT',
    creatorHandle: stringValue(metadata.creatorHandle),
    creatorName: stringValue(metadata.creatorName),
    creatorCity: stringValue(metadata.creatorCity),
    scoutCode: stringValue(metadata.scoutCode),
    scoutHandle: stringValue(metadata.scoutHandle),
    mission: {
      token: stringValue(mission.token),
      status: stringValue(mission.status),
      launchedAt: stringValue(mission.launchedAt),
      missionPath: stringValue(mission.missionPath),
      missionUrl: stringValue(mission.missionUrl),
      packet: {
        title: stringValue(packet.title),
        objective: stringValue(packet.objective),
        prompts: stringArrayValue(packet.prompts),
        proofChecklist: stringArrayValue(packet.proofChecklist),
        captionDraft: stringValue(packet.captionDraft),
        referralAsk: stringValue(packet.referralAsk),
        safetyRules: stringArrayValue(packet.safetyRules),
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
      },
    },
    occurredAt: event.occurredAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

export async function findCaptainMissionEventByToken(token: string) {
  const clean = cleanToken(token);
  if (!clean) return null;

  const events = await prisma.founderEvent.findMany({
    where: {
      eventType: SCOUT_CREATOR_LEAD_EVENT_TYPE,
      status: {
        notIn: ['REJECTED', 'REWARD_PAID'],
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: 300,
    select: {
      id: true,
      title: true,
      status: true,
      metadataJson: true,
      occurredAt: true,
      updatedAt: true,
    },
  });

  return events.find((event) => {
    const metadata = asRecord(event.metadataJson);
    const mission = asRecord(metadata.mission);
    return stringValue(mission.token) === clean;
  }) || null;
}

export async function getCaptainMissionByToken(token: string) {
  const event = await findCaptainMissionEventByToken(token);
  return event ? mapCaptainMissionEvent(event) : null;
}
