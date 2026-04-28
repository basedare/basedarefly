export const WALLET_ACTION_AUTH_WINDOW_MS = 10 * 60 * 1000;

type WalletActionMessageParams = {
  walletAddress: string;
  action: string;
  resource: string;
  issuedAt: string;
};

type StoredWalletActionAuth = WalletActionMessageParams & {
  signature: string;
};

type WalletActionAuthHeadersParams = {
  walletAddress?: string | null;
  sessionToken?: string | null;
  sessionWallet?: string | null;
  action: string;
  resource: string;
  allowSignPrompt?: boolean;
  signMessageAsync?: (args: { message: string }) => Promise<unknown>;
};

export function buildWalletActionMessage({
  walletAddress,
  action,
  resource,
  issuedAt,
}: WalletActionMessageParams): string {
  return [
    'BaseDare Wallet Authorization',
    '',
    'Authorize this wallet-scoped action from your connected wallet.',
    '',
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Action: ${action}`,
    `Resource: ${resource}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}

export function isWalletActionFresh(issuedAt: string, now = Date.now()): boolean {
  const parsed = Date.parse(issuedAt);
  if (!Number.isFinite(parsed)) return false;

  return Math.abs(now - parsed) <= WALLET_ACTION_AUTH_WINDOW_MS;
}

function buildStorageKey(walletAddress: string, action: string, resource: string) {
  return `basedare:wallet-action:${walletAddress.toLowerCase()}:${action}:${resource}`;
}

function readStoredAuth(walletAddress: string, action: string, resource: string): StoredWalletActionAuth | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(buildStorageKey(walletAddress, action, resource));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredWalletActionAuth>;
    if (
      parsed.walletAddress?.toLowerCase() !== walletAddress.toLowerCase() ||
      parsed.action !== action ||
      parsed.resource !== resource ||
      !parsed.issuedAt ||
      !parsed.signature ||
      !isWalletActionFresh(parsed.issuedAt)
    ) {
      return null;
    }

    return parsed as StoredWalletActionAuth;
  } catch {
    return null;
  }
}

function persistStoredAuth(payload: StoredWalletActionAuth) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(
    buildStorageKey(payload.walletAddress, payload.action, payload.resource),
    JSON.stringify(payload)
  );
}

export async function buildWalletActionAuthHeaders({
  walletAddress,
  sessionToken,
  sessionWallet,
  action,
  resource,
  allowSignPrompt = true,
  signMessageAsync,
}: WalletActionAuthHeadersParams): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const normalizedWallet = walletAddress?.trim().toLowerCase() ?? null;
  const normalizedSessionWallet = sessionWallet?.trim().toLowerCase() ?? null;

  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }

  if (!normalizedWallet) return headers;

  if (sessionToken && normalizedSessionWallet === normalizedWallet) {
    return headers;
  }

  const cachedAuth = readStoredAuth(normalizedWallet, action, resource);
  if (!cachedAuth && (!allowSignPrompt || !signMessageAsync)) {
    return headers;
  }

  const issuedAt = cachedAuth?.issuedAt ?? new Date().toISOString();
  const signature =
    cachedAuth?.signature ??
    String(
      await signMessageAsync!({
        message: buildWalletActionMessage({
          walletAddress: normalizedWallet,
          action,
          resource,
          issuedAt,
        }),
      })
    );

  if (!cachedAuth) {
    persistStoredAuth({
      walletAddress: normalizedWallet,
      action,
      resource,
      issuedAt,
      signature,
    });
  }

  headers['x-basedare-wallet'] = normalizedWallet;
  headers['x-basedare-wallet-signature'] = signature;
  headers['x-basedare-wallet-issued-at'] = issuedAt;

  return headers;
}
