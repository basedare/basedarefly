import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  getMapRelicClusterCellSize,
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
    { kind: 'dare', label: 'PAID 2+', ring: 'gold', actionable: true },
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
  assert.deepEqual(
    resolveMapRelicSignal({ ...quietPlace, approvedCount: 2 }),
    { kind: 'update', label: null, ring: 'active', actionable: false },
  );
  assert.equal(resolveMapRelicSignal(quietPlace).kind, 'none');
});

test('one attachment follows needs people, paid, tonight, Spark, crew, then update priority', () => {
  assert.deepEqual(
    resolveMapRelicSignal({
      ...quietPlace,
      challengeLiveCount: 1,
      localSignalLabel: 'NEEDS 1',
      liveTonight: true,
    }),
    { kind: 'crew', label: 'NEEDS 1', ring: 'gold', actionable: true },
  );
  assert.equal(
    resolveMapRelicSignal({
      ...quietPlace,
      challengeLiveCount: 1,
      liveTonight: true,
    }).kind,
    'dare',
  );
  assert.equal(
    resolveMapRelicSignal({
      ...quietPlace,
      challengeLiveCount: 1,
      communitySparkLive: true,
      liveTonight: true,
    }).kind,
    'event',
  );
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

test('ordinary venues cluster through medium zoom and separate at close zoom', () => {
  assert.equal(getMapRelicClusterCellSize(13), 72);
  assert.equal(getMapRelicClusterCellSize(14), 62);
  assert.equal(getMapRelicClusterCellSize(15), 50);
  assert.equal(getMapRelicClusterCellSize(16), 0);
});
