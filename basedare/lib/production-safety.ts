import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';

import { Prisma, type Dare } from '@prisma/client';
import { isAddress } from 'viem';

import rlsTables from '@/config/rls-tables.json';
import { isBountySimulationMode } from '@/lib/bounty-mode';
import { prisma } from '@/lib/prisma';

export type ProductionSafetySeverity = 'pass' | 'warn' | 'block';

export type ProductionSafetyCheck = {
  id: string;
  label: string;
  severity: ProductionSafetySeverity;
  detail: string;
  nextAction?: string;
};

export type SettlementQueueItem = {
  id: string;
  shortId: string | null;
  title: string;
  streamerHandle: string | null;
  status: string;
  bounty: number;
  isSimulated: boolean;
  onChainDareId: string | null;
  txHash: string | null;
  createdAt: string;
  updatedAt: string;
  claimDeadline: string | null;
  ageHours: number | null;
  dueInHours?: number | null;
  href: string | null;
  riskLabel: string;
};

export type SettlementQueueSummary = {
  count: number;
  totalBounty: number;
  oldestAgeHours: number | null;
  liveCount: number;
  simulatedCount: number;
  issueCount: number;
  issueLabel: string;
  items: SettlementQueueItem[];
};

export type MoneyRailsSettlementSnapshot = {
  generatedAt: string;
  payoutQueue: SettlementQueueSummary;
  expiredRefundQueue: SettlementQueueSummary;
  stuckFundingQueue: SettlementQueueSummary;
  pendingReviewCount: number;
  upcomingRefunds: {
    count: number;
    nextDeadline: string | null;
    items: SettlementQueueItem[];
  };
  operatorLinks: Array<{
    label: string;
    path: string;
    note: string;
  }>;
};

export type PaidActivationSmokeStep = {
  id: string;
  label: string;
  severity: ProductionSafetySeverity;
  detail: string;
  nextAction?: string;
  href?: string;
};

export type PaidActivationSmokeSnapshot = {
  generatedAt: string;
  modeLabel: string;
  severity: ProductionSafetySeverity;
  canAttemptPaidSmoke: boolean;
  summary: {
    blockers: number;
    warnings: number;
    passes: number;
    recentIntakes: number;
    qualifiedIntakes: number;
    readyToInvoiceIntakes: number;
    paymentSentIntakes: number;
    paidConfirmedIntakes: number;
    launchedIntakes: number;
    venueCampaigns: number;
    liveVenueCampaigns: number;
    linkedVenueCampaigns: number;
    liveVenueDares: number;
    staleFundingVenueDares: number;
  };
  checks: PaidActivationSmokeStep[];
  runbook: PaidActivationSmokeStep[];
  links: Array<{
    label: string;
    path: string;
    note: string;
  }>;
  latestIntake: {
    id: string;
    title: string | null;
    status: string | null;
    amount: number | null;
    actor: string | null;
    venueSlug: string | null;
    occurredAt: string;
    href: string | null;
  } | null;
  latestCampaign: {
    id: string;
    title: string;
    status: string;
    budgetUsdc: number;
    venueName: string | null;
    venueSlug: string | null;
    linkedDareShortId: string | null;
    linkedDareStatus: string | null;
    linkedDareIsSimulated: boolean | null;
    createdAt: string;
  } | null;
};

export type ProductionSafetyReport = {
  generatedAt: string;
  environment: {
    nodeEnv: string | null;
    network: string | null;
    simulationMode: boolean;
  };
  summary: {
    blockers: number;
    warnings: number;
    passes: number;
  };
  checks: ProductionSafetyCheck[];
  settlement: MoneyRailsSettlementSnapshot | null;
  activationSmoke: PaidActivationSmokeSnapshot | null;
};

const RLS_TABLES = rlsTables;
const ONE_HOUR_MS = 60 * 60 * 1000;
const STUCK_FUNDING_AFTER_MS = 15 * 60 * 1000;
const QUEUE_ITEM_LIMIT = 8;
const LIVE_VENUE_CAMPAIGN_STATUSES = ['LIVE', 'RECRUITING', 'ACTIVE'];
const LIVE_VENUE_DARE_STATUSES = ['PENDING', 'AWAITING_CLAIM', 'PENDING_REVIEW', 'VERIFIED', 'PENDING_PAYOUT'];

const MONEY_QUEUE_SELECT = {
  id: true,
  shortId: true,
  title: true,
  streamerHandle: true,
  status: true,
  bounty: true,
  isSimulated: true,
  onChainDareId: true,
  txHash: true,
  createdAt: true,
  updatedAt: true,
  claimDeadline: true,
} satisfies Prisma.DareSelect;

type SettlementDareRow = Pick<
  Dare,
  | 'id'
  | 'shortId'
  | 'title'
  | 'streamerHandle'
  | 'status'
  | 'bounty'
  | 'isSimulated'
  | 'onChainDareId'
  | 'txHash'
  | 'createdAt'
  | 'updatedAt'
  | 'claimDeadline'
>;

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

function roundCurrency(value: number | null | undefined) {
  return Math.round((value ?? 0) * 100) / 100;
}

function roundHours(value: number) {
  return Math.round(value * 10) / 10;
}

function hoursSince(date: Date | null | undefined, now: Date) {
  if (!date) return null;
  return roundHours(Math.max(0, now.getTime() - date.getTime()) / ONE_HOUR_MS);
}

function hoursUntil(date: Date | null | undefined, now: Date) {
  if (!date) return null;
  return roundHours(Math.max(0, date.getTime() - now.getTime()) / ONE_HOUR_MS);
}

function isBlank(value: string | null | undefined) {
  return !value || value.trim().length === 0;
}

