import { NextResponse } from 'next/server';
import {
  buildSiargaoSurfSignal,
  SIARGAO_SURF_MODEL_POINT,
} from '@/lib/siargao-surf-signal';

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
  url.searchParams.set('timezone', 'UTC');
  return url;
}

export async function GET() {
  try {
    const response = await fetch(buildMarineUrl(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new Error(`Marine provider returned ${response.status}`);
    }

    const signal = buildSiargaoSurfSignal(await response.json());
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
