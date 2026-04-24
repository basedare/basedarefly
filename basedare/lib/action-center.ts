import 'server-only';

import { prisma } from '@/lib/prisma';
import { getDareLifecycleModel } from '@/lib/dare-lifecycle';
import { DARE_STATUS_PENDING_ACCEPTANCE } from '@/lib/dare-status';

export type ActionCenterCategory =
  | 'Needs response'
  | 'Ready for proof'
  | 'Under review'
  | 'Payout queued'
  | 'Paid'
  | 'Claim decision'
  | 'Venue lead follow-up';

export type ActionCenterRole = 'creator' | 'funder' | 'ops' | 'system';

export type ActionCenterItem = {
  id: string;
  dareId?: string | null;
  category: ActionCenterCategory;
  title: string;
  detail: string;
  cta: string;
  href: string;
  priority: number;
  role: ActionCenterRole;
  statusLabel?: string | null;
  locationLabel?: string | null;
  bounty?: number | null;
  createdAt?: string | null;
};

export type ActionCenterSummary = {
  total: number;
  counts: Record<ActionCenterCategory, number>;
};

type RelevantDare = {
  id: string;
  shortId: string | null;
  title: string;
  bounty: number;
  status: string;
  streamerHandle: string | null;
  videoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  verifiedAt: Date | null;
  moderatedAt: Date | null;
  locationLabel: string | null;
  stakerAddress: string | null;
  targetWalletAddress: string | null;
  claimedBy: string | null;
  claimedAt: Date | null;
  claimRequestWallet: string | null;
  claimRequestStatus: string | null;
  claimRequestedAt: Date | null;
};

type RelevantNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  createdAt: Date;
};

type RelevantLead = {
  id: string;
  audience: 'venue' | 'sponsor';
  intent: string | null;
  email: string;
  name: string | null;
  organization: string | null;
  ownerWallet: string | null;
  nextActionAt: Date | null;
  contactedAt: Date;
  followUpStatus: string;
  venue: {
    name: string;
    slug: string;
  };
};

function toLifecycleInput(dare: RelevantDare) {
  return {
    ...dare,
    claimRequestedAt: dare.claimRequestedAt?.toISOString() ?? null,
    claimedAt: dare.claimedAt?.toISOString() ?? null,
    createdAt: dare.createdAt.toISOString(),
    verifiedAt: dare.verifiedAt?.toISOString() ?? null,
    moderatedAt: dare.moderatedAt?.toISOString() ?? null,
  };
}

const MODERATOR_WALLETS =
  process.env.MODERATOR_WALLETS?.split(',').map((wallet) => wallet.trim().toLowerCase()) || [];

function isModeratorWallet(wallet: string | null | undefined) {
  if (!wallet) return false;
  return MODERATOR_WALLETS.includes(wallet.toLowerCase());
}

function walletsMatch(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  return left.toLowerCase() === right.toLowerCase();
}

