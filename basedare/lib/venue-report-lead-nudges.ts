import 'server-only';

import { getAppSettings } from '@/lib/app-settings';
import { createWalletNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';
import { trackServerEvent } from '@/lib/server-analytics';
import { alertVenueLeadActivationDigest, alertVenueLeadFollowUpQueue } from '@/lib/telegram';

const VENUE_LEAD_ALERT_COOLDOWN_MS = 3 * 60 * 60 * 1000;
const VENUE_LEAD_DIGEST_LOOKBACK_HOURS = 24;
const VENUE_LEAD_DIGEST_LOOKBACK_MS = VENUE_LEAD_DIGEST_LOOKBACK_HOURS * 60 * 60 * 1000;

function scoreLead(input: {
  audience: string;
  intent: string | null;
  ownerWallet: string | null;
  nextActionAt: Date | null;
  contactedAt: Date;
}) {
  let score = 0;
  const reasons: string[] = [];

  if (!input.ownerWallet) {
    score += 35;
    reasons.push('unowned');
  }

  if (input.nextActionAt && input.nextActionAt.getTime() < Date.now()) {
    score += 30;
    reasons.push('overdue');
  }

  if (input.audience === 'sponsor') {
    score += 16;
    reasons.push('sponsor');
  }

  if (input.intent === 'repeat') {
    score += 18;
    reasons.push('repeat');
  } else if (input.intent === 'activation') {
    score += 12;
    reasons.push('activation');
  }

  const ageHours = Math.max(0, Math.round((Date.now() - input.contactedAt.getTime()) / (1000 * 60 * 60)));
  if (ageHours >= 72) {
    score += 14;
    reasons.push('stale');
  } else if (ageHours >= 24) {
    score += 8;
    reasons.push('aging');
  }

  return { score, reasons, ageHours };
}

async function notifyAssignedLeadOwners(
  leads: Array<{
    audience: string;
    intent: string | null;
    ownerWallet: string | null;
    venue: {
      name: string;
    };
    priority: {
      score: number;
      reasons: string[];
    };
  }>
) {
  const grouped = leads.reduce((map, lead) => {
    if (!lead.ownerWallet) return map;
    const key = lead.ownerWallet.toLowerCase();
    const current = map.get(key) ?? [];
    current.push(lead);
    map.set(key, current);
    return map;
  }, new Map<string, typeof leads>());

  await Promise.allSettled(
    Array.from(grouped.entries()).map(async ([ownerWallet, ownerLeads]) => {
      const ranked = [...ownerLeads].sort((a, b) => b.priority.score - a.priority.score);
      const topLead = ranked[0];
      const count = ranked.length;
      const intentLabel = topLead.intent ? `${topLead.intent} ` : '';
      const reasonLabel = topLead.priority.reasons.slice(0, 2).join(', ') || 'overdue';

      await createWalletNotification({
        wallet: ownerWallet,
        type: 'VENUE_LEAD_OVERDUE',
        title: count > 1 ? `${count} venue leads need you` : 'A venue lead needs you',
        message:
          count > 1
            ? `${count} assigned venue leads are overdue. Top priority: ${topLead.venue.name} (${topLead.audience} ${intentLabel}lead, ${reasonLabel}).`
            : `${topLead.venue.name} needs follow-up now (${topLead.audience} ${intentLabel}lead, ${reasonLabel}).`,
        link: '/admin',
        pushTopic: 'venues',
      });
    })
  );
}

async function maybeSendVenueLeadActivationDigest(input: {
  urgentLeads: Array<{
    audience: string;
    intent: string | null;
    ownerWallet: string | null;
    contactedAt: Date;
    email: string;
    followUpStatus: string;
    venue: {
      name: string;
      slug: string;
    };
    priority: {
      score: number;
      reasons: string[];
    };
  }>;
  unownedCount: number;
  assignedOverdueCount: number;
}) {
  const since = new Date(Date.now() - VENUE_LEAD_DIGEST_LOOKBACK_MS);
  const [recentLeads, recentEvents] = await Promise.all([
    prisma.venueReportLead.findMany({
      where: {
        contactedAt: { gte: since },
        OR: [
          { audience: 'sponsor' },
          { intent: 'activation' },
          { intent: 'repeat' },
        ],
      },
      orderBy: { contactedAt: 'desc' },
      take: 12,
      select: {
        email: true,
        audience: true,
        intent: true,
        ownerWallet: true,
        followUpStatus: true,
        contactedAt: true,
        venue: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    }),
    prisma.venueReportEvent.findMany({
      where: {
        createdAt: { gte: since },
        eventType: {
          in: ['EMAIL_BRIEF', 'CLAIM_STARTED', 'ACTIVATION_LAUNCHED', 'REPEAT_LAUNCHED'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 16,
      select: {
        eventType: true,
        audience: true,
        channel: true,
        createdAt: true,
        venue: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    }),
  ]);

  if (!recentLeads.length && !recentEvents.length && !input.urgentLeads.length) {
    return { sent: false, reason: 'NO_ACTIVITY' as const };
  }

  const digestLeadKeys = new Set<string>();
  const topLeads = [...input.urgentLeads, ...recentLeads.map((lead) => ({
    ...lead,
    priority: {
      score: 0,
      reasons: [] as string[],
    },
  }))]
    .filter((lead) => {
      const key = `${lead.venue.slug}:${lead.email}`;
      if (digestLeadKeys.has(key)) return false;
      digestLeadKeys.add(key);
      return true;
    })
    .sort((a, b) => b.priority.score - a.priority.score || b.contactedAt.getTime() - a.contactedAt.getTime())
    .slice(0, 8);

  const sent = await alertVenueLeadActivationDigest({
    lookbackHours: VENUE_LEAD_DIGEST_LOOKBACK_HOURS,
    urgentCount: input.urgentLeads.length,
    unownedCount: input.unownedCount,
    assignedOverdueCount: input.assignedOverdueCount,
    recentLeadCount: recentLeads.length,
    recentConversionCount: recentEvents.length,
    topLeads: topLeads.map((lead) => ({
      venueName: lead.venue.name,
      venueSlug: lead.venue.slug,
      email: lead.email,
      audience: lead.audience,
      intent: lead.intent,
      followUpStatus: lead.followUpStatus,
      ownerWallet: lead.ownerWallet,
      contactedAt: lead.contactedAt,
      reasons: lead.priority.reasons,
    })),
    recentEvents: recentEvents.map((event) => ({
      venueName: event.venue.name,
      venueSlug: event.venue.slug,
      eventType: event.eventType,
      audience: event.audience,
      channel: event.channel,
      createdAt: event.createdAt,
    })),
  });

  return { sent, reason: sent ? 'SENT' as const : 'SEND_FAILED' as const };
}

export async function checkAndSendVenueLeadFollowUpAlert() {
  const settings = await getAppSettings();

  const candidates = await prisma.venueReportLead.findMany({
    where: {
      followUpStatus: {
        in: ['NEW', 'FOLLOWING_UP', 'WAITING'],
      },
      AND: [
        {
          OR: [
            { ownerWallet: null },
            { nextActionAt: { lt: new Date() } },
          ],
        },
        {
          OR: [
            { audience: 'sponsor' },
            { intent: 'activation' },
            { intent: 'repeat' },
          ],
        },
      ],
    },
    orderBy: { contactedAt: 'desc' },
    take: 30,
    select: {
      id: true,
      audience: true,
      intent: true,
      ownerWallet: true,
      nextActionAt: true,
      contactedAt: true,
      email: true,
      followUpStatus: true,
      venue: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });

  const urgentLeads = candidates
    .map((lead) => ({
      ...lead,
      priority: scoreLead({
        audience: lead.audience,
        intent: lead.intent,
        ownerWallet: lead.ownerWallet,
        nextActionAt: lead.nextActionAt,
        contactedAt: lead.contactedAt,
      }),
    }))
    .filter((lead) => lead.priority.score >= 50)
    .sort((a, b) => b.priority.score - a.priority.score);

  const unownedUrgentLeads = urgentLeads.filter((lead) => !lead.ownerWallet);
  const assignedOverdueLeads = urgentLeads.filter(
    (lead) => Boolean(lead.ownerWallet) && lead.nextActionAt && lead.nextActionAt.getTime() < Date.now()
  );
  const ownerBuckets = Array.from(
    assignedOverdueLeads.reduce((map, lead) => {
      const key = lead.ownerWallet as string;
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .map(([ownerWallet, count]) => ({ ownerWallet, count }))
    .sort((a, b) => b.count - a.count);

  if (urgentLeads.length < settings.venueLeadAlertThreshold) {
    const digest = await maybeSendVenueLeadActivationDigest({
      urgentLeads,
      unownedCount: unownedUrgentLeads.length,
      assignedOverdueCount: assignedOverdueLeads.length,
    });

    return {
      alerted: false,
      digestSent: digest.sent,
      digestReason: digest.reason,
      urgentCount: urgentLeads.length,
      unownedCount: unownedUrgentLeads.length,
      assignedOverdueCount: assignedOverdueLeads.length,
      threshold: settings.venueLeadAlertThreshold,
      reason: 'BELOW_THRESHOLD' as const,
    };
  }

  const now = new Date();
  const lastAlert = settings.lastVenueLeadAlertSent;
  if (lastAlert && now.getTime() - lastAlert.getTime() < VENUE_LEAD_ALERT_COOLDOWN_MS) {
    const digest = await maybeSendVenueLeadActivationDigest({
      urgentLeads,
      unownedCount: unownedUrgentLeads.length,
      assignedOverdueCount: assignedOverdueLeads.length,
    });

    return {
      alerted: false,
      digestSent: digest.sent,
      digestReason: digest.reason,
      urgentCount: urgentLeads.length,
      unownedCount: unownedUrgentLeads.length,
      assignedOverdueCount: assignedOverdueLeads.length,
      threshold: settings.venueLeadAlertThreshold,
      reason: 'COOLDOWN' as const,
    };
  }

  const sent = await alertVenueLeadFollowUpQueue({
    urgentCount: urgentLeads.length,
    unownedCount: unownedUrgentLeads.length,
    assignedOverdueCount: assignedOverdueLeads.length,
    threshold: settings.venueLeadAlertThreshold,
    ownerBuckets,
    leads: urgentLeads.map((lead) => ({
      venueName: lead.venue.name,
      email: lead.email,
      audience: lead.audience,
      intent: lead.intent,
      ownerWallet: lead.ownerWallet,
      reasons: lead.priority.reasons,
    })),
  });

  if (!sent) {
    return {
      alerted: false,
      urgentCount: urgentLeads.length,
      unownedCount: unownedUrgentLeads.length,
      assignedOverdueCount: assignedOverdueLeads.length,
      threshold: settings.venueLeadAlertThreshold,
      reason: 'SEND_FAILED' as const,
    };
  }

  await notifyAssignedLeadOwners(assignedOverdueLeads);

  await prisma.appSettings.update({
    where: { id: settings.id },
    data: { lastVenueLeadAlertSent: now },
  });

  trackServerEvent('venue_lead_follow_up_alert_sent', {
    urgentCount: urgentLeads.length,
    threshold: settings.venueLeadAlertThreshold,
    source: 'venue_report_lead_cron',
  });

  return {
    alerted: true,
    digestSent: false,
    digestReason: 'URGENT_ALERT_SENT' as const,
    urgentCount: urgentLeads.length,
    unownedCount: unownedUrgentLeads.length,
    assignedOverdueCount: assignedOverdueLeads.length,
    threshold: settings.venueLeadAlertThreshold,
    reason: 'ALERT_SENT' as const,
  };
}
