import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';

import { Prisma } from '@prisma/client';
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
};

const RLS_TABLES = rlsTables;

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
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
    const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
    const schema = await fs.readFile(schemaPath, 'utf8');
    const modelNames = Array.from(schema.matchAll(/^model\s+(\w+)\s+\{/gm))
      .map((match) => match[1])
      .filter(Boolean);
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

async function checkRuntimeQueues(checks: ProductionSafetyCheck[]) {
  try {
    const [pendingPayouts, stuckFunding, pendingReview, expiredClaims] = await Promise.all([
      prisma.dare.count({ where: { status: 'PENDING_PAYOUT' } }),
      prisma.dare.count({
        where: {
          status: 'FUNDING',
          createdAt: { lt: new Date(Date.now() - 15 * 60 * 1000) },
        },
      }),
      prisma.dare.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.dare.count({
        where: {
          status: 'PENDING',
          claimDeadline: { lt: new Date() },
          claimedBy: { not: null },
        },
      }),
    ]);

    checks.push({
      id: 'runtime.money-queues',
      label: 'Money queue pressure',
      severity: pendingPayouts > 0 || expiredClaims > 0 || stuckFunding > 0 ? 'warn' : 'pass',
      detail: `${pendingPayouts} payout queued, ${expiredClaims} expired claimed dares, ${stuckFunding} stuck funding dares, ${pendingReview} proofs under review.`,
      nextAction:
        pendingPayouts > 0 || expiredClaims > 0 || stuckFunding > 0
          ? 'Open admin ops, run authenticated cron checks, and confirm referee wallet health.'
          : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown queue error';
    checks.push({
      id: 'runtime.money-queues',
      label: 'Money queue pressure',
      severity: 'warn',
      detail: `Could not read runtime queues: ${message}`,
      nextAction: 'Confirm Prisma can query production before calling the app launch-safe.',
    });
  }
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

  await Promise.all([
    checkRlsCoverage(checks),
    checkRls(checks),
    checkCronSchedules(checks),
    checkRuntimeQueues(checks),
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
  };
}
