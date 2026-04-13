export function normalizeCreatorHandle(handle: string | null | undefined): string | null {
  const trimmed = handle?.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(/^@+/, '').trim().toLowerCase();
  return normalized || null;
}

export function buildCreatorHandleVariants(handle: string | null | undefined): string[] {
  const normalized = normalizeCreatorHandle(handle);
  if (!normalized) return [];

  return [`@${normalized}`, normalized];
}

export function toDisplayCreatorHandle(handle: string | null | undefined): string | null {
  const normalized = normalizeCreatorHandle(handle);
  return normalized ? `@${normalized}` : null;
}
