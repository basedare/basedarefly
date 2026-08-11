import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  buildSiargaoSurfSignal,
  classifySiargaoSurfSignal,
} from './siargao-surf-signal.ts';

const receivedAt = new Date('2026-08-05T04:45:00.000Z');

test('turns a strong period swell into a conservative pumping signal', () => {
  const signal = buildSiargaoSurfSignal(
    {
      current: {
        time: '2026-08-05T04:30',
        wave_height: 1.06,
        wave_direction: 82,
        wave_period: 11.15,
        swell_wave_height: 0.8,
        swell_wave_direction: 53,
        swell_wave_period: 12.25,
      },
    },
    receivedAt
  );

  assert.ok(signal);
  assert.equal(signal.tier, 'pumping');
  assert.equal(signal.model.swellHeightLabel, '2–3 ft');
  assert.equal(signal.model.swellDirectionLabel, 'NE');
  assert.match(signal.headline, /one offshore model shows a stronger swell/i);
  assert.match(signal.guidance, /Rock Island, Stimpy’s, Bumee, or Tuason/);
  assert.match(signal.caveat, /modelled offshore swell and tide/i);
  assert.match(signal.caveat, /not an observed break report or safety forecast/i);
  assert.equal(
    signal.crossCheck.href,
    'https://www.surf-forecast.com/breaks/Cloud-Nine/forecasts/latest/six_day'
  );
});

test('uses total-wave fields when the provider omits primary swell fields', () => {
  const signal = buildSiargaoSurfSignal(
    {
      current: {
        time: '2026-08-05T04:30Z',
        wave_height: 0.6,
        wave_direction: 90,
        wave_period: 8,
      },
    },
    receivedAt
  );

  assert.ok(signal);
  assert.equal(signal.tier, 'playful');
  assert.equal(signal.model.swellDirectionLabel, 'E');
  assert.equal(signal.tide, null);
});

test('publishes the next useful low and high tide times for today', () => {
  const signal = buildSiargaoSurfSignal(
    {
      utc_offset_seconds: 28_800,
      current: {
        time: '2026-08-11T09:15',
        wave_height: 1,
        wave_direction: 125,
        wave_period: 7.65,
        swell_wave_height: 0.88,
        swell_wave_direction: 142,
        swell_wave_period: 5.25,
      },
      hourly: {
        time: [
          '2026-08-11T01:00',
          '2026-08-11T02:00',
          '2026-08-11T03:00',
          '2026-08-11T04:00',
          '2026-08-11T09:00',
          '2026-08-11T10:00',
          '2026-08-11T11:00',
          '2026-08-11T16:00',
          '2026-08-11T17:00',
          '2026-08-11T18:00',
          '2026-08-12T00:00',
        ],
        sea_level_height_msl: [1.1, 1.35, 1.5, 1.42, -0.1, -0.21, -0.15, 1.3, 1.39, 1.28, 0.89],
      },
    },
    new Date('2026-08-11T02:15:00.000Z'),
  );

  assert.ok(signal?.tide);
  assert.equal(signal.tide.lowTime, '2026-08-11T02:00:00.000Z');
  assert.equal(signal.tide.highTime, '2026-08-11T09:00:00.000Z');
  assert.match(signal.caveat, /modelled offshore swell and tide/i);
});

test('labels the current-style short-period SE model component conservatively', () => {
  const signal = buildSiargaoSurfSignal(
    {
      current: {
        time: '2026-08-05T04:30Z',
        wave_height: 1.2,
        wave_direction: 100,
        wave_period: 9.1,
        swell_wave_height: 0.92,
        swell_wave_direction: 129,
        swell_wave_period: 7.15,
      },
    },
    receivedAt,
  );

  assert.ok(signal);
  assert.equal(signal.tier, 'playful');
  assert.equal(signal.model.swellHeightLabel, '3–4 ft');
  assert.equal(signal.model.swellDirectionLabel, 'SE');
  assert.match(signal.headline, /one offshore model shows some swell/i);
  assert.doesNotMatch(signal.headline, /surf is|waves are|pumping/i);
});

test('does not label short-period or small swell as pumping', () => {
  assert.equal(
    classifySiargaoSurfSignal({ swellHeightM: 1.2, swellPeriodSeconds: 6 }),
    'quiet'
  );
  assert.equal(
    classifySiargaoSurfSignal({ swellHeightM: 0.6, swellPeriodSeconds: 8 }),
    'playful'
  );
});

test('fails closed for stale, future, or invalid model data', () => {
  const baseCurrent = {
    wave_height: 0.8,
    wave_direction: 45,
    wave_period: 10,
  };

  assert.equal(
    buildSiargaoSurfSignal(
      { current: { ...baseCurrent, time: '2026-08-05T00:00Z' } },
      receivedAt
    ),
    null
  );
  assert.equal(
    buildSiargaoSurfSignal(
      { current: { ...baseCurrent, time: '2026-08-05T05:30Z' } },
      receivedAt
    ),
    null
  );
  assert.equal(
    buildSiargaoSurfSignal(
      { current: { ...baseCurrent, time: 'bad-time', wave_height: Number.NaN } },
      receivedAt
    ),
    null
  );
});
