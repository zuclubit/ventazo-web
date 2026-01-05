/**
 * OAuth Callback Route Handler
 *
 * Handles the redirect from OAuth providers (Google, Microsoft)
 * Integrates with the app's session system (zcrm_session)
 *
 * SECURITY ARCHITECTURE:
 * 1. Receive OAuth code from provider
 * 2. Exchange code for Supabase session (server-to-server, secure)
 * 3. Call backend /oauth/exchange with INTERNAL_API_KEY (server-to-server)
 *    - No SUPABASE_JWT_SECRET needed - we trust the exchangeCodeForSession result
 * 4. Backend generates native JWT tokens
 * 5. Create app session cookie with native tokens
 * 6. Redirect to appropriate destination
 *
 * This eliminates the need for SUPABASE_JWT_SECRET on the backend.
 */

import { createClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================
// Configuration
// ============================================

const SESSION_COOKIE_NAME = 'zcrm_session';
const SESSION_DURATION_DAYS = 7;

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const SUPABASE_ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '';
const rawApiUrl = process.env['API_URL'] || process.env['NEXT_PUBLIC_API_URL'] || 'https://zuclubit-lead-service.fly.dev';
const API_URL = rawApiUrl.replace(/\/api\/v1\/?$/, '');

// Internal API key for server-to-server communication
const INTERNAL_API_KEY = process.env['INTERNAL_API_KEY'] || '';

// Allowed redirect paths (security: prevent open redirect)
const ALLOWED_REDIRECTS = [
  '/app',
  '/onboarding/create-business',
  '/onboarding/setup',
  '/onboarding/invite-team',
  '/onboarding/complete',
];

/**
 * Development fallback key - MUST be consistent across all files
 * This fallback is shared between: middleware.ts, callback route, session/index.ts, proxy
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
 * Get secret key for session encryption
 *
 * SECURITY: Enforces proper configuration in production
 * CRITICAL: Must use the same sources as middleware.ts and proxy routes!
 */
function getSecretKey(): Uint8Array {
  const cfEnv = getCloudflareEnv();

  const secret = process.env['SESSION_SECRET'] ||
    process.env['NEXTAUTH_SECRET'] ||
    cfEnv['SESSION_SECRET'] ||
    cfEnv['NEXTAUTH_SECRET'] ||
    (globalThis as Record<string, unknown>)['SESSION_SECRET'] as string | undefined;

  if (!secret) {
    const isProduction = process.env['NODE_ENV'] === 'production' ||
      process.env['VERCEL_ENV'] === 'production' ||
      process.env['CF_PAGES'] === '1';

    if (isProduction) {
      console.error(
        '[OAuth Callback] CRITICAL: SESSION_SECRET not configured in production! ' +
        'Using fallback key. Run: wrangler pages secret put SESSION_SECRET'
      );
    } else {
      console.warn('[OAuth Callback] SESSION_SECRET not set. Using development fallback.');
    }

    return new TextEncoder().encode(DEV_FALLBACK_KEY);
  }

  if (secret.length < 32) {
    console.warn('[OAuth Callback] SESSION_SECRET should be at least 32 characters for security.');
  }

  return new TextEncoder().encode(secret);
}

/**
 * Validate redirect URL to prevent open redirect attacks
 */
function validateRedirect(redirect: string): string {
  // Check if it's in allowed list or starts with allowed paths
  const isAllowed = ALLOWED_REDIRECTS.some(
    (allowed) => redirect === allowed || redirect.startsWith(allowed + '/')
  );

  if (isAllowed) {
    return redirect;
  }

  // Default to onboarding for new users
  return '/onboarding/create-business';
}

/**
 * Create encrypted session JWT
 */
async function encryptSession(payload: {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    ...payload,
    createdAt: now,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(getSecretKey());
}

// ============================================
// Types
// ============================================

interface BackendSyncResponse {
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
  tenants: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
  }>;
  onboarding?: {
    status: string;
    currentStep: number;
    completedSteps: string[];
  };
  // Native JWT tokens from backend
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    expiresAt: number;
  };
}

