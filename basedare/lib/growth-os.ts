import 'server-only';

import { buildDailyCommandLoopReport } from '@/lib/daily-command-loop';
import { buildFounderScoreboardReport } from '@/lib/founder-scoreboard';
import { buildGrowthOsReport } from '@/lib/growth-os-policy';
import type { GrowthOperatingInputs, GrowthOsReport } from '@/lib/growth-os-types';
import { prisma } from '@/lib/prisma';

const PERIOD_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_SPRINT_STATUSES = ['DRAFT', 'FUNDED', 'ROUTING', 'COLLECTING', 'REVIEW'];

export async function buildGrowthOsAdminReport(): Promise<GrowthOsReport> {
  const now = new Date();
  const periodStart = new Date(now.getTime() - PERIOD_DAYS * DAY_MS);

  const [
    founder,
    daily,
    activeSprint,
    completedSprintAwaitingDecision,
    fundedSprints,
    completedSprints,
    buyerRepeatRequests,
    verifiedStationArrivals,
    fieldStationCount,
  ] = await Promise.all([
    buildFounderScoreboardReport({ periodDays: PERIOD_DAYS, ledgerLimit: 12 }),
    buildDailyCommandLoopReport(),
    prisma.verifiedFieldSprint.findFirst({
      where: { status: { in: ACTIVE_SPRINT_STATUSES } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        receiptCode: true,
        status: true,
        buyerName: true,
        buyerOrganization: true,
        buyerQuestion: true,
        _count: { select: { missions: true } },
      },
    }),
    prisma.verifiedFieldSprint.findFirst({
      where: {
        status: 'COMPLETE',
        completedAt: { not: null },
        buyerDecisions: { none: {} },
      },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        receiptCode: true,
        buyerName: true,
        buyerOrganization: true,
      },
    }),
    prisma.verifiedFieldSprint.count({ where: { fundedAt: { gte: periodStart } } }),
    prisma.verifiedFieldSprint.count({ where: { status: 'COMPLETE', completedAt: { gte: periodStart } } }),
    prisma.verifiedFieldSprintBuyerDecision.count({
      where: { decision: 'REPEAT', createdAt: { gte: periodStart } },
    }),
    prisma.attributionEvent.count({
      where: { eventType: 'STATION_VERIFIED_ARRIVAL', occurredAt: { gte: periodStart } },
    }),
    prisma.creatorAttributionLink.count({ where: { active: true, stationCode: { not: null } } }),
  ]);

  const topDailyCommand = daily.commandStack[0] ?? null;
  const inputs: GrowthOperatingInputs = {
    fundedSprints,
    completedSprints,
    buyerRepeatRequests,
    settledDares: founder.growth.settledDares,
    approvedPlaceRecords: founder.place.approvedPlaceTags,
    verifiedStationArrivals,
    confirmedCheckIns: founder.place.checkIns,
    reviewQueue: founder.trust.reviewQueue,
    payoutBacklog: founder.trust.payoutBacklog,
    activeVenueLeads: daily.sourceSignals.activeVenueLeads,
    overdueVenueLeads: daily.sourceSignals.overdueVenueLeads,
    activeActivationIntakes: daily.sourceSignals.activeActivationIntakes,
    overdueActivationIntakes: daily.sourceSignals.overdueActivationIntakes,
    activeCreators: founder.growth.activeCreators,
    fieldStationCount,
    activeSprint: activeSprint
      ? {
          id: activeSprint.id,
          receiptCode: activeSprint.receiptCode,
          buyerLabel: activeSprint.buyerOrganization || activeSprint.buyerName,
          question: activeSprint.buyerQuestion,
          status: activeSprint.status,
          missionCount: activeSprint._count.missions,
        }
      : null,
    completedSprintAwaitingDecision: completedSprintAwaitingDecision
      ? {
          id: completedSprintAwaitingDecision.id,
          receiptCode: completedSprintAwaitingDecision.receiptCode,
          buyerLabel:
            completedSprintAwaitingDecision.buyerOrganization || completedSprintAwaitingDecision.buyerName,
        }
      : null,
    dailyCommand: topDailyCommand
      ? {
          title: topDailyCommand.title,
          why: topDailyCommand.why,
          nextAction: topDailyCommand.nextAction,
          href: topDailyCommand.href,
          evidence: topDailyCommand.evidence,
        }
      : null,
  };

  return buildGrowthOsReport(
    inputs,
    {
      label: `Rolling ${PERIOD_DAYS}-day season`,
      start: periodStart.toISOString(),
      end: now.toISOString(),
    },
    now.toISOString()
  );
}
