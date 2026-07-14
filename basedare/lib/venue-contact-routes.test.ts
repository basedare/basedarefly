import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeVenueContactRoute,
  normalizeVenueContactUrl,
} from './venue-contact-routes.ts';

test('normalizes official Instagram handles to HTTPS routes', () => {
  assert.equal(
    normalizeVenueContactUrl('INSTAGRAM', '@lasola.siargao'),
    'https://www.instagram.com/lasola.siargao/'
  );
});

test('rejects channel spoofing and unsafe protocols', () => {
  assert.equal(normalizeVenueContactUrl('INSTAGRAM', 'https://example.com/lasola'), null);
  assert.equal(normalizeVenueContactUrl('WEBSITE', 'javascript:alert(1)'), null);
  assert.equal(normalizeVenueContactUrl('WEBSITE', 'http://example.com'), null);
});

test('normalizes phone and email routes', () => {
  assert.equal(normalizeVenueContactUrl('PHONE', '+63 (917) 555-0123'), 'tel:+639175550123');
  assert.equal(normalizeVenueContactUrl('EMAIL', 'HELLO@EXAMPLE.COM'), 'mailto:hello@example.com');
});

test('personal contacts require explicit consent', () => {
  assert.equal(
    normalizeVenueContactRoute({
      channel: 'WHATSAPP',
      label: 'Manager WhatsApp',
      url: 'https://wa.me/639175550123',
      isPersonal: true,
      consentConfirmed: false,
    }),
    null
  );

  assert.equal(
    normalizeVenueContactRoute({
      channel: 'WHATSAPP',
      label: 'Manager WhatsApp',
      url: 'https://wa.me/639175550123',
      isPersonal: true,
      consentConfirmed: true,
    })?.consentBasis,
    'PERSONAL_CONTACT_EXPLICIT_CONSENT'
  );
});