function dareHref(row: SettlementDareRow) {
  return row.shortId ? `/dare/${row.shortId}` : null;
}

function mapSettlementItem(
  row: SettlementDareRow,
  now: Date,
  ageDate: Date | null | undefined,
  riskLabel: string,
  dueDate?: Date | null
): SettlementQueueItem {
  return {
    id: row.id,
    shortId: row.shortId,
    title: row.title,
    streamerHandle: row.streamerHandle,
    status: row.status,
    bounty: row.bounty,
    isSimulated: row.isSimulated,
    onChainDareId: row.onChainDareId,
    txHash: row.txHash,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    claimDeadline: row.claimDeadline?.toISOString() ?? null,
    ageHours: hoursSince(ageDate, now),
    dueInHours: dueDate ? hoursUntil(dueDate, now) : undefined,
    href: dareHref(row),
    riskLabel,
  };
}

function payoutRiskLabel(row: SettlementDareRow) {
  if (!row.isSimulated && isBlank(row.onChainDareId)) return 'Missing on-chain ID';
  if (row.isSimulated) return 'Simulation cleanup';
  return 'Retry payout';
}

function refundRiskLabel(row: SettlementDareRow) {
  if (!row.isSimulated && isBlank(row.onChainDareId)) return 'Live refund missing on-chain ID';
  if (row.isSimulated) return 'Simulation refund';
  return 'Refund eligible';
}

function fundingRiskLabel(row: SettlementDareRow) {
  if (isBlank(row.txHash)) return 'Missing funding tx';
  if (!row.isSimulated && isBlank(row.onChainDareId)) return 'Registration stale';
  return 'Funding stale';
}

function addEnvCheck(
  checks: ProductionSafetyCheck[],
  input: {
    id: string;
    label: string;
    env: string;
    severityWhenMissing?: ProductionSafetySeverity;
    detailWhenPresent?: string;
    detailWhenMissing?: string;
    nextAction?: string;
  }
) {
  const present = hasEnv(input.env);
  checks.push({
    id: input.id,
    label: input.label,
    severity: present ? 'pass' : input.severityWhenMissing ?? 'block',
    detail: present
      ? input.detailWhenPresent ?? `${input.env} is configured.`
      : input.detailWhenMissing ?? `${input.env} is missing.`,
    nextAction: present ? undefined : input.nextAction,
  });
}

