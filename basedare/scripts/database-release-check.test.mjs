import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { databaseReleaseProblems } from './database-release-check.mjs';

const ready = () => ({
  requiredMigrations: ['content_rights'],
  migrationRows: [{ migration_name: 'content_rights', finished_at: new Date(), rolled_back_at: null }],
  models: [{ name: 'Dare', fields: [{ name: 'contentSubmittedAt', kind: 'scalar' }, { name: 'creator', kind: 'object' }] }],
  columns: [{ table_name: 'Dare', column_name: 'contentSubmittedAt' }],
});
test('compatible database passes without requiring relation pseudo-columns', () => {
  assert.deepEqual(databaseReleaseProblems(ready()), []);
});
test('the production incident is blocked before release', () => {
  assert.deepEqual(databaseReleaseProblems({ ...ready(), migrationRows: [], columns: [] }), [
    'Unapplied migration: content_rights', 'Missing database field: Dare.contentSubmittedAt',
  ]);
});
test('migration recorded as complete does not hide physical schema drift', () => {
  assert.deepEqual(databaseReleaseProblems({ ...ready(), columns: [] }), ['Missing database field: Dare.contentSubmittedAt']);
});
test('unfinished migration blocks even if an older successful attempt exists', () => {
  const state = ready();
  state.migrationRows.push({ migration_name: 'content_rights', finished_at: null, rolled_back_at: null });
  assert.deepEqual(databaseReleaseProblems(state), ['Unresolved migration: content_rights']);
});
test('rolled back attempts are allowed when a later attempt completed', () => {
  const state = ready();
  state.migrationRows.push({ migration_name: 'content_rights', finished_at: null, rolled_back_at: new Date() });
  assert.deepEqual(databaseReleaseProblems(state), []);
});
test('mapped tables, mapped columns and enum fields use physical names', () => {
  const state = ready();
  state.models = [{ name: 'Mission', dbName: 'Dare', fields: [{ name: 'state', dbName: 'status', kind: 'enum' }] }];
  state.columns = [{ table_name: 'Dare', column_name: 'status' }];
  assert.deepEqual(databaseReleaseProblems(state), []);
});

test('production builds fail closed without a database connection setting', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./database-release-check.mjs', import.meta.url)), '--build'], {
    env: { ...process.env, VERCEL_ENV: 'production', DATABASE_URL: '' }, encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /BLOCKED: DATABASE_URL is required/);
});
test('ordinary local builds do not require production credentials', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./database-release-check.mjs', import.meta.url)), '--build'], {
    env: { ...process.env, VERCEL_ENV: '', DATABASE_URL: '' }, encoding: 'utf8',
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /skipped/);
});
