import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';

const require = createRequire(import.meta.url);

test('oversized arrays are rejected before evaluating attacker-controlled elements', () => {
  let visited = 0;
  const schema = z.array(z.string().superRefine(() => { visited++; })).max(2);
  const rejected = schema.safeParse(Array(1000).fill('input'));
  assert.equal(rejected.success, false);
  assert.equal(visited, 0);
  assert.equal(schema.safeParse(['one']).success, true);
  assert.equal(visited, 1);
});

test('Farcaster notification schemas still validate payloads and reject malformed callbacks', async () => {
  const { sendNotificationRequestSchema, serverEventSchema } = await import('@farcaster/miniapp-core');
  const valid = { notificationId: 'test', title: 'An update', body: 'A real update', targetUrl: 'https://example.com', tokens: ['one'] };
  assert.equal(sendNotificationRequestSchema.safeParse(valid).success, true);
  assert.equal(sendNotificationRequestSchema.safeParse({ ...valid, tokens: Array(101).fill('token') }).success, false);
  assert.equal(serverEventSchema.safeParse({ event: 'miniapp_removed' }).success, true);
  assert.equal(serverEventSchema.safeParse({ event: 'notifications_enabled' }).success, false);
});

test('Reown wallet frame schemas retain network and theme record validation', async () => {
  const entry = require.resolve('@reown/appkit-wallet');
  const schemas = await import(pathToFileURL(path.resolve(path.dirname(entry), '../src/W3mFrameSchema.js')).href);
  assert.equal(schemas.AppSwitchNetworkRequest.safeParse({ chainId: 8453 }).success, true);
  assert.equal(schemas.AppSwitchNetworkRequest.safeParse({ chainId: {} }).success, false);
  assert.equal(schemas.AppSyncThemeRequest.safeParse({ themeMode: 'dark', themeVariables: { '--size': 12 }, w3mThemeVariables: { '--color': '#ffe16b' } }).success, true);
  assert.equal(schemas.AppSyncThemeRequest.safeParse({ themeVariables: { '--size': {} } }).success, false);
});

test('Coinbase typed-data policies retain legacy record validation with the patched library', () => {
  const entry = require.resolve('@coinbase/cdp-sdk');
  const { SignEvmTypedDataFieldCriterionSchema } = require(path.join(path.dirname(entry), 'policies/evmSchema.js'));
  const records = SignEvmTypedDataFieldCriterionSchema.shape.types.shape.types;
  assert.equal(records.safeParse({ Example: [{ name: 'value', type: 'uint256' }] }).success, true);
  assert.equal(records.safeParse({ Example: [{ name: 'value', type: 9 }] }).success, false);
  assert.equal(records.safeParse({ Example: 'wrong' }).success, false);
});
