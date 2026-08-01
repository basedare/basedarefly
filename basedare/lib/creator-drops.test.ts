import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCreatorDropLandingHref,
  buildCreatorDropMetadata,
  buildCreatorDropShareText,
  creatorDropCategoryLabel,
  parseCreatorDropMetadata,
} from './creator-drops.ts';

describe('creator drop metadata', () => {
  it('normalizes a local BaseDare action into creator-drop metadata', () => {
    const metadata = buildCreatorDropMetadata({
      title: '  Solo in Siargao tonight?  ',
      hook: '  Open the map and find one public thing worth joining. ',
      category: 'social',
      actionHref: '/map?intent=social&place=hideaway',
      rewardLabel: 'Free play · no payout promise',
      actionLabel: '',
    });

    assert.equal(metadata.kind, 'creator_drop_v1');
    assert.equal(metadata.title, 'Solo in Siargao tonight?');
    assert.equal(metadata.hook, 'Open the map and find one public thing worth joining.');
    assert.equal(metadata.actionHref, '/map?intent=social&place=hideaway');
    assert.equal(metadata.actionLabel, 'Open on BaseDare');
    assert.equal(metadata.rewardLabel, 'Free play · no payout promise');
    assert.ok(metadata.createdAt);
  });

  it('rejects external action URLs', () => {
    assert.throws(
      () => buildCreatorDropMetadata({
        title: 'Cloud 9 rumor',
        hook: 'Find out whether the rumor is real and bring back useful proof.',
        category: 'mystery',
        actionHref: 'https://evil.example/drop',
      }),
      /local BaseDare path/
    );
  });

  it('builds normalized drop landing URLs', () => {
    assert.equal(buildCreatorDropLandingHref('Maya-Cloud9_01'), '/drops/maya-cloud9_01');
  });

  it('parses only creator-drop metadata', () => {
    const metadata = buildCreatorDropMetadata({
      title: 'Wakepark Sunday',
      hook: 'See what is happening before you ride.',
      category: 'action_sports',
      actionHref: '/map?place=wakepark-siargao',
    });

    assert.deepEqual(parseCreatorDropMetadata(metadata), metadata);
    assert.equal(parseCreatorDropMetadata({ kind: 'other', title: 'Nope' }), null);
  });

  it('keeps share copy honest and creator-specific', () => {
    const share = buildCreatorDropShareText({
      creatorCode: 'maya',
      title: 'Rumor or real?',
      hook: 'Go find out and save the pass if you are doing it tomorrow.',
      rewardLabel: 'Free play · no payout promise',
    });

    assert.match(share, /@maya/);
    assert.match(share, /Free play/);
    assert.equal(creatorDropCategoryLabel('action_sports'), 'Action sports');
  });
});
