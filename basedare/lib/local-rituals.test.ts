import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatLocalRitualTime,
  localRitualFreshness,
  nextLocalRitualOccurrence,
  validateLocalRitualSchedule,
  WAKEPARK_SUNDAY_FUNDAY_RITUAL,
} from './local-rituals.ts';

test('ritual freshness expires honestly and paused rituals never appear confirmed', () => {
  const expiresAt = new Date('2026-08-24T00:00:00.000Z');
  assert.equal(
    localRitualFreshness({
      status: 'ACTIVE',
      freshnessExpiresAt: expiresAt,
      now: new Date('2026-08-24T00:00:00.000Z'),
    }),
    'CONFIRMED'
  );
  assert.equal(
    localRitualFreshness({
      status: 'ACTIVE',
      freshnessExpiresAt: expiresAt,
      now: new Date('2026-08-24T00:00:00.001Z'),
    }),
    'NEEDS_CONFIRMATION'
  );
  assert.equal(
    localRitualFreshness({
      status: 'PAUSED',
      freshnessExpiresAt: expiresAt,
      now: new Date('2026-08-01T00:00:00.000Z'),
    }),
    'PAUSED'
  );
});

test('Wakepark Sunday Funday remains current while it is actually running', () => {
  const occurrence = nextLocalRitualOccurrence({
    weekday: WAKEPARK_SUNDAY_FUNDAY_RITUAL.weekday,
    startLocalMinutes: WAKEPARK_SUNDAY_FUNDAY_RITUAL.startLocalMinutes,
    endLocalMinutes: WAKEPARK_SUNDAY_FUNDAY_RITUAL.endLocalMinutes,
    timeZone: WAKEPARK_SUNDAY_FUNDAY_RITUAL.timezone,
    now: new Date('2026-07-26T05:00:00.000Z'),
  });
  assert.equal(occurrence.startsAt.toISOString(), '2026-07-26T04:00:00.000Z');
  assert.equal(occurrence.endsAt?.toISOString(), '2026-07-26T10:00:00.000Z');
});

test('Wakepark Sunday Funday advances to the next Sunday after the window closes', () => {
  const occurrence = nextLocalRitualOccurrence({
    weekday: WAKEPARK_SUNDAY_FUNDAY_RITUAL.weekday,
    startLocalMinutes: WAKEPARK_SUNDAY_FUNDAY_RITUAL.startLocalMinutes,
    endLocalMinutes: WAKEPARK_SUNDAY_FUNDAY_RITUAL.endLocalMinutes,
    timeZone: WAKEPARK_SUNDAY_FUNDAY_RITUAL.timezone,
    now: new Date('2026-07-26T11:00:00.000Z'),
  });
  assert.equal(occurrence.startsAt.toISOString(), '2026-08-02T04:00:00.000Z');
  assert.equal(occurrence.endsAt?.toISOString(), '2026-08-02T10:00:00.000Z');
  assert.equal(
    formatLocalRitualTime(WAKEPARK_SUNDAY_FUNDAY_RITUAL),
    'Sunday · 12pm–6pm'
  );
});

test('invalid schedules fail before they can become public ritual data', () => {
  assert.throws(() =>
    validateLocalRitualSchedule({
      weekday: 7,
      startLocalMinutes: 720,
      sourceLastConfirmedAt: new Date('2026-07-27T00:00:00.000Z'),
      freshnessExpiresAt: new Date('2026-08-27T00:00:00.000Z'),
    })
  );
  assert.throws(() =>
    validateLocalRitualSchedule({
      weekday: 0,
      startLocalMinutes: 720,
      sourceLastConfirmedAt: new Date('2026-08-27T00:00:00.000Z'),
      freshnessExpiresAt: new Date('2026-07-27T00:00:00.000Z'),
    })
  );
});
