import test from 'node:test';
import assert from 'node:assert/strict';
import { personalPassport, nextPassportActivity, personalAdventureInvite, PERSONAL_COLLECTION } from './adventure-passport';
import { ACTIVITY_SUGGESTIONS, SIARGAO_ACTIVITY_AREA } from './home-activities';
import type { AdventureRun } from './adventure-progress';

const now = Date.parse('2026-10-14T04:00:00Z');
function run(activityId: string, id = activityId, completedAt = now - 1000): AdventureRun {
  const activity = ACTIVITY_SUGGESTIONS.find((item) => item.id === activityId)!;
  return { runId: id, activityId, startedAt: now - 60000, completedAt, steps: activity.steps.map((_, index) => index), area: SIARGAO_ACTIVITY_AREA };
}

test('personal stamps require valid completed steps; active, forged and future runs do not earn them', () => {
  const active = { ...run('postcard'), completedAt: undefined };
  const invalid = { ...run('soundtrack'), steps: [] };
  const future = run('one-minute-story', 'future', now + 1000);
  const result = personalPassport({ runs: [active, invalid, future] }, now);
  assert.equal(result.completed.length, 0);
  assert.ok(result.stamps.every((stamp) => stamp.earnedAt === null));
});

test('repeat runs cannot substitute for distinct collection stages or inflate unique activities', () => {
  const result = personalPassport({ runs: [run('little-local-loop'), run('little-local-loop', 'repeat')] }, now);
  assert.equal(result.completed.length, 2);
  assert.equal(result.uniqueActivities, 1);
  assert.equal(result.stages.filter((stage) => stage.run).length, 1);
  assert.equal(result.stamps[1].earnedAt, null);
});

test('a collection stamp dates the first complete set and survives subsequent repeated runs', () => {
  const runs = PERSONAL_COLLECTION.activities.map((id, index) => run(id, id, now - 4000 + index * 1000));
  const initial = personalPassport({ runs }, now);
  const repeated = personalPassport({ runs: [run('postcard', 'again'), ...runs] }, now);
  assert.equal(initial.stamps[1].earnedAt, now - 2000);
  assert.deepEqual(initial.stamps, repeated.stamps);
});

test('PeeBear skips an unfinished daylight stage at night, then offers it in daylight', () => {
  const progress = { runs: [run('one-minute-story'), run('postcard')] };
  const night = new Date('2026-10-14T16:00:00Z');
  assert.notEqual(nextPassportActivity(progress, SIARGAO_ACTIVITY_AREA, night)?.id, 'little-local-loop');
  assert.equal(nextPassportActivity(progress, SIARGAO_ACTIVITY_AREA, new Date(now))?.id, 'little-local-loop');
});

test('completion invites preserve place and activity while excluding sender state and precise coordinates', () => {
  const saved = { ...run('postcard'), placeSlug: 'cloud-9-boardwalk' };
  const url = new URL(personalAdventureInvite(saved), 'https://basedare.test');
  assert.equal(url.pathname, '/adventures/postcard');
  assert.equal(url.searchParams.get('place'), saved.placeSlug);
  assert.equal(url.searchParams.get('from'), 'passport');
  assert.equal(url.searchParams.size, 2);
  const areaUrl = new URL(personalAdventureInvite({ ...saved, placeSlug: undefined, area: { ...saved.area, lat: 9.79054321, lng: 126.15876543 } }), 'https://basedare.test');
  assert.equal(areaUrl.searchParams.get('lat'), '9.791');
  assert.equal(areaUrl.searchParams.get('lng'), '126.159');
  assert.equal(personalPassport({ runs: [] }, now).completed.length, 0);
});
