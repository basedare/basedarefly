export const LOCAL_RITUAL_STATUSES = ['ACTIVE', 'PAUSED'] as const;
export const LOCAL_RITUAL_PERMISSION_STATUSES = [
  'PUBLICLY_REPORTED',
  'VENUE_CONFIRMED',
  'BASEDARE_CONFIRMED',
] as const;

export type LocalRitualFreshness = 'CONFIRMED' | 'NEEDS_CONFIRMATION' | 'PAUSED';

export const WAKEPARK_SUNDAY_FUNDAY_RITUAL = {
  venueSlug: 'siargao-wakepark',
  slug: 'siargao-wakepark-sunday-funday',
  title: 'Wakepark Sunday Funday',
  summary: 'Sunday wakepark session with DJs and a free wakeboard ride when a drink is purchased.',
  weekday: 0,
  startLocalMinutes: 12 * 60,
  endLocalMinutes: 18 * 60,
  timezone: 'Asia/Manila',
  sourceKind: 'FOUNDER_FIELD_CONFIRMATION',
  sourceLabel: 'Founder field confirmation',
  sourceUrl: 'https://siargaovibes.com/activities/wakepark-sunday-funday/',
  sourceLastConfirmedAt: new Date('2026-07-27T00:00:00.000Z'),
  freshnessExpiresAt: new Date('2026-08-24T00:00:00.000Z'),
  permissionStatus: 'PUBLICLY_REPORTED',
  offerLabel: 'Free wakeboard ride with a drink purchase · DJs',
} as const;

export function validateLocalRitualSchedule(input: {
  weekday: number;
  startLocalMinutes: number;
  endLocalMinutes?: number | null;
  sourceLastConfirmedAt: Date;
  freshnessExpiresAt: Date;
}) {
  if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6) {
    throw new Error('weekday must be a whole number from 0 (Sunday) to 6 (Saturday).');
  }
  if (
    !Number.isInteger(input.startLocalMinutes) ||
    input.startLocalMinutes < 0 ||
    input.startLocalMinutes > 1439
  ) {
    throw new Error('startLocalMinutes must be between 0 and 1439.');
  }
  if (
    input.endLocalMinutes !== null &&
    input.endLocalMinutes !== undefined &&
    (!Number.isInteger(input.endLocalMinutes) ||
      input.endLocalMinutes < 0 ||
      input.endLocalMinutes > 1439)
  ) {
    throw new Error('endLocalMinutes must be null or between 0 and 1439.');
  }
  if (
    !Number.isFinite(input.sourceLastConfirmedAt.getTime()) ||
    !Number.isFinite(input.freshnessExpiresAt.getTime()) ||
    input.freshnessExpiresAt < input.sourceLastConfirmedAt
  ) {
    throw new Error('Ritual freshness must expire after its source confirmation.');
  }
}

export function localRitualFreshness(input: {
  status: string;
  freshnessExpiresAt: Date;
  now?: Date;
}): LocalRitualFreshness {
  if (input.status !== 'ACTIVE') return 'PAUSED';
  const now = input.now ?? new Date();
  return input.freshnessExpiresAt.getTime() >= now.getTime()
    ? 'CONFIRMED'
    : 'NEEDS_CONFIRMATION';
}

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  const weekdays: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    year: Number(value('year')),
    month: Number(value('month')),
    day: Number(value('day')),
    weekday: weekdays[value('weekday')] ?? 0,
    minuteOfDay: Number(value('hour')) * 60 + Number(value('minute')),
  };
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const representedAsUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second')
  );
  return representedAsUtc - date.getTime();
}

function localDateTimeToUtc(input: {
  year: number;
  month: number;
  day: number;
  minuteOfDay: number;
  timeZone: string;
}) {
  const wallClockUtc = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    Math.floor(input.minuteOfDay / 60),
    input.minuteOfDay % 60
  );
  let result = new Date(wallClockUtc);
  for (let index = 0; index < 3; index += 1) {
    result = new Date(wallClockUtc - timeZoneOffsetMs(result, input.timeZone));
  }
  return result;
}

export function nextLocalRitualOccurrence(input: {
  weekday: number;
  startLocalMinutes: number;
  endLocalMinutes?: number | null;
  timeZone: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const parts = localParts(now, input.timeZone);
  let nextFuture: { startsAt: Date; endsAt: Date | null } | null = null;

  // Inspect yesterday as well as the next seven local calendar days so an
  // overnight or already-started ritual remains "happening now" instead of
  // incorrectly jumping to next week's occurrence.
  for (let dayOffset = -1; dayOffset <= 7; dayOffset += 1) {
    const localDate = new Date(
      Date.UTC(parts.year, parts.month - 1, parts.day + dayOffset)
    );
    if (localDate.getUTCDay() !== input.weekday) continue;

    const startsAt = localDateTimeToUtc({
      year: localDate.getUTCFullYear(),
      month: localDate.getUTCMonth() + 1,
      day: localDate.getUTCDate(),
      minuteOfDay: input.startLocalMinutes,
      timeZone: input.timeZone,
    });
    const endsAt =
      input.endLocalMinutes === null || input.endLocalMinutes === undefined
        ? null
        : localDateTimeToUtc({
            year: localDate.getUTCFullYear(),
            month: localDate.getUTCMonth() + 1,
            day:
              localDate.getUTCDate() +
              (input.endLocalMinutes < input.startLocalMinutes ? 1 : 0),
            minuteOfDay: input.endLocalMinutes,
            timeZone: input.timeZone,
          });

    if (endsAt && startsAt <= now && now < endsAt) {
      return { startsAt, endsAt };
    }
    if (startsAt >= now && (!nextFuture || startsAt < nextFuture.startsAt)) {
      nextFuture = { startsAt, endsAt };
    }
  }

  if (!nextFuture) {
    throw new Error('Unable to resolve the next ritual occurrence.');
  }
  return nextFuture;
}

export function formatLocalRitualTime(input: {
  weekday: number;
  startLocalMinutes: number;
  endLocalMinutes?: number | null;
}) {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const time = (minutes: number) => {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const suffix = hour >= 12 ? 'pm' : 'am';
    const shownHour = hour % 12 || 12;
    return `${shownHour}${minute ? `:${String(minute).padStart(2, '0')}` : ''}${suffix}`;
  };
  return `${weekdays[input.weekday]} · ${time(input.startLocalMinutes)}${
    input.endLocalMinutes === null || input.endLocalMinutes === undefined
      ? ''
      : `–${time(input.endLocalMinutes)}`
  }`;
}
