export const WALLET_ACTION_AUTH_WINDOW_MS = 10 * 60 * 1000;
export const WALLET_SESSION_AUTH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type WalletActionMessageParams = {
  walletAddress: string;
  action: string;
  resource: string;
  issuedAt: string;
};

type StoredWalletActionAuth = WalletActionMessageParams & {
  signature: string;
};

type WalletSessionMessageParams = {
  walletAddress: string;
  issuedAt: string;
};

type StoredWalletSessionAuth = WalletSessionMessageParams & {
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

export function buildWalletSessionMessage({
  walletAddress,
  issuedAt,
}: WalletSessionMessageParams): string {
  return [
    'BaseDare Wallet Session',
    '',
    'Authorize wallet-scoped BaseDare actions from this browser session.',
    'This does not move funds or approve tokens.',
    '',
    `Wallet: ${walletAddress.toLowerCase()}`,
    'Scope: inbox, notifications, profile, creator, venue, proof, push, and social actions',
    `Issued At: ${issuedAt}`,
  ].join('\n');
}

export function isWalletActionFresh(issuedAt: string, now = Date.now()): boolean {
  const parsed = Date.parse(issuedAt);
  if (!Number.isFinite(parsed)) return false;

  return Math.abs(now - parsed) <= WALLET_ACTION_AUTH_WINDOW_MS;
}

export function isWalletSessionFresh(issuedAt: string, now = Date.now()): boolean {
  const parsed = Date.parse(issuedAt);
  if (!Number.isFinite(parsed)) return false;

  return Math.abs(now - parsed) <= WALLET_SESSION_AUTH_WINDOW_MS;
}

function buildStorageKey(walletAddress: string, action: string, resource: string) {
  return `basedare:wallet-action:${walletAddress.toLowerCase()}:${action}:${resource}`;
}

function buildWalletSessionStorageKey(walletAddress: string) {
  return `basedare:wallet-session:${walletAddress.toLowerCase()}`;
}

function readStoredWalletSession(walletAddress: string): StoredWalletSessionAuth | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw =
      window.localStorage.getItem(buildWalletSessionStorageKey(walletAddress)) ??
      window.sessionStorage.getItem(buildWalletSessionStorageKey(walletAddress));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredWalletSessionAuth>;
    if (
      parsed.walletAddress?.toLowerCase() !== walletAddress.toLowerCase() ||
      !parsed.issuedAt ||
      !parsed.signature ||
      !isWalletSessionFresh(parsed.issuedAt)
    ) {
      return null;
    }

    return parsed as StoredWalletSessionAuth;
  } catch {
    return null;
  }
}

function persistStoredWalletSession(payload: StoredWalletSessionAuth) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(buildWalletSessionStorageKey(payload.walletAddress), JSON.stringify(payload));
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

  const cachedWalletSession = readStoredWalletSession(normalizedWallet);
  if (cachedWalletSession) {
    headers['x-basedare-wallet'] = normalizedWallet;
    headers['x-basedare-wallet-session-signature'] = cachedWalletSession.signature;
    headers['x-basedare-wallet-session-issued-at'] = cachedWalletSession.issuedAt;
    return headers;
  }

  if (allowSignPrompt && signMessageAsync) {
    const issuedAt = new Date().toISOString();
    const signature = String(
      await signMessageAsync({
        message: buildWalletSessionMessage({
          walletAddress: normalizedWallet,
          issuedAt,
        }),
      })
    );

    persistStoredWalletSession({
      walletAddress: normalizedWallet,
      issuedAt,
      signature,
    });

    headers['x-basedare-wallet'] = normalizedWallet;
    headers['x-basedare-wallet-session-signature'] = signature;
    headers['x-basedare-wallet-session-issued-at'] = issuedAt;
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
