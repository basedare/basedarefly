import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyticsPath, privateAnalyticsPayload } from './analytics-privacy';
test('analytics strips location, invite tokens and private records while retaining public activity routes', () => {
  assert.equal(analyticsPath('/adventures/three-details?lat=9.791234&lng=126&token=secret#from'), '/adventures/three-details');
  assert.equal(analyticsPath('/inbox/private-thread?wallet=0x123'), '/inbox');
  assert.equal(analyticsPath('/community/meet/private-plan'), '/community/meet');
  assert.deepEqual(privateAnalyticsPayload({ source: 'passport_completion', plan_path: '/adventures/three-details?lat=9.79', wallet: 'secret', redemptionCode: 'private' }), { source: 'passport_completion', plan_path: '/adventures/three-details' });
});
