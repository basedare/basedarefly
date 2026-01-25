import NextAuth, { type NextAuthOptions } from 'next-auth';
import TwitterProvider from 'next-auth/providers/twitter';
import TwitchProvider from 'next-auth/providers/twitch';
import GoogleProvider from 'next-auth/providers/google';

// ============================================================================
// NEXTAUTH CONFIGURATION
// Supports: Twitter, Twitch, YouTube (via Google), Kick (manual)
// ============================================================================

export const authOptions: NextAuthOptions = {
  providers: [
    // Twitter/X OAuth 2.0
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID || '',
      clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
      version: '2.0',
    }),

    // Twitch OAuth
    TwitchProvider({
      clientId: process.env.TWITCH_CLIENT_ID || '',
      clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
    }),

    // YouTube via Google OAuth (with YouTube scope)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/youtube.readonly',
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        // Store the provider used
        token.provider = account.provider;

        // Twitter data
        if (account.provider === 'twitter') {
          token.twitterId = (profile as any).data?.id || (profile as any).id;
          token.twitterHandle = (profile as any).data?.username || (profile as any).username;
          token.platformHandle = token.twitterHandle;
          token.platformId = token.twitterId;
        }

        // Twitch data
        if (account.provider === 'twitch') {
          token.twitchId = (profile as any).sub || (profile as any).id;
          token.twitchHandle = (profile as any).preferred_username || (profile as any).login;
          token.platformHandle = token.twitchHandle;
          token.platformId = token.twitchId;
        }

        // YouTube/Google data
        if (account.provider === 'google') {
          token.youtubeId = (profile as any).sub;
          token.youtubeHandle = (profile as any).name || (profile as any).email?.split('@')[0];
          token.platformHandle = token.youtubeHandle;
          token.platformId = token.youtubeId;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        // Add platform data to session
        (session as any).provider = token.provider;
        (session as any).platformHandle = token.platformHandle;
        (session as any).platformId = token.platformId;

        // Provider-specific data
        (session as any).twitterId = token.twitterId;
        (session as any).twitterHandle = token.twitterHandle;
        (session as any).twitchId = token.twitchId;
        (session as any).twitchHandle = token.twitchHandle;
        (session as any).youtubeId = token.youtubeId;
        (session as any).youtubeHandle = token.youtubeHandle;
      }
      return session;
    },
  },

  pages: {
    signIn: '/claim-tag',
    error: '/claim-tag',
  },

  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
