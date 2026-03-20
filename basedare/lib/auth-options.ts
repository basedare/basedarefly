import type { NextAuthOptions, Session } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import TwitchProvider from 'next-auth/providers/twitch';
import TwitterProvider from 'next-auth/providers/twitter';

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

type SessionWithPlatformData = Session & {
  walletAddress?: string;
  provider?: string | null;
  platformHandle?: string | null;
  platformId?: string | null;
  twitterId?: string | null;
  twitterHandle?: string | null;
  twitchId?: string | null;
  twitchHandle?: string | null;
  youtubeId?: string | null;
  youtubeHandle?: string | null;
  platformBio?: string | null;
  platformFollowerCount?: number | null;
  token?: string | null;
  user?: Session['user'] & {
    walletAddress?: string;
  };
};

type TokenWithPlatformData = {
  walletAddress?: unknown;
  apiToken?: string | null;
  provider?: string | null;
  platformHandle?: string | null;
  platformId?: string | null;
  twitterId?: string | null;
  twitterHandle?: string | null;
  twitchId?: string | null;
  twitchHandle?: string | null;
  youtubeId?: string | null;
  youtubeHandle?: string | null;
  platformBio?: string | null;
  platformFollowerCount?: number | null;
  sub?: string | null;
};

function normalizeWalletAddress(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!EVM_ADDRESS_REGEX.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

function walletFromOAuthProfile(profile: unknown): string | null {
  if (!profile || typeof profile !== 'object') return null;
  const p = profile as Record<string, unknown>;

  const candidates = [
    p.walletAddress,
    p.wallet,
    p.address,
    p.eth_address,
    p.ethereumAddress,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeWalletAddress(candidate);
    if (normalized) return normalized;
  }

  return null;
}

if (process.env.NODE_ENV === 'development') {
  console.log('[NextAuth] Provider configuration status:');
  console.log('  - Twitter:', process.env.TWITTER_CLIENT_ID ? 'configured' : 'MISSING');
  console.log('  - Twitch:', process.env.TWITCH_CLIENT_ID ? 'configured' : 'MISSING');
  console.log('  - Google:', process.env.GOOGLE_CLIENT_ID ? 'configured' : 'MISSING');
  console.log('  - NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'NOT SET');
  console.log('  - NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'configured' : 'MISSING');
}

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET
      ? [TwitterProvider({
          clientId: process.env.TWITTER_CLIENT_ID,
          clientSecret: process.env.TWITTER_CLIENT_SECRET,
          version: '2.0',
        })]
      : []),
    ...(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET
      ? [TwitchProvider({
          clientId: process.env.TWITCH_CLIENT_ID,
          clientSecret: process.env.TWITCH_CLIENT_SECRET,
        })]
      : []),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          authorization: {
            params: {
              scope: 'openid email profile https://www.googleapis.com/auth/youtube.readonly',
            },
          },
        })]
      : []),
  ],

  callbacks: {
    async jwt({ token, account, profile }) {
      if (!token.apiToken) {
        token.apiToken = crypto.randomUUID();
      }

      const tokenWallet =
        normalizeWalletAddress((token as { walletAddress?: unknown }).walletAddress) ||
        normalizeWalletAddress(token.sub) ||
        walletFromOAuthProfile(profile);

      if (tokenWallet) {
        (token as { walletAddress?: string }).walletAddress = tokenWallet;
      }

      if (account && profile) {
        if (!token.apiToken) {
          token.apiToken = crypto.randomUUID();
        }

        token.provider = account.provider;

        if (account.provider === 'twitter') {
          token.twitterId = (profile as { data?: { id?: string }; id?: string }).data?.id || (profile as { id?: string }).id;
          token.twitterHandle =
            (profile as { data?: { username?: string }; username?: string }).data?.username ||
            (profile as { username?: string }).username;
          token.platformHandle = token.twitterHandle;
          token.platformId = token.twitterId;
          token.platformBio =
            (profile as { data?: { description?: string | null }; description?: string | null }).data?.description ??
            (profile as { description?: string | null }).description ??
            null;
          token.platformFollowerCount =
            (profile as { data?: { public_metrics?: { followers_count?: number } }; public_metrics?: { followers_count?: number } }).data?.public_metrics?.followers_count ??
            (profile as { public_metrics?: { followers_count?: number } }).public_metrics?.followers_count ??
            null;
        }

        if (account.provider === 'twitch') {
          token.twitchId = (profile as { sub?: string; id?: string }).sub || (profile as { id?: string }).id;
          token.twitchHandle =
            (profile as { preferred_username?: string; login?: string }).preferred_username ||
            (profile as { login?: string }).login;
          token.platformHandle = token.twitchHandle;
          token.platformId = token.twitchId;
          token.platformBio = (profile as { description?: string | null }).description ?? null;
          token.platformFollowerCount = (profile as { followers?: number | null }).followers ?? null;
        }

        if (account.provider === 'google') {
          token.youtubeId = (profile as { sub?: string }).sub;
          token.youtubeHandle =
            (profile as { name?: string; email?: string }).name ||
            (profile as { email?: string }).email?.split('@')[0];
          token.platformHandle = token.youtubeHandle;
          token.platformId = token.youtubeId;
          token.platformBio = (profile as { bio?: string | null }).bio ?? null;
          token.platformFollowerCount =
            (profile as { subscriberCount?: number | null; followers?: number | null }).subscriberCount ??
            (profile as { followers?: number | null }).followers ??
            null;
        }
      }

      return token;
    },

    async session({ session, token }) {
      const mutableSession = session as SessionWithPlatformData;
      const enrichedToken = token as typeof token & TokenWithPlatformData;
      const walletAddress =
        normalizeWalletAddress(enrichedToken.walletAddress) ||
        normalizeWalletAddress(enrichedToken.sub);

      if (walletAddress) {
        mutableSession.walletAddress = walletAddress;
        if (mutableSession.user) {
          mutableSession.user.walletAddress = walletAddress;
        }
      }

      if (mutableSession.user) {
        mutableSession.provider = enrichedToken.provider;
        mutableSession.platformHandle = enrichedToken.platformHandle;
        mutableSession.platformId = enrichedToken.platformId;
        mutableSession.twitterId = enrichedToken.twitterId;
        mutableSession.twitterHandle = enrichedToken.twitterHandle;
        mutableSession.twitchId = enrichedToken.twitchId;
        mutableSession.twitchHandle = enrichedToken.twitchHandle;
        mutableSession.youtubeId = enrichedToken.youtubeId;
        mutableSession.youtubeHandle = enrichedToken.youtubeHandle;
        mutableSession.platformBio = enrichedToken.platformBio;
        mutableSession.platformFollowerCount = enrichedToken.platformFollowerCount;
        mutableSession.token = enrichedToken.apiToken;
      }

      return mutableSession;
    },
  },

  pages: {
    signIn: '/claim-tag',
    error: '/claim-tag',
  },

  events: {
    async signIn({ user, account }) {
      console.log('[NextAuth] SignIn event:', { provider: account?.provider, userId: user?.id });
    },
    async signOut() {
      console.log('[NextAuth] SignOut event');
    },
    async createUser({ user }) {
      console.log('[NextAuth] User created:', user?.id);
    },
    async linkAccount({ user, account }) {
      console.log('[NextAuth] Account linked:', { provider: account?.provider, userId: user?.id });
    },
  },

  logger: {
    error(code, metadata) {
      console.error('[NextAuth Error]', code, metadata);
    },
    warn(code) {
      console.warn('[NextAuth Warning]', code);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[NextAuth Debug]', code, metadata);
      }
    },
  },

  debug: process.env.NODE_ENV === 'development',
};
