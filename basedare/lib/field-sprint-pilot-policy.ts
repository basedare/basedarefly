import type { FieldStationAttentionMode } from '@/lib/field-station-policy';

export const FIELD_SPRINT_PILOT_GATES = {
  minimumUniqueEntries: 20,
  minimumHealthyInventoryRatePercent: 60,
  minimumTargetOpenRatePercent: 25,
  minimumVerifiedOutcomes: 3,
  maximumMedianRenderMs: 1_500,
  minimumRenderSamples: 5,
} as const;

type GateStatus = 'PASS' | 'FAIL' | 'PENDING' | 'NOT_APPLICABLE';

export type FieldSprintPilotEvent = {
  id: string;
  eventType: string;
  campaignCode: string | null;
  journeyId: string | null;
  occurredAt: Date;
  metadataJson: unknown;
};

export type FieldSprintPilotGate = {
  status: GateStatus;
  value: number | null;
  target: number;
  unit: 'count' | 'percent' | 'milliseconds';
  meaning: string;
};

export type FieldSprintPilotScorecard = {
  campaignCode: string;
  status: 'LEARNING' | 'NEEDS_FIX' | 'PASS_CANDIDATE';
  counts: {
    uniqueEntries: number;
    renderedEntries: number;
    choices: number;
    targetOpens: number;
    missionPasses: number;
    verifiedOutcomes: number;
    targetedScans: number;
    healthyTargetedScans: number;
  };
  rates: {
    healthyInventoryPercent: number | null;
    targetOpenPercent: number | null;
    medianRenderMs: number | null;
  };
  gates: {
    sampleSize: FieldSprintPilotGate;
    inventoryHealth: FieldSprintPilotGate;
    targetOpen: FieldSprintPilotGate;
    verifiedOutcomes: FieldSprintPilotGate;
    performance: FieldSprintPilotGate;
  };
  humanDecisionRequired: true;
  humanDecisionMeaning: string;
};

export type FieldStationReadinessLaneInput = {
  attention: Exclude<FieldStationAttentionMode, 'ASK' | 'NEARBY'>;
  healthy: boolean;
  hasVerifiedOutcomePath: boolean;
};

export type FieldStationReadinessIssue = {
  severity: 'BLOCKER' | 'WARNING';
  code: string;
  message: string;
};

function metadata(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function percent(numerator: number, denominator: number) {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 1_000) / 10;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : Math.round((ordered[middle - 1] + ordered[middle]) / 2);
}

function eventIdentity(event: FieldSprintPilotEvent) {
  return event.journeyId || `event:${event.id}`;
}

function countUnique(events: FieldSprintPilotEvent[], eventTypes: string[]) {
  const accepted = new Set(eventTypes);
  return new Set(events.filter((event) => accepted.has(event.eventType)).map(eventIdentity)).size;
}

function countGate(value: number, target: number, meaning: string, sampleReady: boolean) : FieldSprintPilotGate {
  return {
    status: value >= target ? 'PASS' : sampleReady ? 'FAIL' : 'PENDING',
    value,
    target,
    unit: 'count',
    meaning,
  };
}

export function inheritStationCampaignAcrossJourney<T extends {
  eventType: string;
  campaignCode: string | null;
  stationCode: string | null;
  journeyId: string | null;
  occurredAt: Date;
}>(events: T[]): T[] {
  const campaignByStationJourney = new Map<string, string>();
  return [...events]
    .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime())
    .map((event) => {
      if (!event.stationCode || !event.journeyId) return event;
      const key = `${event.stationCode}:${event.journeyId}`;
      if (event.eventType === 'STATION_SCAN' && event.campaignCode) {
        campaignByStationJourney.set(key, event.campaignCode);
      }
      return {
        ...event,
        // The append-only event retains creator-primary attribution. Station
        // reporting carries the station campaign forward from its own scan.
        campaignCode: campaignByStationJourney.get(key) ?? event.campaignCode,
      };
    });
}

