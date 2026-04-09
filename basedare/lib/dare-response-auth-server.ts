import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  Hex,
  createPublicClient,
  hashMessage,
  http,
  isAddress,
  recoverMessageAddress,
} from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { authOptions } from '@/lib/auth-options';
import {
  buildDareResponseMessage,
  isDareResponseFresh,
} from '@/lib/dare-response-auth';

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
  token?: string;
  walletAddress?: string;
  user?: {
    walletAddress?: string | null;
  } | null;
};

function normalizeAuthorizedWallets(wallets: Iterable<string | null | undefined>): string[] {
  return [
    ...new Set(
      [...wallets]
        .filter((wallet): wallet is string => typeof wallet === 'string' && isAddress(wallet))
        .map((wallet) => wallet.toLowerCase())
    ),
  ];
}

async function getVerifiedSessionWallet(request: NextRequest): Promise<string | null> {
  const session = (await getServerSession(authOptions)) as WalletSession | null;
  if (!session) return null;

  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (session.token && (!bearerToken || bearerToken !== session.token)) {
    return null;
  }

  const wallet = session.walletAddress ?? session.user?.walletAddress ?? null;
  if (!wallet || !isAddress(wallet)) return null;
  return wallet.toLowerCase();
}

async function getVerifiedWalletSignature(
  request: NextRequest,
  dareId: string,
  authorizedWallets: string[]
): Promise<string | null> {
  const walletHeader = request.headers.get('x-basedare-dare-wallet')?.trim() ?? null;
  const signature = request.headers.get('x-basedare-dare-signature')?.trim() ?? null;
  const issuedAt = request.headers.get('x-basedare-dare-issued-at')?.trim() ?? null;

  if (!walletHeader || !signature || !issuedAt || !isAddress(walletHeader)) {
    return null;
  }

  const normalizedWallet = walletHeader.toLowerCase();
  if (!authorizedWallets.includes(normalizedWallet)) {
    return null;
  }

  if (!isDareResponseFresh(issuedAt)) {
    return null;
  }

  try {
    const message = buildDareResponseMessage({
      walletAddress: normalizedWallet,
      dareId,
      issuedAt,
    });
    const messageHash = hashMessage(message);

    const bytecode = await publicClient.getBytecode({
      address: normalizedWallet as Hex,
    });

    if (bytecode && bytecode !== '0x') {
      const result = await publicClient.readContract({
        address: normalizedWallet as Hex,
        abi: ERC1271_ABI,
        functionName: 'isValidSignature',
        args: [messageHash, signature as Hex],
      });

      if (result === ERC1271_MAGIC_VALUE) {
        return normalizedWallet;
      }

      return null;
    }

    const recovered = await recoverMessageAddress({
      message,
      signature: signature as Hex,
    });

    if (recovered.toLowerCase() !== normalizedWallet) {
      return null;
    }

    return normalizedWallet;
  } catch {
    return null;
  }
}

export async function getAuthorizedDareResponseWallet(
  request: NextRequest,
  {
    dareId,
    authorizedWallets,
  }: {
    dareId: string;
    authorizedWallets: Iterable<string | null | undefined>;
  }
): Promise<string | null> {
  const normalizedAuthorizedWallets = normalizeAuthorizedWallets(authorizedWallets);
  if (normalizedAuthorizedWallets.length === 0) {
    return null;
  }

  const sessionWallet = await getVerifiedSessionWallet(request);
  if (sessionWallet && normalizedAuthorizedWallets.includes(sessionWallet)) {
    return sessionWallet;
  }

  return getVerifiedWalletSignature(request, dareId, normalizedAuthorizedWallets);
}
