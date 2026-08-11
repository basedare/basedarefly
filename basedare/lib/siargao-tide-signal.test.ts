import assert from 'node:assert/strict';
import test from 'node:test';

import { parseSurfForecastTidePage } from './siargao-tide-signal.ts';

const tidePage = `
  <html><script>
  window.FCGON = {"tideDays":[{"date":"2026-08-11","tides":[
    {"timestamp":1786391580,"time":"3:53AM","height":1.87,"type":"high"},
    {"timestamp":1786416660,"time":"10:51AM","height":-0.08,"type":"low"},
    {"timestamp":1786440060,"time":"5:21PM","height":1.69,"type":"high"},
    {"timestamp":1786459860,"time":"10:51PM","height":0.73,"type":"low"}
  ]}]};
  </script></html>
`;

test('publishes the daytime low followed by the evening high with exact minutes', () => {
  const tide = parseSurfForecastTidePage(tidePage, new Date('2026-08-11T01:00:00.000Z'));
  assert.ok(tide);
  assert.equal(tide.lowTime, '2026-08-11T02:51:00.000Z');
  assert.equal(tide.highTime, '2026-08-11T09:21:00.000Z');
  assert.equal(tide.station, 'Barrio');
  assert.equal(tide.source.crossCheckLabel, 'Compare Port Pilar · Surfline');
});

test('fails quiet instead of inventing tide precision when the source changes', () => {
  assert.equal(parseSurfForecastTidePage('<html>no forecast payload</html>'), null);
  assert.equal(
    parseSurfForecastTidePage('window.FCGON = {"tideDays":[]};', new Date('2026-08-11T01:00:00.000Z')),
    null,
  );
});