function formatStatusTimestamp(value?: Date | string | null, fallback = 'just now') {
  if (!value) return fallback;
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getClaimLoopState(dare: RelevantDare, walletAddress?: string | null) {
  const isPendingRequester = walletsMatch(dare.claimRequestWallet, walletAddress);
  const isAssignedCreator =
    walletsMatch(dare.targetWalletAddress, walletAddress) || walletsMatch(dare.claimedBy, walletAddress);

  if (isPendingRequester && dare.claimRequestStatus === 'PENDING') {
    return {
      label: 'Claim Pending',
      detail: dare.claimRequestedAt
        ? `Requested ${formatStatusTimestamp(dare.claimRequestedAt)}. Moderator review is still in flight.`
        : 'Moderator review is still in flight.',
      cta: 'Open Brief',
      priority: 1,
    };
  }

  if (isAssignedCreator && dare.status === DARE_STATUS_PENDING_ACCEPTANCE) {
    return {
      label: 'Respond Now',
      detail:
        'You were directly dared. Accept to unlock proof submission, or decline so the funder gets a clear answer.',
      cta: 'Respond',
      priority: 0,
    };
  }

  if (isAssignedCreator && dare.status === 'PENDING') {
    if (dare.videoUrl) {
      return {
        label: 'Proof Uploaded',
        detail: dare.updatedAt
          ? `Proof attached ${formatStatusTimestamp(dare.updatedAt)}. Resume verification if it did not finish.`
          : 'Proof is already attached. Resume verification if needed.',
        cta: 'Resume proof',
        priority: 0,
      };
    }

    return {
      label: 'Ready for Proof',
      detail: dare.claimedAt
        ? `Claimed ${formatStatusTimestamp(dare.claimedAt)}. Submit proof as soon as the activation is complete.`
        : 'The creator can now complete the mission and submit proof.',
      cta: 'Submit proof',
      priority: 1,
    };
  }

  if (isAssignedCreator && dare.status === 'PENDING_REVIEW') {
    return {
      label: 'Under Review',
      detail: dare.moderatedAt
        ? `Proof is still in review since ${formatStatusTimestamp(dare.moderatedAt)}.`
        : 'Proof is still in review.',
      cta: 'Open brief',
      priority: 2,
    };
  }

  if (isAssignedCreator && dare.status === 'PENDING_PAYOUT') {
    return {
      label: 'Payout Queued',
      detail: 'Proof cleared. Settlement is retrying automatically on Base.',
      cta: 'Open brief',
      priority: 3,
    };
  }

  if (isAssignedCreator && dare.status === 'VERIFIED') {
    return {
      label: 'Paid',
      detail: dare.verifiedAt
        ? `Approved and settled ${formatStatusTimestamp(dare.verifiedAt)}.`
        : 'Approved and settled from escrow.',
      cta: 'Open brief',
      priority: 4,
    };
  }

  return {
    label: 'Open brief',
    detail: 'Open the brief to review the current state.',
    cta: 'Open brief',
    priority: 5,
  };
}

function hoursSince(value: Date) {
  return Math.max(0, Math.round((Date.now() - value.getTime()) / (1000 * 60 * 60)));
}

function buildLeadPriority(input: {
  audience: 'venue' | 'sponsor';
  intent: string | null;
  followUpStatus: string;
  ownerWallet: string | null;
  nextActionAt: Date | null;
  contactedAt: Date;
}) {
  let score = 0;
  const reasons: string[] = [];
  const staleHours = hoursSince(input.contactedAt);
  const isOverdue = Boolean(input.nextActionAt && input.nextActionAt.getTime() < Date.now());

  if (!input.ownerWallet && ['NEW', 'FOLLOWING_UP'].includes(input.followUpStatus)) {
    score += 35;
    reasons.push('unowned');
  }

  if (isOverdue) {
    score += 30;
    reasons.push('overdue');
  }

  if (input.audience === 'sponsor') {
    score += 18;
    reasons.push('sponsor');
  }

  if (input.intent === 'repeat') {
    score += 16;
    reasons.push('repeat-spend');
  } else if (input.intent === 'activation') {
    score += 12;
    reasons.push('activation');
  } else if (input.intent === 'claim') {
    score += 8;
    reasons.push('claim');
  }

  if (staleHours >= 72) {
    score += 14;
    reasons.push('stale');
  } else if (staleHours >= 24) {
    score += 8;
    reasons.push('aging');
  }

  return {
    score,
    reasons,
    isOverdue,
  };
}

export async function getActionCenter(
  walletAddress: string,
  options?: { includeModeratorOps?: boolean }
): Promise<{
  items: ActionCenterItem[];
  summary: ActionCenterSummary;
}> {
  const lowerWallet = walletAddress.toLowerCase();
  const includeModeratorOps = options?.includeModeratorOps === true && isModeratorWallet(lowerWallet);

  const [dareRows, claimNotifications, venueLeads] = await Promise.all([
    prisma.dare.findMany({
      where: {
        OR: [
          { targetWalletAddress: lowerWallet },
          { claimedBy: lowerWallet },
          { claimRequestWallet: lowerWallet },
          { stakerAddress: lowerWallet },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        shortId: true,
        title: true,
        bounty: true,
        status: true,
        streamerHandle: true,
        videoUrl: true,
        createdAt: true,
        updatedAt: true,
        verifiedAt: true,
        moderatedAt: true,
        locationLabel: true,
        stakerAddress: true,
        targetWalletAddress: true,
        claimedBy: true,
        claimedAt: true,
        claimRequestWallet: true,
        claimRequestStatus: true,
        claimRequestedAt: true,
      },
    }) as Promise<RelevantDare[]>,
    prisma.notification.findMany({
      where: {
        wallet: lowerWallet,
        isRead: false,
        type: {
          in: ['CLAIM_APPROVED', 'CLAIM_REJECTED', 'VENUE_CLAIM_APPROVED', 'VENUE_CLAIM_REJECTED'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        link: true,
        createdAt: true,
      },
    }) as Promise<RelevantNotification[]>,
    includeModeratorOps
      ? prisma.venueReportLead.findMany({
          where: {
            OR: [
              { ownerWallet: null },
              { ownerWallet: lowerWallet },
            ],
            followUpStatus: {
              in: ['NEW', 'FOLLOWING_UP', 'WAITING'],
            },
          },
          orderBy: { contactedAt: 'desc' },
          take: 12,
          select: {
            id: true,
            audience: true,
            intent: true,
            email: true,
            name: true,
            organization: true,
            ownerWallet: true,
            nextActionAt: true,
            contactedAt: true,
            followUpStatus: true,
            venue: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        })
      : Promise.resolve([] as RelevantLead[]),
  ]);

  const items: ActionCenterItem[] = [];

  const creatorClaims = dareRows
    .filter((dare) => walletsMatch(dare.targetWalletAddress, lowerWallet) || walletsMatch(dare.claimedBy, lowerWallet))
    .sort((left, right) => {
      const leftPriority = getClaimLoopState(left, lowerWallet).priority;
      const rightPriority = getClaimLoopState(right, lowerWallet).priority;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return right.createdAt.getTime() - left.createdAt.getTime();
    });

  const fundedRows = dareRows
    .filter((dare) => walletsMatch(dare.stakerAddress, lowerWallet))
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  creatorClaims.forEach((dare) => {
    const loopState = getClaimLoopState(dare, lowerWallet);
    const lifecycle = getDareLifecycleModel(toLifecycleInput(dare));
    const href = `/dare/${dare.shortId || dare.id}`;

    if (dare.status === DARE_STATUS_PENDING_ACCEPTANCE && loopState.label === 'Respond Now') {
      items.push({
        id: `creator-${dare.id}-respond`,
        dareId: dare.id,
        category: 'Needs response',
        title: dare.title,
        detail: lifecycle.nextActionCopy,
        cta: 'Respond',
        href,
        priority: 0,
        role: 'creator',
        statusLabel: lifecycle.currentStatusLabel,
        locationLabel: dare.locationLabel,
        bounty: dare.bounty,
        createdAt: dare.createdAt.toISOString(),
      });
      return;
    }

    if (dare.status === 'PENDING' && (loopState.label === 'Ready for Proof' || loopState.label === 'Proof Uploaded')) {
      items.push({
        id: `creator-${dare.id}-proof`,
        dareId: dare.id,
        category: 'Ready for proof',
        title: dare.title,
        detail: lifecycle.nextActionCopy,
        cta: loopState.label === 'Proof Uploaded' ? 'Resume proof' : 'Submit proof',
        href,
        priority: 1,
        role: 'creator',
        statusLabel: lifecycle.currentStatusLabel,
        locationLabel: dare.locationLabel,
        bounty: dare.bounty,
        createdAt: dare.createdAt.toISOString(),
      });
      return;
    }

    if (dare.status === 'PENDING_REVIEW') {
      items.push({
        id: `creator-${dare.id}-review`,
        dareId: dare.id,
        category: 'Under review',
        title: dare.title,
        detail: lifecycle.nextActionCopy,
        cta: 'Open brief',
        href,
        priority: 2,
        role: 'creator',
        statusLabel: lifecycle.currentStatusLabel,
        locationLabel: dare.locationLabel,
        bounty: dare.bounty,
        createdAt: dare.createdAt.toISOString(),
      });
      return;
    }

    if (dare.status === 'PENDING_PAYOUT') {
      items.push({
        id: `creator-${dare.id}-queued`,
        dareId: dare.id,
        category: 'Payout queued',
        title: dare.title,
        detail: lifecycle.nextActionCopy,
        cta: 'Open brief',
        href,
        priority: 3,
        role: 'creator',
        statusLabel: lifecycle.currentStatusLabel,
        locationLabel: dare.locationLabel,
        bounty: dare.bounty,
        createdAt: dare.createdAt.toISOString(),
      });
      return;
    }

    if (dare.status === 'VERIFIED') {
      items.push({
        id: `creator-${dare.id}-paid`,
        dareId: dare.id,
        category: 'Paid',
        title: dare.title,
        detail: lifecycle.nextActionCopy,
        cta: 'Open brief',
        href,
        priority: 4,
        role: 'creator',
        statusLabel: lifecycle.currentStatusLabel,
        locationLabel: dare.locationLabel,
        bounty: dare.bounty,
        createdAt: dare.createdAt.toISOString(),
      });
    }
  });

  fundedRows.forEach((dare) => {
    const lifecycle = getDareLifecycleModel(toLifecycleInput(dare));
    const href = `/dare/${dare.shortId || dare.id}`;

    if (dare.status === 'PENDING_PAYOUT') {
      items.push({
        id: `funder-${dare.id}-queued`,
        dareId: dare.id,
        category: 'Payout queued',
        title: dare.title,
        detail: lifecycle.nextActionCopy,
        cta: 'Open brief',
        href,
        priority: 3,
        role: 'funder',
        statusLabel: lifecycle.currentStatusLabel,
        locationLabel: dare.locationLabel,
        bounty: dare.bounty,
        createdAt: dare.createdAt.toISOString(),
      });
    } else if (dare.status === 'VERIFIED') {
      items.push({
        id: `funder-${dare.id}-paid`,
        dareId: dare.id,
        category: 'Paid',
        title: dare.title,
        detail: 'Completed and settled. Leave a rating while the result is still fresh.',
        cta: 'Rate creator',
        href,
        priority: 4,
        role: 'funder',
        statusLabel: lifecycle.currentStatusLabel,
        locationLabel: dare.locationLabel,
        bounty: dare.bounty,
        createdAt: dare.createdAt.toISOString(),
      });
    }
  });

  claimNotifications.forEach((notification) => {
    items.push({
      id: `notification-${notification.id}`,
      category: 'Claim decision',
      title: notification.title,
      detail: notification.message,
      cta: notification.type.includes('APPROVED') ? 'Open' : 'Review',
      href: notification.link || '/dashboard',
      priority: notification.type.includes('REJECTED') ? 1 : 2,
      role: 'system',
      statusLabel: notification.type
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase()),
      createdAt: notification.createdAt.toISOString(),
    });
  });

  venueLeads
    .map((lead) => ({
      lead,
      priority: buildLeadPriority({
        audience: lead.audience as 'venue' | 'sponsor',
        intent: lead.intent,
        followUpStatus: lead.followUpStatus,
        ownerWallet: lead.ownerWallet,
        nextActionAt: lead.nextActionAt,
        contactedAt: lead.contactedAt,
      }),
    }))
    .filter(({ priority }) => priority.score >= 28)
    .sort((left, right) => right.priority.score - left.priority.score)
    .slice(0, 6)
    .forEach(({ lead, priority }) => {
      const subject = lead.name || lead.organization || lead.email;
      const intentLabel = lead.intent ? `${lead.intent} ` : '';
      const reasons = priority.reasons.join(', ') || 'follow-up';
      items.push({
        id: `lead-${lead.id}`,
        category: 'Venue lead follow-up',
        title: `${lead.venue.name} · ${subject}`,
        detail: `${lead.audience} ${intentLabel}lead needs follow-up (${reasons}).`,
        cta: lead.ownerWallet ? 'Open ops' : 'Claim lead',
        href: '/admin',
        priority: priority.isOverdue ? 0 : 2,
        role: 'ops',
        statusLabel: priority.isOverdue ? 'Overdue' : priority.score >= 50 ? 'High signal' : 'Active',
        createdAt: lead.contactedAt.toISOString(),
      });
    });

  const deduped = items
    .sort((left, right) => {
      if (left.priority !== right.priority) return left.priority - right.priority;
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    })
    .filter((item, index, array) => array.findIndex((entry) => entry.id === item.id) === index);

  const counts: Record<ActionCenterCategory, number> = {
    'Needs response': 0,
    'Ready for proof': 0,
    'Under review': 0,
    'Payout queued': 0,
    Paid: 0,
    'Claim decision': 0,
    'Venue lead follow-up': 0,
  };

  deduped.forEach((item) => {
    counts[item.category] += 1;
  });

  return {
    items: deduped,
    summary: {
      total: deduped.length,
      counts,
    },
  };
}
