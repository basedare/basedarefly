import { test } from 'node:test';
import assert from 'node:assert/strict';
import { venueReportPeriod } from './venue-reporting.ts';
const now = new Date('2026-09-29T06:00:00Z');
test('old venue records cannot become this week merely because they are the newest records', () => {
  const result = venueReportPeriod([{ bucketStartAt: '2026-03-27T00:00:00Z' }], 7, now);
  assert.deepEqual(result, { current: [], previous: [] });
});
test('report windows are calendar based, exclude future/overlapping aggregate records and retain the previous period', () => {
  const rows = ['2026-09-30','2026-09-29','2026-09-23','2026-09-22','2026-09-16','2026-09-15'].map(date => ({ bucketStartAt: date+'T00:00:00Z', bucketType: 'DAY' }));
  const result = venueReportPeriod([...rows,{bucketStartAt:'2026-09-29T00:00:00Z',bucketType:'WEEK'}],7,now);
  assert.deepEqual(result.current, rows.slice(1,3));
  assert.deepEqual(result.previous, rows.slice(3,5));
});
