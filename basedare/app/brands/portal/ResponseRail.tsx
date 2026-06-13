// Extracted verbatim from page.tsx (Phase A structural split — no behavior changes).
// Pure campaign display helpers live here at module scope; stateful handlers stay
// in the page shell and arrive as props with their original names.
import type { Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import { CreditCard, MapPin, PlayCircle, Sparkles, Users } from 'lucide-react';
import {
  TIER_INFO,
  formatWallet,
  getDefaultResponseTab,
  type Campaign,
  type CampaignFormData,
  type CampaignMatchesState,
  type ResponseRailTab,
} from './activation-packages';

const formatTargetingPreview = (targetingRaw?: string) => {
  if (!targetingRaw) return [];

  try {
    const targeting = JSON.parse(targetingRaw) as CampaignFormData['targetingCriteria'];
    const chips: string[] = [];
    if (targeting.minFollowers && targeting.minFollowers > 0) {
      chips.push(`min ${targeting.minFollowers.toLocaleString()} followers`);
    }
    if (targeting.platforms?.length) {
      chips.push(targeting.platforms.map((platform) => platform.toUpperCase()).join(' + '));
    }
    if (targeting.niche?.trim()) {
      chips.push(targeting.niche.trim());
    }
    if (targeting.location === 'near-venue') {
      chips.push('venue-local');
    }
    return chips;
  } catch {
    return [];
  }
};

const getCampaignIntent = (campaign: Campaign) => {
  const dare = campaign.linkedDare;
  if (!dare) return null;

  const actor =
    (dare.streamerHandle && dare.streamerHandle !== '@open' ? dare.streamerHandle : null) ||
    dare.claimRequestTag ||
    formatWallet(dare.claimRequestWallet || dare.claimedBy || dare.targetWalletAddress) ||
    'Creator';

  if (dare.status === 'VERIFIED') {
    return {
      label: 'Paid',
      tone: 'emerald' as const,
      actor,
      detail: dare.verifiedAt
        ? `verified ${new Date(dare.verifiedAt).toLocaleString()}`
        : 'activation verified and payout completed',
    };
  }

  if (dare.status === 'PENDING_PAYOUT') {
    return {
      label: 'Payout queued',
      tone: 'cyan' as const,
      actor,
      detail: 'proof is approved and payout is being processed automatically',
    };
  }

  if (dare.status === 'PENDING_REVIEW') {
    return {
      label: 'Proof in review',
      tone: 'amber' as const,
      actor,
      detail: 'creator submitted proof, waiting on referee review',
    };
  }

  if (dare.claimRequestStatus === 'PENDING') {
    return {
      label: 'Claim request pending',
      tone: 'amber' as const,
      actor,
      detail: dare.claimRequestedAt
        ? `requested ${new Date(dare.claimRequestedAt).toLocaleString()}`
        : 'waiting for review',
    };
  }

  if (dare.claimedBy || dare.targetWalletAddress) {
    return {
      label: dare.status === 'PENDING' ? 'Ready for proof' : 'Claimed',
      tone: 'blue' as const,
      actor,
      detail: dare.claimedAt
        ? `claimed ${new Date(dare.claimedAt).toLocaleString()}`
        : dare.status === 'PENDING'
          ? 'creator is attached and can submit proof now'
          : 'creator is attached to this activation',
    };
  }

  if (campaign.type === 'PLACE') {
    return {
      label: 'Open',
      tone: 'zinc' as const,
      actor: 'No creator yet',
      detail: 'live on the map and waiting for a creator to pick it up',
    };
  }

  return null;
};

const getCampaignOutcomeSteps = (campaign: Campaign) => {
  const dare = campaign.linkedDare;
  const creatorAttached = Boolean(dare?.claimedBy || dare?.targetWalletAddress);
  const creatorPending = dare?.claimRequestStatus === 'PENDING';
  const proofAttached = Boolean(dare?.videoUrl);
  const proofInReview = dare?.status === 'PENDING_REVIEW';
  const payoutQueued = dare?.status === 'PENDING_PAYOUT';
  const paid = dare?.status === 'VERIFIED';

  return [
    {
      label: 'Live',
      state: dare ? 'done' : campaign.status === 'LIVE' ? 'done' : 'idle',
    },
    {
      label: 'Creator',
      state: creatorAttached ? 'done' : creatorPending ? 'active' : 'idle',
    },
    {
      label: 'Proof',
      state: paid || payoutQueued || proofInReview || proofAttached ? 'done' : 'idle',
    },
    {
      label: 'Paid',
      state: paid ? 'done' : payoutQueued ? 'active' : 'idle',
    },
  ] as const;
};

const getCampaignOutcomeSummary = (campaign: Campaign) => {
  const dare = campaign.linkedDare;
  if (!dare) {
    return {
      label: 'No linked activation yet',
      detail: 'This activation has not produced a live creator result yet.',
    };
  }

  if (dare.status === 'VERIFIED') {
    return {
      label: 'Verified result',
      detail: dare.verifiedAt
        ? `proof cleared ${new Date(dare.verifiedAt).toLocaleString()}`
        : 'proof cleared and payout completed',
    };
  }

  if (dare.status === 'PENDING_PAYOUT') {
    return {
      label: 'Proof cleared',
      detail: 'Waiting for payout retry to complete automatically.',
    };
  }

  if (dare.status === 'PENDING_REVIEW') {
    return {
      label: 'Proof submitted',
      detail: dare.videoUrl ? 'Proof media is attached and waiting on referee review.' : 'Submission is waiting on referee review.',
    };
  }

  if (dare.claimRequestStatus === 'PENDING') {
    return {
      label: 'Claim request in',
      detail: 'A creator has raised a hand. Review is still in flight.',
    };
  }

  if (dare.claimedBy || dare.targetWalletAddress) {
    return {
      label: 'Creator attached',
      detail: 'A creator is attached and the activation is waiting for proof.',
    };
  }

  return {
    label: 'Open activation',
    detail: 'Live on the map and waiting for a creator to engage.',
  };
};

const getCampaignRecentMovement = (campaign: Campaign) => {
  const dare = campaign.linkedDare;
  if (!dare) {
    return {
      label: 'No movement yet',
      detail: 'The activation is live but no creator has engaged with it yet.',
    };
  }

  if (dare.status === 'VERIFIED') {
    return {
      label: 'Paid out',
      detail: dare.verifiedAt
        ? `verified ${new Date(dare.verifiedAt).toLocaleString()}`
        : 'verified completion cleared payout',
    };
  }

  if (dare.status === 'PENDING_PAYOUT') {
    return {
      label: 'Awaiting chain settlement',
      detail: dare.moderatedAt
        ? `approved ${new Date(dare.moderatedAt).toLocaleString()}`
        : 'proof is approved and payout retry is running',
    };
  }

  if (dare.status === 'PENDING_REVIEW') {
    return {
      label: 'Proof submitted',
      detail: dare.updatedAt
        ? `submitted ${new Date(dare.updatedAt).toLocaleString()}`
        : 'proof is in review now',
    };
  }

  if (dare.claimRequestStatus === 'PENDING') {
    return {
      label: 'Creator raised a hand',
      detail: dare.claimRequestedAt
        ? `requested ${new Date(dare.claimRequestedAt).toLocaleString()}`
        : 'claim request is waiting for review',
    };
  }

  if (dare.claimedBy || dare.targetWalletAddress) {
    return {
      label: 'Creator attached',
      detail: dare.claimedAt
        ? `attached ${new Date(dare.claimedAt).toLocaleString()}`
        : 'creator can submit proof now',
    };
  }

  return {
      label: 'Live on the map',
      detail: dare.createdAt
        ? `linked ${new Date(dare.createdAt).toLocaleString()}`
        : 'activation is waiting for creator activity',
  };
};

const getCampaignCompletionHistory = (campaign: Campaign) => {
  const dare = campaign.linkedDare;
  if (!dare) return [];

  const entries = [
    dare.claimRequestedAt
      ? {
          key: 'claim-request',
          label: 'Claim requested',
          detail: dare.claimRequestTag || formatWallet(dare.claimRequestWallet) || 'Creator',
          at: dare.claimRequestedAt,
        }
      : null,
    dare.claimedAt
      ? {
          key: 'creator-attached',
          label: 'Creator attached',
          detail: dare.streamerHandle || formatWallet(dare.claimedBy || dare.targetWalletAddress) || 'Creator',
          at: dare.claimedAt,
        }
      : null,
    dare.updatedAt && dare.videoUrl
      ? {
          key: 'proof-submitted',
          label: 'Proof submitted',
          detail: 'Proof was submitted for review',
          at: dare.updatedAt,
        }
      : null,
    dare.moderatedAt
      ? {
          key: 'moderated',
          label: dare.status === 'FAILED' ? 'Rejected' : 'Approved',
          detail: dare.status === 'FAILED' ? 'Review closed this activation' : 'Review cleared the proof',
          at: dare.moderatedAt,
        }
      : null,
    dare.verifiedAt
      ? {
          key: 'paid',
          label: 'Paid',
          detail: 'Completion settled to the creator',
          at: dare.verifiedAt,
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; detail: string; at: string }>;

  return entries
    .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
    .slice(0, 4);
};

const getLinkedCreatorHandle = (campaign: Campaign) => {
  const dare = campaign.linkedDare;
  return (
    (dare?.streamerHandle && dare.streamerHandle !== '@open' ? dare.streamerHandle : null) ||
    dare?.claimRequestTag ||
    formatWallet(dare?.claimRequestWallet || dare?.claimedBy || dare?.targetWalletAddress) ||
    'Creator'
  );
};

const getResponseTabCounts = (campaign: Campaign, matchesState?: CampaignMatchesState, shortlistedCount = 0) => {
  const dare = campaign.linkedDare;
  const shortlisted = shortlistedCount || (matchesState?.data?.length ?? 0);
  const claimed = dare?.claimRequestStatus === 'PENDING' || dare?.claimedBy || dare?.targetWalletAddress ? 1 : 0;
  const proof = dare?.videoUrl ? 1 : 0;
  const review = dare?.status === 'PENDING_REVIEW' ? 1 : 0;
  const verified = dare?.status === 'VERIFIED' || dare?.status === 'PENDING_PAYOUT' ? 1 : 0;

  return { shortlisted, claimed, proof, review, verified };
};

const getCampaignImpactSummary = (campaign: Campaign) => {
  const impact = campaign.venue?.impact;
  if (!campaign.venue || !impact) {
    return {
      label: 'Venue impact pending',
      detail: 'Attach this activation to a venue to track venue memory and momentum.',
    };
  }

  if (impact.campaignVerifiedMemory) {
    return {
      label: impact.firstMarkWon ? 'First mark won' : 'Verified memory added',
      detail: `${campaign.venue.name} now sits at ${impact.memoriesNow} memories and pulse ${impact.pulseNow}.`,
    };
  }

  if (campaign.linkedDare?.status === 'PENDING_REVIEW' || campaign.linkedDare?.videoUrl) {
    return {
      label: 'Outcome forming',
      detail: 'Proof is in review. Once it clears, the venue impact will appear here.',
    };
  }

  return {
    label: 'Venue pulse live',
    detail: `${campaign.venue.name} currently has ${impact.memoriesNow} memories and pulse ${impact.pulseNow}.`,
  };
};


type ResponseRailProps = {
  campaigns: Campaign[];
  claimRequestsPendingCount: number;
  creatorsAttachedCount: number;
  expandedMatchesCampaignId: string | null;
  inReviewCount: number;
  matchesByCampaign: Record<string, CampaignMatchesState>;
  openActivationBuilder: () => void;
  openCampaignComposerForCampaign: (campaign: Campaign) => void;
  paidOutCount: number;
  payoutQueuedCount: number;
  proofsSubmittedCount: number;
  responsesTabByCampaign: Record<string, ResponseRailTab>;
  setResponsesTabByCampaign: Dispatch<SetStateAction<Record<string, ResponseRailTab>>>;
  shortlistedCreators: Record<string, string[]>;
  toggleCampaignMatches: (campaign: Campaign) => Promise<void>;
  toggleShortlistCreator: (campaignId: string, creatorId: string) => void;
};

export default function ResponseRail({
  campaigns,
  claimRequestsPendingCount,
  creatorsAttachedCount,
  expandedMatchesCampaignId,
  inReviewCount,
  matchesByCampaign,
  openActivationBuilder,
  openCampaignComposerForCampaign,
  paidOutCount,
  payoutQueuedCount,
  proofsSubmittedCount,
  responsesTabByCampaign,
  setResponsesTabByCampaign,
  shortlistedCreators,
  toggleCampaignMatches,
  toggleShortlistCreator,
}: ResponseRailProps) {
  return (
    <>
        {/* Activations List */}
        <div className="activation-shell rounded-[30px] border p-4 md:p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/30 bg-[#f5c518]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ffe785]">
                <Sparkles className="h-3.5 w-3.5" />
                Operator board
              </div>
              <h2 className="mt-3 text-2xl font-black text-white md:text-3xl">Active venue routes</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-300">
                Track the activation, route creators, inspect proof, and repeat the venues that are already moving.
              </p>
            </div>
            <button
              type="button"
              onClick={openActivationBuilder}
              className="activation-raised-gold inline-flex min-h-12 items-center justify-center rounded-full border px-5 text-xs font-black uppercase tracking-[0.14em] transition active:translate-y-[1px]"
            >
              Launch new route
            </button>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="activation-inset rounded-2xl border border-[#f5c518]/20 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffe785]">Claim queue</div>
              <div className="mt-1 text-2xl font-black text-white">{claimRequestsPendingCount}</div>
              <div className="text-xs text-zinc-400">waiting for review</div>
            </div>
            <div className="activation-inset rounded-2xl border border-cyan-300/20 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Creators</div>
              <div className="mt-1 text-2xl font-black text-white">{creatorsAttachedCount}</div>
              <div className="text-xs text-zinc-400">attached to routes</div>
            </div>
            <div className="activation-inset rounded-2xl border border-purple-300/20 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-purple-200">Proofs</div>
              <div className="mt-1 text-2xl font-black text-white">{proofsSubmittedCount}</div>
              <div className="text-xs text-zinc-400">{inReviewCount} in review</div>
            </div>
            <div className="activation-inset rounded-2xl border border-emerald-300/20 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">Paid</div>
              <div className="mt-1 text-2xl font-black text-white">{paidOutCount}</div>
              <div className="text-xs text-zinc-400">{payoutQueuedCount} queued</div>
            </div>
          </div>

          {campaigns.length === 0 ? (
            <div className="activation-inset rounded-[24px] border border-white/10 px-5 py-10 text-center">
              <div className="text-lg font-black text-white">No activations yet.</div>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
                Pick a hot venue from the radar and fund one clean proof route.
              </p>
              <button
                type="button"
                onClick={openActivationBuilder}
                className="activation-raised-gold mt-5 inline-flex min-h-12 items-center justify-center rounded-full border px-6 text-xs font-black uppercase tracking-[0.14em] transition active:translate-y-[1px]"
              >
                Start first activation
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => {
                const tierInfo = TIER_INFO[campaign.tier as keyof typeof TIER_INFO];
                const targetingPreview = formatTargetingPreview(campaign.targetingCriteria);
                const matchesState = matchesByCampaign[campaign.id];
                const shortlistedCount = (shortlistedCreators[campaign.id] ?? []).length;
                const isMatchesExpanded = expandedMatchesCampaignId === campaign.id;
                const activeResponsesTab = responsesTabByCampaign[campaign.id] ?? getDefaultResponseTab(campaign);
                const creatorIntent = getCampaignIntent(campaign);
                const outcomeSteps = getCampaignOutcomeSteps(campaign);
                const outcomeSummary = getCampaignOutcomeSummary(campaign);
                const impactSummary = getCampaignImpactSummary(campaign);
                const completionHistory = getCampaignCompletionHistory(campaign);
                const responseTabCounts = getResponseTabCounts(campaign, matchesState, shortlistedCount);
                return (
                  <div
                    key={campaign.id}
                    id={`campaign-${campaign.id}`}
                    className="activation-inset rounded-[24px] border border-white/10 p-4 transition hover:border-[#f5c518]/30 md:p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-3 md:gap-4">
                        <div
                          className={`shrink-0 rounded-full bg-gradient-to-r ${tierInfo.color} px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.26)]`}
                        >
                          {tierInfo.name}
                        </div>
                        <div>
                          <div className="text-lg font-black leading-tight text-white md:text-xl">{campaign.title}</div>
                          <div className="mt-1 text-xs md:text-sm text-zinc-400">
                            {new Date(campaign.createdAt).toLocaleDateString()}
                            {campaign.venue ? ` • ${campaign.venue.name}` : ''}
                          </div>
                          {campaign.type === 'PLACE' && campaign.linkedDare?.shortId ? (
                            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-cyan-500">
                              Live dare {campaign.linkedDare.shortId}
                            </div>
                          ) : null}
                          {campaign.truth?.creatorRoutingDormant ? (
                            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-amber-500">
                              Creator routing parked
                            </div>
                          ) : null}
                          {targetingPreview.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {targetingPreview.map((item) => (
                                <span
                                  key={`${campaign.id}-${item}`}
                                  className="activation-soft-button rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-300"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 md:min-w-[300px]">
                        <div className="activation-inset rounded-2xl border border-white/10 px-3 py-2 text-center">
                          <div className="text-base md:text-lg font-bold text-white">
                            ${campaign.budgetUsdc.toLocaleString()}
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Budget</div>
                        </div>

                        <div className="activation-inset rounded-2xl border border-white/10 px-3 py-2 text-center">
                          <div className="text-base md:text-lg font-bold text-white">
                            {campaign.slotCounts.assigned + campaign.slotCounts.completed}/
                            {campaign.slotCounts.total}
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Slots</div>
                        </div>

                        <div
                          className={`flex items-center justify-center rounded-2xl border px-2 py-2 text-center text-[10px] font-black uppercase tracking-[0.12em] ${
                            campaign.status === 'RECRUITING'
                              ? 'border-emerald-300/25 bg-emerald-400/[0.09] text-emerald-200'
                              : campaign.status === 'LIVE'
                                ? 'border-cyan-300/25 bg-cyan-400/[0.09] text-cyan-200'
                                : campaign.status === 'SETTLED'
                                  ? 'border-white/10 bg-white/[0.05] text-zinc-300'
                                  : 'border-[#f5c518]/25 bg-[#f5c518]/10 text-[#ffe785]'
                          }`}
                        >
                          {campaign.status}
                        </div>
                      </div>
                    </div>

                    {/* Slot Progress Bar */}
                    <div className="mt-4">
                      {creatorIntent ? (
                        <div
                          className={`mb-4 rounded-xl border px-4 py-3 ${
                            creatorIntent.tone === 'amber'
                              ? 'border-amber-300 bg-amber-50 text-amber-900'
                              : creatorIntent.tone === 'cyan'
                                ? 'border-cyan-300 bg-cyan-50 text-cyan-900'
                                : creatorIntent.tone === 'blue'
                                  ? 'border-blue-300 bg-blue-50 text-blue-900'
                                  : creatorIntent.tone === 'zinc'
                                    ? 'border-zinc-300 bg-zinc-50 text-zinc-900'
                              : 'border-emerald-300 bg-emerald-50 text-emerald-900'
                          }`}
                        >
                          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                                Activation State
                              </div>
                              <div className="mt-1 text-sm font-semibold">
                                {creatorIntent.label} • {creatorIntent.actor}
                              </div>
                            </div>
                            <div className="text-xs opacity-80">{creatorIntent.detail}</div>
                          </div>
                        </div>
                      ) : null}

                      {(() => {
                        const recentMovement = getCampaignRecentMovement(campaign);
                        return (
                          <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                  Recent Movement
                                </div>
                                <div className="mt-1 text-sm font-semibold text-zinc-900">{recentMovement.label}</div>
                              </div>
                              <div className="text-xs text-zinc-500">{recentMovement.detail}</div>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                              Result Proof
                            </div>
                            <div className="mt-1 text-sm font-semibold text-zinc-900">
                              {outcomeSummary.label}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">{outcomeSummary.detail}</div>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {outcomeSteps.map((step) => (
                              <div
                                key={`${campaign.id}-${step.label}`}
                                className={`rounded-lg border px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                  step.state === 'done'
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                    : step.state === 'active'
                                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                                      : 'border-zinc-200 bg-white text-zinc-400'
                                }`}
                              >
                                {step.label}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {campaign.venue?.impact ? (
                        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                Pulse Outcome
                              </div>
                              <div className="mt-1 text-sm font-semibold text-zinc-900">{impactSummary.label}</div>
                              <div className="mt-1 text-xs text-zinc-500">{impactSummary.detail}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Pulse now</div>
                                <div className="mt-1 text-sm font-bold text-zinc-900">{campaign.venue.impact.pulseNow}</div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Memories</div>
                                <div className="mt-1 text-sm font-bold text-zinc-900">{campaign.venue.impact.memoriesNow}</div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">This activation</div>
                                <div className="mt-1 text-sm font-bold text-zinc-900">
                                  {campaign.venue.impact.campaignVerifiedMemory
                                    ? `+${campaign.venue.impact.pulseContribution}`
                                    : 'pending'}
                                </div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">First mark</div>
                                <div className="mt-1 text-sm font-bold text-zinc-900">
                                  {campaign.venue.impact.firstMarkWon ? 'won' : 'open'}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {campaign.venue.impact.campaignVerifiedMemory ? (
                              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-800">
                                memory added {campaign.venue.impact.linkedMemoryAt ? new Date(campaign.venue.impact.linkedMemoryAt).toLocaleDateString() : ''}
                              </span>
                            ) : null}
                            {campaign.venue.impact.firstMarkWon ? (
                              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-800">
                                first mark won
                              </span>
                            ) : null}
                            {campaign.venue.impact.recentCompletedCount > 0 ? (
                              <span className="rounded-full border border-purple-300 bg-purple-500/[0.08] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-zinc-800">
                                {campaign.venue.impact.recentCompletedCount} completions in latest bucket
                              </span>
                            ) : null}
                            {campaign.venue.impact.lastMarkedAt ? (
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                                last marked {new Date(campaign.venue.impact.lastMarkedAt).toLocaleDateString()}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {completionHistory.length > 0 ? (
                        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                            Completion History
                          </div>
                          <div className="mt-3 space-y-2">
                            {completionHistory.map((entry) => (
                              <div
                                key={`${campaign.id}-${entry.key}`}
                                className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 md:flex-row md:items-center md:justify-between"
                              >
                                <div>
                                  <div className="text-xs font-semibold text-zinc-900">{entry.label}</div>
                                  <div className="text-[11px] text-zinc-500">{entry.detail}</div>
                                </div>
                                <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                                  {new Date(entry.at).toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="activation-inset h-2 overflow-hidden rounded-full border border-white/10">
                        <div
                          className="h-full bg-gradient-to-r from-[#f5c518] via-[#b65cff] to-[#33e6ff]"
                          style={{
                            width: `${
                              ((campaign.slotCounts.assigned + campaign.slotCounts.completed) /
                                Math.max(1, campaign.slotCounts.total)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-zinc-400">
                        <span>
                          {campaign.type === 'PLACE'
                            ? `${campaign.slotCounts.completed > 0 ? 'completed' : 'live on map'}`
                            : `${campaign.slotCounts.open} open • ${campaign.slotCounts.claimed} claimed • ${campaign.slotCounts.assigned} assigned`}
                        </span>
                        <span>
                          {campaign.truth?.timeline.settledAt
                            ? `settled ${new Date(campaign.truth.timeline.settledAt).toLocaleDateString()}`
                            : campaign.linkedDare?.status === 'PENDING_REVIEW'
                              ? 'proof in review'
                              : campaign.linkedDare?.status === 'PENDING_PAYOUT'
                                ? 'payout queued'
                                : campaign.linkedDare?.status === 'VERIFIED'
                                  ? 'paid and verified'
                            : campaign.truth?.timeline.liveAt
                              ? `live ${new Date(campaign.truth.timeline.liveAt).toLocaleDateString()}`
                              : `${campaign.slotCounts.completed} completed`}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {campaign.linkedDare?.videoUrl ? (
                          <a
                            href={campaign.linkedDare.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="activation-raised-cyan inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition active:translate-y-[1px]"
                          >
                            <PlayCircle className="h-3.5 w-3.5" />
                            Watch Proof
                          </a>
                        ) : null}
                        {campaign.linkedDare?.shortId ? (
                          <Link
                            href={`/dare/${encodeURIComponent(campaign.linkedDare.shortId)}`}
                            className="activation-soft-button inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-200 transition hover:border-white/20 active:translate-y-[1px]"
                          >
                            Open Brief
                          </Link>
                        ) : null}
                        {campaign.venue ? (
                          <button
                            type="button"
                            onClick={() => openCampaignComposerForCampaign(campaign)}
                            className="activation-raised-gold inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition active:translate-y-[1px]"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Repeat route
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => toggleCampaignMatches(campaign)}
                          className="activation-soft-button inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-200 transition hover:border-white/20 active:translate-y-[1px]"
                        >
                          <Users className="h-3.5 w-3.5" />
                          {isMatchesExpanded ? 'Hide Responses' : responseTabCounts.shortlisted > 0 ? `Responses • ${responseTabCounts.shortlisted} shortlisted` : 'Responses'}
                        </button>
                        {campaign.venue?.slug ? (
                          <Link
                            href={`/map?place=${encodeURIComponent(campaign.venue.slug)}&campaignId=${encodeURIComponent(campaign.id)}&source=control`}
                            className="activation-soft-button inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-cyan-300/20 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-300/35 active:translate-y-[1px]"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            Venue map
                          </Link>
                        ) : null}
                      </div>

                      {isMatchesExpanded ? (
                        <div className="activation-shell mt-4 rounded-[22px] border border-white/10 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-black text-white">Creator responses</div>
                              <div className="mt-1 text-xs text-zinc-400">
                                Watch the activation move from shortlist to proof to paid outcome without leaving Control.
                              </div>
                            </div>
                            {matchesState?.loading ? (
                              <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Loading</div>
                            ) : null}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {([
                              ['shortlisted', 'Shortlisted', responseTabCounts.shortlisted],
                              ['claimed', 'Claimed', responseTabCounts.claimed],
                              ['proof', 'Proof Submitted', responseTabCounts.proof],
                              ['review', 'In Review', responseTabCounts.review],
                              ['verified', 'Verified / Paid', responseTabCounts.verified],
                            ] as Array<[ResponseRailTab, string, number]>).map(([tabKey, label, count]) => (
                              <button
                                key={`${campaign.id}-${tabKey}`}
                                type="button"
                                onClick={() =>
                                  setResponsesTabByCampaign((current) => ({
                                    ...current,
                                    [campaign.id]: tabKey,
                                  }))
                                }
                                className={`rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
                                  activeResponsesTab === tabKey
                                    ? 'activation-raised-purple border-purple-300 text-white'
                                    : 'activation-soft-button border-white/10 text-zinc-300 hover:border-white/20'
                                }`}
                              >
                                {label} {count > 0 ? `• ${count}` : ''}
                              </button>
                            ))}
                          </div>

                          {matchesState?.error ? (
                            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                              {matchesState.error}
                            </div>
                          ) : null}

                          {activeResponsesTab === 'shortlisted' ? (
                            <>
                              {!matchesState?.loading && (matchesState?.data?.length ?? 0) === 0 ? (
                                <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-sm text-zinc-600">
                                  No creator matches yet. That is expected while onboarding is still at zero. Social connect and tag claims will start feeding this list.
                                </div>
                              ) : null}

                              <div className="mt-3 space-y-3">
                                {(matchesState?.data ?? []).slice(0, 5).map((match) => {
                                  const shortlist = (shortlistedCreators[campaign.id] ?? []).includes(match.creator.id);
                                  const platformLabels = Object.entries(match.creator.platforms)
                                    .filter(([, value]) => value?.handle)
                                    .map(([platform]) => platform.toUpperCase());

                                  return (
                                    <div
                                      key={match.creator.id}
                                      className="rounded-xl border border-white/10 bg-white/5 p-3"
                                    >
                                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <div className="font-semibold text-zinc-900">{match.creator.tag}</div>
                                            <div className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                                              score {match.score}
                                            </div>
                                          </div>
                                          <div className="mt-1 text-sm text-zinc-600">
                                            {match.creator.followerCount
                                              ? `${match.creator.followerCount.toLocaleString()} followers`
                                              : 'audience signal pending'}
                                            {' • '}
                                            {match.creator.completedDares} wins
                                            {' • '}
                                            ${Math.round(match.creator.totalEarned)} earned
                                          </div>
                                          {platformLabels.length > 0 ? (
                                            <div className="mt-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
                                              {platformLabels.join(' • ')}
                                            </div>
                                          ) : null}
                                          {match.creator.identityHandle ? (
                                            <div className="mt-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
                                              primary {match.creator.identityPlatform ?? 'identity'} • @{match.creator.identityHandle.replace(/^@/, '')}
                                            </div>
                                          ) : null}
                                          {match.creator.bio ? (
                                            <div className="mt-2 text-sm text-zinc-600 line-clamp-2">{match.creator.bio}</div>
                                          ) : null}
                                          <div className="mt-3 flex flex-wrap gap-2">
                                            {match.venueAffinity.exactVenueWins > 0 ? (
                                              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-800">
                                                {match.venueAffinity.exactVenueWins} win{match.venueAffinity.exactVenueWins === 1 ? '' : 's'} here
                                              </span>
                                            ) : null}
                                            {match.venueAffinity.exactVenueMarks > 0 ? (
                                              <span className="rounded-full border border-purple-300 bg-purple-500/[0.08] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-zinc-800">
                                                {match.venueAffinity.exactVenueMarks} mark{match.venueAffinity.exactVenueMarks === 1 ? '' : 's'} here
                                              </span>
                                            ) : null}
                                            {match.venueAffinity.exactVenueCheckIns > 0 ? (
                                              <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-sky-800">
                                                {match.venueAffinity.exactVenueCheckIns} check-in{match.venueAffinity.exactVenueCheckIns === 1 ? '' : 's'} here
                                              </span>
                                            ) : null}
                                            {match.venueAffinity.sameCityMarks > 0 ? (
                                              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-800">
                                                {match.venueAffinity.sameCityMarks} city mark{match.venueAffinity.sameCityMarks === 1 ? '' : 's'}
                                              </span>
                                            ) : null}
                                          </div>
                                          <div className="mt-2 flex flex-wrap gap-2">
                                            {match.reasons.slice(0, 3).map((reason) => (
                                              <span
                                                key={`${match.creator.id}-${reason}`}
                                                className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-zinc-600"
                                              >
                                                {reason}
                                              </span>
                                            ))}
                                          </div>
                                          <div className="mt-3 flex flex-wrap gap-2">
                                            <Link
                                              href={`/creator/${encodeURIComponent(match.creator.tag)}`}
                                              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 transition hover:border-white/20 hover:bg-white/10 hover:text-zinc-900"
                                            >
                                              View Creator
                                            </Link>
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => toggleShortlistCreator(campaign.id, match.creator.id)}
                                          className={`rounded-lg border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                                            shortlist
                                              ? 'border-purple-500 bg-purple-500/[0.08] text-zinc-950'
                                              : 'border-white/10 bg-white/5 text-zinc-700 hover:border-white/20 hover:bg-white/10 hover:text-zinc-900'
                                          }`}
                                        >
                                          {shortlist ? 'Shortlisted' : 'Shortlist'}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : null}

                          {activeResponsesTab === 'claimed' ? (
                            responseTabCounts.claimed > 0 ? (
                              <div className="mt-3 space-y-3">
                                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="font-semibold text-zinc-900">{getLinkedCreatorHandle(campaign)}</div>
                                        <div className="rounded-full border border-blue-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-800">
                                          {campaign.linkedDare?.claimRequestStatus === 'PENDING' ? 'pending claim' : 'creator attached'}
                                        </div>
                                      </div>
                                      <div className="mt-1 text-sm text-zinc-600">
                                        {campaign.linkedDare?.claimRequestedAt
                                          ? `claimed ${new Date(campaign.linkedDare.claimRequestedAt).toLocaleString()}`
                                          : campaign.linkedDare?.claimedAt
                                            ? `attached ${new Date(campaign.linkedDare.claimedAt).toLocaleString()}`
                                            : 'creator is moving on this activation'}
                                      </div>
                                      <div className="mt-2 text-xs text-zinc-500">
                                        {campaign.linkedDare?.claimRequestStatus === 'PENDING'
                                          ? 'Waiting for moderation before the creator can lock the spot.'
                                          : 'Creator is attached and can submit proof now.'}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {campaign.linkedDare?.shortId ? (
                                        <Link
                                          href={`/dare/${encodeURIComponent(campaign.linkedDare.shortId)}`}
                                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-800 transition hover:border-white/20 hover:bg-white/80"
                                        >
                                          Open Brief
                                        </Link>
                                      ) : null}
                                      {(campaign.linkedDare?.streamerHandle || campaign.linkedDare?.claimRequestTag) ? (
                                        <Link
                                          href={`/creator/${encodeURIComponent((campaign.linkedDare?.streamerHandle || campaign.linkedDare?.claimRequestTag || '').replace(/^@?/, '@'))}`}
                                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-800 transition hover:border-white/20 hover:bg-white/80"
                                        >
                                          View Creator
                                        </Link>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-sm text-zinc-600">
                                No creator has claimed this activation yet. Warm matches live in the Shortlisted rail.
                              </div>
                            )
                          ) : null}

                          {activeResponsesTab === 'proof' ? (
                            responseTabCounts.proof > 0 ? (
                              <div className="mt-3 space-y-3">
                                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="font-semibold text-zinc-900">{getLinkedCreatorHandle(campaign)}</div>
                                        <div className="rounded-full border border-violet-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-800">
                                          proof submitted
                                        </div>
                                      </div>
                                      <div className="mt-1 text-sm text-zinc-600">
                                        {campaign.linkedDare?.updatedAt
                                          ? `submitted ${new Date(campaign.linkedDare.updatedAt).toLocaleString()}`
                                          : 'proof media landed for review'}
                                      </div>
                                      <div className="mt-2 text-xs text-zinc-500">
                                        Media is attached to the linked activation and ready for operator review.
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {campaign.linkedDare?.videoUrl ? (
                                        <a
                                          href={campaign.linkedDare.videoUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-2 rounded-lg border border-violet-300 bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-900 transition hover:bg-white"
                                        >
                                          View Proof
                                        </a>
                                      ) : null}
                                      {campaign.linkedDare?.shortId ? (
                                        <Link
                                          href={`/dare/${encodeURIComponent(campaign.linkedDare.shortId)}`}
                                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-800 transition hover:border-white/20 hover:bg-white/80"
                                        >
                                          Open Brief
                                        </Link>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-sm text-zinc-600">
                                No proof has landed yet. This rail wakes up as soon as media is attached.
                              </div>
                            )
                          ) : null}

                          {activeResponsesTab === 'review' ? (
                            responseTabCounts.review > 0 ? (
                              <div className="mt-3 space-y-3">
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="font-semibold text-zinc-900">{getLinkedCreatorHandle(campaign)}</div>
                                        <div className="rounded-full border border-amber-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                                          in review
                                        </div>
                                      </div>
                                      <div className="mt-1 text-sm text-zinc-600">
                                        {campaign.linkedDare?.moderatedAt
                                          ? `review touched ${new Date(campaign.linkedDare.moderatedAt).toLocaleString()}`
                                          : 'referee review is in flight'}
                                      </div>
                                      <div className="mt-2 text-xs text-zinc-500">
                                        {campaign.linkedDare?.moderatorNote || 'Review is live. The operator rail is deciding whether proof clears payout.'}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {campaign.linkedDare?.videoUrl ? (
                                        <a
                                          href={campaign.linkedDare.videoUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-900 transition hover:bg-white"
                                        >
                                          View Proof
                                        </a>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-sm text-zinc-600">
                                Nothing is waiting on moderation right now.
                              </div>
                            )
                          ) : null}

                          {activeResponsesTab === 'verified' ? (
                            responseTabCounts.verified > 0 ? (
                              <div className="mt-3 space-y-3">
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="font-semibold text-zinc-900">{getLinkedCreatorHandle(campaign)}</div>
                                        <div className="rounded-full border border-emerald-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
                                          {campaign.linkedDare?.status === 'PENDING_PAYOUT' ? 'payout queued' : 'paid and verified'}
                                        </div>
                                      </div>
                                      <div className="mt-1 text-sm text-zinc-600">
                                        {campaign.linkedDare?.verifiedAt
                                          ? `verified ${new Date(campaign.linkedDare.verifiedAt).toLocaleString()}`
                                          : 'proof cleared and settlement is underway'}
                                      </div>
                                      <div className="mt-2 text-xs text-zinc-500">
                                        {campaign.venue
                                          ? `This completion now sits in ${campaign.venue.name}'s place memory and strengthens the venue pulse.`
                                          : 'This completion now counts as a verified cultural outcome for the activation.'}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {campaign.linkedDare?.videoUrl ? (
                                        <a
                                          href={campaign.linkedDare.videoUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-900 transition hover:bg-white"
                                        >
                                          Watch Proof
                                        </a>
                                      ) : null}
                                      {campaign.venue?.slug ? (
                                        <Link
                                          href={`/venues/${encodeURIComponent(campaign.venue.slug)}`}
                                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-800 transition hover:border-white/20 hover:bg-white/80"
                                        >
                                          Open Venue
                                        </Link>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-sm text-zinc-600">
                                No verified outcome yet. Once this clears, payout and place-memory impact will show up here.
                              </div>
                            )
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </>
  );
}
