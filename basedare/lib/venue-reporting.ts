// VenueMemory DAY records use UTC bucket boundaries. Count calendar days, not rows.
export function venueReportPeriod<T extends { bucketStartAt: string; bucketType?: string }>(history: T[], days: number, now = new Date()) {
  const day = 86_400_000;
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + day;
  const start = end - days * day;
  const inPeriod = (from: number, to: number) => history.filter((row) => {
    const at = Date.parse(row.bucketStartAt);
    return (!row.bucketType || row.bucketType === 'DAY') && Number.isFinite(at) && at >= from && at < to;
  });
  return { current: inPeriod(start, end), previous: inPeriod(start - days * day, start) };
}
