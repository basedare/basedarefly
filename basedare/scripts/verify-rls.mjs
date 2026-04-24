#!/usr/bin/env node

import 'dotenv/config';

import fs from 'node:fs/promises';
import path from 'node:path';

import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rlsTableConfigPath = path.join(process.cwd(), 'config/rls-tables.json');
const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');

const RLS_TABLES = JSON.parse(await fs.readFile(rlsTableConfigPath, 'utf8'));

async function verifyModelCoverage() {
  const schema = await fs.readFile(schemaPath, 'utf8');
  const modelNames = Array.from(schema.matchAll(/^model\s+(\w+)\s+\{/gm))
    .map((match) => match[1])
    .filter(Boolean);
  const missingModels = modelNames.filter((modelName) => !RLS_TABLES.includes(modelName));
  const extraTables = RLS_TABLES.filter((tableName) => !modelNames.includes(tableName));

  if (missingModels.length > 0) {
    console.error(`BLOCKED: ${missingModels.length} Prisma model(s) are missing from config/rls-tables.json:`);
    for (const modelName of missingModels) {
      console.error(`- ${modelName}`);
    }
    console.error('Add the missing models and create/apply an RLS migration before deploying.');
    process.exit(1);
  }

  if (extraTables.length > 0) {
    console.warn(`WARN: ${extraTables.length} configured RLS table(s) are not Prisma models:`);
    for (const tableName of extraTables) {
      console.warn(`- ${tableName}`);
    }
  }

  console.log(`RLS config covers all ${modelNames.length} Prisma models.`);
}

try {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('BLOCKED: DATABASE_URL is required to verify RLS.');
    process.exit(2);
  }

  await verifyModelCoverage();

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
