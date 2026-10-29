import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { CHAOS_QUESTS } from './chaos-quests';
import { ACTIVITY_SUGGESTIONS, matchingAdventureSuggestions, suggestionsForArea, type ActivityArea } from './home-activities';
import { activeAdventure, adventureHref, completeAdventure, readAdventureProgress, updateAdventureStep, type AdventureProgress } from './adventure-progress';
import { personalAdventureInvite } from './adventure-passport';
import { canonicalPersonalProgress, personalCompletionSvg } from './passport-progression';
import { analyticsPath } from './analytics-privacy';

const now = Date.parse('2026-10-29T03:00:00Z');
const area: ActivityArea = { lat: -33.8688, lng: 151.2093, label: 'Sydney', timeZone: 'Australia/Sydney' };
test('12 stable Chaos Quests append to the catalogue with three steps, actual owned covers and creator ideas', () => {
  assert.deepEqual(CHAOS_QUESTS.map((q) => q.id), ['wave-or-ex', 'unnecessary-soundtrack', 'main-character-entrance', 'worst-tour-guide', 'wipeout-idol', 'zero-peso-blockbuster', 'coconut-ceo', 'life-but-a-song', 'dramatic-weather-report', 'came-for-three-days', 'suspiciously-normal', 'dare-your-doppelganger']);
  assert.equal(ACTIVITY_SUGGESTIONS[0].id, 'little-local-loop');
  assert.equal(new Set(ACTIVITY_SUGGESTIONS.map((q) => q.id)).size, ACTIVITY_SUGGESTIONS.length);
  for (const quest of CHAOS_QUESTS) {
    assert.equal(quest.steps.length, 3); assert.ok(quest.minutes >= 5 && quest.minutes <= 20);
    assert.ok(quest.hook && quest.result && quest.creator?.hook && quest.creator.filming && quest.creator.caption && quest.creator.invitation);
    assert.ok(existsSync(`public/assets/map/graffiti-v1/${quest.cover?.art}.webp`));
  }
});
test('all Chaos Quests can be discovered in any city, at any hour, without overriding existing preferences', () => {
  for (const city of [area, { lat: 9.79, lng: 126.15, label: 'Siargao', timeZone: 'Asia/Manila' }, { lat: 51.5, lng: -0.1, label: 'London', timeZone: 'Europe/London' }]) {
    for (let hour = 0; hour < 24; hour++) {
      const date = new Date(now + hour * 3600000);
      const eligible = suggestionsForArea(city, date);
      assert.ok(CHAOS_QUESTS.every((q) => eligible.some((item) => item.id === q.id)));
      assert.ok(matchingAdventureSuggestions(city, date, { minutes: 10, mood: 'create' }).every((q) => q.minutes <= 10 && q.moods.includes('create')));
    }
  }
});
test('every quest starts as a guest, rejects premature completion, resumes and invites a fresh attempt', () => {
  for (const quest of CHAOS_QUESTS) {
    let state: AdventureProgress = { runs: [{ runId: `guest-${quest.id}`, activityId: quest.id, startedAt: now - 1000, steps: [], area }] };
    const id = state.runs[0].runId;
    assert.equal(completeAdventure(state, id, now), state);
    state = updateAdventureStep(state, id, 0, now);
    state = readAdventureProgress(JSON.parse(JSON.stringify(state)), now);
    assert.equal(activeAdventure(state, now)?.steps.length, 1);
    state = updateAdventureStep(updateAdventureStep(state, id, 1, now), id, 2, now);
    state = completeAdventure(state, id, now);
    const saved = canonicalPersonalProgress(state, now).runs[0];
    assert.equal(saved.completedAt, now);
    const invite = new URL(personalAdventureInvite(saved), 'https://www.basedare.xyz');
    assert.equal(invite.pathname, `/adventures/${quest.id}`);
    assert.equal(invite.searchParams.get('areaLabel'), 'Sydney');
    assert.equal(invite.searchParams.get('timeZone'), 'Australia/Sydney');
    assert.equal(invite.searchParams.has('runId'), false); assert.equal(invite.searchParams.has('completedAt'), false);
    assert.deepEqual(readAdventureProgress(null, now), { runs: [] });
    assert.match(personalCompletionSvg(saved), /Self-reported/);
    assert.equal(analyticsPath(adventureHref(quest.id, undefined, area)), `/adventures/${quest.id}`);
  }
});
