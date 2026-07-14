import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  getSiargaoNightGuide,
  isSiargaoVenueFeaturedTonight,
} from './siargao-nightlife.ts';

test('uses the Siargao timezone rather than the viewer timezone', () => {
  const guide = getSiargaoNightGuide(new Date('2026-07-12T16:30:00.000Z'));

  assert.equal(guide.weekday, 'Monday');
  assert.equal(guide.headline, 'Mama Coco');
});

test('returns the founder-confirmed weekly venue rhythm', () => {
  const expectedRotation = [
    ['2026-07-12', 'Happiness'],
    ['2026-07-13', 'Mama Coco'],
    ['2026-07-14', 'Barbosa + Barrel quiz'],
    ['2026-07-15', 'Goodies'],
    ['2026-07-16', 'Bed and Brew'],
    ['2026-07-17', 'Mama Coco + Barbosa'],
    ['2026-07-18', 'Harana'],
  ];

  for (const [date, headline] of expectedRotation) {
    assert.equal(
      getSiargaoNightGuide(new Date(`${date}T12:00:00.000Z`)).headline,
      headline
    );
  }
});

test('highlights the main venues for tonight plus SBC every night', () => {
  const tuesday = new Date('2026-07-14T12:00:00.000Z');

  assert.equal(
    isSiargaoVenueFeaturedTonight({ name: 'Barbosa', now: tuesday }),
    true
  );
  assert.equal(
    isSiargaoVenueFeaturedTonight({ slug: 'barrel-sports-bar', now: tuesday }),
    true
  );
  assert.equal(
    isSiargaoVenueFeaturedTonight({ name: 'Siargao Beach Club', now: tuesday }),
    true
  );
  assert.equal(
    isSiargaoVenueFeaturedTonight({ name: 'Hideaway', now: tuesday }),
    false
  );
});
