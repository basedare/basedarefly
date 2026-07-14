'use client';

import { useEffect, useMemo, useState } from 'react';

export type TonightActivity = {
  id: string;
  type: 'dare' | 'meetup';
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  place: {
    venueId: string | null;
    label: string;
    lat: number;
    lng: number;
    approx: true;
  };
  distanceKm: number | null;
  goingCount: number | null;
  capacity: number | null;
  reward: { amountUsdc: number } | null;
  viewer: { identified: boolean; rsvped: boolean };
  visibility: 'public';
  href: string;
};

export type TonightSnapshot = {
  window: {
    startUtc: string;
    endUtc: string;
    tz: string;
  };
  center: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
  totals: {
    activities: number;
    dares: number;
    meetups: number;
    going: number;
  };
  activities: TonightActivity[];
};

type TonightResponse = {
  success: boolean;
  error?: string;
  data?: TonightSnapshot;
};

type TonightCenter = {
  latitude: number;
  longitude: number;
};

const TONIGHT_REFRESH_MS = 120_000;
const TONIGHT_FETCH_DEBOUNCE_MS = 420;
// Leave room for a cold serverless/database wake-up. The UI renders the usual
// local rhythm immediately, so this longer ceiling never blocks the visitor.
const TONIGHT_REQUEST_TIMEOUT_MS = 12_000;

function roundCenter(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function useTonightActivity(
  center: TonightCenter | null,
  enabled: boolean,
  radiusKm = 5
) {
  const [snapshot, setSnapshot] = useState<TonightSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const centerKey = useMemo(() => {
    if (!center) return null;
    return `${roundCenter(center.latitude)}:${roundCenter(center.longitude)}:${radiusKm}`;
  }, [center, radiusKm]);
  const requestCenter = useMemo(() => {
    if (!centerKey) return null;
    const [latitude, longitude] = centerKey.split(':').map(Number);
    return { latitude, longitude };
  }, [centerKey]);

  useEffect(() => {
    if (!enabled || !requestCenter) {
      setLoading(false);
      setError(null);
      return;
    }

    setSnapshot(null);
    setError(null);
    let cancelled = false;
    let controller: AbortController | null = null;

    const load = async () => {
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      let timedOut = false;
      const timeoutId = window.setTimeout(() => {
        timedOut = true;
        requestController.abort();
      }, TONIGHT_REQUEST_TIMEOUT_MS);
      setLoading(true);

      const query = new URLSearchParams({
        lat: String(roundCenter(requestCenter.latitude)),
        lng: String(roundCenter(requestCenter.longitude)),
        radiusKm: String(radiusKm),
        limit: '12',
      });

      try {
        const response = await fetch(`/api/tonight?${query.toString()}`, {
          cache: 'no-store',
          signal: requestController.signal,
        });
        const payload = (await response.json()) as TonightResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error || 'Tonight is unavailable right now.');
        }

        if (!cancelled) {
          setSnapshot(payload.data);
          setError(null);
        }
      } catch (loadError) {
        if (cancelled || (requestController.signal.aborted && !timedOut)) return;
        setError(
          timedOut
            ? 'Live activity is taking too long to refresh.'
            : loadError instanceof Error
              ? loadError.message
              : 'Tonight is unavailable right now.'
        );
      } finally {
        window.clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      }
    };

    const debounceId = window.setTimeout(() => void load(), TONIGHT_FETCH_DEBOUNCE_MS);
    const refreshId = window.setInterval(() => void load(), TONIGHT_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(debounceId);
      window.clearInterval(refreshId);
      controller?.abort();
    };
  }, [enabled, radiusKm, requestCenter]);

  return { snapshot, loading, error };
}
