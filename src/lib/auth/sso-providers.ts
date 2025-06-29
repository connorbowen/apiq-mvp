import { NextAuthOptions } from 'next-auth';
import OktaProvider from 'next-auth/providers/okta';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '../../../lib/database/client';
import bcrypt from 'bcryptjs';
import { logInfo, logError } from '../../utils/logger';

/**
 * SSO Provider Configuration
 * Supports Okta, Google Workspace, Microsoft Azure AD, and Generic OIDC
 */

export const ssoProviders = [
  // Okta Provider (Enterprise SSO)
  ...(process.env.OKTA_CLIENT_ID && process.env.OKTA_CLIENT_SECRET ? [
    OktaProvider({
      clientId: process.env.OKTA_CLIENT_ID!,
      clientSecret: process.env.OKTA_CLIENT_SECRET!,
      issuer: process.env.OKTA_ISSUER,
      authorization: {
        params: {
          scope: 'openid profile email',
          response_type: 'code',
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          provider: 'okta',
          providerUserId: profile.sub,
        };
      },
    })
  ] : []),

  // Google Provider (SMB SSO)
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          provider: 'google',
          providerUserId: profile.sub,
        };
      },
    })
  ] : []),

  // Microsoft Azure AD Provider (Enterprise SSO)
  ...(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET ? [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          scope: 'openid profile email',
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          provider: 'azure',
          providerUserId: profile.sub,
        };
      },
    })
  ] : []),

  // Credentials Provider (fallback for existing users)
  CredentialsProvider({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' }
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      try {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          provider: 'credentials',
        };
      } catch (error) {
        logError('Credentials authentication error', error instanceof Error ? error : new Error(String(error)));
        return null;
      }
    }
  }),
];

/**
 * NextAuth Configuration
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: ssoProviders,
  session: {
    strategy: 'jwt',
    maxAge: 15 * 60, // 15 minutes
  },
  jwt: {
    maxAge: 15 * 60, // 15 minutes
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Log SSO sign-in for audit
        if (account?.provider && account.provider !== 'credentials') {
          logInfo('SSO sign-in', {
            provider: account.provider,
            userId: user.id,
            email: user.email,
            providerUserId: profile?.sub,
          });
        }

        // Update user with provider information
        if (account?.provider && account.provider !== 'credentials') {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              provider: account.provider,
              providerUserId: profile?.sub,
              lastLogin: new Date(),
              // Store encrypted refresh token if available
              ...(account.refresh_token && {
                refreshToken: account.refresh_token, // Will be encrypted by middleware
                tokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
              }),
            },
          });
        }

        return true;
      } catch (error) {
        logError('Sign-in callback error', error instanceof Error ? error : new Error(String(error)));
        return false;
      }
    },

    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          userId: user.id,
          role: (user as any).role,
          provider: (user as any).provider,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        };
      }

      // Return previous token if the access token has not expired yet
      if (token.expiresAt && Date.now() < (token.expiresAt as number) * 1000) {
        return token;
      }

      // Access token has expired, try to update it
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId as string;
        (session.user as any).role = token.role as string;
        (session.user as any).provider = token.provider as string;
      }
      (session as any).accessToken = token.accessToken as string;
      (session as any).expires = token.expiresAt as number;

      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  events: {
    async signOut({ token }) {
      // Log sign-out for audit
      logInfo('User sign-out', {
        userId: token.userId,
        provider: token.provider,
      });
    },
  },
};

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(token: any) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: token.userId },
    });

    if (!user?.refreshToken) {
      return { ...token, error: 'RefreshAccessTokenError' };
    }

    // Decrypt refresh token (implement based on your encryption)
    const refreshToken = user.refreshToken; // Add decryption here

    let response;
    switch (token.provider) {
      case 'google':
        response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          }),
        });
        break;

      case 'okta':
        response = await fetch(`${process.env.OKTA_ISSUER}/oauth2/v1/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.OKTA_CLIENT_ID!,
            client_secret: process.env.OKTA_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          }),
        });
        break;

      case 'azure':
        response = await fetch(`https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.AZURE_AD_CLIENT_ID!,
            client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          }),
        });
        break;

      default:
        return { ...token, error: 'RefreshAccessTokenError' };
    }

    const tokens = await response.json();

    if (!response.ok) {
      throw tokens;
    }

    // Update user with new tokens
    await prisma.user.update({
      where: { id: token.userId },
      data: {
        tokenExpiresAt: new Date((Date.now() + tokens.expires_in * 1000)),
        // Store new refresh token if provided
        ...(tokens.refresh_token && { refreshToken: tokens.refresh_token }),
      },
    });

    return {
      ...token,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? refreshToken,
      expiresAt: Math.floor(Date.now() / 1000 + tokens.expires_in),
    };
  } catch (error) {
    logError('Token refresh error', error instanceof Error ? error : new Error(String(error)));
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

/**
 * Get available SSO providers based on environment configuration
 */
export function getAvailableProviders() {
  const providers = [];

  if (process.env.OKTA_CLIENT_ID && process.env.OKTA_CLIENT_SECRET) {
    providers.push({
      id: 'okta',
      name: 'Okta',
      type: 'oauth',
      description: 'Enterprise SSO with Okta',
    });
  }

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push({
      id: 'google',
      name: 'Google Workspace',
      type: 'oauth',
      description: 'SSO with Google Workspace',
    });
  }

  if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET) {
    providers.push({
      id: 'azure-ad',
      name: 'Microsoft Azure AD',
      type: 'oauth',
      description: 'Enterprise SSO with Microsoft Azure AD',
    });
  }

  // Always include credentials provider
  providers.push({
    id: 'credentials',
    name: 'Email & Password',
    type: 'credentials',
    description: 'Sign in with email and password',
  });

  return providers;
} 