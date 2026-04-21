import 'server-only';

import { getAppSettings } from '@/lib/app-settings';
import { prisma } from '@/lib/prisma';
import { trackServerEvent } from '@/lib/server-analytics';
import { alertVenueLeadFollowUpQueue } from '@/lib/telegram';

const VENUE_LEAD_ALERT_COOLDOWN_MS = 3 * 60 * 60 * 1000;

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
      venue: {
        select: {
          name: true,
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

  if (urgentLeads.length < settings.venueLeadAlertThreshold) {
    return {
      alerted: false,
      urgentCount: urgentLeads.length,
      threshold: settings.venueLeadAlertThreshold,
      reason: 'BELOW_THRESHOLD' as const,
    };
  }

  const now = new Date();
  const lastAlert = settings.lastVenueLeadAlertSent;
  if (lastAlert && now.getTime() - lastAlert.getTime() < VENUE_LEAD_ALERT_COOLDOWN_MS) {
    return {
      alerted: false,
      urgentCount: urgentLeads.length,
      threshold: settings.venueLeadAlertThreshold,
      reason: 'COOLDOWN' as const,
    };
  }

  const sent = await alertVenueLeadFollowUpQueue({
    urgentCount: urgentLeads.length,
    threshold: settings.venueLeadAlertThreshold,
    leads: urgentLeads.map((lead) => ({
      venueName: lead.venue.name,
      email: lead.email,
      audience: lead.audience,
      intent: lead.intent,
      reasons: lead.priority.reasons,
    })),
  });

  if (!sent) {
    return {
      alerted: false,
      urgentCount: urgentLeads.length,
      threshold: settings.venueLeadAlertThreshold,
      reason: 'SEND_FAILED' as const,
    };
  }

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
    urgentCount: urgentLeads.length,
    threshold: settings.venueLeadAlertThreshold,
    reason: 'ALERT_SENT' as const,
  };
}
