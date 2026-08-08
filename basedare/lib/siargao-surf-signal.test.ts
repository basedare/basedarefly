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
  assert.match(signal.caveat, /not breaking-wave height, an observation, or a safety forecast/i);
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