// ============================================
// Route Handler
// ============================================

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirectParam = requestUrl.searchParams.get('redirect') || '/onboarding/create-business';
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('[OAuth Callback] Error:', error, errorDescription);
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('error', error);
    if (errorDescription) {
      loginUrl.searchParams.set('error_description', errorDescription);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Handle missing code
  if (!code) {
    console.error('[OAuth Callback] Missing authorization code');
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('error', 'missing_code');
    return NextResponse.redirect(loginUrl);
  }

  // Verify Supabase configuration
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[OAuth Callback] Supabase not configured');
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('error', 'config_error');
    return NextResponse.redirect(loginUrl);
  }

  try {
    // 1. Create Supabase client and exchange code for session
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: authData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !authData.session || !authData.user) {
      console.error('[OAuth Callback] Exchange error:', exchangeError);
      const loginUrl = new URL('/login', requestUrl.origin);
      loginUrl.searchParams.set('error', 'exchange_failed');
      loginUrl.searchParams.set('error_description', exchangeError?.message || 'Session exchange failed');
      return NextResponse.redirect(loginUrl);
    }

    const { session: supabaseSession, user: supabaseUser } = authData;

    console.log('[OAuth Callback] Supabase session created for:', supabaseUser.email);

    // 2. Validate INTERNAL_API_KEY is configured
    if (!INTERNAL_API_KEY) {
      const isProduction = process.env['NODE_ENV'] === 'production';
      if (isProduction) {
        console.error('[OAuth Callback] CRITICAL: INTERNAL_API_KEY not configured in production');
        const loginUrl = new URL('/login', requestUrl.origin);
        loginUrl.searchParams.set('error', 'config_error');
        loginUrl.searchParams.set('error_description', 'Server configuration error. Contact administrator.');
        return NextResponse.redirect(loginUrl);
      }
      console.warn('[OAuth Callback] INTERNAL_API_KEY not set in development');
    }

    // 3. Exchange verified OAuth user data for native JWT tokens
    // Using INTERNAL_API_KEY instead of Supabase token - no SUPABASE_JWT_SECRET needed
    let tenantId = '';
    let role = 'viewer';
    let onboardingStatus = 'not_started';

    try {
      console.log('[OAuth Callback] Calling /oauth/exchange with INTERNAL_API_KEY');

      const exchangeResponse = await fetch(`${API_URL}/api/v1/auth/oauth/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': INTERNAL_API_KEY,
        },
        body: JSON.stringify({
          // Send verified user data from exchangeCodeForSession
          userId: supabaseUser.id,
          email: supabaseUser.email,
          fullName: supabaseUser.user_metadata?.['full_name'] || supabaseUser.user_metadata?.['name'],
          avatarUrl: supabaseUser.user_metadata?.['avatar_url'],
          provider: supabaseUser.app_metadata?.['provider'],
        }),
        cache: 'no-store',
      });

      if (exchangeResponse.ok) {
        const exchangeData: BackendSyncResponse = await exchangeResponse.json();

        // Get tenant info if available
        if (exchangeData.tenants && exchangeData.tenants.length > 0) {
          const firstTenant = exchangeData.tenants[0];
          if (firstTenant) {
            tenantId = firstTenant.id;
            role = firstTenant.role || 'viewer';
          }
        }

        // Get onboarding status
        if (exchangeData.onboarding) {
          onboardingStatus = exchangeData.onboarding.status;
        }

        // Use native tokens from backend
        if (exchangeData.tokens) {
          console.log('[OAuth Callback] Received native JWT tokens from backend');

          const sessionToken = await encryptSession({
            userId: supabaseUser.id,
            email: supabaseUser.email || '',
            tenantId,
            role,
            accessToken: exchangeData.tokens.accessToken,
            refreshToken: exchangeData.tokens.refreshToken,
            expiresAt: exchangeData.tokens.expiresAt,
          });

          // Determine redirect destination
          let finalRedirect: string;

          if (!tenantId) {
            finalRedirect = '/onboarding/create-business';
          } else if (onboardingStatus !== 'completed' && onboardingStatus !== 'not_started') {
            const stepToRoute: Record<string, string> = {
              profile_created: '/onboarding/create-business',
              business_created: '/onboarding/setup',
              setup_completed: '/onboarding/invite-team',
              team_invited: '/onboarding/complete',
            };
            finalRedirect = stepToRoute[onboardingStatus] || '/app';
          } else if (tenantId && (redirectParam === '/onboarding/create-business' || redirectParam.startsWith('/onboarding'))) {
            finalRedirect = '/app';
          } else {
            finalRedirect = validateRedirect(redirectParam);
          }

          console.log('[OAuth Callback] Redirecting to:', finalRedirect);

          const response = NextResponse.redirect(new URL(finalRedirect, requestUrl.origin));

          const cookieStore = await cookies();
          cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            expires: new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000),
            sameSite: 'lax',
            path: '/',
          });

          return response;
        }

        // No tokens in response - this is unexpected
        console.error('[OAuth Callback] No tokens in exchange response');
        const loginUrl = new URL('/login', requestUrl.origin);
        loginUrl.searchParams.set('error', 'no_tokens');
        return NextResponse.redirect(loginUrl);
      } else {
        // Exchange failed
        const errorText = await exchangeResponse.text();
        console.error('[OAuth Callback] OAuth exchange failed:', exchangeResponse.status, errorText);

        const loginUrl = new URL('/login', requestUrl.origin);
        loginUrl.searchParams.set('error', 'exchange_failed');
        loginUrl.searchParams.set('error_description', 'Unable to complete authentication. Please try again.');
        return NextResponse.redirect(loginUrl);
      }
    } catch (exchangeError) {
      // Backend unavailable - FAIL SECURELY
      console.error('[OAuth Callback] Backend exchange error:', exchangeError);

      const loginUrl = new URL('/login', requestUrl.origin);
      loginUrl.searchParams.set('error', 'backend_unavailable');
      loginUrl.searchParams.set('error_description', 'Authentication service is temporarily unavailable. Please try again later.');
      return NextResponse.redirect(loginUrl);
    }
  } catch (error) {
    console.error('[OAuth Callback] Unexpected error:', error);
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('error', 'server_error');
    return NextResponse.redirect(loginUrl);
  }
}
