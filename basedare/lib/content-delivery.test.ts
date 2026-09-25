import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CONTENT_RIGHTS_VERSION, readContentDelivery, validPublicationUrl } from './content-delivery.ts';
import { buildOutcomeContractSnapshot, validateReportedOutcome } from './outcome-contracts.ts';
import { isCreatorMissionAvailable } from './creator-mission-policy.ts';

const brief = {
  termsVersion: CONTENT_RIGHTS_VERSION, buyerName: 'Example venue', assetType: 'VIDEO' as const,
  format: 'Vertical 20 second video', acceptanceCriteria: 'Show the entrance and one item with accurate descriptions.',
  posting: 'NONE' as const, postingInstructions: '', deadline: new Date(Date.now() + 86400000).toISOString(), revisionLimit: 0,
};
test('asset-only content remains distinct from publication and requires explicit reuse consent', () => {
  const snapshot = buildOutcomeContractSnapshot({ title: 'Document the venue', amount: 100, missionMode: 'IRL', isNearbyDare: true, contentDelivery: brief });
  assert.equal(snapshot.family, 'EXPERIENCE_EXECUTION');
  assert.equal(snapshot.rights.sponsorCommercialReuseRequired, true);
  assert.match(snapshot.mission.prove, /No posting/);
  assert.equal(isCreatorMissionAvailable({ title: 'Document the venue', bounty: 100, status: 'PENDING', isSimulated: false, missionMode: 'IRL', tag: 'brand-campaign', streamerHandle: null, claimedBy: null, targetWalletAddress: null, claimRequestStatus: null, expiresAt: new Date(brief.deadline), outcomeContractSnapshot: snapshot }), true);
});
test('incomplete and unsupported licence scopes stay closed', () => {
  assert.equal(readContentDelivery({ contentDelivery: { ...brief, buyerName: '' } }), null);
  assert.equal(readContentDelivery({ contentDelivery: { ...brief, termsVersion: 'unlimited-ads' } }), null);
  assert.equal(readContentDelivery({ contentDelivery: { ...brief, revisionLimit: 1 } }), null);
  assert.equal(readContentDelivery({ contentDelivery: { ...brief, posting: 'PUBLIC_POST' } }), null);
});
test('publication requires a real-shaped public social URL; arbitrary/internal URLs cannot be submitted', () => {
  const snapshot = buildOutcomeContractSnapshot({ title: 'Publish a venue clip', amount: 100, missionMode: 'IRL', isNearbyDare: true,
    contentDelivery: { ...brief, posting: 'PUBLIC_POST', postingInstructions: 'Post on Instagram with sponsorship disclosure for seven days.' } });
  const result = { kind: 'PUBLISHED', summary: 'Published the agreed video', observedAt: new Date().toISOString() };
  assert.equal(validateReportedOutcome(snapshot, result).ok, false);
  assert.equal(validateReportedOutcome(snapshot, { ...result, publicationUrl: 'http://localhost/post' }).ok, false);
  assert.equal(validateReportedOutcome(snapshot, { ...result, publicationUrl: 'https://instagram.com.evil.example/reel/123' }).ok, false);
  assert.equal(validateReportedOutcome(snapshot, { ...result, publicationUrl: 'https://www.instagram.com/reel/123/' }).ok, true);
  assert.equal(validPublicationUrl('https://user:pass@instagram.com/reel/123'), null);
});
