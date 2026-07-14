import { test } from 'node:test';
import assert from 'node:assert/strict';

import { classifySocialWebview, isSocialWebview } from './social-webview.ts';

test('classifies common Instagram and TikTok webviews', () => {
  assert.equal(classifySocialWebview('Mozilla/5.0 Instagram 333.0.0.0'), 'instagram');
  assert.equal(classifySocialWebview('Mozilla/5.0 musical_ly TikTok 36.2'), 'tiktok');
  assert.equal(classifySocialWebview('Mozilla/5.0 BytedanceWebview'), 'tiktok');
});

test('classifies Meta webviews without mistaking Safari for one', () => {
  assert.equal(classifySocialWebview('Mozilla/5.0 [FBAN/FBIOS;FBAV/500.0]'), 'facebook');
  assert.equal(classifySocialWebview('Mozilla/5.0 MessengerForiOS'), 'messenger');
  assert.equal(classifySocialWebview('Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/604.1'), 'browser');
});

test('unknown Android webview gets a safe handoff while normal Chrome does not', () => {
  assert.equal(classifySocialWebview('Mozilla/5.0 Linux; Android 15; wv) AppleWebKit'), 'other-in-app');
  assert.equal(isSocialWebview('Mozilla/5.0 Chrome/140.0.0.0 Mobile Safari/537.36'), false);
});
