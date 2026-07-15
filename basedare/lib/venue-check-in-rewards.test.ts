import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getVenueCheckInSignalPoints,
  VERIFIED_VENUE_CHECK_IN_POINTS,
} from './creator-passport-constants.ts';

test('QR + GPS check-ins qualify for the one-time venue reward', () => {
  assert.equal(
    getVenueCheckInSignalPoints('QR_AND_GPS'),
    VERIFIED_VENUE_CHECK_IN_POINTS
  );
});

test('QR-only presence does not earn Signal Points', () => {
  assert.equal(getVenueCheckInSignalPoints('QR_ONLY'), 0);
});

test('missing and unknown proof levels fail closed', () => {
  assert.equal(getVenueCheckInSignalPoints(null), 0);
  assert.equal(getVenueCheckInSignalPoints('GPS_ONLY'), 0);
});
