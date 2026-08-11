import { NextResponse } from 'next/server';
import {
  buildSiargaoSurfSignal,
  SIARGAO_SURF_MODEL_POINT,
} from '@/lib/siargao-surf-signal';
import {
  CLOUD_9_TIDE_SOURCE,
  parseSurfForecastTidePage,
} from '@/lib/siargao-tide-signal';

const SURF_SIGNAL_CACHE_HEADER =
  'public, s-maxage=900, stale-while-revalidate=3600';

function buildMarineUrl() {
  const url = new URL('https://marine-api.open-meteo.com/v1/marine');
  url.searchParams.set('latitude', String(SIARGAO_SURF_MODEL_POINT.latitude));
  url.searchParams.set('longitude', String(SIARGAO_SURF_MODEL_POINT.longitude));
  url.searchParams.set(
    'current',
    [
      'wave_height',
      'wave_direction',
      'wave_period',
      'swell_wave_height',
      'swell_wave_direction',
      'swell_wave_period',
    ].join(',')
  );
  url.searchParams.set('forecast_days', '1');
  url.searchParams.set('timezone', 'Asia/Manila');
  return url;
}

export async function GET() {
  try {
    const receivedAt = new Date();
    const [marineResult, tideResult] = await Promise.allSettled([
      fetch(buildMarineUrl(), {
        headers: { Accept: 'application/json' },
        next: { revalidate: 900 },
        signal: AbortSignal.timeout(7_000),
      }),
      fetch(CLOUD_9_TIDE_SOURCE.href, {
        headers: {
          Accept: 'text/html',
          'User-Agent': 'BaseDare/1.0 (+https://basedare.xyz)',
        },
        next: { revalidate: 1800 },
        signal: AbortSignal.timeout(7_000),
      }),
    ]);

    if (marineResult.status !== 'fulfilled') throw marineResult.reason;
    const response = marineResult.value;

    if (!response.ok) {
      throw new Error(`Marine provider returned ${response.status}`);
    }

    let tide = null;
    if (tideResult.status === 'fulfilled' && tideResult.value.ok) {
      tide = parseSurfForecastTidePage(await tideResult.value.text(), receivedAt);
    }

    const signal = buildSiargaoSurfSignal(await response.json(), receivedAt, tide);
    if (!signal) {
      return NextResponse.json(
        { success: false, error: 'The surf model is not fresh enough to publish.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { success: true, data: signal },
      { headers: { 'Cache-Control': SURF_SIGNAL_CACHE_HEADER } }
    );
  } catch (error) {
    console.error('[surf-signal] Failed to refresh Siargao marine model:', error);
    return NextResponse.json(
      { success: false, error: 'The live surf signal is unavailable right now.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
