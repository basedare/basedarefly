import { getBuyerCampaignState, hasRecordedBuyerPayment } from '@/lib/buyer-workspace-presentation';
// Extracted verbatim from page.tsx (Phase A structural split — no behavior changes).
// Pure campaign display helpers live here at module scope; stateful handlers stay
// in the page shell and arrive as props with their original names.
import type { Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import { MapPin, PlayCircle, RefreshCw, Sparkles, Users } from 'lucide-react';
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
          detail: dare.status === 'FAILED' ? 'Review closed this mission' : 'Review cleared the proof',
          at: dare.moderatedAt,
        }
      : null,
    dare.verifiedAt
      ? {
          key: 'paid',
          label: hasRecordedBuyerPayment(campaign) ? 'Payment reference recorded' : 'Verification recorded',
          detail: 'Open the brief for the current payment status',
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

const getResponseTabCounts = (campaign: Campaign, matchesState?: CampaignMatchesState) => {
  const dare = campaign.linkedDare;
  const shortlisted = matchesState?.data?.length ?? 0;
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
      detail: 'Attach this mission to a place to track verified place memory.',
    };
  }

  if (impact.campaignVerifiedMemory) {
    return {
      label: impact.firstMarkWon ? 'First update won' : 'Verified memory added',
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
    label: 'Place activity',
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
  expandedMatchesCampaignId,
  matchesByCampaign,
  openActivationBuilder,
  openCampaignComposerForCampaign,
  responsesTabByCampaign,
  setResponsesTabByCampaign,
  shortlistedCreators,
  toggleCampaignMatches,
  toggleShortlistCreator,
}: ResponseRailProps) {
  return (
    <>
        {/* Buyer mission history */}
        <div className="activation-shell rounded-[30px] border p-4 md:p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#f5c518]/30 bg-[#f5c518]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#ffe785]">
                <Sparkles className="h-3.5 w-3.5" />
                Commissioned work
              </div>
              <h2 className="mt-3 text-2xl font-black text-white md:text-3xl">Your briefs</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-300">
                Open a brief for its requirements. Expand details when you need evidence, responses or history.
              </p>
            </div>
            {/* The single generic "Create mission" CTA lives in the hero. This
                reporting header stays focused on status; the empty state below
                owns the launch CTA when there are no missions yet. */}
          </div>

          {campaigns.length === 0 ? (
            <div className="activation-inset rounded-[24px] border border-white/10 px-5 py-10 text-center">
              <div className="text-lg font-black text-white">No missions yet.</div>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
                Start with a clear goal. Review the scope and price before work begins.
              </p>
              <button
                type="button"
                onClick={openActivationBuilder}
                className="activation-raised-gold mt-5 inline-flex min-h-12 items-center justify-center rounded-full border px-6 text-xs font-black uppercase tracking-[0.14em] transition active:translate-y-[1px]"
              >
                Create first mission
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => {
                const tierInfo = TIER_INFO[campaign.tier as keyof typeof TIER_INFO];
                const targetingPreview = formatTargetingPreview(campaign.targetingCriteria);
                const matchesState = matchesByCampaign[campaign.id];
                const isMatchesExpanded = expandedMatchesCampaignId === campaign.id;
                const activeResponsesTab = responsesTabByCampaign[campaign.id] ?? getDefaultResponseTab(campaign);
                const creatorIntent = getBuyerCampaignState(campaign);
                const impactSummary = getCampaignImpactSummary(campaign);
                const completionHistory = getCampaignCompletionHistory(campaign);
                const responseTabCounts = getResponseTabCounts(campaign, matchesState);
                return (
                  <div
                    key={campaign.id}
                    id={`campaign-${campaign.id}`}
                    className="activation-inset rounded-[24px] border border-white/10 p-4 transition hover:border-[#f5c518]/30 md:p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row md:gap-4">
                        <div
                          className={`shrink-0 rounded-full bg-gradient-to-r ${tierInfo?.color ?? 'from-zinc-700 to-zinc-700'} px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.26)]`}
                        >
                          {tierInfo?.name ?? 'Brief'}
                        </div>
                        <div className="min-w-0 break-words">
                          <div className="text-lg font-black leading-tight text-white md:text-xl">{campaign.title}</div>
                          <div className="mt-1 text-xs md:text-sm text-zinc-400">
                            {new Date(campaign.createdAt).toLocaleDateString()}
                            {campaign.venue ? ` • ${campaign.venue.name}` : ''}
                          </div>
                          {campaign.type === 'PLACE' && campaign.linkedDare?.shortId ? (
                            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-cyan-500">
                              Brief {campaign.linkedDare.shortId}
                            </div>
                          ) : null}
                          {campaign.truth?.creatorRoutingDormant ? (
                            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-amber-500">
                              Contributor routing paused
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

                      <span className={`w-fit rounded-full border px-3 py-2 text-sm font-semibold ${creatorIntent.tone === 'amber' ? 'border-amber-200/25 text-amber-100' : creatorIntent.tone === 'mint' ? 'border-emerald-200/25 text-emerald-100' : 'border-white/15 text-white/80'}`}>{creatorIntent.label}</span>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-white/70">{creatorIntent.detail}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {campaign.linkedDare?.shortId ? <Link className="bd-action !text-sm" href={`/dare/${encodeURIComponent(campaign.linkedDare.shortId)}`}>Open brief →</Link> : null}
                      {campaign.linkedDare?.videoUrl && /^https?:\/\//.test(campaign.linkedDare.videoUrl) ? <a href={campaign.linkedDare.videoUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-sm font-bold text-cyan-100">View evidence ↗</a> : null}
                    </div>
                    <details className="mt-3 border-t border-white/10" open={isMatchesExpanded || undefined}>
                      <summary className="flex min-h-12 cursor-pointer items-center text-sm font-bold text-white/75">Details & responses</summary>
                      <dl className="mb-4 grid grid-cols-1 gap-3 rounded-xl bg-white/[0.03] p-4 text-sm sm:grid-cols-2">
                        <div><dt className="text-white/55">Planned reward budget</dt><dd className="mt-1 text-white">{campaign.budgetUsdc.toLocaleString()} USDC</dd></div>
                        <div><dt className="text-white/55">Contributor slots</dt><dd className="mt-1 text-white">{campaign.slotCounts.assigned + campaign.slotCounts.completed} / {campaign.slotCounts.total} attached or completed</dd></div>
                      </dl>
                      {campaign.description ? <p className="mb-4 whitespace-pre-wrap text-sm leading-6 text-white/70">{campaign.description}</p> : null}
                    <div className="mt-2">
                      {campaign.venue?.impact ? (
                        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                                Place context
                              </div>
                              <div className="mt-1 text-sm font-semibold text-white">{impactSummary.label}</div>
                              <div className="mt-1 text-xs text-white/60">{impactSummary.detail}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">Pulse now</div>
                                <div className="mt-1 text-sm font-bold text-white">{campaign.venue.impact.pulseNow}</div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">Memories</div>
                                <div className="mt-1 text-sm font-bold text-white">{campaign.venue.impact.memoriesNow}</div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">This mission</div>
                                <div className="mt-1 text-sm font-bold text-white">
                                  {campaign.venue.impact.campaignVerifiedMemory
                                    ? `+${campaign.venue.impact.pulseContribution}`
                                    : 'pending'}
                                </div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">First update</div>
                                <div className="mt-1 text-sm font-bold text-white">
                                  {campaign.venue.impact.firstMarkWon ? 'won' : 'open'}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {campaign.venue.impact.campaignVerifiedMemory ? (
                              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-100">
                                memory added {campaign.venue.impact.linkedMemoryAt ? new Date(campaign.venue.impact.linkedMemoryAt).toLocaleDateString() : ''}
                              </span>
                            ) : null}
                            {campaign.venue.impact.firstMarkWon ? (
                              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-100">
                                first mark won
                              </span>
                            ) : null}
                            {campaign.venue.impact.recentCompletedCount > 0 ? (
                              <span className="rounded-full border border-purple-300 bg-purple-500/[0.08] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/85">
                                {campaign.venue.impact.recentCompletedCount} completions in latest bucket
                              </span>
                            ) : null}
                            {campaign.venue.impact.lastMarkedAt ? (
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/70">
                                last marked {new Date(campaign.venue.impact.lastMarkedAt).toLocaleDateString()}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {completionHistory.length > 0 ? (
                        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                            Completion History
                          </div>
                          <div className="mt-3 space-y-2">
                            {completionHistory.map((entry) => (
                              <div
                                key={`${campaign.id}-${entry.key}`}
                                className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 md:flex-row md:items-center md:justify-between"
                              >
                                <div>
                                  <div className="text-xs font-semibold text-white">{entry.label}</div>
                                  <div className="text-[11px] text-white/60">{entry.detail}</div>
                                </div>
                                <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                                  {new Date(entry.at).toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

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
                            <RefreshCw className="h-3.5 w-3.5" />
                            Run a fresh check
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => toggleCampaignMatches(campaign)}
                          className="activation-soft-button inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-200 transition hover:border-white/20 active:translate-y-[1px]"
                        >
                          <Users className="h-3.5 w-3.5" />
                          {isMatchesExpanded ? 'Hide Responses' : responseTabCounts.shortlisted > 0 ? `Creator suggestions • ${responseTabCounts.shortlisted}` : 'Responses'}
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
                              <div className="text-sm font-black text-white">Responses & suggestions</div>
                              <div className="mt-1 text-xs text-zinc-400">
                                Inspect submitted work or browse suggested creators. A shortlist stays here while this workspace is open; it does not assign work.
                              </div>
                            </div>
                            {matchesState?.loading ? (
                              <div className="text-xs uppercase tracking-[0.16em] text-white/60">Loading</div>
                            ) : null}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {([
                              ['shortlisted', 'Suggestions', responseTabCounts.shortlisted],
                              ['claimed', 'Claimed', responseTabCounts.claimed],
                              ['proof', 'Proof Submitted', responseTabCounts.proof],
                              ['review', 'In Review', responseTabCounts.review],
                              ['verified', 'Outcome', responseTabCounts.verified],
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
                                className={`min-h-11 rounded-full border px-3 py-2 text-sm font-semibold uppercase tracking-[0.16em] transition ${
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
                                <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/70">
                                  No suggestions are available yet. You can retry later; this does not change your brief.
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
                                            <div className="font-semibold text-white">{match.creator.tag}</div>
                                            <div className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                                              score {match.score}
                                            </div>
                                          </div>
                                          <div className="mt-1 text-sm text-white/70">
                                            {match.creator.followerCount
                                              ? `${match.creator.followerCount.toLocaleString()} followers`
                                              : 'audience signal pending'}
                                            {' • '}
                                            {match.creator.completedDares} wins
                                            {' • '}
                                            ${Math.round(match.creator.totalEarned)} earned
                                          </div>
                                          {platformLabels.length > 0 ? (
                                            <div className="mt-2 text-xs uppercase tracking-[0.16em] text-white/60">
                                              {platformLabels.join(' • ')}
                                            </div>
                                          ) : null}
                                          {match.creator.identityHandle ? (
                                            <div className="mt-2 text-xs uppercase tracking-[0.16em] text-white/60">
                                              primary {match.creator.identityPlatform ?? 'identity'} • @{match.creator.identityHandle.replace(/^@/, '')}
                                            </div>
                                          ) : null}
                                          {match.creator.bio ? (
                                            <div className="mt-2 text-sm text-white/70 line-clamp-2">{match.creator.bio}</div>
                                          ) : null}
                                          <div className="mt-3 flex flex-wrap gap-2">
                                            {match.venueAffinity.exactVenueWins > 0 ? (
                                              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-100">
                                                {match.venueAffinity.exactVenueWins} win{match.venueAffinity.exactVenueWins === 1 ? '' : 's'} here
                                              </span>
                                            ) : null}
                                            {match.venueAffinity.exactVenueMarks > 0 ? (
                                              <span className="rounded-full border border-purple-300 bg-purple-500/[0.08] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/85">
                                                {match.venueAffinity.exactVenueMarks} mark{match.venueAffinity.exactVenueMarks === 1 ? '' : 's'} here
                                              </span>
                                            ) : null}
                                            {match.venueAffinity.exactVenueCheckIns > 0 ? (
                                              <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-sky-800">
                                                {match.venueAffinity.exactVenueCheckIns} check-in{match.venueAffinity.exactVenueCheckIns === 1 ? '' : 's'} here
                                              </span>
                                            ) : null}
                                            {match.venueAffinity.sameCityMarks > 0 ? (
                                              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-100">
                                                {match.venueAffinity.sameCityMarks} city mark{match.venueAffinity.sameCityMarks === 1 ? '' : 's'}
                                              </span>
                                            ) : null}
                                          </div>
                                          <div className="mt-2 flex flex-wrap gap-2">
                                            {match.reasons.slice(0, 3).map((reason) => (
                                              <span
                                                key={`${match.creator.id}-${reason}`}
                                                className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/70"
                                              >
                                                {reason}
                                              </span>
                                            ))}
                                          </div>
                                          <div className="mt-3 flex flex-wrap gap-2">
                                            <Link
                                              href={`/creator/${encodeURIComponent(match.creator.tag)}`}
                                              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                                            >
                                              View Creator
                                            </Link>
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => toggleShortlistCreator(campaign.id, match.creator.id)}
                                          className={`min-h-11 rounded-lg border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                                            shortlist
                                              ? 'border-purple-500 bg-purple-500/[0.08] text-white'
                                              : 'border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10 hover:text-white'
                                          }`}
                                        >
                                          {shortlist ? 'Suggestions' : 'Shortlist'}
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
                                        <div className="font-semibold text-white">{getLinkedCreatorHandle(campaign)}</div>
                                        <div className="rounded-full border border-blue-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-800">
                                          {campaign.linkedDare?.claimRequestStatus === 'PENDING' ? 'pending claim' : 'creator attached'}
                                        </div>
                                      </div>
                                      <div className="mt-1 text-sm text-white/70">
                                        {campaign.linkedDare?.claimRequestedAt
                                          ? `claimed ${new Date(campaign.linkedDare.claimRequestedAt).toLocaleString()}`
                                          : campaign.linkedDare?.claimedAt
                                            ? `attached ${new Date(campaign.linkedDare.claimedAt).toLocaleString()}`
                                            : 'contributor is working on this mission'}
                                      </div>
                                      <div className="mt-2 text-xs text-white/60">
                                        {campaign.linkedDare?.claimRequestStatus === 'PENDING'
                                          ? 'Waiting for moderation before the creator can lock the spot.'
                                          : 'Creator is attached and can submit proof now.'}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {campaign.linkedDare?.shortId ? (
                                        <Link
                                          href={`/dare/${encodeURIComponent(campaign.linkedDare.shortId)}`}
                                          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85 transition hover:border-white/20 hover:bg-white/80"
                                        >
                                          Open Brief
                                        </Link>
                                      ) : null}
                                      {(campaign.linkedDare?.streamerHandle || campaign.linkedDare?.claimRequestTag) ? (
                                        <Link
                                          href={`/creator/${encodeURIComponent((campaign.linkedDare?.streamerHandle || campaign.linkedDare?.claimRequestTag || '').replace(/^@?/, '@'))}`}
                                          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85 transition hover:border-white/20 hover:bg-white/80"
                                        >
                                          View Creator
                                        </Link>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/70">
                                No contributor has claimed this mission yet. Available matches appear under Shortlisted.
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
                                        <div className="font-semibold text-white">{getLinkedCreatorHandle(campaign)}</div>
                                        <div className="rounded-full border border-violet-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-800">
                                          proof submitted
                                        </div>
                                      </div>
                                      <div className="mt-1 text-sm text-white/70">
                                        {campaign.linkedDare?.updatedAt
                                          ? `submitted ${new Date(campaign.linkedDare.updatedAt).toLocaleString()}`
                                          : 'proof media landed for review'}
                                      </div>
                                      <div className="mt-2 text-xs text-white/60">
                                        Evidence is attached to the mission and ready for review.
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {campaign.linkedDare?.videoUrl ? (
                                        <a
                                          href={campaign.linkedDare.videoUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-violet-300 bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-100 transition hover:bg-white"
                                        >
                                          View Proof
                                        </a>
                                      ) : null}
                                      {campaign.linkedDare?.shortId ? (
                                        <Link
                                          href={`/dare/${encodeURIComponent(campaign.linkedDare.shortId)}`}
                                          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85 transition hover:border-white/20 hover:bg-white/80"
                                        >
                                          Open Brief
                                        </Link>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/70">
                                No evidence has been submitted yet.
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
                                        <div className="font-semibold text-white">{getLinkedCreatorHandle(campaign)}</div>
                                        <div className="rounded-full border border-amber-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100">
                                          in review
                                        </div>
                                      </div>
                                      <div className="mt-1 text-sm text-white/70">
                                        {campaign.linkedDare?.moderatedAt
                                          ? `review touched ${new Date(campaign.linkedDare.moderatedAt).toLocaleString()}`
                                          : 'referee review is in flight'}
                                      </div>
                                      <div className="mt-2 text-xs text-white/60">
                                        {campaign.linkedDare?.moderatorNote || 'Review is live. The operator rail is deciding whether proof clears payout.'}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {campaign.linkedDare?.videoUrl ? (
                                        <a
                                          href={campaign.linkedDare.videoUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-300 bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-900 transition hover:bg-white"
                                        >
                                          View Proof
                                        </a>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/70">
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
                                        <div className="font-semibold text-white">{getLinkedCreatorHandle(campaign)}</div>
                                        <div className="rounded-full border border-emerald-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-100">
                                          {campaign.linkedDare?.status === 'PENDING_PAYOUT' ? 'payment pending' : 'evidence approved'}
                                        </div>
                                      </div>
                                      <div className="mt-1 text-sm text-white/70">
                                        {campaign.linkedDare?.verifiedAt
                                          ? `verified ${new Date(campaign.linkedDare.verifiedAt).toLocaleString()}`
                                          : 'proof cleared and settlement is underway'}
                                      </div>
                                      <div className="mt-2 text-xs text-white/60">
                                        {campaign.venue
                                          ? 'Place activity is separate from evidence approval and payment.'
                                          : 'Approval and payment have separate requirements. Check the linked brief for its current record.'}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {campaign.linkedDare?.videoUrl ? (
                                        <a
                                          href={campaign.linkedDare.videoUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-300 bg-white/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-900 transition hover:bg-white"
                                        >
                                          Watch Proof
                                        </a>
                                      ) : null}
                                      {campaign.venue?.slug ? (
                                        <Link
                                          href={`/venues/${encodeURIComponent(campaign.venue.slug)}`}
                                          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85 transition hover:border-white/20 hover:bg-white/80"
                                        >
                                          Open Venue
                                        </Link>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/70">
                                No approved result is recorded yet.
                              </div>
                            )
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    </details>
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </>
  );
}
