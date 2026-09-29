export function venueLocalInput(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const get = (key: string) => parts.find(p => p.type === key)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
export function venueLocalToIso(value: string, timeZone: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const wall = Date.parse(value + ':00Z');
  if (!Number.isFinite(wall)) return null;
  let candidate = wall;
  for (let i = 0; i < 4; i++) {
    const rendered = Date.parse(venueLocalInput(new Date(candidate), timeZone) + ':00Z');
    candidate += wall - rendered;
  }
  if (venueLocalInput(new Date(candidate), timeZone) !== value) return null;
  // Reject repeated clock times instead of silently picking a DST occurrence.
  if ([-3600000,3600000].some(delta => venueLocalInput(new Date(candidate + delta), timeZone) === value)) return null;
  return new Date(candidate).toISOString();
}
