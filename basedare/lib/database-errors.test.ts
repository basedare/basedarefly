import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDatabaseSchemaError } from './database-errors';

test('missing Prisma columns/tables and raw SQL schema failures are classified', () => {
  for (const error of [{ code: 'P2021' }, { code: 'P2022' }, { code: 'P2010', meta: { code: '42703' } }, { code: 'P2010', meta: { code: '42P01' } }]) {
    assert.equal(isDatabaseSchemaError(error), true);
  }
});
test('chain, connection and unrelated query failures are not called schema errors', () => {
  for (const error of [null, 'missing column', new Error('execution reverted'), { code: 'P1001' }, { code: 'P2002' }, { code: 'P2010', meta: { code: '23505' } }]) {
    assert.equal(isDatabaseSchemaError(error), false);
  }
});
