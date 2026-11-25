'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAccount, useSignMessage } from 'wagmi';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';

export default function DareClipPermission({ dareId }: { dareId: string }) {
  const { address } = useAccount();
  const { data: session } = useSession();
  const { signMessageAsync } = useSignMessage();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (!address) return null;
  const withdraw = async () => {
    setBusy(true);
    try {
      const saved = session as { token?: string; walletAddress?: string; user?: { walletAddress?: string } } | null;
      const headers = await buildWalletActionAuthHeaders({ walletAddress: address, sessionToken: saved?.token, sessionWallet: saved?.walletAddress ?? saved?.user?.walletAddress, action: 'dare:clip-withdraw', resource: dareId, signatureScope: 'action', signMessageAsync });
      const response = await fetch('/api/upload/dare-proof/withdraw', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ dareId, walletAddress: address }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not withdraw permission.');
      setMessage(data.withdrawn ? 'Clip permission withdrawn. The next connected BaseClips sync will revoke the job. Your proof and payout remain unchanged.' : 'No active clip permission for this dare.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Please retry.'); }
    finally { setBusy(false); }
  };
  return <details className="mt-3 text-left text-xs text-white/65"><summary className="cursor-pointer py-2 font-semibold">Clip permission</summary><p>Withdraw optional editing and publication permission without changing your proof or reward. Existing public proof storage is separate.</p><button type="button" onClick={() => void withdraw()} disabled={busy} className="mt-2 min-h-11 rounded-lg border border-white/15 px-3 font-bold text-white/80">{busy ? 'Withdrawing…' : 'Withdraw clip permission'}</button><p aria-live="polite" className="mt-1">{message}</p></details>;
}
