import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { ReadOnlyRpcProvider, rpcIpFamily } from './mainnet-rpc.mjs';

async function fixture(t, respond) {
  const methods = [];
  const server = http.createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    const payload = JSON.parse(body);
    methods.push(payload.method);
    respond(payload, response);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${server.address().port}/private-test-key`;
  const provider = new ReadOnlyRpcProvider(url, { ipFamily: 4, timeoutMs: 700 });
  t.after(() => provider.destroy());
  return { provider, methods, url };
}

test('observes the real chain and supports independent read operations', async t => {
  const { provider } = await fixture(t, (p, r) => r.end(JSON.stringify({ jsonrpc: '2.0', id: p.id, result: p.method === 'eth_chainId' ? '0x2105' : '0x10' })));
  assert.equal((await provider.getNetwork()).chainId, 8453n);
  assert.equal(await provider.getBalance('0x1111111111111111111111111111111111111111'), 16n);
});

test('cannot forward a signing or transaction method', async t => {
  const { provider, methods } = await fixture(t, () => assert.fail('No request expected.'));
  await assert.rejects(provider.send('eth_sendRawTransaction', ['0x1234']), /read-only methods/);
  await assert.rejects(provider.send('personal_sign', []), /read-only methods/);
  assert.deepEqual(methods, []);
});

test('a stalled connection terminates instead of leaving the operator command hanging', async t => {
  const { provider } = await fixture(t, () => {});
  const start = Date.now();
  await assert.rejects(provider.getNetwork(), /TIMEOUT/);
  assert.ok(Date.now() - start < 2500);
  assert.equal(provider.destroyed, true);
});

test('mismatched RPC replies cannot be treated as chain evidence', async t => {
  const { provider } = await fixture(t, (p, r) => r.end(JSON.stringify({ jsonrpc: '2.0', id: p.id + 1, result: '0x2105' })));
  await assert.rejects(provider.getNetwork(), /BAD_DATA/);
});

test('ambiguous result plus error fails closed', async t => {
  const { provider } = await fixture(t, (p, r) => r.end(JSON.stringify({ jsonrpc: '2.0', id: p.id, result: '0x2105', error: { code: -1, message: 'private-test-key' } })));
  await assert.rejects(provider.getNetwork(), /BAD_DATA/);
});

test('malformed chain/code results cannot be mistaken for evidence or leak provider content', async t => {
  const { provider } = await fixture(t, (p, r) => r.end(JSON.stringify({ jsonrpc: '2.0', id: p.id, result: 'private-test-key' })));
  await assert.rejects(provider.getNetwork(), error => /BAD_DATA/.test(error.message) && !error.message.includes('private-test-key'));
});

test('transport errors redact URL credentials and response contents', async t => {
  const { provider, url } = await fixture(t, (_p, r) => { r.writeHead(503); r.end('private-test-key'); });
  await assert.rejects(provider.getNetwork(), error => {
    assert.ok(!error.message.includes('private-test-key'));
    assert.ok(!error.message.includes(url));
    return /Read-only RPC failed/.test(error.message);
  });
});

test('RPC redirects cannot forward credentials or requests to another destination', async t => {
  const { provider, methods } = await fixture(t, (_p, r) => {
    r.writeHead(302, { location: 'https://example.com/private-test-key' }); r.end();
  });
  await assert.rejects(provider.getNetwork(), /NETWORK_ERROR/);
  assert.deepEqual(methods, ['eth_chainId']);
});

test('RPC error messages cannot echo secrets into operator output', async t => {
  const { provider } = await fixture(t, (p, r) => r.end(JSON.stringify({ jsonrpc: '2.0', id: p.id, error: { code: -32000, message: 'private-test-key', data: 'private-test-key' } })));
  await assert.rejects(provider.getNetwork(), error => !error.message.includes('private-test-key'));
});

test('invalid URL, insecure remote RPC and bad family settings are rejected without echoing input', () => {
  for (const endpoint of ['private-test-key', 'http://example.com/private-test-key', 'file:///private-test-key']) {
    assert.throws(() => new ReadOnlyRpcProvider(endpoint), error => !error.message.includes('private-test-key'));
  }
  assert.equal(rpcIpFamily('4'), 4);
  assert.equal(rpcIpFamily('0'), 0);
  assert.throws(() => rpcIpFamily('private-test-key'), /must be 0/);
});
