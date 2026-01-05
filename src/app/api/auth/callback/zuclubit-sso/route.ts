/**
 * OIDC Callback Route for Zuclubit SSO
 *
 * Handles the OAuth2 authorization code flow callback:
 * 1. Receives authorization code from SSO
 * 2. Exchanges code for tokens
 * 3. Creates local session
 * 4. Redirects to app or requested page
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import {
  getSSOConfig,
  exchangeCodeForTokens,
  type SSOTokenPayload,
} from '@/lib/auth/sso-config';

// Session configuration
const SESSION_COOKIE_NAME = 'zcrm_session';
const SESSION_DURATION_DAYS = 7;

/**
 * Get secret key for session encryption
 */
function getSecretKey(): Uint8Array {
  const secret = process.env['SESSION_SECRET'] || 'zuclubit-crm-session-fallback-key-2025';
  return new TextEncoder().encode(secret);
}

/**
 * Decode JWT payload without verification (for extracting claims)
 */
function decodeJWTPayload(token: string): SSOTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    if (!payload) return null;

    // Add padding if needed
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Create encrypted session cookie
 */
async function createSessionCookie(
  accessToken: string,
  refreshToken: string,
  payload: SSOTokenPayload
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (SESSION_DURATION_DAYS * 24 * 60 * 60);

  // Create session JWT with SSO claims
  const sessionToken = await new SignJWT({
    userId: payload.sub,
    email: payload.email,
    tenantId: payload.tenant_id || '',
    tenantSlug: payload.tenant_slug || '',
    role: payload.role || 'viewer',
    permissions: payload.permissions || [],
    accessToken,
    refreshToken,
    expiresAt,
    createdAt: now,
    authMode: 'sso',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  });
}

/**
 * GET /api/auth/callback/zuclubit-sso
 *
 * Handles the OAuth2 callback from SSO server
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Get authorization code and state
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle SSO errors
  if (error) {
    console.error('[SSO Callback] Error from SSO:', error, errorDescription);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', error);
    if (errorDescription) {
      loginUrl.searchParams.set('error_description', errorDescription);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Validate code exists
  if (!code) {
    console.error('[SSO Callback] Missing authorization code');
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url));
  }

  try {
    // Build redirect URI (must match what was sent in authorization request)
    const redirectUri = new URL('/api/auth/callback/zuclubit-sso', request.url).toString();

    // Exchange code for tokens
    console.log('[SSO Callback] Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Decode access token to get claims
    const payload = decodeJWTPayload(tokens.accessToken);
    if (!payload) {
      throw new Error('Failed to decode access token');
    }

    console.log('[SSO Callback] Token exchange successful for user:', payload.email);

    // Create session cookie with SSO data
    await createSessionCookie(tokens.accessToken, tokens.refreshToken, payload);

    // Determine redirect destination
    let redirectTo = '/app';

    // Check state for original destination
    if (state) {
      try {
        const stateData = JSON.parse(atob(state));
        if (stateData.redirect && typeof stateData.redirect === 'string') {
          // Validate redirect is internal
          if (stateData.redirect.startsWith('/')) {
            redirectTo = stateData.redirect;
          }
        }
      } catch {
        // Ignore invalid state
      }
    }

    // Check if user needs onboarding (no tenant)
    if (!payload.tenant_id) {
      redirectTo = '/onboarding/create-business';
    }

    console.log('[SSO Callback] Redirecting to:', redirectTo);
    return NextResponse.redirect(new URL(redirectTo, request.url));

  } catch (err) {
    console.error('[SSO Callback] Token exchange failed:', err);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'token_exchange_failed');
    return NextResponse.redirect(loginUrl);
  }
}
