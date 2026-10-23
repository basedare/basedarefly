import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';

import followRedirects from 'follow-redirects';

const { http } = followRedirects;

async function serve(handler) {
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
    async close() {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}

function readHeaders(url, headers) {
  return new Promise((resolve, reject) => {
    // Node does not add Host automatically for its raw array header format.
    const requestHeaders = Array.isArray(headers) ? ['Host', new URL(url).host, ...headers] : headers;
    const request = http.get(url, { headers: requestHeaders, maxRedirects: 2 }, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Local redirect fixture returned HTTP ${response.statusCode}`));
        return;
      }
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
      response.on('error', reject);
    });
    request.on('error', reject);
    request.setTimeout(3_000, () => request.destroy(new Error('Local redirect fixture timed out')));
  });
}

const credentials = {
  Authorization: 'Bearer local-fixture-only',
  'Proxy-Authorization': 'Basic local-fixture-only',
  Cookie: 'session=local-fixture-only',
  'X-Request-Id': 'safe-correlation',
};

for (const headerFormat of ['object', 'array']) {
  test(`cross-origin redirects strip credential headers in ${headerFormat} format`, { timeout: 5_000 }, async () => {
    const destination = await serve((request, response) => {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(request.headers));
    });
    const source = await serve((_request, response) => {
      response.writeHead(302, { Location: `${destination.url}/receipt` });
      response.end();
    });
    try {
      const headers = headerFormat === 'array' ? Object.entries(credentials).flat() : { ...credentials };
      const received = await readHeaders(`${source.url}/redirect`, headers);
      assert.equal(received.authorization, undefined, 'Authorization must not reach another origin');
      assert.equal(received['proxy-authorization'], undefined, 'Proxy credentials must not reach another origin');
      assert.equal(received.cookie, undefined, 'Session cookies must not reach another origin');
      assert.equal(received['x-request-id'], 'safe-correlation');
    } finally {
      await source.close();
      await destination.close();
    }
  });
}

test('same-origin redirects retain credentials needed by the intended service', { timeout: 5_000 }, async () => {
  const fixture = await serve((request, response) => {
    if (request.url === '/redirect') {
      response.writeHead(302, { Location: '/receipt' });
      response.end();
    } else {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(request.headers));
    }
  });
  try {
    const received = await readHeaders(`${fixture.url}/redirect`, Object.entries(credentials).flat());
    assert.equal(received.authorization, credentials.Authorization);
    assert.equal(received.cookie, credentials.Cookie);
    assert.equal(received['x-request-id'], 'safe-correlation');
  } finally {
    await fixture.close();
  }
});
