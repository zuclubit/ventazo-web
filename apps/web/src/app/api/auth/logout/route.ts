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
 * Get secret key for session decryption
 */
function getSecretKey(): Uint8Array {
  const secret = process.env['SESSION_SECRET'] || 'zuclubit-crm-session-fallback-key-2025';
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
