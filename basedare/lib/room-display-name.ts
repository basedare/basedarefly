import { createHash } from 'node:crypto';

export function roomDisplayName(wallet: string, tag?: string | null) {
  if (tag?.trim() && !/^0x[\da-f]/i.test(tag.trim())) return `@${tag.trim().replace(/^@+/, '')}`;
  return `Explorer ${createHash('sha256').update(wallet.toLowerCase()).digest('hex').slice(0, 6).toUpperCase()}`;
}
