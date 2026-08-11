export const CLOUD_9_TIDE_SOURCE = {
  station: 'Barrio',
  distanceKm: 7,
  attribution: 'Barrio · Surf-Forecast',
  href: 'https://www.surf-forecast.com/breaks/Cloud-Nine/tides/latest',
  crossCheckLabel: 'Compare Port Pilar · Surfline',
  crossCheckHref: 'https://www.surfline.com/tide-charts/cloud-9/5842041f4e65fad6a7708d7a',
} as const;

export type SiargaoTideSignal = {
  date: string;
  lowTime: string;
  highTime: string;
  lowHeightM: number;
  highHeightM: number;
  station: typeof CLOUD_9_TIDE_SOURCE.station;
  distanceKm: typeof CLOUD_9_TIDE_SOURCE.distanceKm;
  source: typeof CLOUD_9_TIDE_SOURCE;
};

type ForecastTide = {
  timestamp?: unknown;
  height?: unknown;
  type?: unknown;
};

type ForecastDay = {
  date?: unknown;
  tides?: unknown;
};

function getManilaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getManilaHour(timestampMs: number) {
  const part = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestampMs)).find((item) => item.type === 'hour');
  return Number(part?.value);
}

function parsePayload(pageHtml: string) {
  const match = pageHtml.match(/window\.FCGON\s*=\s*(\{[\s\S]*?\});/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]) as { tideDays?: unknown };
  } catch {
    return null;
  }
}

export function parseSurfForecastTidePage(pageHtml: string, receivedAt = new Date()): SiargaoTideSignal | null {
  const payload = parsePayload(pageHtml);
  if (!payload || !Array.isArray(payload.tideDays)) return null;

  const date = getManilaDateKey(receivedAt);
  const day = (payload.tideDays as ForecastDay[]).find((item) => item?.date === date);
  if (!day || !Array.isArray(day.tides)) return null;

  const samples = (day.tides as ForecastTide[]).flatMap((event) => {
    if (typeof event.timestamp !== 'number' || !Number.isFinite(event.timestamp)) return [];
    if (typeof event.height !== 'number' || !Number.isFinite(event.height)) return [];
    const timestampMs = event.timestamp * 1000;
    if (getManilaDateKey(new Date(timestampMs)) !== date) return [];
    return [{
      type: event.type === 'low' || event.type === 'high' ? event.type : null,
      timestampMs,
      heightM: event.height,
    }];
  }).sort((left, right) => left.timestampMs - right.timestampMs);

  const explicitLows = samples.filter((event) => event.type === 'low');
  const explicitHighs = samples.filter((event) => event.type === 'high');
  const lows = [...explicitLows];
  const highs = [...explicitHighs];
  for (let index = 1; index < samples.length - 1; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const next = samples[index + 1];
    if (
      current.type === null &&
      current.heightM <= previous.heightM &&
      current.heightM <= next.heightM &&
      (current.heightM < previous.heightM || current.heightM < next.heightM)
    ) {
      lows.push(current);
    }
    if (
      current.type === null &&
      current.heightM >= previous.heightM &&
      current.heightM >= next.heightM &&
      (current.heightM > previous.heightM || current.heightM > next.heightM)
    ) {
      highs.push(current);
    }
  }
  lows.sort((left, right) => left.timestampMs - right.timestampMs);
  highs.sort((left, right) => left.timestampMs - right.timestampMs);
  const isDaytimeLow = (event: (typeof lows)[number]) => {
    const hour = getManilaHour(event.timestampMs);
    return hour >= 5 && hour < 16;
  };
  const low = explicitLows.find(isDaytimeLow) ?? lows.find(isDaytimeLow) ?? explicitLows[0] ?? lows[0];
  const high = low
    ? explicitHighs.find((event) => event.timestampMs > low.timestampMs && getManilaHour(event.timestampMs) < 23) ??
      highs.find((event) => event.timestampMs > low.timestampMs && getManilaHour(event.timestampMs) < 23)
    : null;
  if (!low || !high) return null;

  return {
    date,
    lowTime: new Date(low.timestampMs).toISOString(),
    highTime: new Date(high.timestampMs).toISOString(),
    lowHeightM: low.heightM,
    highHeightM: high.heightM,
    station: CLOUD_9_TIDE_SOURCE.station,
    distanceKm: CLOUD_9_TIDE_SOURCE.distanceKm,
    source: CLOUD_9_TIDE_SOURCE,
  };
}
