import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getMissionAlertContactKind,
  isUsableMissionAlertContact,
  normalizeMissionAlertInput,
} from './creator-mission-alerts.ts';

test('normalizes the three-field mission alert without creating a profile', () => {
  assert.deepEqual(
    normalizeMissionAlertInput({
      handleOrName: '  @maya   surf  ',
      city: ' General   Luna ',
      contact: ' maya@example.com ',
      workLane: 'sports_outdoors',
    }),
    {
      handleOrName: '@maya surf',
      city: 'General Luna',
      contact: 'maya@example.com',
      contactKind: 'email',
      workLane: 'sports_outdoors',
    }
  );
});

test('accepts email, Telegram handle, or WhatsApp-style phone contact', () => {
  assert.equal(getMissionAlertContactKind('maya@example.com'), 'email');
  assert.equal(getMissionAlertContactKind('@mayasurf'), 'telegram');
  assert.equal(getMissionAlertContactKind('+63 917 123 4567'), 'whatsapp');
  assert.equal(isUsableMissionAlertContact('find me online'), false);
});
