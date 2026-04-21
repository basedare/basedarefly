'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type SessionShape = {
  token?: string | null;
  walletAddress?: string | null;
  user?: {
    walletAddress?: string | null;
  } | null;
};

function getSessionFields(session: SessionShape | null | undefined) {
  const token = session?.token ?? null;
  const wallet = session?.walletAddress ?? session?.user?.walletAddress ?? null;
  return {
    token,
    walletAddress: wallet?.toLowerCase() ?? null,
  };
}

type ClaimVenueButtonProps = {
  venueSlug: string;
  venueName: string;
  claimHref?: string;
  className?: string;
  pendingClassName?: string;
  requireAuthClassName?: string;
  pending?: boolean;
  onClaimSubmitted?: (claimRequestTag: string | null) => void;
};

export default function ClaimVenueButton({
  venueSlug,
  venueName,
  claimHref,
  className,
  pendingClassName,
  requireAuthClassName,
  pending = false,
  onClaimSubmitted,
}: ClaimVenueButtonProps) {
  const { data: session, status } = useSession();
  const { isConnected } = useAccount();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const sessionFields = useMemo(
    () => getSessionFields((session as SessionShape | null) ?? null),
    [session]
  );
  const canSubmit = Boolean(sessionFields.token && sessionFields.walletAddress);

  if (pending) {
    return (
      <span className={pendingClassName}>
        Claim pending
      </span>
    );
  }

  if (!canSubmit && status !== 'loading') {
    return (
      <Link href="/claim-tag" className={requireAuthClassName ?? className}>
        {isConnected ? 'Reconnect session' : 'Claim venue'}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={submitting || status === 'loading'}
      onClick={async () => {
        if (!sessionFields.token) return;

        try {
          setSubmitting(true);
          const response = await fetch(claimHref ?? `/api/venues/${encodeURIComponent(venueSlug)}/claim`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${sessionFields.token}`,
            },
          });
          const payload = await response.json();

          if (!response.ok || !payload?.success) {
            toast({
              title: 'Claim failed',
              description: payload?.error ?? `Could not claim ${venueName} right now.`,
              variant: 'destructive',
            });
            return;
          }

          toast({
            title: 'Venue claim submitted',
            description: payload?.message ?? `${venueName} is now pending moderator review.`,
          });
          onClaimSubmitted?.(payload?.data?.claimRequestTag ?? null);
        } catch (error) {
          toast({
            title: 'Claim failed',
            description: error instanceof Error ? error.message : `Could not claim ${venueName} right now.`,
            variant: 'destructive',
          });
        } finally {
          setSubmitting(false);
        }
      }}
      className={className}
    >
      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {submitting ? 'Submitting claim' : 'Claim venue'}
    </button>
  );
}
