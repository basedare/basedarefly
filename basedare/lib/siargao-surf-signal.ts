export const SIARGAO_SURF_MODEL_POINT = {
  latitude: 9.81,
  longitude: 126.19,
  label: 'Siargao east reefs',
} as const;

export const SIARGAO_SURF_CHECKS = [
  'Rock Island',
  'Stimpy’s',
  'Bumee',
  'Tuason',
] as const;

export const KANAWAY_SURF_LAUNCH = {
  slug: 'kanaway-surf-school',
  name: 'Kanaway Surf School',
} as const;

export const CLOUD_9_SURF_FORECAST_CROSS_CHECK = {
  label: 'Compare Cloud 9 forecast',
  href: 'https://www.surf-forecast.com/breaks/Cloud-Nine/forecasts/latest/six_day',
} as const;

export type SiargaoSurfSignalTier = 'quiet' | 'playful' | 'pumping';

export function isSiargaoSurfLocation(categories: readonly string[]) {
  const normalized = categories.map((category) => category.trim().toLowerCase());
  const isSiargao = normalized.includes('siargao');
  const isSurf = normalized.some(
    (category) =>
      category === 'surf' ||
      category === 'surfing' ||
      category.startsWith('surf-')
  );

  return isSiargao && isSurf;
}

export type SiargaoSurfSignal = {
  area: string;
  tier: SiargaoSurfSignalTier;
  modelTime: string;
  headline: string;
  guidance: string;
  kanawayNote: string;
  caveat: string;
  spots: readonly string[];
  launchPlace: typeof KANAWAY_SURF_LAUNCH;
  model: {
    swellHeightM: number;
    swellHeightFeet: number;
    swellHeightLabel: string;
    swellPeriodSeconds: number;
    swellDirectionDegrees: number;
    swellDirectionLabel: string;
    totalWaveHeightM: number | null;
  };
  tide: {
    date: string;
    lowTime: string;
    highTime: string;
  } | null;
  source: {
    provider: 'Open-Meteo Marine';
    attribution: 'Open-Meteo Marine';
    href: 'https://open-meteo.com/en/docs/marine-weather-api';
  };
  crossCheck: typeof CLOUD_9_SURF_FORECAST_CROSS_CHECK;
};

type MarineCurrent = {
  time?: unknown;
  wave_height?: unknown;
  wave_direction?: unknown;
  wave_period?: unknown;
  swell_wave_height?: unknown;
  swell_wave_direction?: unknown;
  swell_wave_period?: unknown;
};

type MarineHourly = {
  time?: unknown;
  sea_level_height_msl?: unknown;
};

