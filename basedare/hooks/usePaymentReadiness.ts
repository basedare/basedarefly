'use client';
import { useCallback, useEffect, useState } from 'react';
export function usePaymentReadiness(enabled = true) {
  const [state, setState] = useState<'checking' | 'ready' | 'unavailable'>('checking');
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => { controller.abort(); if (active) setState('unavailable'); }, 10_000);
    void fetch('/api/config/payment-readiness', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (active) setState(response.ok && data.ready === true ? 'ready' : 'unavailable'); })
      .catch(() => { if (active) setState('unavailable'); }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [enabled, attempt]);
  useEffect(() => { if (!enabled) return; window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh); }, [enabled, refresh]);
  return { state, refresh };
}
