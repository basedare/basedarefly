import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Read-only compatibility gate. Migrations remain an explicit operator action.
export function databaseReleaseProblems({ requiredMigrations, migrationRows, models, columns }) {
  const problems = [];
  const completed = new Set(migrationRows.filter((r) => r.finished_at && !r.rolled_back_at).map((r) => r.migration_name));
  for (const name of requiredMigrations) {
    if (!completed.has(name)) problems.push(`Unapplied migration: ${name}`);
  }
  for (const row of migrationRows) {
    if (!row.finished_at && !row.rolled_back_at) problems.push(`Unresolved migration: ${row.migration_name}`);
  }
  const actual = new Set(columns.map((c) => JSON.stringify([c.table_name, c.column_name])));
  for (const model of models) {
    for (const field of model.fields.filter((f) => f.kind !== 'object')) {
      const table = model.dbName || model.name;
      const column = field.dbName || field.name;
      if (!actual.has(JSON.stringify([table, column]))) problems.push(`Missing database field: ${table}.${column}`);
    }
  }
  return problems;
}

export async function checkDatabaseRelease() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for the database release check.');
  const { PrismaClient, Prisma } = await import('@prisma/client');
  const schema = new URL(process.env.DATABASE_URL).searchParams.get('schema') || 'public';
  const requiredMigrations = (await fs.readdir(new URL('../prisma/migrations/', import.meta.url), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const client = new PrismaClient();
  try {
    const { migrationRows, columns } = await client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '15s'");
      const migrationRows = await tx.$queryRawUnsafe('SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"');
      const columns = await tx.$queryRaw`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = ${schema}`;
      return { migrationRows, columns };
    }, { maxWait: 10000, timeout: 30000 });
    const problems = databaseReleaseProblems({ requiredMigrations, migrationRows, columns, models: Prisma.dmmf.datamodel.models });
    if (problems.length) throw new Error(problems.join('\n'));
    console.log(`Database release check passed: ${requiredMigrations.length} migrations and ${Prisma.dmmf.datamodel.models.length} models compatible.`);
  } finally {
    await client.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.includes('--build') && process.env.VERCEL_ENV !== 'production') {
    console.log('Production database gate skipped for this local/preview build. Run npm run safety:database to check an explicit target.');
  } else {
    // Bound connection failures as well as queries; never print connection strings.
    const watchdog = setTimeout(() => { console.error('BLOCKED: database release check timed out.'); process.exit(1); }, 45000);
    try {
      await checkDatabaseRelease();
    } catch (error) {
      const safeMessage = error?.constructor === Error && !/postgres(ql)?:\/\//i.test(error.message)
        ? error.message : `Database unavailable or incompatible (${error?.code || 'connection/query error'}).`;
      console.error(`BLOCKED: ${safeMessage}`);
      process.exitCode = 1;
    } finally {
      clearTimeout(watchdog);
    }
  }
}
