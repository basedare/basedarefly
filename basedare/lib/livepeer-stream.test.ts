import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getLivepeerStream } from './livepeer-stream';

test('fetches the same Studio stream with a bounded, uncached request and no credential redirects', async () => {
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, 'https://livepeer.studio/api/stream/a%2Fb%3Fx');
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-key');
    assert.equal(init?.redirect, 'error');
    assert.equal(init?.cache, 'no-store');
    assert.ok(init?.signal instanceof AbortSignal);
    return Response.json({ isActive: false, isHealthy: false, name: 'stream', playbackId: 'play', streamKey: 'never-return-this' });
  };
  assert.deepEqual(await getLivepeerStream('a/b?x', 'test-key', fetcher), { stream: { isActive: false, isHealthy: false, name: 'stream', playbackId: 'play' } });
});
test('HTTP and transport errors never expose provider bodies or credentials', async () => {
  await assert.rejects(getLivepeerStream('id', 'test-key', async () => new Response('secret-provider-body', { status: 401 })), { message: 'Livepeer stream lookup failed (401)' });
  await assert.rejects(getLivepeerStream('id', 'test-key', async () => { throw new Error('test-key in transport details'); }), { message: 'Livepeer stream lookup unavailable' });
  await assert.rejects(getLivepeerStream('id', 'test-key', async () => { throw new DOMException('Timeout', 'TimeoutError'); }), { message: 'Livepeer stream lookup unavailable' });
});
test('rejects malformed status and missing configuration without inventing a live stream', async () => {
  for (const value of [null, [], {}, { name: 'stream', isActive: 'true' }, { name: 'stream', isHealthy: 1 }, { name: 123 }]) {
    await assert.rejects(getLivepeerStream('id', 'test-key', async () => Response.json(value)), /invalid stream/);
  }
  await assert.rejects(getLivepeerStream('id', '', async () => { throw Error('must not fetch'); }), /not configured/);
  assert.equal((await getLivepeerStream('id', 'test-key', async () => Response.json({ name: 'stream', isHealthy: null }))).stream.isHealthy, null);
});
