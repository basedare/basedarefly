// Extracted verbatim from page.tsx (Phase A structural split — no behavior changes).
// All state lives in the page shell; props are threaded with their original names.
import type { Brand, Campaign } from './activation-packages';

type PortalStatsProps = {
  brand: Brand | null;
  campaignSummary: Brand['campaignSummary'];
  campaigns: Campaign[];
  creatorMovementCount: number;
  inReviewCount: number;
  liveCampaignCount: number;
  paidOutCount: number;
  payoutQueuedCount: number;
  proofsSubmittedCount: number;
};

export default function PortalStats({
  brand,
  campaignSummary,
  campaigns,
  creatorMovementCount,
  inReviewCount,
  liveCampaignCount,
  paidOutCount,
  payoutQueuedCount,
  proofsSubmittedCount,
}: PortalStatsProps) {
  // Hide the whole stat grid until there is something to report. A brand with
  // A buyer with no missions should see the mission builder, not a wall of zeroes.
  const totalActivations = campaignSummary?.total ?? campaigns.length;
  const hasSignal =
    (brand?.totalSpend ?? 0) > 0 ||
    totalActivations > 0 ||
    liveCampaignCount > 0 ||
    creatorMovementCount > 0 ||
    paidOutCount > 0;

  if (!hasSignal) return null;

  return (
    <>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="rounded-2xl border border-[#f5c518]/[0.18] bg-[#f5c518]/[0.08] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_40px_rgba(0,0,0,0.26)] backdrop-blur-xl md:p-4">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-[#ffe785] md:text-sm">Spend</div>
            <div className="text-xl font-black text-white md:text-2xl">${(brand?.totalSpend ?? 0).toLocaleString()}</div>
            <div className="mt-1 text-[11px] text-zinc-400 md:text-xs">
              {campaignSummary?.total ?? campaigns.length} missions funded
            </div>
          </div>
          <div className="rounded-2xl border border-cyan-300/[0.18] bg-cyan-400/[0.08] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_40px_rgba(0,0,0,0.26)] backdrop-blur-xl md:p-4">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100 md:text-sm">Live</div>
            <div className="text-xl font-black text-white md:text-2xl">{liveCampaignCount}</div>
            <div className="mt-1 text-[11px] text-zinc-400 md:text-xs">
              {(campaignSummary?.place ?? campaigns.filter((campaign) => campaign.type === 'PLACE').length)} venue
              {' • '}
              {(campaignSummary?.creator ?? campaigns.filter((campaign) => campaign.type === 'CREATOR').length)} creator
            </div>
          </div>
          <div className="rounded-2xl border border-purple-300/20 bg-purple-500/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_40px_rgba(0,0,0,0.26)] backdrop-blur-xl md:p-4">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-purple-100 md:text-sm">Contributors</div>
            <div className="text-xl font-black text-white md:text-2xl">{creatorMovementCount}</div>
            <div className="mt-1 text-[11px] text-zinc-400 md:text-xs">
              {proofsSubmittedCount} proofs submitted
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-300/[0.18] bg-emerald-400/[0.08] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_40px_rgba(0,0,0,0.26)] backdrop-blur-xl md:p-4">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100 md:text-sm">Paid</div>
            <div className="text-xl font-black text-white md:text-2xl">{paidOutCount}</div>
            <div className="mt-1 text-[11px] text-zinc-400 md:text-xs">
              {inReviewCount} in review {' • '} {payoutQueuedCount} queued
            </div>
          </div>
        </div>
    </>
  );
}
