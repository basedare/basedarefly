import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalPersonalProgress, mergePersonalProgress, destinationWeek, weeklyPersonalChallenge, personalCompletionSvg, eligibleFrame } from './passport-progression';
import { ACTIVITY_SUGGESTIONS } from './home-activities';
const now = Date.parse('2026-10-18T16:00:00Z'); // Monday midnight Manila
const run = { runId: 'test-run', activityId: ACTIVITY_SUGGESTIONS[0].id, startedAt: now - 2000, completedAt: now - 1000, steps: ACTIVITY_SUGGESTIONS[0].steps.map((_, i) => i), area: { lat: 9.790543, lng: 126.159423, label: 'A <public> & place', timeZone: 'Asia/Manila' } };
test('account copy is a bounded whitelist, never a verified award or precise device location', () => {
  const result = canonicalPersonalProgress({ runs: [{ ...run, verified: true, points: 100, proof: 'QR_AND_GPS' }] }, now);
  assert.equal(result.runs[0].area.lat, 9.791);
  assert.equal((result.runs[0] as unknown as Record<string, unknown>).verified, undefined);
  assert.equal(canonicalPersonalProgress({ runs: [{ ...run, completedAt: now + 1 }] }, now).runs.length, 0);
});
test('merge preserves both devices and rejects a conflicting run context', () => {
  const device = { runs: [{ ...run, runId: 'second' }] };
  assert.equal(mergePersonalProgress({ runs: [run] }, device, now).runs.length, 2);
  assert.throws(() => mergePersonalProgress({ runs: [run] }, { runs: [{ ...run, activityId: ACTIVITY_SUGGESTIONS[1].id }] }, now), /different activity/);
  assert.equal(mergePersonalProgress({ runs: [run] }, { runs: [run] }, now).runs.length, 1);
});
test('weekly challenge resets at local Monday and counts different adventures, not repeat clicks', () => {
  assert.equal(destinationWeek(new Date(now - 1)), '2026-10-12');
  assert.equal(destinationWeek(new Date(now)), '2026-10-19');
  assert.equal(destinationWeek(new Date('2026-10-04T13:00:00Z'), 'Australia/Sydney'), '2026-10-05');
  const p = { runs: [run, { ...run, runId: 'repeat' }] };
  assert.equal(weeklyPersonalChallenge(p, run.area, new Date(now - 1)).completed, 1);
  assert.equal(weeklyPersonalChallenge(p, run.area, new Date(now)).completed, 0);
});
test('download escapes names and place text; local completion cannot unlock evidence frames', () => {
  const svg = personalCompletionSvg(run, '<script>name</script>');
  assert.ok(svg.includes('&lt;script&gt;'));
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('Self-reported adventure'));
  assert.equal(eligibleFrame('story', []), false);
  assert.equal(eligibleFrame('classic', []), true);
});

test('personal weekly progress uses a known destination timezone or an honest UTC fallback', () => {
  const clock = new Date('2026-10-18T13:00:00Z'); // Monday in Sydney, Sunday in UTC and Manila.
  const sydney = weeklyPersonalChallenge({ runs: [] }, { timeZone: 'Australia/Sydney' }, clock);
  assert.equal(sydney.week, '2026-10-19');
  assert.equal(sydney.timeZone, 'Australia/Sydney');
  for (const area of [{}, { timeZone: 'invalid/zone' }]) {
    const result = weeklyPersonalChallenge({ runs: [] }, area, clock);
    assert.equal(result.timeZone, 'UTC');
    assert.equal(result.week, '2026-10-12');
  }
});
