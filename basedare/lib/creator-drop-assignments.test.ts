import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCreatorDropOutreachCopy,
  creatorDropAssignmentVerdict,
  nextCreatorDropAssignmentStatus,
  normalizeCreatorDropAssignmentInput,
  normalizeCreatorDropAssignmentStatus,
} from './creator-drop-assignments.ts';

describe('creator drop assignment queue', () => {
  it('normalizes assignment inputs without inventing creator identities', () => {
    const normalized = normalizeCreatorDropAssignmentInput({
      linkSlug: '  Maya-Tonight-01 ',
      creatorCode: ' @Maya ',
      creatorName: ' Maya ',
      contactChannel: 'In Person',
      contactHandle: ' Hostel lobby ',
      status: 'ready-to-send',
      priority: 3,
      notes: '  bring the QR card  ',
    });

    assert.equal(normalized.linkSlug, 'maya-tonight-01');
    assert.equal(normalized.creatorCode, 'maya');
    assert.equal(normalized.contactChannel, 'in_person');
    assert.equal(normalized.status, 'READY_TO_SEND');
    assert.equal(normalized.notes, 'bring the QR card');
  });

  it('rejects unsupported status values', () => {
    assert.throws(() => normalizeCreatorDropAssignmentStatus('auto-paid'), /Unsupported/);
  });

  it('builds plain outreach copy with manual-send and no-bonus boundaries', () => {
    const copy = buildCreatorDropOutreachCopy({
      creatorCode: 'maya',
      creatorName: 'Maya',
      title: 'Solo in Siargao tonight?',
      hook: 'Open the live map and pick one public thing worth joining.',
      publicUrl: 'https://basedare.xyz/go/maya-tonight-01',
      actionLabel: 'open the live map',
      rewardLabel: 'Free play · no payout promise',
      creatorBrief: 'show the map, the place, and why it is worth going now',
    });

    assert.match(copy, /Maya/);
    assert.match(copy, /https:\/\/basedare\.xyz\/go\/maya-tonight-01/);
    assert.match(copy, /No wallet explanation needed/);
    assert.match(copy, /No promised bonus/);
    assert.doesNotMatch(copy, /commission/i);
    assert.doesNotMatch(copy, /guaranteed/i);
  });

  it('keeps the ops status ladder simple', () => {
    assert.equal(nextCreatorDropAssignmentStatus('DRAFTED'), 'READY_TO_SEND');
    assert.equal(nextCreatorDropAssignmentStatus('POSTED'), 'INTENT_LOCKED');
    assert.equal(nextCreatorDropAssignmentStatus('KILL'), 'KILL');
  });

  it('suggests repeat or kill from ground-truth metrics', () => {
    assert.equal(creatorDropAssignmentVerdict({ touches: 40, intents: 9, verifiedCompletions: 0 }), 'KILL');
    assert.equal(creatorDropAssignmentVerdict({ touches: 3, intents: 1, verifiedCompletions: 0 }), 'INTENT_LOCKED');
    assert.equal(creatorDropAssignmentVerdict({ touches: 3, intents: 1, verifiedCompletions: 1 }), 'REPEAT');
    assert.equal(creatorDropAssignmentVerdict({ touches: 0, intents: 0, verifiedCompletions: 0 }), null);
  });
});
