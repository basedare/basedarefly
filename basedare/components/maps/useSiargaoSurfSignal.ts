'use client';

import { useEffect, useState } from 'react';
import type { SiargaoSurfSignal } from '@/lib/siargao-surf-signal';

type SurfSignalResponse = {
  success: boolean;
  error?: string;
  data?: SiargaoSurfSignal;
};

const SURF_SIGNAL_REFRESH_MS = 15 * 60_000;
const SURF_SIGNAL_TIMEOUT_MS = 8_000;

export function useSiargaoSurfSignal(enabled = true) {
  const [signal, setSignal] = useState<SiargaoSurfSignal | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let controller: AbortController | null = null;

    const load = async () => {
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      const timeoutId = window.setTimeout(
        () => requestController.abort(),
        SURF_SIGNAL_TIMEOUT_MS
      );

      try {
        const response = await fetch('/api/surf-signal', {
          signal: requestController.signal,
        });
        const payload = (await response.json()) as SurfSignalResponse;
        if (!response.ok || !payload.success || !payload.data) return;
        if (!cancelled) setSignal(payload.data);
      } catch {
        // Surf signal is optional context. The map and PeeBear stay useful when
        // the upstream model is slow or unavailable.
        if (!cancelled) {
          setSignal((current) =>
            current && Date.now() - Date.parse(current.modelTime) <= 3 * 60 * 60_000
              ? current
              : null
          );
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    void load();
    const refreshId = window.setInterval(load, SURF_SIGNAL_REFRESH_MS);
    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(refreshId);
    };
  }, [enabled]);

  return signal;
}
