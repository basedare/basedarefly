import test from 'node:test';
import assert from 'node:assert/strict';
import { publicDareUrl } from './dare-share.ts';

test('printed QR and shared dare link are stable on the production domain', () => {
  assert.equal(publicDareUrl('Dare_123'), 'https://www.basedare.xyz/dare/Dare_123');
  for (const bad of ['', '../wallet', 'id?token=private', 'https://elsewhere.example', 'id#fragment']) {
    assert.throws(() => publicDareUrl(bad));
  }
});
