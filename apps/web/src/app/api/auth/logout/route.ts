/**
 * Logout API Route - SSO Integration
 *
 * Handles session cleanup and SSO token revocation.
 * Called when user logs out to:
 * 1. Revoke tokens at SSO server
 * 2. Clear local session cookie
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'zcrm_session';

// SSO Configuration
const SSO_CONFIG = {
  issuerUrl: process.env['SSO_ISSUER_URL'] || 'https://sso.zuclubit.com',
  clientId: process.env['SSO_CLIENT_ID'] || 'ventazo',
  clientSecret: process.env['SSO_CLIENT_SECRET'] || '',
};

/**
 * Development fallback key - MUST be consistent across all files
 * This fallback is shared between: middleware.ts, callback route, session/index.ts, logout route
 * IMPORTANT: In production, always set SESSION_SECRET environment variable
 */
const DEV_FALLBACK_KEY = 'zuclubit-dev-session-key-do-not-use-in-production';

/**
 * Get Cloudflare context env bindings (if available)
 */
function getCloudflareEnv(): Record<string, string | undefined> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const ctx = getCloudflareContext();
    return ctx?.env || {};
  } catch {
    return {};
  }
}

/**
 * Get secret key for session decryption
 * CRITICAL: Must use the same sources as middleware.ts and session/index.ts
 */
function getSecretKey(): Uint8Array {
  const cfEnv = getCloudflareEnv();

  const secret = process.env['SESSION_SECRET'] ||
    process.env['NEXTAUTH_SECRET'] ||
    cfEnv['SESSION_SECRET'] ||
    cfEnv['NEXTAUTH_SECRET'] ||
    (globalThis as Record<string, unknown>)['SESSION_SECRET'] as string | undefined;

  if (!secret) {
    const isProduction =
      process.env['NODE_ENV'] === 'production' ||
      process.env['VERCEL_ENV'] === 'production' ||
      process.env['CF_PAGES'] === '1';

    if (isProduction) {
      console.error('[Logout] CRITICAL: SESSION_SECRET not configured in production!');
    }
    return new TextEncoder().encode(DEV_FALLBACK_KEY);
  }

  return new TextEncoder().encode(secret);
}

/**
 * Revoke token at SSO server
 */
async function revokeTokenAtSSO(token: string, tokenType: 'access_token' | 'refresh_token'): Promise<void> {
  try {
    const response = await fetch(`${SSO_CONFIG.issuerUrl}/oauth/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token,
        token_type_hint: tokenType,
        client_id: SSO_CONFIG.clientId,
        client_secret: SSO_CONFIG.clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      console.warn(`[Logout] SSO token revocation failed: ${response.status}`);
    }
  } catch (error) {
    console.warn('[Logout] SSO token revocation error:', error);
  }
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    // Try to revoke tokens at SSO if session exists
    if (sessionCookie) {
      try {
        const { payload } = await jwtVerify(sessionCookie, getSecretKey(), {
          algorithms: ['HS256'],
        });

        const accessToken = payload['accessToken'] as string | undefined;
        const refreshToken = payload['refreshToken'] as string | undefined;
        const authMode = payload['authMode'] as string | undefined;

        // Only revoke if this is an SSO session
        if (authMode === 'sso' || !authMode) {
          if (refreshToken) {
            await revokeTokenAtSSO(refreshToken, 'refresh_token');
          }
          if (accessToken) {
            await revokeTokenAtSSO(accessToken, 'access_token');
          }
        }
      } catch {
        // Session decryption failed, just clear the cookie
        console.warn('[Logout] Could not decode session for token revocation');
      }
    }

    // Clear the session cookie
    cookieStore.delete(SESSION_COOKIE_NAME);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Logout] Error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// Support GET for simpler client-side calls
export async function GET() {
  return POST();
}
