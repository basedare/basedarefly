export type PlanCalendarInput = {
  id: string;
  title: string;
  placeLabel: string;
  startsAt: string | null;
  endsAt?: string | null;
  detailsUrl: string;
  description?: string | null;
};

export type PlanCalendarFile = {
  content: string;
  filename: string;
};

function escapeCalendarText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatCalendarDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function safeCalendarFilename(value: string) {
  const slug = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 64);
  return `${slug || 'basedare-plan'}.ics`;
}

export function buildPlanCalendarFile(
  input: PlanCalendarInput,
  createdAt = new Date(),
): PlanCalendarFile | null {
  if (!input.startsAt) return null;
  const start = new Date(input.startsAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(createdAt.getTime())) return null;

  const end = input.endsAt ? new Date(input.endsAt) : null;
  const usableEnd = end && Number.isFinite(end.getTime()) && end > start ? end : null;
  const uid = input.id.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120) || 'live-plan';
  const description = [input.description?.trim(), input.detailsUrl]
    .filter(Boolean)
    .join('\n\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BaseDare//Live Plans//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}@basedare.xyz`,
    `DTSTAMP:${formatCalendarDate(createdAt)}`,
    `DTSTART:${formatCalendarDate(start)}`,
    ...(usableEnd ? [`DTEND:${formatCalendarDate(usableEnd)}`] : []),
    `SUMMARY:${escapeCalendarText(input.title)}`,
    `LOCATION:${escapeCalendarText(input.placeLabel)}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    `URL:${input.detailsUrl}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ];

  return {
    content: lines.join('\r\n'),
    filename: safeCalendarFilename(input.title),
  };
}
