import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getDefaultMeetHereStart,
  getMeetupSharePath,
  normalizeMeetupInviteTags,
} from './meetup-plan.ts';

test('meetup share paths are stable deep links', () => {
  assert.equal(getMeetupSharePath('meet one'), '/community/meet/meet%20one');
});

test('invite tags are normalized, deduplicated and bounded', () => {
  assert.deepEqual(
    normalizeMeetupInviteTags([' @Maya ', 'maya', '@kai.surf', 'bad tag', '@one', '@two', '@three', '@four']),
    ['maya', 'kai.surf', 'one', 'two', 'three'],
  );
});

test('the default meetup time is nearby and quarter-hour aligned', () => {
  const start = getDefaultMeetHereStart(new Date('2026-08-11T08:02:00.000Z'));
  assert.equal(start.toISOString(), '2026-08-11T08:45:00.000Z');
});
