import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfigFromFile } from '@prisma/config';

// Exercise Prisma's actual transitive merger, not a separately installed copy.
const configRequire = createRequire(import.meta.resolve('@prisma/config'));
const { deepmerge } = await import(pathToFileURL(configRequire.resolve('deepmerge-ts')));
const left = { label: 'left' };
left.self = left;
const right = { count: 2 };
right.self = right;
const merged = deepmerge(left, right);
assert.equal(merged.self, merged, 'Recursive inputs must not exhaust the stack.');
assert.equal(merged.label, 'left');
assert.equal(merged.count, 2);
assert.deepEqual(deepmerge({ migrations: { seed: 'existing' } }, { migrations: { path: 'migrations' } }), {
  migrations: { seed: 'existing', path: 'migrations' },
});

const loaded = await loadConfigFromFile({ configRoot: process.cwd() });
assert.equal(loaded.error, undefined, 'The checked-in Prisma configuration must still load.');
assert.equal(loaded.resolvedPath, path.resolve('prisma.config.ts'));
assert.equal(loaded.config.schema, path.resolve('prisma/schema.prisma'));
assert.equal(loaded.config.migrations.seed, 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts');
console.log('PASS: Prisma uses a cycle-safe merger and preserves the checked-in schema/migration configuration. No database connection or mutation.');
