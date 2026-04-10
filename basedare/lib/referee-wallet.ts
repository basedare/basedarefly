import { privateKeyToAccount } from 'viem/accounts';

let warnedLegacyRefereeKey = false;

function normalizePrivateKey(value: string) {
  let normalized = value.replace(/[\s\u200B-\u200D\uFEFF]+/g, '').trim();

  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'")) ||
    (normalized.startsWith('`') && normalized.endsWith('`'))
  ) {
    normalized = normalized
      .slice(1, -1)
      .replace(/[\s\u200B-\u200D\uFEFF]+/g, '')
      .trim();
  }

  if (/^[a-fA-F0-9]{64}$/.test(normalized)) {
    normalized = `0x${normalized}`;
  }

  return normalized;
}

export function getConfiguredRefereePrivateKey(): `0x${string}` {
  const rawHotKey = process.env.REFEREE_HOT_WALLET_PRIVATE_KEY;
  const rawLegacyKey = process.env.REFEREE_PRIVATE_KEY;
  const source = rawHotKey ? 'REFEREE_HOT_WALLET_PRIVATE_KEY' : 'REFEREE_PRIVATE_KEY';
  const rawValue = rawHotKey || rawLegacyKey;

  if (!rawValue) {
    throw new Error('REFEREE_HOT_WALLET_PRIVATE_KEY not configured');
  }

  if (!rawHotKey && !warnedLegacyRefereeKey) {
    console.warn(
      '[SECURITY] REFEREE_HOT_WALLET_PRIVATE_KEY not set; falling back to REFEREE_PRIVATE_KEY. Configure a dedicated low-balance hot wallet.'
    );
    warnedLegacyRefereeKey = true;
  }

  const normalized = normalizePrivateKey(rawValue);
  if (!/^0x[a-fA-F0-9]{64}$/.test(normalized)) {
    throw new Error(
      `${source} is malformed. Expected one-line 0x-prefixed 64-byte hex private key.`
    );
  }

  return normalized as `0x${string}`;
}

export function getRefereeAccount(platformWallet?: string | null) {
  const account = privateKeyToAccount(getConfiguredRefereePrivateKey());
  if (platformWallet && account.address.toLowerCase() === platformWallet.toLowerCase()) {
    throw new Error('Referee wallet must be dedicated and different from platform wallet');
  }

  return account;
}
