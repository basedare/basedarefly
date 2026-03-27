'use client';

import { useEffect, useState } from 'react';
import { getBountyModeSnapshot, type BountyModeSnapshot } from '@/lib/bounty-mode';

export function useBountyMode() {
    const [snapshot, setSnapshot] = useState<BountyModeSnapshot>(() => getBountyModeSnapshot());
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const response = await fetch('/api/config/bounty-mode', { cache: 'no-store' });
                const payload = await response.json();
                if (!cancelled && payload?.success && payload?.data) {
                    setSnapshot(payload.data as BountyModeSnapshot);
                }
            } catch {
                // Keep env-derived fallback if the config endpoint is unavailable.
            } finally {
                if (!cancelled) {
                    setReady(true);
                }
            }
        }

        void load();

        return () => {
            cancelled = true;
        };
    }, []);

    return {
        ...snapshot,
        ready,
    };
}

