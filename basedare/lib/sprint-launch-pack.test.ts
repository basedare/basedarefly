import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BASEDARE_CORE_POSITIONING,
  SPRINT_LAUNCH_PACKETS,
  getSprintLaunchPacket,
} from './sprint-launch-pack.ts';

describe('sprint launch pack', () => {
  it('states the BaseDare core without narrowing the app to one surface', () => {
    assert.match(BASEDARE_CORE_POSITIONING.core, /playable social map/);
    assert.match(BASEDARE_CORE_POSITIONING.core, /performance-verified dare marketplace/);
    assert.match(BASEDARE_CORE_POSITIONING.core, /place-memory receipt engine/);
    assert.match(BASEDARE_CORE_POSITIONING.supportingLine, /playable missions/);
  });

  it('replaces agency-sounding fieldwork copy', () => {
    assert.equal(
      BASEDARE_CORE_POSITIONING.recommendedLine,
      'Turn real-world curiosity into playable proof.'
    );
    assert.doesNotMatch(BASEDARE_CORE_POSITIONING.recommendedLine, /verified people/i);
    assert.doesNotMatch(BASEDARE_CORE_POSITIONING.supportingLine, /send verified people/i);
  });

  it('keeps the operator sequence complete and ordered', () => {
    assert.deepEqual(
      SPRINT_LAUNCH_PACKETS.map((packet) => packet.id),
      [
        'creator-starter-pack',
        'sprint-operator-checklist',
        'venue-field-station-packet',
        'receipt-close',
      ]
    );
  });

  it('gives every packet a real owner, outcome, local admin action and checklist', () => {
    for (const packet of SPRINT_LAUNCH_PACKETS) {
      assert.ok(packet.owner.length > 4, packet.id);
      assert.ok(packet.outcome.length > 20, packet.id);
      assert.match(packet.nextActionHref, /^\//, packet.id);
      assert.ok(packet.checklist.length >= 5, packet.id);
      assert.ok(packet.scripts.length >= 2, packet.id);
    }
  });

  it('can retrieve a packet by id', () => {
    assert.equal(getSprintLaunchPacket('receipt-close')?.title, 'Receipt Close');
    assert.equal(getSprintLaunchPacket('creator-starter-pack')?.nextActionHref, '/admin/creator-drops');
  });
});
