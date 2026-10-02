'use client';
import { useEffect } from 'react';
import { BOUNTY_CONTRACT_ADDRESS, NETWORK_CONFIG } from '@/lib/contracts';

// Registration verifies chain evidence server-side. This never submits a payment.
export function useFundingRecovery(wallet?: string | null) {
  useEffect(() => {
    if (!wallet) return;
    let running = false;
    let disposed = false;
    const recover = async () => {
      if (running || document.visibilityState !== 'visible') return;
      running = true;
      try {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('basedare:pending-funding:')).slice(0, 20);
        for (const key of keys) {
          if (disposed) break;
          try {
            const item = JSON.parse(localStorage.getItem(key) || '{}');
            if (item.wallet?.toLowerCase() !== wallet.toLowerCase() || item.chainId !== NETWORK_CONFIG.chainId ||
                item.bounty?.toLowerCase() !== BOUNTY_CONTRACT_ADDRESS.toLowerCase() || typeof item.dareId !== 'string' ||
                !/^0x[0-9a-f]{64}$/i.test(item.txHash)) continue;
            const response = await fetch('/api/bounties/register', { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ dareId: item.dareId, txHash: item.txHash }) });
            const result = await response.json();
            if (response.ok && result.success) {
              localStorage.removeItem(key);
              window.dispatchEvent(new Event('basedare:mission-updated'));
            }
          } catch { /* Preserve evidence for the next return. */ }
        }
      } catch { /* Storage may be unavailable. */ }
      finally { running = false; }
    };
    void recover();
    window.addEventListener('focus', recover);
    document.addEventListener('visibilitychange', recover);
    return () => { disposed = true; window.removeEventListener('focus', recover); document.removeEventListener('visibilitychange', recover); };
  }, [wallet]);
}
