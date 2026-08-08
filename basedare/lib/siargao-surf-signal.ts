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
  source: {
    provider: 'Open-Meteo Marine';
    attribution: 'Open-Meteo / DWD';
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

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeModelTime(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const candidate = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  const timestamp = Date.parse(candidate);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
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
  const current = (payload as { current?: MarineCurrent }).current;
  if (!current || typeof current !== 'object') return null;

  const modelTime = normalizeModelTime(current.time);
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
        ? 'Cross-check wind, tide, a spot forecast, and local guidance before choosing a break.'
        : `Cross-check wind, tide, and a spot forecast before asking a local guide about ${SIARGAO_SURF_CHECKS.join(', ').replace(', Tuason', ', or Tuason')}.`,
    kanawayNote:
      'Kanaway is the map’s board-and-guide stop beside the Catangnan beach launch for the outer reefs. Confirm boats, rentals, tide, and the safe spot choice on site.',
    caveat:
      'Modelled primary swell component—not breaking-wave height, an observation, or a safety forecast. Other models and actual reef conditions can differ.',
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
    source: {
      provider: 'Open-Meteo Marine',
      attribution: 'Open-Meteo / DWD',
      href: 'https://open-meteo.com/en/docs/marine-weather-api',
    },
    crossCheck: CLOUD_9_SURF_FORECAST_CROSS_CHECK,
  };
}
