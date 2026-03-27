export type CampaignTruthInput = {
  id: string;
  type: string;
  status: string;
  createdAt: Date;
  fundedAt?: Date | null;
  liveAt?: Date | null;
  settledAt?: Date | null;
  updatedAt?: Date | null;
  creatorCountTarget: number;
  payoutPerCreator: number;
  budgetUsdc: number;
  venue?: {
    id: string;
    slug: string;
    name: string;
    city?: string | null;
    country?: string | null;
  } | null;
  brand?: {
    id?: string;
    name: string;
    logo?: string | null;
    walletAddress?: string;
  } | null;
  linkedDare?: {
    id: string;
    shortId?: string | null;
    status: string;
    verifiedAt?: Date | null;
    completed_at?: Date | null;
    createdAt?: Date;
    venueId?: string | null;
  } | null;
  slots?: Array<{
    status: string;
    totalPayout?: number | null;
    discoveryRake?: number | null;
    activeRake?: number | null;
    precisionBonus?: number | null;
  }>;
};

function toIso(value?: Date | null) {
  return value ? value.toISOString() : null;
}

export function buildCampaignTruth(campaign: CampaignTruthInput) {
  const linkedDare = campaign.linkedDare ?? null;
  const sourceOfTruth = campaign.type === 'PLACE' ? 'LINKED_DARE' : 'CAMPAIGN';
  const lifecycleState =
    campaign.type === 'CREATOR'
      ? 'DORMANT'
      : campaign.status === 'SETTLED'
        ? 'SETTLED'
        : campaign.status === 'CANCELLED'
          ? 'CANCELLED'
          : campaign.status === 'LIVE'
            ? 'LIVE'
            : campaign.status;

  return {
    sourceOfTruth,
    lifecycleState,
    followsLinkedDare: campaign.type === 'PLACE',
    creatorRoutingDormant: campaign.type === 'CREATOR',
    linkedDareState: linkedDare
      ? {
          id: linkedDare.id,
          shortId: linkedDare.shortId ?? null,
          status: linkedDare.status,
          verifiedAt: toIso(linkedDare.verifiedAt ?? null),
          completedAt: toIso(linkedDare.completed_at ?? null),
          createdAt: toIso(linkedDare.createdAt ?? null),
          venueId: linkedDare.venueId ?? null,
        }
      : null,
    timeline: {
      createdAt: toIso(campaign.createdAt),
      fundedAt: toIso(campaign.fundedAt ?? null),
      liveAt: toIso(campaign.liveAt ?? null),
      settledAt: toIso(campaign.settledAt ?? null),
      linkedDareVerifiedAt: toIso(linkedDare?.verifiedAt ?? null),
      linkedDareCompletedAt: toIso(linkedDare?.completed_at ?? null),
      lastOperationalAt: toIso(
        campaign.settledAt ??
          linkedDare?.verifiedAt ??
          linkedDare?.completed_at ??
          campaign.liveAt ??
          campaign.updatedAt ??
          campaign.createdAt
      ),
    },
  };
}

export function buildCampaignSlotCounts(
  slots: Array<{ status: string }>,
  creatorCountTarget: number
) {
  return {
    total: creatorCountTarget,
    open: slots.filter((s) => s.status === 'OPEN').length,
    claimed: slots.filter((s) => s.status === 'CLAIMED').length,
    vetoed: slots.filter((s) => s.status === 'VETOED').length,
    assigned: slots.filter((s) => s.status === 'ASSIGNED').length,
    submitted: slots.filter((s) => s.status === 'SUBMITTED').length,
    verified: slots.filter((s) => s.status === 'VERIFIED').length,
    paid: slots.filter((s) => s.status === 'PAID').length,
    forfeited: slots.filter((s) => s.status === 'FORFEITED').length,
    completed: slots.filter((s) => s.status === 'VERIFIED' || s.status === 'PAID').length,
  };
}

export function buildCampaignPayoutTotals(
  slots: Array<{
    status: string;
    totalPayout?: number | null;
    discoveryRake?: number | null;
    activeRake?: number | null;
    precisionBonus?: number | null;
  }>
) {
  const settledSlots = slots.filter((s) => s.status === 'VERIFIED' || s.status === 'PAID');

  return {
    totalCreatorPayout: settledSlots.reduce((sum, s) => sum + (s.totalPayout || 0), 0),
    totalDiscoveryRake: settledSlots.reduce((sum, s) => sum + (s.discoveryRake || 0), 0),
    totalActiveRake: settledSlots.reduce((sum, s) => sum + (s.activeRake || 0), 0),
    strikeBonusesPaid: settledSlots.reduce((sum, s) => sum + (s.precisionBonus || 0), 0),
  };
}