export function buildFieldSprintPilotScorecards(
  events: FieldSprintPilotEvent[]
): FieldSprintPilotScorecard[] {
  const byCampaign = new Map<string, FieldSprintPilotEvent[]>();
  for (const event of events) {
    const campaignCode = event.campaignCode?.trim();
    if (!campaignCode) continue;
    const row = byCampaign.get(campaignCode) ?? [];
    row.push(event);
    byCampaign.set(campaignCode, row);
  }

  return [...byCampaign.entries()].map<FieldSprintPilotScorecard>(([campaignCode, campaignEvents]) => {
    const uniqueEntries = countUnique(campaignEvents, ['STATION_SCAN']);
    const renderedEntries = countUnique(campaignEvents, ['STATION_ENTRY_RENDERED']);
    const choices = countUnique(campaignEvents, ['STATION_ATTENTION_SELECTED']);
    const targetOpens = countUnique(campaignEvents, ['STATION_TARGET_OPENED']);
    const missionPasses = countUnique(campaignEvents, ['MISSION_PASS_ISSUED']);
    // One person reaching both a secure venue arrival and an accepted mission
    // completion is still one verified pilot outcome, not two successes.
    const verifiedOutcomes = countUnique(campaignEvents, [
      'STATION_VERIFIED_ARRIVAL',
      'PATH_VERIFIED_COMPLETION',
      'DIRECT_VERIFIED_COMPLETION',
    ]);
    const targetedScans = campaignEvents.filter((event) => {
      if (event.eventType !== 'STATION_SCAN') return false;
      const requested = metadata(event.metadataJson).requestedAttentionMode;
      return typeof requested === 'string' && ['TONIGHT', 'MYSTERY', 'SOCIAL', 'REWARD'].includes(requested.toUpperCase());
    });
    const healthyTargetedScans = targetedScans.filter(
      (event) => metadata(event.metadataJson).fallbackApplied !== true
    ).length;
    const renderSamples = campaignEvents.flatMap((event) => {
      if (event.eventType !== 'STATION_ENTRY_RENDERED') return [];
      const value = metadata(event.metadataJson).clientRenderMs;
      return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? [value] : [];
    });
    const healthyInventoryPercent = percent(healthyTargetedScans, targetedScans.length);
    const targetOpenPercent = percent(targetOpens, uniqueEntries);
    const medianRenderMs = median(renderSamples);
    const sampleReady = uniqueEntries >= FIELD_SPRINT_PILOT_GATES.minimumUniqueEntries;
    const inventoryHealth: FieldSprintPilotGate = healthyInventoryPercent === null
      ? {
          status: 'NOT_APPLICABLE',
          value: null,
          target: FIELD_SPRINT_PILOT_GATES.minimumHealthyInventoryRatePercent,
          unit: 'percent',
          meaning: 'Applies to targeted poster promises; ASK-first stations are judged by live preflight instead.',
        }
      : {
          status: healthyInventoryPercent >= FIELD_SPRINT_PILOT_GATES.minimumHealthyInventoryRatePercent
            ? 'PASS'
            : sampleReady ? 'FAIL' : 'PENDING',
          value: healthyInventoryPercent,
          target: FIELD_SPRINT_PILOT_GATES.minimumHealthyInventoryRatePercent,
          unit: 'percent',
          meaning: 'Targeted entries that received the promised healthy inventory without fallback.',
        };
    const targetOpen: FieldSprintPilotGate = {
      status: targetOpenPercent === null
        ? 'PENDING'
        : targetOpenPercent >= FIELD_SPRINT_PILOT_GATES.minimumTargetOpenRatePercent
          ? 'PASS'
          : sampleReady ? 'FAIL' : 'PENDING',
      value: targetOpenPercent,
      target: FIELD_SPRINT_PILOT_GATES.minimumTargetOpenRatePercent,
      unit: 'percent',
      meaning: 'Unique station journeys that opened one recommended destination or action.',
    };
    const performance: FieldSprintPilotGate = {
      status: renderSamples.length < FIELD_SPRINT_PILOT_GATES.minimumRenderSamples || medianRenderMs === null
        ? 'PENDING'
        : medianRenderMs <= FIELD_SPRINT_PILOT_GATES.maximumMedianRenderMs ? 'PASS' : 'FAIL',
      value: medianRenderMs,
      target: FIELD_SPRINT_PILOT_GATES.maximumMedianRenderMs,
      unit: 'milliseconds',
      meaning: `Median Board render after at least ${FIELD_SPRINT_PILOT_GATES.minimumRenderSamples} measured station entries.`,
    };
    const gates = {
      sampleSize: countGate(
        uniqueEntries,
        FIELD_SPRINT_PILOT_GATES.minimumUniqueEntries,
        'Minimum unique station journeys before conversion rates are judged.',
        false
      ),
      inventoryHealth,
      targetOpen,
      verifiedOutcomes: countGate(
        verifiedOutcomes,
        FIELD_SPRINT_PILOT_GATES.minimumVerifiedOutcomes,
        'Distinct station journeys that produced a secure venue arrival or accepted mission completion.',
        sampleReady
      ),
      performance,
    };
    const evaluatedGates = Object.values(gates).filter((gate) => gate.status !== 'NOT_APPLICABLE');
    const hasFailure = evaluatedGates.some((gate) => gate.status === 'FAIL');
    const allPassed = evaluatedGates.every((gate) => gate.status === 'PASS');

    return {
      campaignCode,
      status: hasFailure ? 'NEEDS_FIX' : allPassed ? 'PASS_CANDIDATE' : 'LEARNING',
      counts: {
        uniqueEntries,
        renderedEntries,
        choices,
        targetOpens,
        missionPasses,
        verifiedOutcomes,
        targetedScans: targetedScans.length,
        healthyTargetedScans,
      },
      rates: { healthyInventoryPercent, targetOpenPercent, medianRenderMs },
      gates,
      humanDecisionRequired: true,
      humanDecisionMeaning: 'Expansion still requires a host or destination asking to repeat or pay, acceptable complaints, and manageable operator cost.',
    };
  }).sort((left, right) => left.campaignCode.localeCompare(right.campaignCode));
}

