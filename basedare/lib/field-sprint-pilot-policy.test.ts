import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildFieldSprintPilotScorecards,
  deriveFieldStationLaunchReadiness,
  inheritStationCampaignAcrossJourney,
  type FieldSprintPilotEvent,
} from './field-sprint-pilot-policy.ts';

function event(
  id: string,
  eventType: string,
  journeyId: string,
  metadataJson: unknown = null
): FieldSprintPilotEvent {
  return {
    id,
    eventType,
    journeyId,
    campaignCode: 'siargao-design-partner-v1',
    occurredAt: new Date(`2026-07-19T10:${String(Number(id.replace(/\D/g, '') || 0) % 60).padStart(2, '0')}:00.000Z`),
    metadataJson,
  };
}

test('pilot scorecard deduplicates people and does not double-count verified outcomes', () => {
  const events: FieldSprintPilotEvent[] = [];
  for (let index = 0; index < 20; index += 1) {
    const journey = `journey-${index}`;
    events.push(event(`scan-${index}`, 'STATION_SCAN', journey, {
      requestedAttentionMode: 'REWARD',
      fallbackApplied: index >= 15,
    }));
    events.push(event(`render-${index}`, 'STATION_ENTRY_RENDERED', journey, { clientRenderMs: 800 + index }));
    if (index < 8) events.push(event(`open-${index}`, 'STATION_TARGET_OPENED', journey));
  }
  events.push(event('arrival-1', 'STATION_VERIFIED_ARRIVAL', 'journey-1'));
  events.push(event('completion-1', 'PATH_VERIFIED_COMPLETION', 'journey-1'));
  events.push(event('completion-2', 'PATH_VERIFIED_COMPLETION', 'journey-2'));
  events.push(event('completion-3', 'DIRECT_VERIFIED_COMPLETION', 'journey-3'));

  const [scorecard] = buildFieldSprintPilotScorecards(events);
  assert.equal(scorecard.counts.uniqueEntries, 20);
  assert.equal(scorecard.counts.verifiedOutcomes, 3);
  assert.equal(scorecard.rates.healthyInventoryPercent, 75);
  assert.equal(scorecard.rates.targetOpenPercent, 40);
  assert.equal(scorecard.gates.inventoryHealth.status, 'PASS');
  assert.equal(scorecard.gates.performance.status, 'PASS');
  assert.equal(scorecard.status, 'PASS_CANDIDATE');
});

test('ASK-first campaign does not invent a historical inventory gate', () => {
  const [scorecard] = buildFieldSprintPilotScorecards([
    event('scan-1', 'STATION_SCAN', 'journey-1', { requestedAttentionMode: 'ASK' }),
  ]);
  assert.equal(scorecard.gates.inventoryHealth.status, 'NOT_APPLICABLE');
  assert.equal(scorecard.status, 'LEARNING');
});

test('readiness blocks thin promises and healthy answers without a verified outcome path', () => {
  const thin = deriveFieldStationLaunchReadiness({
    requestedAttention: 'REWARD',
    journeySecretConfigured: true,
    lanes: [{ attention: 'REWARD', healthy: false, hasVerifiedOutcomePath: false }],
  });
  assert.equal(thin.status, 'BLOCKED');
  assert.equal(thin.issues[0].code, 'PROMISED_INVENTORY_THIN');

  const unverifiable = deriveFieldStationLaunchReadiness({
    requestedAttention: 'ASK',
    journeySecretConfigured: true,
    lanes: [
      { attention: 'SOCIAL', healthy: true, hasVerifiedOutcomePath: false },
      { attention: 'MYSTERY', healthy: false, hasVerifiedOutcomePath: false },
    ],
  });
  assert.equal(unverifiable.status, 'BLOCKED');
  assert.equal(unverifiable.issues.some((issue) => issue.code === 'NO_VERIFIED_OUTCOME_PATH'), true);
});

test('readiness accepts a funded mission as a real verified outcome path', () => {
  const readiness = deriveFieldStationLaunchReadiness({
    requestedAttention: 'REWARD',
    journeySecretConfigured: true,
    lanes: [{ attention: 'REWARD', healthy: true, hasVerifiedOutcomePath: true }],
  });
  assert.deepEqual(readiness, { status: 'READY', issues: [] });
});

test('station reporting keeps its scan campaign when creator attribution was primary', () => {
  const inherited = inheritStationCampaignAcrossJourney([
    {
      ...event('scan-1', 'STATION_SCAN', 'journey-1'),
      stationCode: 'host-01',
      campaignCode: 'station-pilot',
    },
    {
      ...event('pass-1', 'MISSION_PASS_ISSUED', 'journey-1'),
      stationCode: 'host-01',
      campaignCode: 'creator-episode',
    },
  ]);
  assert.equal(inherited[1].campaignCode, 'station-pilot');
});
