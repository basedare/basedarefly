import 'server-only';

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  createPublicClient,
  hashMessage,
  http,
  isAddress,
  recoverMessageAddress,
  type Address,
  type Hex,
} from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { authOptions } from '@/lib/auth-options';
import {
  buildWalletActionMessage,
  buildWalletSessionMessage,
  isWalletActionFresh,
  isWalletSessionFresh,
} from '@/lib/wallet-action-auth';

const IS_MAINNET = process.env.NEXT_PUBLIC_NETWORK === 'mainnet';
const activeChain = IS_MAINNET ? base : baseSepolia;
const rpcUrl = IS_MAINNET ? 'https://mainnet.base.org' : 'https://sepolia.base.org';

const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(rpcUrl),
});

const ERC1271_ABI = [
  {
    type: 'function',
    name: 'isValidSignature',
    stateMutability: 'view',
    inputs: [
      { name: 'hash', type: 'bytes32' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [{ name: 'magicValue', type: 'bytes4' }],
  },
] as const;

const ERC1271_MAGIC_VALUE = '0x1626ba7e';

type WalletSession = {
  token?: string | null;
  walletAddress?: string | null;
  user?: {
    walletAddress?: string | null;
  } | null;
};

function normalizeWallet(value: string | null | undefined): string | null {
  if (!value || !isAddress(value)) return null;
  return value.toLowerCase();
}

async function getVerifiedSessionWallet(request: NextRequest): Promise<string | null> {
  const session = (await getServerSession(authOptions)) as WalletSession | null;
  if (!session) return null;

  const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (session.token && (!bearerToken || bearerToken !== session.token)) {
    return null;
  }

  return normalizeWallet(session.walletAddress ?? session.user?.walletAddress ?? null);
}

async function getVerifiedWalletSignature({
  request,
  walletAddress,
  action,
  resource,
}: {
  request: NextRequest;
  walletAddress: string;
  action: string;
  resource: string;
}): Promise<string | null> {
  const walletHeader = normalizeWallet(request.headers.get('x-basedare-wallet')?.trim());
  const signature = request.headers.get('x-basedare-wallet-signature')?.trim() ?? null;
  const issuedAt = request.headers.get('x-basedare-wallet-issued-at')?.trim() ?? null;

  if (!walletHeader || walletHeader !== walletAddress || !signature || !issuedAt) {
    return null;
  }

  if (!isWalletActionFresh(issuedAt)) {
    return null;
  }

  try {
    const message = buildWalletActionMessage({
      walletAddress,
      action,
      resource,
      issuedAt,
    });
    const messageHash = hashMessage(message);
    const address = walletAddress as Address;

    const bytecode = await publicClient.getBytecode({ address });
    if (bytecode && bytecode !== '0x') {
      const result = await publicClient.readContract({
        address,
        abi: ERC1271_ABI,
        functionName: 'isValidSignature',
        args: [messageHash, signature as Hex],
      });

      return result === ERC1271_MAGIC_VALUE ? walletAddress : null;
    }

    const recovered = await recoverMessageAddress({
      message,
      signature: signature as Hex,
    });

    return recovered.toLowerCase() === walletAddress ? walletAddress : null;
  } catch {
    return null;
  }
}

async function getVerifiedWalletSessionSignature({
  request,
  walletAddress,
}: {
  request: NextRequest;
  walletAddress: string;
}): Promise<string | null> {
  const walletHeader = normalizeWallet(request.headers.get('x-basedare-wallet')?.trim());
  const signature = request.headers.get('x-basedare-wallet-session-signature')?.trim() ?? null;
  const issuedAt = request.headers.get('x-basedare-wallet-session-issued-at')?.trim() ?? null;

  if (!walletHeader || walletHeader !== walletAddress || !signature || !issuedAt) {
    return null;
  }

  if (!isWalletSessionFresh(issuedAt)) {
    return null;
  }

  try {
    const message = buildWalletSessionMessage({
      walletAddress,
      issuedAt,
    });
    const messageHash = hashMessage(message);
    const address = walletAddress as Address;

    const bytecode = await publicClient.getBytecode({ address });
    if (bytecode && bytecode !== '0x') {
      const result = await publicClient.readContract({
        address,
        abi: ERC1271_ABI,
        functionName: 'isValidSignature',
        args: [messageHash, signature as Hex],
      });

      return result === ERC1271_MAGIC_VALUE ? walletAddress : null;
    }

    const recovered = await recoverMessageAddress({
      message,
      signature: signature as Hex,
    });

    return recovered.toLowerCase() === walletAddress ? walletAddress : null;
  } catch {
    return null;
  }
}

export async function getAuthorizedWalletForRequest(
  request: NextRequest,
  {
    walletAddress,
    action,
    resource,
  }: {
    walletAddress: string | null | undefined;
    action: string;
    resource: string;
  }
): Promise<string | null> {
  const normalizedWallet = normalizeWallet(walletAddress ?? null);
  if (!normalizedWallet) return null;

  const sessionWallet = await getVerifiedSessionWallet(request);
  if (sessionWallet === normalizedWallet) {
    return normalizedWallet;
  }

  const walletSession = await getVerifiedWalletSessionSignature({
    request,
    walletAddress: normalizedWallet,
  });

  if (walletSession === normalizedWallet) {
    return normalizedWallet;
  }

  return getVerifiedWalletSignature({
    request,
    walletAddress: normalizedWallet,
    action,
    resource,
  });
}
