#!/usr/bin/env node

import 'dotenv/config';

import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RLS_TABLES = [
  'User',
  'Dare',
  'Referral',
  'StreamerTag',
  'Brand',
  'Campaign',
  'CampaignSlot',
  'Scout',
  'ScoutCreator',
  'LivePot',
  'PotTransaction',
  'LeaderboardEntry',
  'WeeklyRewardDistribution',
  'Venue',
  'PlaceTag',
  'VenueCheckIn',
  'VenueMemory',
  'VenueQrSession',
  'Comment',
  'Vote',
  'VoterPoints',
  'Notification',
  'CreatorReview',
  'VenueReportEvent',
  'VenueReportLead',
  'AppSettings',
  'WebPushSubscription',
  'WebPushDelivery',
];

try {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('BLOCKED: DATABASE_URL is required to verify RLS.');
    process.exit(2);
  }

  const rows = await prisma.$queryRaw`
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

  console.log(`Checked ${rows.length} public tables for row-level security.`);

  if (disabledTables.length > 0) {
    console.error(`BLOCKED: RLS disabled on ${disabledTables.length} table(s):`);
    for (const table of disabledTables) {
      console.error(`- ${table}`);
    }
    console.error('Run prisma/enable-rls.sql in Supabase SQL Editor, then rerun this check.');
    process.exit(1);
  }

  if (missingTables.length > 0) {
    console.warn(`WARN: ${missingTables.length} expected table(s) were not found:`);
    for (const table of missingTables) {
      console.warn(`- ${table}`);
    }
    console.warn('Confirm migrations are applied to the intended production database.');
  }

  console.log('PASS: RLS is enabled on all checked public tables that exist.');
} catch (error) {
  console.error('BLOCKED: RLS verification failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
} finally {
  await prisma.$disconnect();
}
