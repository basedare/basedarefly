import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ISLAND_TRIAL_ID, TRIAL_ISLANDS, readTrialIsland, trialInviteHref } from './island-trials';
import { adventureHref, completeAdventure, readAdventureProgress, updateAdventureStep, type AdventureProgress } from './adventure-progress';
import { canonicalPersonalProgress, mergePersonalProgress, personalCompletionSvg } from './passport-progression';
import { personalAdventureInvite } from './adventure-passport';
import { suppressInstallPrompt } from './mobile-surface-policy';
const now = Date.parse('2026-10-29T03:00:00Z');
test('every island keeps its own guest choice through steps, reload, account save and merge', () => {
  for (const island of TRIAL_ISLANDS) {
    let state: AdventureProgress = { runs: [{ runId: 'trial', activityId: ISLAND_TRIAL_ID, startedAt: now - 1000, steps: [], island: island.id, area: { lat: island.lat, lng: island.lng, label: island.label, timeZone: 'Asia/Manila' } }] };
    const original = state;
    const missingChoice = { runs: [{ ...state.runs[0], steps: [0, 1, 2], island: undefined }] };
    assert.equal(completeAdventure(missingChoice, 'trial', now), missingChoice);
    assert.equal(completeAdventure(state, 'trial', now), state);
    for (let step = 0; step < 3; step++) state = updateAdventureStep(state, 'trial', step, now);
    state = completeAdventure(state, 'trial', now);
    const saved = canonicalPersonalProgress(JSON.parse(JSON.stringify(state)), now);
    assert.equal(saved.runs[0].island, island.id);
    assert.equal(mergePersonalProgress(original, saved, now).runs[0].island, island.id);
    assert.match(personalCompletionSvg(saved.runs[0]), new RegExp('I DEFENDED ' + island.label.toUpperCase()));
    assert.equal(personalAdventureInvite(saved.runs[0]), trialInviteHref(island.id));
    assert.doesNotMatch(personalAdventureInvite(saved.runs[0]), /trial=|runId|completedAt|lat=|story=|wallet=/);
    assert.equal(readAdventureProgress({ runs: [{ ...state.runs[0], island: 'made-up' }] }, now).runs.length, 0);
    assert.equal(readAdventureProgress({ runs: [{ ...state.runs[0], island: undefined }] }, now).runs.length, 0);
    assert.throws(() => mergePersonalProgress(saved, { runs: [{ ...state.runs[0], island: TRIAL_ISLANDS.find((i) => i.id !== island.id)!.id }] }, now), /different activity context/);
  }
});
test('trial routes have fresh-attempt invitations and suppress competing install prompts', () => {
  assert.equal(readTrialIsland('siargao'), 'siargao'); assert.equal(readTrialIsland('../admin'), undefined);
  assert.equal(adventureHref(ISLAND_TRIAL_ID), '/island-trials/no-beaches-allowed');
  for (const path of ['/island-trials', '/island-trials/no-beaches-allowed', trialInviteHref('boracay')]) assert.equal(suppressInstallPrompt(path), true);
  assert.deepEqual(readAdventureProgress(null, now), { runs: [] });
});

test('launch presets reuse creator drops without inventing creators, rights or rewards', async () => {
  const { adventureLaunchPreset } = await import('./adventure-launch-kit');
  const { buildCreatorDropMetadata } = await import('./creator-drops');
  for (const id of [ISLAND_TRIAL_ID, 'wave-or-ex', 'siargao-verdict']) {
    const preset = adventureLaunchPreset(id)!;
    assert.equal(buildCreatorDropMetadata(preset).category, 'free_play');
    assert.equal(preset.participationOwner, false);
    assert.equal('creatorCode' in preset, false);
    assert.match(preset.proofPrompt, /self-reported/);
  }
  assert.equal(adventureLaunchPreset('made-up'), null);
});
