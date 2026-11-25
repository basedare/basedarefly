import assert from 'node:assert/strict';
import test from 'node:test';
import { DareProofPrepareSchema, DareProofTicketSchema, DARE_VIDEO_MAX_BYTES, matchingDareProofFile, isConsentedDareMedia } from './dare-proof-media.ts';
import { dareClipPayload } from './dare-media-export.ts';

const cid = 'bafy' + 'a'.repeat(50);
const ticketId = 'a'.repeat(32);
const consent = { processing: true, publication: false, rightsConfirmed: true };
const prepare = { action: 'prepare', dareId: 'dare-1', name: 'phone.mov', mime: 'video/quicktime', size: 1024, sha256: 'b'.repeat(64), consent };
const ticket = DareProofTicketSchema.parse({ ticket: ticketId, name: 'proof', mime: prepare.mime, size: prepare.size, sha256: prepare.sha256, consent, version: 'dare-media-v1', expiresAt: '2026-11-26T01:00:00Z', cid, fileId: 'file-1', attachedAt: '2026-11-26T00:00:00Z' });

test('video tickets bound size, MIME and exact opted-in source hash', () => {
  assert.ok(DareProofPrepareSchema.safeParse(prepare).success);
  assert.equal(DareProofPrepareSchema.safeParse({ ...prepare, size: DARE_VIDEO_MAX_BYTES + 1 }).success, false);
  assert.equal(DareProofPrepareSchema.safeParse({ ...prepare, mime: 'image/jpeg' }).success, false);
  assert.equal(DareProofPrepareSchema.safeParse({ ...prepare, sha256: null }).success, false);
  assert.equal(DareProofPrepareSchema.safeParse({ ...prepare, consent: { ...consent, rightsConfirmed: false } }).success, false);
  assert.equal(DareProofPrepareSchema.safeParse({ ...prepare, consent: { processing: false, publication: true, rightsConfirmed: true } }).success, false);
  assert.ok(DareProofPrepareSchema.safeParse({ ...prepare, sha256: null, consent: { processing: false, publication: false, rightsConfirmed: false } }).success);
});

test('provider receipt must bind exact dare, ticket, bytes, format and single file', () => {
  const receipt = { id: 'file-1', cid, size: prepare.size, mime_type: prepare.mime, number_of_files: 1, keyvalues: { basedareDare: 'dare-1', basedareTicket: ticketId } };
  assert.ok(matchingDareProofFile(receipt, ticket, 'dare-1', cid));
  for (const altered of [{ ...receipt, size: 999 }, { ...receipt, mime_type: 'image/jpeg' }, { ...receipt, number_of_files: 2 }, { ...receipt, cid: 'bafy'+'b'.repeat(50) }, { ...receipt, keyvalues: { ...receipt.keyvalues, basedareTicket: 'other' } }]) {
    assert.equal(matchingDareProofFile(altered, ticket, 'dare-1', cid), false);
  }
  assert.equal(matchingDareProofFile(receipt, ticket, 'dare-2', cid), false);
});

test('BaseClips grant waits for verified proof and never implies distribution or training', () => {
  const input = { ticket, tenant: 'basedare', status: 'PENDING', dareId: 'dare-1', title: 'Dance', credit: 'contributor', now: Date.parse('2026-11-27T00:00:00Z') };
  assert.ok(isConsentedDareMedia(ticket));
  assert.equal(dareClipPayload(input), null);
  assert.equal(dareClipPayload({ ...input, ticket: { ...ticket, sha256: null } }), null);
  const payload = dareClipPayload({ ...input, status: 'VERIFIED' });
  assert.equal(payload?.action, 'process');
  if (payload?.action !== 'process') throw new Error('Expected media contract');
  assert.deepEqual(payload.target, { type: 'dare', id: 'dare-1', revision: 1 });
  assert.equal(payload.grant.publication, false);
  assert.deepEqual(payload.grant.destinations, []);
  assert.equal(payload.grant.training, false);
  assert.equal(payload.grant.evaluation, false);
  assert.equal(dareClipPayload({ ...input, status: 'REVOKED' })?.action, 'revoke');
  assert.equal(dareClipPayload({ ...input, status: 'VERIFIED', now: Date.parse('2027-01-01') })?.action, 'revoke');
});
