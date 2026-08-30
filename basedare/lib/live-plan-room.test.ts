import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getCrewRoomHref,
  getCrewRoomQuickCopy,
  getCrewRoomThreadId,
  isCrewRoomMetadataOpen,
  isCrewRoomPlanType,
  readCrewRoomMetadata,
  shouldNotifyCrewRoomQuickAction,
} from './live-plan-room.ts';

test('Crew Rooms are limited to participant-bearing Live Plans', () => {
  assert.equal(isCrewRoomPlanType('boat'), true);
  assert.equal(isCrewRoomPlanType('meetup'), true);
  assert.equal(isCrewRoomPlanType('paid_dare'), false);
  assert.equal(isCrewRoomPlanType('venue_event'), false);
});

test('room identity and plan anchors stay deterministic', () => {
  assert.equal(getCrewRoomThreadId('boat', 'abc'), 'crew-room:boat:abc');
  assert.equal(getCrewRoomHref('meetup', 'm 1'), '/community/meet/m%201#crew-room');
});

test('metadata expires rooms without deleting their operational record', () => {
  const metadata = {
    planType: 'meetup',
    planId: 'm1',
    planHref: '/community/meet/m1',
    planTitle: 'Sunday surf',
    expiresAt: '2026-08-29T12:00:00.000Z',
  };
  assert.deepEqual(readCrewRoomMetadata(metadata), {
    planType: 'meetup',
    planId: 'm1',
    planHref: '/community/meet/m1',
    planTitle: 'Sunday surf',
    expiresAt: '2026-08-29T12:00:00.000Z',
  });
  assert.equal(isCrewRoomMetadataOpen(metadata, new Date('2026-08-29T11:59:59.000Z')), true);
  assert.equal(isCrewRoomMetadataOpen(metadata, new Date('2026-08-29T12:00:00.000Z')), false);
});

test('quick coordination copy is actionable and only important state alerts', () => {
  assert.equal(getCrewRoomQuickCopy('NEED_GEAR', 'boat'), 'I need a board.');
  assert.equal(getCrewRoomQuickCopy('NEED_GEAR', 'meetup'), 'I need equipment.');
  assert.equal(getCrewRoomQuickCopy('ETA_10', 'meetup'), 'I’m 10 minutes away.');
  assert.equal(getCrewRoomQuickCopy('ETA_20', 'boat'), 'I’m 20 minutes away.');
  assert.equal(shouldNotifyCrewRoomQuickAction('COMING'), false);
  assert.equal(shouldNotifyCrewRoomQuickAction('ETA_10'), true);
  assert.equal(shouldNotifyCrewRoomQuickAction('HERE'), true);
  assert.equal(shouldNotifyCrewRoomQuickAction('CANT_MAKE_IT'), true);
});
