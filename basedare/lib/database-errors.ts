/** Prisma missing-table/column failures are schema incidents, not chain failures. */
export function isDatabaseSchemaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, meta } = error as { code?: unknown; meta?: { code?: unknown } };
  return code === 'P2021' || code === 'P2022'
    || (code === 'P2010' && (meta?.code === '42703' || meta?.code === '42P01'));
}
