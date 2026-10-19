/* eslint-disable @typescript-eslint/no-require-imports -- Keep the real route/DB; replace only post-response scheduling and external messages. */
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

const Module = require('node:module');
const originalLoad = Module._load;
const afterTasks: Array<() => Promise<void>> = [];
const alerts: Array<Record<string, unknown>> = [];
Module._load = function (name: string, ...args: unknown[]) {
  if (name === 'next/server') {
    return { ...originalLoad.call(this, name, ...args), after: (callback: () => Promise<void>) => afterTasks.push(callback) };
  }
  if (name === '@/lib/telegram') return {
    alertCreatorMissionAlert: async (input: Record<string, unknown>) => { alerts.push(input); },
    alertCreatorCaptainApplication: async () => { throw new Error('Unexpected legacy application alert.'); },
  };
  return originalLoad.call(this, name, ...args);
};

async function main() {
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  assert.match(rows[0]?.name ?? '', /^basedare_revenue_readiness_/, 'Disposable database required.');
  globalThis.fetch = async () => { throw new Error('External requests disabled in creator intake test.'); };
  const { POST } = require('../app/api/creator-captains/route');
  const base = { applicationKind: 'mission_alert', handleOrName: '@qa_creator', city: 'Sydney', contact: 'creator@example.test', workLane: 'photo_video' };
  let requestNumber = 0;
  const submit = async (patch: Record<string, unknown> = {}) => {
    requestNumber += 1;
    const response = await POST(new NextRequest('http://localhost/api/creator-captains', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `192.0.2.${requestNumber}` },
      body: JSON.stringify({ ...base, ...patch }),
    }));
    return { status: response.status, body: await response.json() };
  };

  const [first, concurrentRetry] = await Promise.all([
    submit(), submit({ city: '  SYDNEY  ', contact: 'CREATOR@example.test' }),
  ]);
  assert.equal(first.status, 200);
  assert.equal(concurrentRetry.status, 200);
  assert.equal(first.body.data.received, true);
  assert.equal(first.body.data.id, concurrentRetry.body.data.id);
  assert.equal(await prisma.founderEvent.count({ where: { source: 'creator-mission-alert' } }), 1);
  assert.equal(afterTasks.length, 1, 'Concurrent retry must not schedule duplicate alerts.');
  await Promise.all(afterTasks.splice(0).map(callback => callback()));
  assert.equal(alerts.length, 1);
  assert.equal(String(alerts[0].city).toLowerCase(), 'sydney');

  const id = first.body.data.id;
  const original = await prisma.founderEvent.findUniqueOrThrow({ where: { id } });
  const reviewedMetadata = { ...(original.metadataJson as Record<string, unknown>), operatorNote: 'Invited to a scoped brief', statusHistory: [{ to: 'INVITED' }] };
  await prisma.founderEvent.update({ where: { id }, data: { status: 'INVITED', metadataJson: reviewedMetadata } });
  const retry = await submit({ handleOrName: 'Different public name', workLane: 'place_update' });
  assert.equal(retry.status, 200);
  assert.equal(retry.body.data.id, id);
  const preserved = await prisma.founderEvent.findUniqueOrThrow({ where: { id } });
  assert.equal(preserved.status, 'INVITED');
  assert.deepEqual(preserved.metadataJson, reviewedMetadata);
  assert.equal(preserved.occurredAt.toISOString(), original.occurredAt.toISOString());
  assert.equal(preserved.title, original.title);
  assert.equal(afterTasks.length, 0, 'Reviewed retry must not notify the operator again.');

  const otherCity = await submit({ city: 'Melbourne' });
  assert.equal(otherCity.status, 200);
  assert.notEqual(otherCity.body.data.id, id);
  assert.equal((await submit({ city: '   ' })).status, 400);
  assert.equal((await submit({ handleOrName: '   ' })).status, 400);
  assert.equal((await submit({ contact: 'not a contact' })).status, 400);
  const beforeTrap = await prisma.founderEvent.count();
  const trap = await submit({ contact: 'trap@example.test', companyWebsite: 'bot.invalid' });
  assert.equal(trap.body.data.received, true);
  assert.equal(await prisma.founderEvent.count(), beforeTrap);
  console.log('Creator intake database checks passed: concurrent dedupe, review/notes preservation, one post-response alert, separate cities, validation and honeypot. No messages or money sent.');
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  Module._load = originalLoad;
  await prisma.$disconnect();
  process.exit(process.exitCode || 0);
});
