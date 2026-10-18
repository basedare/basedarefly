import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildActivationCloseRoomFromEvent } from '@/lib/activation-close-room';

async function main() {
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  assert.match(rows[0]?.name ?? '', /^basedare_revenue_readiness_/, 'Disposable database required.');
  // Exercise the actual intake route without allowing any customer/operator message.
  globalThis.fetch = async () => { throw new Error('External requests disabled in buyer intake test.'); };
  const { POST } = await import('../app/api/activation-intake/route');
  const base = { company: 'QA buyer', contactName: 'QA contact', email: 'qa@example.test', buyerType: 'agency', city: 'Sydney',
    budgetRange: 'discuss', timeline: 'exploring', packageId: 'pilot-drop', routedSource: 'buyer-workspace', routedTimeWindow: 'Next month' };
  async function submit(kind: string, notes: string) {
    const response = await POST(new NextRequest('http://localhost/api/activation-intake', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.44' },
      body: JSON.stringify({ ...base, routedMissionType: kind, goal: kind === 'content-brief' ? 'ugc' : 'other', notes }) }));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    return body.data;
  }
  const content = await submit('content-brief', 'One vertical original video; usage to agree.');
  const activity = await submit('activity-brief', 'A safe daytime discovery challenge.');
  const retry = await submit('content-brief', 'One vertical original video; revised timing to agree.');
  assert.notEqual(content.id, activity.id, 'Distinct intents must not overwrite each other.');
  assert.equal(retry.id, content.id, 'A retry revises the same unqualified enquiry.');
  const stored = await prisma.founderEvent.findUniqueOrThrow({ where: { id: content.id } });
  const metadata = stored.metadataJson as Record<string, unknown>;
  assert.equal(metadata.intakeIntent, 'content-brief');
  assert.equal(metadata.routedTimeWindow, 'Next month');
  assert.equal(metadata.deadWindowTime, '');
  const room = buildActivationCloseRoomFromEvent(stored);
  assert.equal(room.isFirstSpark, false);
  assert.equal(room.businessBrief?.notes, 'One vertical original video; revised timing to agree.');
  assert.equal(room.budgetLabel, 'Budget to be agreed');
  assert.ok(content.closeRoomHref.startsWith('/activations/close/'));
  console.log('Buyer intake database checks passed: distinct intents, retry, saved scope and enquiry review. No messages or money sent.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); process.exit(process.exitCode || 0); });