type TidePoint = {
  date: string;
  time: string;
  timestamp: number;
  heightM: number;
};

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeProviderTime(value: unknown, utcOffsetSeconds = 0) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const boundedOffset = Number.isFinite(utcOffsetSeconds) && Math.abs(utcOffsetSeconds) <= 14 * 60 * 60
    ? Math.trunc(utcOffsetSeconds)
    : 0;
  const absoluteOffset = Math.abs(boundedOffset);
  const offsetHours = String(Math.floor(absoluteOffset / 3600)).padStart(2, '0');
  const offsetMinutes = String(Math.floor((absoluteOffset % 3600) / 60)).padStart(2, '0');
  const offset = `${boundedOffset < 0 ? '-' : '+'}${offsetHours}:${offsetMinutes}`;
  const candidate = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}${offset}`;
  const timestamp = Date.parse(candidate);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function getManilaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function pickUsefulExtremum(points: TidePoint[], nowMs: number) {
  const currentTideGraceMs = 90 * 60_000;
  return points.find((point) => point.timestamp >= nowMs - currentTideGraceMs) ?? points.at(-1) ?? null;
}

function deriveTodayTide(payload: {
  hourly?: MarineHourly;
  utc_offset_seconds?: unknown;
}, receivedAt: Date) {
  const times = payload.hourly?.time;
  const levels = payload.hourly?.sea_level_height_msl;
  if (!Array.isArray(times) || !Array.isArray(levels) || times.length !== levels.length) return null;

  const rawOffset = finiteNumber(payload.utc_offset_seconds);
  const utcOffsetSeconds = rawOffset === null ? 0 : rawOffset;
  const points = times.flatMap((value, index): TidePoint[] => {
    const heightM = finiteNumber(levels[index]);
    const time = normalizeProviderTime(value, utcOffsetSeconds);
    if (
      typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) ||
      !time ||
      heightM === null ||
      heightM < -15 ||
      heightM > 15
    ) {
      return [];
    }
    return [{ date: value.slice(0, 10), time, timestamp: Date.parse(time), heightM }];
  });
  if (points.length < 3) return null;

  const today = getManilaDateKey(receivedAt);
  const todayPoints = points.filter((point) => point.date === today);
  if (todayPoints.length < 3) return null;

  const lows: TidePoint[] = [];
  const highs: TidePoint[] = [];
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    if (current.date !== today) continue;
    if (
      current.heightM <= previous.heightM &&
      current.heightM <= next.heightM &&
      (current.heightM < previous.heightM || current.heightM < next.heightM)
    ) {
      lows.push(current);
    }
    if (
      current.heightM >= previous.heightM &&
      current.heightM >= next.heightM &&
      (current.heightM > previous.heightM || current.heightM > next.heightM)
    ) {
      highs.push(current);
    }
  }

  const lowestToday = todayPoints.reduce((lowest, point) =>
    point.heightM < lowest.heightM ? point : lowest
  );
  const highestToday = todayPoints.reduce((highest, point) =>
    point.heightM > highest.heightM ? point : highest
  );
  const low = pickUsefulExtremum(lows, receivedAt.getTime()) ?? lowestToday;
  const high = pickUsefulExtremum(highs, receivedAt.getTime()) ?? highestToday;
  if (!low || !high || low.time === high.time) return null;

  return { date: today, lowTime: low.time, highTime: high.time };
}

function formatFeetRange(heightM: number) {
  const feet = heightM * 3.28084;
  if (feet < 1) return 'under 1 ft';
  const lower = Math.max(1, Math.floor(feet));
  const upper = Math.max(lower + 1, Math.ceil(feet));
  return `${lower}–${upper} ft`;
}

function formatDirection(degrees: number) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
  return directions[Math.round(degrees / 45) % directions.length];
}

export function classifySiargaoSurfSignal(input: {
  swellHeightM: number;
  swellPeriodSeconds: number;
}): SiargaoSurfSignalTier {
  if (input.swellHeightM >= 0.75 && input.swellPeriodSeconds >= 10) {
    return 'pumping';
  }
  if (input.swellHeightM >= 0.45 && input.swellPeriodSeconds >= 7) {
    return 'playful';
  }
  return 'quiet';
}

export function buildSiargaoSurfSignal(
  payload: unknown,
  receivedAt = new Date()
): SiargaoSurfSignal | null {
  if (!payload || typeof payload !== 'object') return null;
  const marinePayload = payload as {
    current?: MarineCurrent;
    hourly?: MarineHourly;
    utc_offset_seconds?: unknown;
  };
  const current = marinePayload.current;
  if (!current || typeof current !== 'object') return null;

  const utcOffsetSeconds = finiteNumber(marinePayload.utc_offset_seconds) ?? 0;
  const modelTime = normalizeProviderTime(current.time, utcOffsetSeconds);
  const totalWaveHeightM = finiteNumber(current.wave_height);
  const totalWavePeriodSeconds = finiteNumber(current.wave_period);
  const totalWaveDirectionDegrees = finiteNumber(current.wave_direction);
  const reportedSwellHeightM = finiteNumber(current.swell_wave_height);
  const reportedSwellPeriodSeconds = finiteNumber(current.swell_wave_period);
  const reportedSwellDirectionDegrees = finiteNumber(current.swell_wave_direction);

  const swellHeightM = reportedSwellHeightM ?? totalWaveHeightM;
  const swellPeriodSeconds = reportedSwellPeriodSeconds ?? totalWavePeriodSeconds;
  const swellDirectionDegrees =
    reportedSwellDirectionDegrees ?? totalWaveDirectionDegrees;

  if (
    !modelTime ||
    swellHeightM === null ||
    swellPeriodSeconds === null ||
    swellDirectionDegrees === null ||
    swellHeightM < 0 ||
    swellHeightM > 25 ||
    swellPeriodSeconds <= 0 ||
    swellPeriodSeconds > 40 ||
    swellDirectionDegrees < 0 ||
    swellDirectionDegrees > 360 ||
    (totalWaveHeightM !== null &&
      (totalWaveHeightM < 0 || totalWaveHeightM > 25))
  ) {
    return null;
  }

  const modelAgeMs = receivedAt.getTime() - Date.parse(modelTime);
  if (modelAgeMs < -30 * 60_000 || modelAgeMs > 3 * 60 * 60_000) {
    return null;
  }

  const tier = classifySiargaoSurfSignal({
    swellHeightM,
    swellPeriodSeconds,
  });
  const swellHeightLabel = formatFeetRange(swellHeightM);
  const swellDirectionLabel = formatDirection(swellDirectionDegrees);
  const periodLabel = Math.round(swellPeriodSeconds);
  const tide = deriveTodayTide(marinePayload, receivedAt);
  const headline =
    tier === 'pumping'
      ? `One offshore model shows a stronger swell: ${swellHeightLabel} at ${periodLabel}s from ${swellDirectionLabel}.`
      : tier === 'playful'
        ? `One offshore model shows some swell: ${swellHeightLabel} at ${periodLabel}s from ${swellDirectionLabel}.`
        : `One offshore model looks small: ${swellHeightLabel} at ${periodLabel}s from ${swellDirectionLabel}.`;

  return {
    area: SIARGAO_SURF_MODEL_POINT.label,
    tier,
    modelTime,
    headline,
    guidance:
      tier === 'quiet'
        ? 'Check wind, a spot forecast, and local guidance before choosing a break.'
        : `Check wind and local guidance before asking about ${SIARGAO_SURF_CHECKS.join(', ').replace(', Tuason', ', or Tuason')}.`,
    kanawayNote:
      'Kanaway is the map’s board-and-guide stop beside the Catangnan beach launch for the outer reefs. Confirm boats, rentals, tide, and the safe spot choice on site.',
    caveat: 'Modelled offshore swell and tide—not an observed break report or safety forecast.',
    spots: SIARGAO_SURF_CHECKS,
    launchPlace: KANAWAY_SURF_LAUNCH,
    model: {
      swellHeightM,
      swellHeightFeet: swellHeightM * 3.28084,
      swellHeightLabel,
      swellPeriodSeconds,
      swellDirectionDegrees,
      swellDirectionLabel,
      totalWaveHeightM,
    },
    tide,
    source: {
      provider: 'Open-Meteo Marine',
      attribution: 'Open-Meteo Marine',
      href: 'https://open-meteo.com/en/docs/marine-weather-api',
    },
    crossCheck: CLOUD_9_SURF_FORECAST_CROSS_CHECK,
  };
}