async function checkRls(checks: ProductionSafetyCheck[]) {
  try {
    const rows = await prisma.$queryRaw<Array<{ tablename: string; rowsecurity: boolean }>>`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (${Prisma.join(RLS_TABLES)})
      ORDER BY tablename;
    `;

    const missingTables = RLS_TABLES.filter(
      (table) => !rows.some((row) => row.tablename === table)
    );
    const disabledTables = rows
      .filter((row) => !row.rowsecurity)
      .map((row) => row.tablename);

    if (disabledTables.length > 0) {
      checks.push({
        id: 'database.rls',
        label: 'Supabase RLS',
        severity: 'block',
        detail: `${disabledTables.length} public tables do not have RLS enabled: ${disabledTables.join(', ')}.`,
        nextAction: 'Run prisma/enable-rls.sql in Supabase SQL Editor and verify all public tables show rowsecurity=true.',
      });
      return;
    }

    checks.push({
      id: 'database.rls',
      label: 'Supabase RLS',
      severity: missingTables.length > 0 ? 'warn' : 'pass',
      detail:
        missingTables.length > 0
          ? `RLS is enabled on known tables that exist, but ${missingTables.length} expected tables were not found in this database.`
          : `RLS is enabled on ${rows.length} checked public tables.`,
      nextAction:
        missingTables.length > 0
          ? 'Confirm migrations are applied to the intended production database.'
          : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    checks.push({
      id: 'database.rls',
      label: 'Supabase RLS',
      severity: 'block',
      detail: `Could not verify RLS state: ${message}`,
      nextAction: 'Confirm DATABASE_URL points at Supabase Postgres and rerun the production safety check.',
    });
  }
}

async function checkRlsCoverage(checks: ProductionSafetyCheck[]) {
  try {
    const dmmfModelNames = Prisma.dmmf?.datamodel?.models
      ?.map((model) => model.name)
      .filter(Boolean) ?? [];
    let modelNames = dmmfModelNames;

    if (modelNames.length === 0) {
      const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
      const schema = await fs.readFile(schemaPath, 'utf8');
      modelNames = Array.from(schema.matchAll(/^model\s+(\w+)\s+\{/gm))
        .map((match) => match[1])
        .filter(Boolean);
    }

    const missingModels = modelNames.filter((modelName) => !RLS_TABLES.includes(modelName));
    const extraTables = RLS_TABLES.filter((tableName) => !modelNames.includes(tableName));

    if (missingModels.length > 0) {
      checks.push({
        id: 'database.rls-coverage',
        label: 'RLS model coverage',
        severity: 'block',
        detail: `${missingModels.length} Prisma model(s) are not included in config/rls-tables.json: ${missingModels.join(', ')}.`,
        nextAction: 'Add the missing models to config/rls-tables.json and create/apply an RLS migration before deploying.',
      });
      return;
    }

    checks.push({
      id: 'database.rls-coverage',
      label: 'RLS model coverage',
      severity: extraTables.length > 0 ? 'warn' : 'pass',
      detail:
        extraTables.length > 0
          ? `Every Prisma model is covered, but ${extraTables.length} configured table(s) are no longer schema models: ${extraTables.join(', ')}.`
          : `All ${modelNames.length} Prisma models are covered by config/rls-tables.json.`,
      nextAction:
        extraTables.length > 0
          ? 'Confirm whether the extra RLS table names are legacy tables or should be removed from the safety config.'
          : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown schema read error';
    checks.push({
      id: 'database.rls-coverage',
      label: 'RLS model coverage',
      severity: 'warn',
      detail: `Could not verify Prisma model coverage: ${message}`,
      nextAction: 'Run npm run safety:rls locally before deploying database changes.',
    });
  }
}

async function checkCronSchedules(checks: ProductionSafetyCheck[]) {
  try {
    const vercelPath = path.join(process.cwd(), 'vercel.json');
    const parsed = JSON.parse(await fs.readFile(vercelPath, 'utf8')) as {
      crons?: Array<{ path?: string; schedule?: string }>;
    };
    const crons = parsed.crons ?? [];
    const schedules = new Map(crons.map((cron) => [cron.path, cron.schedule]));
    const missing = ['/api/cron/retry-payouts', '/api/cron/refund-expired', '/api/cron/venue-report-leads']
      .filter((cronPath) => !schedules.get(cronPath));

    if (missing.length > 0) {
      checks.push({
        id: 'cron.config',
        label: 'Vercel cron config',
        severity: 'block',
        detail: `Missing cron declarations: ${missing.join(', ')}.`,
        nextAction: 'Add the missing cron declarations before relying on automated settlement or lead follow-up.',
      });
      return;
    }

    checks.push({
      id: 'cron.config',
      label: 'Vercel cron config',
      severity: 'warn',
      detail: `Cron routes are declared, but Hobby-compatible schedules are daily: ${crons
        .map((cron) => `${cron.path} ${cron.schedule}`)
        .join('; ')}.`,
      nextAction: 'For faster payout/refund trust, move to Pro or external cron for sub-daily retries.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown cron config error';
    checks.push({
      id: 'cron.config',
      label: 'Vercel cron config',
      severity: 'warn',
      detail: `Could not read vercel.json: ${message}`,
      nextAction: 'Confirm cron declarations in Vercel before production settlement.',
    });
  }
}

function buildQueueSummary(input: {
  count: number;
  totalBounty: number | null | undefined;
  oldestAgeHours: number | null;
  simulatedCount: number;
  issueCount: number;
  issueLabel: string;
  items: SettlementQueueItem[];
}): SettlementQueueSummary {
  return {
    count: input.count,
    totalBounty: roundCurrency(input.totalBounty),
    oldestAgeHours: input.oldestAgeHours,
    liveCount: Math.max(0, input.count - input.simulatedCount),
    simulatedCount: input.simulatedCount,
    issueCount: input.issueCount,
    issueLabel: input.issueLabel,
    items: input.items,
  };
}

export async function buildMoneyRailsSettlementSnapshot(): Promise<MoneyRailsSettlementSnapshot> {
  const now = new Date();
  const stuckFundingCutoff = new Date(now.getTime() - STUCK_FUNDING_AFTER_MS);

  const payoutWhere = { status: 'PENDING_PAYOUT' } satisfies Prisma.DareWhereInput;
  const expiredRefundWhere = {
    status: 'AWAITING_CLAIM',
    claimDeadline: { lt: now },
  } satisfies Prisma.DareWhereInput;
  const stuckFundingWhere = {
    status: 'FUNDING',
    createdAt: { lt: stuckFundingCutoff },
  } satisfies Prisma.DareWhereInput;
  const upcomingRefundWhere = {
    status: 'AWAITING_CLAIM',
    claimDeadline: {
      gte: now,
      lt: new Date(now.getTime() + 7 * 24 * ONE_HOUR_MS),
    },
  } satisfies Prisma.DareWhereInput;

  const missingOnChainWhere = {
    isSimulated: false,
    OR: [{ onChainDareId: null }, { onChainDareId: '' }],
  } satisfies Prisma.DareWhereInput;
  const missingFundingTxWhere = {
    OR: [{ txHash: null }, { txHash: '' }],
  } satisfies Prisma.DareWhereInput;

  const [
    payoutCount,
    payoutAggregate,
    payoutSimulatedCount,
    payoutIssueCount,
    payoutRows,
    expiredRefundCount,
    expiredRefundAggregate,
    expiredRefundSimulatedCount,
    expiredRefundIssueCount,
    expiredRefundRows,
    stuckFundingCount,
    stuckFundingAggregate,
    stuckFundingSimulatedCount,
    stuckFundingIssueCount,
    stuckFundingRows,
    pendingReviewCount,
    upcomingRefundCount,
    upcomingRefundRows,
  ] = await Promise.all([
    prisma.dare.count({ where: payoutWhere }),
    prisma.dare.aggregate({
      where: payoutWhere,
      _sum: { bounty: true },
      _min: { updatedAt: true },
    }),
    prisma.dare.count({ where: { ...payoutWhere, isSimulated: true } }),
    prisma.dare.count({ where: { ...payoutWhere, ...missingOnChainWhere } }),
    prisma.dare.findMany({
      where: payoutWhere,
      select: MONEY_QUEUE_SELECT,
      orderBy: { updatedAt: 'asc' },
      take: QUEUE_ITEM_LIMIT,
    }),

    prisma.dare.count({ where: expiredRefundWhere }),
    prisma.dare.aggregate({
      where: expiredRefundWhere,
      _sum: { bounty: true },
      _min: { claimDeadline: true },
    }),
    prisma.dare.count({ where: { ...expiredRefundWhere, isSimulated: true } }),
    prisma.dare.count({ where: { ...expiredRefundWhere, ...missingOnChainWhere } }),
    prisma.dare.findMany({
      where: expiredRefundWhere,
      select: MONEY_QUEUE_SELECT,
      orderBy: { claimDeadline: 'asc' },
      take: QUEUE_ITEM_LIMIT,
    }),

    prisma.dare.count({ where: stuckFundingWhere }),
    prisma.dare.aggregate({
      where: stuckFundingWhere,
      _sum: { bounty: true },
      _min: { createdAt: true },
    }),
    prisma.dare.count({ where: { ...stuckFundingWhere, isSimulated: true } }),
    prisma.dare.count({ where: { ...stuckFundingWhere, ...missingFundingTxWhere } }),
    prisma.dare.findMany({
      where: stuckFundingWhere,
      select: MONEY_QUEUE_SELECT,
      orderBy: { createdAt: 'asc' },
      take: QUEUE_ITEM_LIMIT,
    }),

    prisma.dare.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.dare.count({ where: upcomingRefundWhere }),
    prisma.dare.findMany({
      where: upcomingRefundWhere,
      select: MONEY_QUEUE_SELECT,
      orderBy: { claimDeadline: 'asc' },
      take: QUEUE_ITEM_LIMIT,
    }),
  ]);

  return {
    generatedAt: now.toISOString(),
    payoutQueue: buildQueueSummary({
      count: payoutCount,
      totalBounty: payoutAggregate._sum.bounty,
      oldestAgeHours: hoursSince(payoutAggregate._min.updatedAt, now),
      simulatedCount: payoutSimulatedCount,
      issueCount: payoutIssueCount,
      issueLabel: 'missing on-chain ID',
      items: payoutRows.map((row) => mapSettlementItem(row, now, row.updatedAt, payoutRiskLabel(row))),
    }),
    expiredRefundQueue: buildQueueSummary({
      count: expiredRefundCount,
      totalBounty: expiredRefundAggregate._sum.bounty,
      oldestAgeHours: hoursSince(expiredRefundAggregate._min.claimDeadline, now),
      simulatedCount: expiredRefundSimulatedCount,
      issueCount: expiredRefundIssueCount,
      issueLabel: 'live entries missing on-chain ID',
      items: expiredRefundRows.map((row) => mapSettlementItem(row, now, row.claimDeadline, refundRiskLabel(row))),
    }),
    stuckFundingQueue: buildQueueSummary({
      count: stuckFundingCount,
      totalBounty: stuckFundingAggregate._sum.bounty,
      oldestAgeHours: hoursSince(stuckFundingAggregate._min.createdAt, now),
      simulatedCount: stuckFundingSimulatedCount,
      issueCount: stuckFundingIssueCount,
      issueLabel: 'missing funding tx',
      items: stuckFundingRows.map((row) => mapSettlementItem(row, now, row.createdAt, fundingRiskLabel(row))),
    }),
    pendingReviewCount,
    upcomingRefunds: {
      count: upcomingRefundCount,
      nextDeadline: upcomingRefundRows[0]?.claimDeadline?.toISOString() ?? null,
      items: upcomingRefundRows.map((row) =>
        mapSettlementItem(row, now, row.updatedAt, 'Expires soon', row.claimDeadline)
      ),
    },
    operatorLinks: [
      {
        label: 'Retry payouts cron',
        path: '/api/cron/retry-payouts',
        note: 'Run with CRON_SECRET after referee gas and contract env are confirmed.',
      },
      {
        label: 'Expired refunds cron',
        path: '/api/cron/refund-expired',
        note: 'Run with CRON_SECRET; this delegates to the protected refund processor.',
      },
      {
        label: 'Money rails runbook',
        path: 'docs/money-rails-runbook.md',
        note: 'Use before enabling or recovering live settlement jobs.',
      },
    ],
  };
}

function buildActivationCheck(input: PaidActivationSmokeStep): PaidActivationSmokeStep {
  return input;
}

function summarizeSmokeChecks(checks: PaidActivationSmokeStep[]) {
  return checks.reduce(
    (acc, check) => {
      if (check.severity === 'block') acc.blockers += 1;
      if (check.severity === 'warn') acc.warnings += 1;
      if (check.severity === 'pass') acc.passes += 1;
      return acc;
    },
    { blockers: 0, warnings: 0, passes: 0 }
  );
}

export async function buildPaidActivationSmokeSnapshot(): Promise<PaidActivationSmokeSnapshot> {
  const now = new Date();
  const recentCutoff = new Date(now.getTime() - 7 * 24 * ONE_HOUR_MS);
  const staleFundingCutoff = new Date(now.getTime() - STUCK_FUNDING_AFTER_MS);
  const simulationMode = isBountySimulationMode();
  const bountyAddress = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS;
  const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS;
  const hasCoreContracts = isAddress(bountyAddress ?? '') && isAddress(usdcAddress ?? '');
  const hasDatabase = hasEnv('DATABASE_URL');
  const hasAdminSecret = hasEnv('ADMIN_SECRET');
  const hasProofStorage = hasEnv('PINATA_JWT');
  const hasTelegram = hasEnv('TELEGRAM_BOT_TOKEN') && hasEnv('TELEGRAM_ADMIN_CHAT_ID');
  const hasWalletProject = hasEnv('NEXT_PUBLIC_CDP_PROJECT_ID');

  const [
    recentIntakes,
    qualifiedIntakes,
    readyToInvoiceIntakes,
    paymentSentIntakes,
    paidConfirmedIntakes,
    launchedIntakes,
    venueCampaigns,
    liveVenueCampaigns,
    linkedVenueCampaigns,
    liveVenueDares,
    staleFundingVenueDares,
    latestIntakeRow,
    latestCampaignRow,
  ] = await Promise.all([
    prisma.founderEvent.count({
      where: {
        eventType: 'ACTIVATION_INTAKE',
        occurredAt: { gte: recentCutoff },
      },
    }),
    prisma.founderEvent.count({
      where: {
        eventType: 'ACTIVATION_INTAKE',
        status: 'QUALIFIED',
      },
    }),
    prisma.founderEvent.count({
      where: {
        eventType: 'ACTIVATION_INTAKE',
        status: 'READY_TO_INVOICE',
      },
    }),
    prisma.founderEvent.count({
      where: {
        eventType: 'ACTIVATION_INTAKE',
        status: 'PAYMENT_SENT',
      },
    }),
    prisma.founderEvent.count({
      where: {
        eventType: 'ACTIVATION_INTAKE',
        status: 'PAID_CONFIRMED',
      },
    }),
    prisma.founderEvent.count({
      where: {
        eventType: 'ACTIVATION_INTAKE',
        status: 'LAUNCHED',
      },
    }),
    prisma.campaign.count({
      where: { type: 'PLACE' },
    }),
    prisma.campaign.count({
      where: {
        type: 'PLACE',
        status: { in: LIVE_VENUE_CAMPAIGN_STATUSES },
      },
    }),
    prisma.campaign.count({
      where: {
        type: 'PLACE',
        linkedDareId: { not: null },
      },
    }),
    prisma.dare.count({
      where: {
        missionMode: 'IRL',
        venueId: { not: null },
        status: { in: LIVE_VENUE_DARE_STATUSES },
      },
    }),
    prisma.dare.count({
      where: {
        venueId: { not: null },
        status: 'FUNDING',
        createdAt: { lt: staleFundingCutoff },
      },
    }),
    prisma.founderEvent.findFirst({
      where: { eventType: 'ACTIVATION_INTAKE' },
      orderBy: { occurredAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        amount: true,
        actor: true,
        venueSlug: true,
        occurredAt: true,
        href: true,
      },
    }),
    prisma.campaign.findFirst({
      where: { type: 'PLACE' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        budgetUsdc: true,
        createdAt: true,
        venue: {
          select: {
            name: true,
            slug: true,
          },
        },
        linkedDare: {
          select: {
            shortId: true,
            status: true,
            isSimulated: true,
          },
        },
      },
    }),
  ]);

  const activeActivationIntakes = qualifiedIntakes + readyToInvoiceIntakes + paymentSentIntakes + paidConfirmedIntakes;
  const checks = [
    buildActivationCheck({
      id: 'activation.contracts',
      label: 'Funding contracts',
      severity: hasCoreContracts ? (simulationMode ? 'warn' : 'pass') : 'block',
      detail: hasCoreContracts
        ? simulationMode
          ? 'Bounty and USDC addresses are valid, but bounty simulation is still enabled.'
          : 'Bounty and USDC addresses are valid and simulation is disabled.'
        : 'Bounty or USDC contract address is missing/invalid, so a paid venue activation cannot be funded safely.',
      nextAction: hasCoreContracts
        ? simulationMode
          ? 'Disable SIMULATE_BOUNTIES and NEXT_PUBLIC_SIMULATE_BOUNTIES before a real paid smoke.'
          : undefined
        : 'Set NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS and NEXT_PUBLIC_USDC_ADDRESS for the intended network.',
    }),
    buildActivationCheck({
      id: 'activation.database',
      label: 'Activation storage',
      severity: hasDatabase ? 'pass' : 'block',
      detail: hasDatabase
        ? `${venueCampaigns} venue campaign records exist; ${linkedVenueCampaigns} are linked to funded dares.`
        : 'DATABASE_URL is missing, so activation evidence cannot be stored or audited.',
      nextAction: hasDatabase ? undefined : 'Set DATABASE_URL to the production Supabase Postgres connection string.',
    }),
    buildActivationCheck({
      id: 'activation.funding-registration',
      label: 'Funding registration',
      severity: staleFundingVenueDares > 0 ? 'block' : 'pass',
      detail:
        staleFundingVenueDares > 0
          ? `${staleFundingVenueDares} venue-funded dare(s) are stuck in FUNDING longer than 15 minutes.`
          : 'No venue-funded dares are stuck in FUNDING past the 15 minute repair threshold.',
      nextAction:
        staleFundingVenueDares > 0
          ? 'Repair or refund stale FUNDING records before running another paid smoke.'
          : undefined,
      href: '/admin/production-safety',
    }),
    buildActivationCheck({
      id: 'activation.creator-routing',
      label: 'Creator routing evidence',
      severity: linkedVenueCampaigns > 0 ? 'pass' : 'warn',
      detail:
        linkedVenueCampaigns > 0
          ? `${linkedVenueCampaigns} venue campaign(s) are linked to live dare rails; ${liveVenueDares} venue dares are currently trackable.`
          : 'No venue campaign is linked to a funded dare yet; the first smoke must prove creator routing end-to-end.',
      nextAction:
        linkedVenueCampaigns > 0
          ? undefined
          : 'Launch one tiny controlled venue activation from Brand Portal and verify it creates both Campaign and Dare records.',
      href: '/brands/portal',
    }),
    buildActivationCheck({
      id: 'activation.intake-ops',
      label: 'Buyer intake ops',
      severity: recentIntakes > 0 || activeActivationIntakes > 0 || launchedIntakes > 0 ? 'pass' : 'warn',
      detail: `${recentIntakes} intake(s) arrived in the last 7 days; ${readyToInvoiceIntakes} ready to invoice; ${paymentSentIntakes} payment sent; ${paidConfirmedIntakes} paid confirmed; ${launchedIntakes} marked launched.`,
      nextAction:
        recentIntakes > 0 || activeActivationIntakes > 0 || launchedIntakes > 0
          ? undefined
          : 'Submit one internal test intake from Control mode so admin follow-up and Telegram are visible.',
      href: '/admin/activation-intakes',
    }),
    buildActivationCheck({
      id: 'activation.proof-receipts',
      label: 'Proof receipt media',
      severity: hasProofStorage ? 'pass' : 'block',
      detail: hasProofStorage
        ? 'PINATA_JWT is configured; proof media can be stored for the buyer receipt.'
        : 'PINATA_JWT is missing, so creator proof upload can fail after the buyer funds.',
      nextAction: hasProofStorage ? undefined : 'Set PINATA_JWT before selling a paid proof-backed activation.',
    }),
    buildActivationCheck({
      id: 'activation.ops-alerts',
      label: 'Ops alerts',
      severity: hasTelegram ? 'pass' : 'warn',
      detail: hasTelegram
        ? 'Telegram bot and admin chat are configured for activation intake and status alerts.'
        : 'Telegram activation alerts degrade to logs because bot token or admin chat is missing.',
      nextAction: hasTelegram ? undefined : 'Set TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID before relying on concierge ops.',
      href: '/admin/activation-intakes',
    }),
    buildActivationCheck({
      id: 'activation.wallet-ux',
      label: 'Wallet funding UX',
      severity: hasWalletProject ? 'pass' : 'warn',
      detail: hasWalletProject
        ? 'CDP project id is configured for the embedded wallet/get-USDC experience.'
        : 'NEXT_PUBLIC_CDP_PROJECT_ID is missing; direct wallet funding can still work, but embedded funding UX may be degraded.',
      nextAction: hasWalletProject ? undefined : 'Set NEXT_PUBLIC_CDP_PROJECT_ID before sending non-technical venues into the paid flow.',
    }),
    buildActivationCheck({
      id: 'activation.human-approval',
      label: 'Human approval gate',
      severity: hasAdminSecret ? 'pass' : 'block',
      detail: hasAdminSecret
        ? 'ADMIN_SECRET is configured, so the human review queue can be controlled.'
        : 'ADMIN_SECRET is missing, so the activation queue cannot be safely operated.',
      nextAction: hasAdminSecret ? undefined : 'Set ADMIN_SECRET before routing buyer intakes or launch handoffs.',
    }),
  ];

  const checkSummary = summarizeSmokeChecks(checks);
  const severity: ProductionSafetySeverity =
    checkSummary.blockers > 0 ? 'block' : checkSummary.warnings > 0 ? 'warn' : 'pass';
  const canAttemptPaidSmoke = checkSummary.blockers === 0 && !simulationMode;
  const modeLabel =
    checkSummary.blockers > 0
      ? 'Blocked before paid smoke'
      : simulationMode
        ? 'Simulation only'
        : linkedVenueCampaigns > 0
          ? 'Ready to repeat paid smoke'
          : 'Ready for first tiny paid smoke';

  return {
    generatedAt: now.toISOString(),
    modeLabel,
    severity,
    canAttemptPaidSmoke,
    summary: {
      ...checkSummary,
      recentIntakes,
      qualifiedIntakes,
      readyToInvoiceIntakes,
      paymentSentIntakes,
      paidConfirmedIntakes,
      launchedIntakes,
      venueCampaigns,
      liveVenueCampaigns,
      linkedVenueCampaigns,
      liveVenueDares,
      staleFundingVenueDares,
    },
    checks,
    runbook: [
      {
        id: 'smoke.1',
        label: 'Open Control Brand Portal',
        severity: 'pass',
        detail: 'Use the venue activation composer, not a public fan dare, so Campaign, Brand, Venue, and Dare records stay linked.',
        href: '/brands/portal',
      },
      {
        id: 'smoke.2',
        label: 'Pick one venue and one creator',
        severity: 'pass',
        detail: 'Use the smallest credible route: one real venue, one creator, one proof rule, one tiny payout.',
        href: '/scouts/dashboard',
      },
      {
        id: 'smoke.3',
        label: 'Fund the tiny activation',
        severity: canAttemptPaidSmoke ? 'pass' : 'warn',
        detail: 'Approve and fund the minimum useful USDC amount, then confirm the linked dare leaves FUNDING.',
        nextAction: canAttemptPaidSmoke
          ? undefined
          : 'Do not run this step until blockers are gone and simulation is off.',
        href: '/brands/portal',
      },
      {
        id: 'smoke.4',
        label: 'Verify database receipt',
        severity: 'pass',
        detail: 'Campaign should be LIVE, linkedDareId should be present, and the linked Dare should be PENDING or claimable.',
        href: '/admin/production-safety',
      },
      {
        id: 'smoke.5',
        label: 'Watch ops handoff',
        severity: hasTelegram ? 'pass' : 'warn',
        detail: 'Confirm Telegram/admin intake alerts are visible and the operator can explain what happened without inspecting code.',
        href: '/admin/activation-intakes',
      },
    ],
    links: [
      {
        label: 'Brand Portal',
        path: '/brands/portal',
        note: 'Launch the actual paid venue activation rail.',
      },
      {
        label: 'Creator Radar',
        path: '/scouts/dashboard',
        note: 'Pick the strongest creator for the first buyer route.',
      },
      {
        label: 'Activation Intakes',
        path: '/admin/activation-intakes',
        note: 'Human approval, invoice state, launch handoff, and Telegram status updates.',
      },
      {
        label: 'Settlement Cockpit',
        path: '/admin/production-safety',
        note: 'Check stuck funding, payout retries, and refund pressure after the smoke.',
      },
    ],
    latestIntake: latestIntakeRow
      ? {
          id: latestIntakeRow.id,
          title: latestIntakeRow.title,
          status: latestIntakeRow.status,
          amount: latestIntakeRow.amount,
          actor: latestIntakeRow.actor,
          venueSlug: latestIntakeRow.venueSlug,
          occurredAt: latestIntakeRow.occurredAt.toISOString(),
          href: latestIntakeRow.href,
        }
      : null,
    latestCampaign: latestCampaignRow
      ? {
          id: latestCampaignRow.id,
          title: latestCampaignRow.title,
          status: latestCampaignRow.status,
          budgetUsdc: latestCampaignRow.budgetUsdc,
          venueName: latestCampaignRow.venue?.name ?? null,
          venueSlug: latestCampaignRow.venue?.slug ?? null,
          linkedDareShortId: latestCampaignRow.linkedDare?.shortId ?? null,
          linkedDareStatus: latestCampaignRow.linkedDare?.status ?? null,
          linkedDareIsSimulated: latestCampaignRow.linkedDare?.isSimulated ?? null,
          createdAt: latestCampaignRow.createdAt.toISOString(),
        }
      : null,
  };
}

function addRuntimeQueuesCheck(
  checks: ProductionSafetyCheck[],
  settlement: MoneyRailsSettlementSnapshot | null
) {
  if (!settlement) {
    checks.push({
      id: 'runtime.money-queues',
      label: 'Money queue pressure',
      severity: 'warn',
      detail: 'Could not read runtime settlement queues.',
      nextAction: 'Confirm Prisma can query production before calling the app launch-safe.',
    });
    return;
  }

  const pendingPayouts = settlement.payoutQueue.count;
  const expiredClaims = settlement.expiredRefundQueue.count;
  const stuckFunding = settlement.stuckFundingQueue.count;
  const pendingReview = settlement.pendingReviewCount;

  checks.push({
    id: 'runtime.money-queues',
    label: 'Money queue pressure',
    severity: pendingPayouts > 0 || expiredClaims > 0 || stuckFunding > 0 ? 'warn' : 'pass',
    detail: `${pendingPayouts} payout queued, ${expiredClaims} expired refunds, ${stuckFunding} stuck funding dares, ${pendingReview} proofs under review.`,
    nextAction:
      pendingPayouts > 0 || expiredClaims > 0 || stuckFunding > 0
        ? 'Open the settlement cockpit, run authenticated cron checks, and confirm referee wallet health.'
        : undefined,
  });
}

export async function buildProductionSafetyReport(): Promise<ProductionSafetyReport> {
  const checks: ProductionSafetyCheck[] = [];
  const network = process.env.NEXT_PUBLIC_NETWORK ?? null;
  const simulationMode = isBountySimulationMode();
  const isMainnet = network === 'mainnet';

  checks.push({
    id: 'env.network',
    label: 'Network mode',
    severity: network ? 'pass' : 'block',
    detail: network ? `Running against ${network}.` : 'NEXT_PUBLIC_NETWORK is missing.',
    nextAction: network ? undefined : 'Set NEXT_PUBLIC_NETWORK to mainnet or testnet/sepolia explicitly.',
  });

  checks.push({
    id: 'env.simulation',
    label: 'Simulation mode',
    severity: isMainnet && simulationMode ? 'block' : simulationMode ? 'warn' : 'pass',
    detail: simulationMode
      ? 'Bounty simulation mode is enabled.'
      : 'Bounty simulation mode is disabled.',
    nextAction:
      isMainnet && simulationMode
        ? 'Disable SIMULATE_BOUNTIES and NEXT_PUBLIC_SIMULATE_BOUNTIES before real-money launch.'
        : simulationMode
          ? 'Make sure this is intentional for local or preview testing.'
          : undefined,
  });

  const bountyAddress = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS;
  const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS;
  checks.push({
    id: 'env.contracts',
    label: 'Contract addresses',
    severity: isAddress(bountyAddress ?? '') && isAddress(usdcAddress ?? '') ? 'pass' : 'block',
    detail: `Bounty contract ${isAddress(bountyAddress ?? '') ? 'valid' : 'missing/invalid'}; USDC ${
      isAddress(usdcAddress ?? '') ? 'valid' : 'missing/invalid'
    }.`,
    nextAction:
      isAddress(bountyAddress ?? '') && isAddress(usdcAddress ?? '')
        ? undefined
        : 'Set NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS and NEXT_PUBLIC_USDC_ADDRESS for the intended network.',
  });

  addEnvCheck(checks, {
    id: 'env.database',
    label: 'Database URL',
    env: 'DATABASE_URL',
    nextAction: 'Set DATABASE_URL to the production Supabase Postgres connection string.',
  });
  addEnvCheck(checks, {
    id: 'env.admin-secret',
    label: 'Admin secret',
    env: 'ADMIN_SECRET',
    nextAction: 'Set ADMIN_SECRET to a high-entropy value at least 32 characters long.',
  });
  addEnvCheck(checks, {
    id: 'env.cron-secret',
    label: 'Cron secret',
    env: 'CRON_SECRET',
    nextAction: 'Set CRON_SECRET so scheduled settlement routes fail closed.',
  });
  addEnvCheck(checks, {
    id: 'env.internal-secret',
    label: 'Internal API secret',
    env: 'INTERNAL_API_SECRET',
    severityWhenMissing: hasEnv('ADMIN_SECRET') ? 'warn' : 'block',
    nextAction: 'Set INTERNAL_API_SECRET separately from ADMIN_SECRET for service-to-service calls.',
  });
  addEnvCheck(checks, {
    id: 'env.pinata',
    label: 'Proof upload storage',
    env: 'PINATA_JWT',
    nextAction: 'Set PINATA_JWT so proof uploads do not fail in production.',
  });
  addEnvCheck(checks, {
    id: 'env.referee-wallet',
    label: 'Referee hot wallet',
    env: 'REFEREE_HOT_WALLET_PRIVATE_KEY',
    nextAction: 'Set the referee hot wallet private key and keep only gas-sized ETH in the wallet.',
  });
  addEnvCheck(checks, {
    id: 'env.telegram',
    label: 'Telegram alerts',
    env: 'TELEGRAM_BOT_TOKEN',
    severityWhenMissing: 'warn',
    detailWhenMissing: 'TELEGRAM_BOT_TOKEN is missing, so ops alerts degrade to logs.',
    nextAction: 'Set TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID for settlement/moderation alerts.',
  });
  addEnvCheck(checks, {
    id: 'env.telegram-chat',
    label: 'Telegram admin chat',
    env: 'TELEGRAM_ADMIN_CHAT_ID',
    severityWhenMissing: 'warn',
    detailWhenMissing: 'TELEGRAM_ADMIN_CHAT_ID is missing, so ops alerts degrade to logs.',
    nextAction: 'Set TELEGRAM_ADMIN_CHAT_ID for the admin alert channel.',
  });
  const hasSignalRoomUrl = hasEnv('NEXT_PUBLIC_TELEGRAM_SIGNAL_URL') || hasEnv('NEXT_PUBLIC_TELEGRAM_COMMUNITY_URL');
  const hasSignalRoomChat = hasEnv('TELEGRAM_SIGNAL_CHAT_ID') || hasEnv('TELEGRAM_PUBLIC_CHAT_ID');
  checks.push({
    id: 'env.telegram-signal-room',
    label: 'Telegram Signal Room',
    severity: hasSignalRoomUrl && hasSignalRoomChat ? 'pass' : 'warn',
    detail:
      hasSignalRoomUrl && hasSignalRoomChat
        ? 'Public Signal Room URL and broadcast chat are configured.'
        : `Signal URL ${hasSignalRoomUrl ? 'configured' : 'missing'}; broadcast chat ${
            hasSignalRoomChat ? 'configured' : 'missing'
          }.`,
    nextAction:
      hasSignalRoomUrl && hasSignalRoomChat
        ? undefined
        : 'Set NEXT_PUBLIC_TELEGRAM_SIGNAL_URL and TELEGRAM_SIGNAL_CHAT_ID to enable public community CTAs and safe broadcasts.',
  });

  const hasVapidPublicKey = hasEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY') || hasEnv('VAPID_PUBLIC_KEY');
  const hasVapidPrivateKey = hasEnv('VAPID_PRIVATE_KEY');
  checks.push({
    id: 'env.web-push',
    label: 'Web Push delivery keys',
    severity: hasVapidPublicKey && hasVapidPrivateKey ? 'pass' : 'warn',
    detail:
      hasVapidPublicKey && hasVapidPrivateKey
        ? 'VAPID public/private keys are configured for browser push delivery.'
        : `VAPID public key ${hasVapidPublicKey ? 'configured' : 'missing'}; private key ${
            hasVapidPrivateKey ? 'configured' : 'missing'
          }.`,
    nextAction:
      hasVapidPublicKey && hasVapidPrivateKey
        ? undefined
        : 'Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY before relying on production push delivery.',
  });

  let settlement: MoneyRailsSettlementSnapshot | null = null;
  try {
    settlement = await buildMoneyRailsSettlementSnapshot();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown queue error';
    console.error('[PRODUCTION_SAFETY] Could not build settlement snapshot:', message);
  }
  addRuntimeQueuesCheck(checks, settlement);

  let activationSmoke: PaidActivationSmokeSnapshot | null = null;
  try {
    activationSmoke = await buildPaidActivationSmokeSnapshot();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown activation smoke error';
    console.error('[PRODUCTION_SAFETY] Could not build paid activation smoke snapshot:', message);
  }
  checks.push({
    id: 'runtime.paid-activation-smoke',
    label: 'Paid activation smoke',
    severity: activationSmoke
      ? activationSmoke.severity === 'block'
        ? 'warn'
        : activationSmoke.severity
      : 'warn',
    detail: activationSmoke
      ? `${activationSmoke.modeLabel}: ${activationSmoke.summary.linkedVenueCampaigns} linked venue campaign(s), ${activationSmoke.summary.staleFundingVenueDares} stale venue funding record(s), ${activationSmoke.summary.readyToInvoiceIntakes} intake(s) ready to invoice.`
      : 'Could not read paid activation smoke state.',
    nextAction:
      activationSmoke && activationSmoke.canAttemptPaidSmoke
        ? 'Run one tiny human-approved paid venue activation, then confirm linked Campaign and Dare records.'
        : 'Open the paid activation smoke cockpit and clear blockers before selling or testing live spend.',
  });

  await Promise.all([
    checkRlsCoverage(checks),
    checkRls(checks),
    checkCronSchedules(checks),
  ]);

  const summary = checks.reduce(
    (acc, check) => {
      if (check.severity === 'block') acc.blockers += 1;
      if (check.severity === 'warn') acc.warnings += 1;
      if (check.severity === 'pass') acc.passes += 1;
      return acc;
    },
    { blockers: 0, warnings: 0, passes: 0 }
  );

  return {
    generatedAt: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV ?? null,
      network,
      simulationMode,
    },
    summary,
    checks,
    settlement,
    activationSmoke,
  };
}
