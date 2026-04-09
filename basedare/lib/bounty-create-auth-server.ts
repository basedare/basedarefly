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
  buildBountyCreateMessage,
  isBountyCreateFresh,
} from '@/lib/bounty-create-auth';

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

async function getVerifiedSessionWallet(
  request: NextRequest,
  expectedWalletAddress: string
): Promise<string | null> {
  const session = (await getServerSession(authOptions)) as WalletSession | null;
  if (!session) return null;

  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (session.token && (!bearerToken || bearerToken !== session.token)) {
    return null;
  }

  const wallet = session.walletAddress ?? session.user?.walletAddress ?? null;
  if (!wallet || !isAddress(wallet)) return null;
  if (wallet.toLowerCase() !== expectedWalletAddress.toLowerCase()) return null;
  return wallet.toLowerCase();
}

async function getVerifiedWalletSignature(
  request: NextRequest,
  expectedWalletAddress: string
): Promise<string | null> {
  const walletHeader = request.headers.get('x-basedare-bounty-wallet')?.trim() ?? null;
  const signature = request.headers.get('x-basedare-bounty-signature')?.trim() ?? null;
  const issuedAt = request.headers.get('x-basedare-bounty-issued-at')?.trim() ?? null;

  if (!walletHeader || !signature || !issuedAt || !isAddress(walletHeader)) {
    return null;
  }

  if (walletHeader.toLowerCase() !== expectedWalletAddress.toLowerCase()) {
    return null;
  }

  if (!isBountyCreateFresh(issuedAt)) {
    return null;
  }

  try {
    const message = buildBountyCreateMessage({
      walletAddress: walletHeader,
      issuedAt,
    });
    const messageHash = hashMessage(message);

    const bytecode = await publicClient.getBytecode({
      address: walletHeader as Hex,
    });

    if (bytecode && bytecode !== '0x') {
      const result = await publicClient.readContract({
        address: walletHeader as Hex,
        abi: ERC1271_ABI,
        functionName: 'isValidSignature',
        args: [messageHash, signature as Hex],
      });

      if (result === ERC1271_MAGIC_VALUE) {
        return walletHeader.toLowerCase();
      }

      return null;
    }

    const recovered = await recoverMessageAddress({
      message,
      signature: signature as Hex,
    });

    if (recovered.toLowerCase() !== walletHeader.toLowerCase()) {
      return null;
    }

    return walletHeader.toLowerCase();
  } catch {
    return null;
  }
}

export async function getAuthorizedBountyWallet(
  request: NextRequest,
  expectedWalletAddress: string
): Promise<string | null> {
  const normalizedWallet = expectedWalletAddress.toLowerCase();
  const sessionWallet = await getVerifiedSessionWallet(request, normalizedWallet);
  if (sessionWallet) return sessionWallet;
  return getVerifiedWalletSignature(request, normalizedWallet);
}
