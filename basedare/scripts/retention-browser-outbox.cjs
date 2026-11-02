// Loaded only by the disposable localhost browser fixture; never by app code.
const fs = require('node:fs');
const path = require('node:path');
const db = new URL(process.env.DATABASE_URL || '');
if (db.hostname !== '127.0.0.1' || !db.pathname.endsWith('_test') || !process.env.RETENTION_FIXTURE_OUTBOX) throw Error('Disposable local outbox required.');
const originalFetch = global.fetch;
global.fetch = async (url, init) => {
  if (String(url) !== 'https://api.resend.com/emails') return originalFetch(url, init);
  const body = JSON.parse(String(init?.body));
  if (body.to?.length !== 1 || body.to[0] !== 'fixture@example.test') throw Error('Only the local fixture recipient is allowed.');
  const id = 'fixture-' + require('node:crypto').randomUUID();
  fs.mkdirSync(path.dirname(process.env.RETENTION_FIXTURE_OUTBOX), { recursive: true, mode: 0o700 });
  fs.appendFileSync(process.env.RETENTION_FIXTURE_OUTBOX, JSON.stringify({ ...body, id }) + '\n', { mode: 0o600 });
  return Response.json({ id });
};
