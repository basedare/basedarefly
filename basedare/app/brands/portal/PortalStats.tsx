import { buyerWorkspaceMetrics } from '@/lib/buyer-workspace-presentation';
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

export default function PortalStats({ campaigns }: PortalStatsProps) {
  const metrics = buyerWorkspaceMetrics(campaigns);
  if (!metrics.total) return null;
  return <section aria-label="Workspace overview" className="mb-6">
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {[
        ['Work items', metrics.total], ['Evidence in review', metrics.inReview],
        ['Payments recorded', metrics.payments], ['Funding recorded', `${metrics.funding.toLocaleString()} USDC`],
      ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-4">
        <dt className="text-sm text-white/65">{label}</dt><dd className="mt-1 text-xl font-bold text-white">{value}</dd>
      </div>)}
    </dl>
    <p className="mt-3 text-xs leading-5 text-white/55">Funding and payment totals use recorded transaction references. Planned budgets and simulated records are excluded.</p>
  </section>;
}
