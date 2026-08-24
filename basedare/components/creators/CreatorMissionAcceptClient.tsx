'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useSignMessage } from 'wagmi';

import { IdentityButton } from '@/components/IdentityButton';
import { MissionPassSheet } from '@/components/mission-pass/MissionPassSheet';
import { useSocialWebview } from '@/components/mission-pass/SocialWebviewProvider';
import SafetyWaiver from '@/components/SafetyWaiver';
import CosmicButton from '@/components/ui/CosmicButton';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { trackClientEvent } from '@/lib/analytics';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';

type CreatorMissionAcceptClientProps = {
  missionId: string;
  shortId: string;
  title: string;
  isAvailable: boolean;
  sponsorReuseNeedsOptIn: boolean;
  initialClaimRequestWallet: string | null;
  initialClaimRequestStatus: string | null;
};

export function CreatorMissionAcceptClient({
  missionId,
  shortId,
  title,
  isAvailable,
  sponsorReuseNeedsOptIn,
  initialClaimRequestWallet,
  initialClaimRequestStatus,
}: CreatorMissionAcceptClientProps) {
  const { address, sessionWallet, isConnected, isResolving } = useActiveWallet();
  const { signMessageAsync } = useSignMessage();
  const { data: session } = useSession();
  const { checked: webviewChecked, isSocialWebview, label: socialWebviewLabel } = useSocialWebview();
  const sessionToken = (session as { token?: string | null } | null)?.token ?? null;
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requestWallet, setRequestWallet] = useState(initialClaimRequestWallet?.toLowerCase() ?? null);
  const [requestStatus, setRequestStatus] = useState(initialClaimRequestStatus);
  const [error, setError] = useState<string | null>(null);
  const [showMissionPass, setShowMissionPass] = useState(false);

  const normalizedWallet = address?.toLowerCase() ?? null;
  const isMyPendingRequest =
    requestStatus === 'PENDING' && Boolean(normalizedWallet) && requestWallet === normalizedWallet;
  const anotherRequestIsPending = requestStatus === 'PENDING' && !isMyPendingRequest;

  const requestMission = async () => {
    if (!address || !waiverAccepted || !isAvailable) return;
    setLoading(true);
    setError(null);
    trackClientEvent('creator_mission_request_started', { mission_id: missionId });
    try {
      const authHeaders = await buildWalletActionAuthHeaders({
        walletAddress: address,
        sessionToken,
        sessionWallet,
        action: 'dare:claim',
        resource: missionId,
        signMessageAsync,
      });
      const response = await fetch(`/api/dares/${missionId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ walletAddress: address }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to request this mission.');
      }
      setRequestWallet(address.toLowerCase());
      setRequestStatus('PENDING');
      trackClientEvent('creator_mission_request_submitted', { mission_id: missionId });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to request this mission.');
    } finally {
      setLoading(false);
    }
  };

  if (isMyPendingRequest) {
    return (
      <div className="rounded-[22px] border border-emerald-200/20 bg-emerald-300/[0.07] p-5 text-center">
        <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-200" aria-hidden="true" />
        <p className="mt-3 text-lg font-black text-white">Request sent</p>
        <p className="mt-1 text-sm leading-6 text-white/52">BaseDare is reviewing it. Your profile can come later.</p>
      </div>
    );
  }

  if (!isAvailable || anotherRequestIsPending) {
    return (
      <div className="rounded-[22px] border border-white/10 bg-black/24 p-5 text-center">
        <p className="text-base font-black text-white">
          {anotherRequestIsPending
            ? 'Another contributor is being reviewed'
            : sponsorReuseNeedsOptIn
              ? 'This mission needs a clearer rights agreement'
              : 'This mission is not currently open'}
        </p>
        <p className="mt-2 text-sm leading-6 text-white/46">
          {sponsorReuseNeedsOptIn
            ? 'Requests stay closed until explicit sponsor-use consent is available.'
            : 'Browse the live paid missions for another brief.'}
        </p>
        <CosmicButton href="/earn" variant="blue" size="md" className="mt-4">
          See open missions
        </CosmicButton>
      </div>
    );
  }

  if (isResolving) {
    return <div className="flex min-h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-yellow-200" /></div>;
  }

  if (!isConnected) {
    const isBlockedWebview = webviewChecked && isSocialWebview;
    return (
      <div className="rounded-[22px] border border-yellow-200/14 bg-yellow-300/[0.04] p-5 text-center">
        <p className="text-lg font-black text-white">Want this mission?</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/50">
          {isBlockedWebview
            ? `Save it, then open the pass in Safari or Chrome outside ${socialWebviewLabel}.`
            : 'Sign in only when you are ready to request it. No public profile is required first.'}
        </p>
        <div className="mt-4 flex justify-center">
          {isBlockedWebview ? (
            <CosmicButton onClick={() => setShowMissionPass(true)} variant="gold" size="md">
              Save Mission Pass
            </CosmicButton>
          ) : (
            <IdentityButton disconnectedLabel="Sign in to request" />
          )}
        </div>
        <MissionPassSheet
          open={showMissionPass}
          onClose={() => setShowMissionPass(false)}
          targetType="DARE"
          targetId={missionId}
          targetHref={`/earn/${encodeURIComponent(shortId)}`}
          title={title}
          description="Save this paid mission and continue in Safari or Chrome when you are ready to request it."
        />
      </div>
    );
  }

  return (
    <div>
      <SafetyWaiver
        checked={waiverAccepted}
        onChange={setWaiverAccepted}
        context="claim"
        compact
      />
      {error ? <p className="mt-3 text-sm font-semibold text-red-300">{error}</p> : null}
      <CosmicButton
        onClick={() => void requestMission()}
        disabled={loading || !waiverAccepted}
        variant="gold"
        size="lg"
        fullWidth
        className="mt-4"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        Request mission
      </CosmicButton>
      <p className="mt-3 text-center text-xs leading-5 text-white/38">
        Work starts only after BaseDare approves and assigns the mission to you.
      </p>
    </div>
  );
}