export function deriveFieldStationLaunchReadiness(input: {
  requestedAttention: FieldStationAttentionMode;
  journeySecretConfigured: boolean;
  lanes: FieldStationReadinessLaneInput[];
}) {
  const issues: FieldStationReadinessIssue[] = [];
  if (!input.journeySecretConfigured) {
    issues.push({
      severity: 'BLOCKER',
      code: 'MISSION_PASS_SECRET_MISSING',
      message: 'Configure MISSION_PASS_HMAC_SECRET before activating a physical station.',
    });
  }
  const targeted = !['ASK', 'NEARBY'].includes(input.requestedAttention);
  const relevantLanes = targeted
    ? input.lanes.filter((lane) => lane.attention === input.requestedAttention)
    : input.lanes;
  const healthyLanes = relevantLanes.filter((lane) => lane.healthy);
  if (healthyLanes.length === 0) {
    issues.push({
      severity: 'BLOCKER',
      code: targeted ? 'PROMISED_INVENTORY_THIN' : 'NO_HEALTHY_INTENT_LANE',
      message: targeted
        ? `The ${input.requestedAttention.toLowerCase()} promise does not currently meet its quality-density gate.`
        : 'No useful intent lane currently meets the station quality-density gate.',
    });
  } else if (!healthyLanes.some((lane) => lane.hasVerifiedOutcomePath)) {
    issues.push({
      severity: 'BLOCKER',
      code: 'NO_VERIFIED_OUTCOME_PATH',
      message: 'Healthy answers exist, but none currently lead to a funded mission or live secure venue handshake.',
    });
  }
  if (!targeted) {
    for (const lane of input.lanes.filter((candidate) => !candidate.healthy)) {
      issues.push({
        severity: 'WARNING',
        code: `THIN_${lane.attention}_LANE`,
        message: `${lane.attention.toLowerCase()} is thin and should stay hidden until its inventory recovers.`,
      });
    }
  }
  return {
    status: issues.some((issue) => issue.severity === 'BLOCKER')
      ? 'BLOCKED' as const
      : issues.length > 0 ? 'DEGRADED' as const : 'READY' as const,
    issues,
  };
}
