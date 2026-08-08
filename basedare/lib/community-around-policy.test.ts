import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  buildSundayCommunityHangSignal,
  getLocalPostDefaultWindow,
  getCommunityPostSafetyError,
  getLocalPostLabel,
  getLocalPostMapHref,
  getSundayCommunityHangWindow,
  localPostRequiresPlace,
} from './community-around-policy.ts';

test('builds the next published Sunday 6pm Manila community window', () => {
  const { startsAt, endsAt } = getSundayCommunityHangWindow(
    new Date('2026-08-08T04:00:00.000Z')
  );

  assert.equal(startsAt.toISOString(), '2026-08-09T10:00:00.000Z');
  assert.equal(endsAt.toISOString(), '2026-08-09T16:00:00.000Z');
});

test('keeps the current Sunday occurrence live until the published window ends', () => {
  const { startsAt } = getSundayCommunityHangWindow(new Date('2026-08-09T12:00:00.000Z'));
  assert.equal(startsAt.toISOString(), '2026-08-09T10:00:00.000Z');
});

test('advances the recurring signal after the Sunday window ends', () => {
  const { startsAt } = getSundayCommunityHangWindow(new Date('2026-08-09T17:00:00.000Z'));
  assert.equal(startsAt.toISOString(), '2026-08-16T10:00:00.000Z');
});

test('curated Sunday signal is honest about source and host status', () => {
  const signal = buildSundayCommunityHangSignal(new Date('2026-08-08T04:00:00.000Z'), {
    latitude: 9.8018102,
    longitude: 126.159654,
  });

  assert.equal(signal.status, 'APPROVED');
  assert.equal(signal.postType, 'signal');
  assert.equal(signal.venueSlug, 'happiness-beach-bar-siargao');
  assert.equal(signal.distanceDisplay, '1m');
  assert.match(signal.notes, /BaseDare is not the host or venue partner/i);
  assert.match(signal.sourceUrl, /^https:\/\/happinessphilippines\.com\//);
});

test('ask and offer posts require a place and route into its bounded room', () => {
  assert.equal(localPostRequiresPlace('signal'), false);
  assert.equal(localPostRequiresPlace('ask'), true);
  assert.equal(localPostRequiresPlace('offer'), true);
  assert.equal(
    getLocalPostMapHref({ postType: 'ask', venueSlug: 'cloud-9-boardwalk' }),
    '/map?place=cloud-9-boardwalk&source=local-ask&room=1'
  );
  assert.equal(getLocalPostLabel('offer'), 'OFFER');
  assert.equal(getLocalPostLabel('signal', 'community'), 'HANG');
});

test('bounded community posts default to a 72-hour window', () => {
  const window = getLocalPostDefaultWindow(new Date('2026-08-08T00:00:00.000Z'));
  assert.equal(window.startsAt, '2026-08-08T00:00:00.000Z');
  assert.equal(window.endsAt, '2026-08-11T00:00:00.000Z');
});

test('bounded posts reject marketplace and prohibited-goods language', () => {
  assert.equal(
    getCommunityPostSafetyError({ title: 'Spare board bag available', notes: 'Reply in the place room.' }),
    null,
  );
  assert.match(
    getCommunityPostSafetyError({ title: 'Board for sale', notes: 'Cash only' }) ?? '',
    /cannot arrange payments/i,
  );
});
