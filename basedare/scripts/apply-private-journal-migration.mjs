import fs from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

// Explicit, single-migration fallback for a transaction pooler when Prisma's
// session migration connection is unavailable. Never called by install/build.
const name = '20261017100000_private_adventure_journal';
const sql = await fs.readFile(new URL('../prisma/migrations/' + name + '/migration.sql', import.meta.url), 'utf8');
const checksum = createHash('sha256').update(sql).digest('hex');
const required = (await fs.readdir(new URL('../prisma/migrations/', import.meta.url), { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
const apply = process.argv.includes('--apply');
const db = new PrismaClient({ log: [] });
try {
  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '15s'");
    // Same namespace as Prisma Migrate, but transaction-scoped for a pooler.
    const [lock] = await tx.$queryRawUnsafe('SELECT pg_try_advisory_xact_lock(72707369) AS acquired');
    if (!lock.acquired) throw Error('Another migration owns the database lock.');
    const rows = await tx.$queryRawUnsafe('SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations"');
    if (rows.some((r) => !r.finished_at && !r.rolled_back_at)) throw Error('An unresolved migration must be investigated first.');
    const completed = new Set(rows.filter((r) => r.finished_at && !r.rolled_back_at).map((r) => r.migration_name));
    const pending = required.filter((n) => !completed.has(n));
    const receipt = rows.find((row) => row.migration_name === name && row.finished_at && !row.rolled_back_at);
    if (receipt && receipt.checksum !== checksum) throw Error('The private journal receipt has a different checksum. Reconcile it before continuing.');
    if (!pending.length) { console.log('Private journal migration already applied; no changes.'); return; }
    if (pending.length !== 1 || pending[0] !== name) throw Error('Refusing to apply anything except the sole reviewed private-journal migration.');
    const [table] = await tx.$queryRawUnsafe('SELECT to_regclass(\'public."AdventureJournal"\')::text AS name');
    if (table.name) throw Error('Unexpected existing journal table. Reconcile it before continuing.');
    if (!apply) { console.log('Ready: private-journal migration is the only pending migration. Use --apply to execute intentionally.'); return; }
    for (const statement of sql.split(';').map((s) => s.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
    await tx.$executeRaw`INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count) VALUES (${randomUUID()}, ${checksum}, CURRENT_TIMESTAMP, ${name}, CURRENT_TIMESTAMP, 1)`;
    console.log('Applied the reviewed private-journal SQL and appended its exact SHA-256 migration receipt in one transaction.');
  }, { timeout: 45000, maxWait: 10000 });
} catch (error) {
  const message = error?.constructor === Error && !/postgres(ql)?:\/\//i.test(error.message) ? error.message : 'Database operation failed; no credential values logged.';
  console.error(message);
  process.exitCode = 1;
} finally { await db.$disconnect(); }
