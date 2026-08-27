import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  getMapRelicClusterTone,
  getMapRelicZoomBand,
  resolveMapRelicSignal,
} from './map-relic-system.ts';

const quietPlace = {
  selected: false,
  challengeLiveCount: 0,
  communitySparkLive: false,
  localSignalLabel: null,
  liveTonight: false,
  approvedCount: 0,
};

test('paid Dares, free Sparks, crews, events, and updates resolve into one signal attachment', () => {
  assert.deepEqual(
    resolveMapRelicSignal({ ...quietPlace, challengeLiveCount: 2 }),
    { kind: 'dare', label: 'DARE 2+', ring: 'gold', actionable: true },
  );
  assert.deepEqual(
    resolveMapRelicSignal({
      ...quietPlace,
      challengeLiveCount: 1,
      communitySparkLive: true,
    }),
    { kind: 'spark', label: 'SPARK', ring: 'cyan', actionable: true },
  );
  assert.equal(resolveMapRelicSignal({ ...quietPlace, localSignalLabel: 'HANG' }).kind, 'crew');
  assert.equal(resolveMapRelicSignal({ ...quietPlace, liveTonight: true }).kind, 'event');
  assert.equal(resolveMapRelicSignal({ ...quietPlace, approvedCount: 2 }).kind, 'update');
  assert.equal(resolveMapRelicSignal(quietPlace).kind, 'none');
});

test('selection changes the ring without replacing the underlying signal', () => {
  const signal = resolveMapRelicSignal({
    ...quietPlace,
    selected: true,
    challengeLiveCount: 1,
    communitySparkLive: true,
  });

  assert.equal(signal.kind, 'spark');
  assert.equal(signal.label, 'SPARK');
  assert.equal(signal.ring, 'selected');
});

test('zoom bands progressively reveal relic detail', () => {
  assert.equal(getMapRelicZoomBand(13.9), 'far');
  assert.equal(getMapRelicZoomBand(14.2), 'mid');
  assert.equal(getMapRelicZoomBand(15.8), 'near');
});

test('clusters only use gold when they contain a live paid or playable signal', () => {
  assert.equal(getMapRelicClusterTone({ challengeLiveCount: 1, matched: false }), 'gold');
  assert.equal(getMapRelicClusterTone({ challengeLiveCount: 0, matched: true }), 'cyan');
  assert.equal(getMapRelicClusterTone({ challengeLiveCount: 0, matched: false }), 'purple');
});
