import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDareLoopPresentation, dareLoopCategory, isMysteryDareTitle } from './dare-loop-presentation.ts';

const base = {
  shortId: 'dare-1', title: 'Make a coconut advert', locationLabel: 'General Luna', creatorPayout: 5,
  latitude: 9.79, longitude: 126.158, venueSlug: null, expiresAt: null, whatToMake: 'Film a playful advert',
  missionMode: 'IRL', family: 'EXPERIENCE_EXECUTION' as const, contentRightsFingerprint: null, isAvailable: true,
};

test('Chaos and Control are categories of the same Dare, not poster roles', () => {
  assert.equal(dareLoopCategory(base), 'CHAOS');
  assert.equal(dareLoopCategory({ ...base, family: 'FIELD_TRUTH' }), 'CONTROL');
  assert.equal(dareLoopCategory({ ...base, family: 'PUBLICATION' }), 'CONTROL');
  assert.equal(dareLoopCategory({ ...base, contentRightsFingerprint: 'structured-brief' }), 'CONTROL');
});

test('rewards count only eligible positive unexpired dares; identical action structure for either category', () => {
  const presentation = buildDareLoopPresentation([
    base,
    { ...base, shortId: 'dare-2', family: 'FIELD_TRUTH', creatorPayout: 12 },
    { ...base, shortId: 'unavailable', isAvailable: false, creatorPayout: 1000 },
    { ...base, shortId: 'expired', expiresAt: new Date(10) },
    { ...base, shortId: 'invalid', creatorPayout: NaN },
    { ...base, shortId: 'unfunded', creatorPayout: 0 },
  ], 20);
  assert.equal(presentation.listedCount, 2);
  assert.equal(presentation.listedRewardUsdc, 17);
  assert.deepEqual(presentation.dares.map(dare => [dare.shortId, dare.category, dare.remainingSlots]), [['dare-1', 'CHAOS', 1], ['dare-2', 'CONTROL', 1]]);
});

test('mystery keeps requirements visible and online/invalid targets do not get map coordinates', () => {
  assert.equal(isMysteryDareTitle('CLASSIFIED — a strange coconut'), true);
  assert.equal(isMysteryDareTitle('Not a mystery drop'), false);
  const presentation = buildDareLoopPresentation([{ ...base, title: 'MYSTERY DROP: coconut', missionMode: 'STREAM' }, { ...base, latitude: 180 }]);
  assert.equal(presentation.dares[0].isMystery, true);
  assert.equal(presentation.dares[0].description, base.whatToMake);
  assert.equal(presentation.dares[0].latitude, null);
  assert.equal(presentation.dares[1].longitude, null);
  assert.equal('contentRightsFingerprint' in presentation.dares[0], false);
});
