/**
 * OIDC Callback Route for Zuclubit SSO
 *
 * Handles the OAuth2 authorization code flow callback:
 * 1. Receives authorization code from SSO
 * 2. Exchanges code for SSO tokens
 * 3. Exchanges SSO tokens for native backend tokens via /oauth/exchange
 * 4. Creates local session with backend tokens
 * 5. Redirects to app or requested page
 *
 * IMPORTANT: The session is created with BACKEND tokens, not SSO tokens.
 * This ensures API calls to zuclubit-lead-service.fly.dev are authenticated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import {
  getSSOConfig,
  exchangeCodeForTokens,
  type SSOTokenPayload,
} from '@/lib/auth/sso-config';

// Session configuration (must match session/index.ts)
const SESSION_COOKIE_NAME = 'zcrm_session';
const SESSION_DURATION_DAYS = 7;

// Backend API configuration for token exchange
const rawApiUrl = process.env['API_URL'] || process.env['NEXT_PUBLIC_API_URL'] || 'https://zuclubit-lead-service.fly.dev';
const API_URL = rawApiUrl.replace(/\/api\/v1\/?$/, '');
const INTERNAL_API_KEY = process.env['INTERNAL_API_KEY'] || '';

/**
 * Response from backend /oauth/exchange endpoint
 */
interface BackendExchangeResponse {
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
    currentStep: string;
    completedSteps: string[];
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    expiresAt: number;
  };
}

/**
 * Development fallback key - MUST be consistent across all files
 * This fallback is shared between: middleware.ts, callback route, session/index.ts
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
      console.error(
        '[SSO Callback] CRITICAL: SESSION_SECRET not configured in production! ' +
        'Using fallback key. Run: wrangler pages secret put SESSION_SECRET'
      );
    } else {
      console.warn('[SSO Callback] SESSION_SECRET not set, using fallback');
    }
    return new TextEncoder().encode(DEV_FALLBACK_KEY);
  }

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
 * Create encrypted session JWT
 * Returns the token and cookie options for setting on response
 */
async function createSessionToken(
  accessToken: string,
  refreshToken: string,
  payload: SSOTokenPayload
): Promise<{
  token: string;
  cookieOptions: {
    name: string;
    value: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    path: string;
    maxAge: number;
  };
}> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (SESSION_DURATION_DAYS * 24 * 60 * 60);

  // Determine onboarding state based on tenant
  const hasTenant = !!payload.tenant_id;
  const onboardingStatus = hasTenant ? 'completed' : 'not_started';
  const onboardingStep = hasTenant ? 'complete' : 'create-business';
  const requiresOnboarding = !hasTenant;

  console.log('[SSO Callback] Creating session with:', {
    userId: payload.sub,
    email: payload.email,
    tenantId: payload.tenant_id || '(none)',
    hasTenant,
    requiresOnboarding,
  });

  // Create session JWT with SSO claims
  const sessionToken = await new SignJWT({
    userId: payload.sub,
    email: payload.email,
    tenantId: payload.tenant_id || '',
    role: payload.role || 'viewer',
    accessToken,
    refreshToken,
    onboardingStatus,
    onboardingStep,
    requiresOnboarding,
    expiresAt,
    createdAt: now,
    accessTokenExpiresAt: payload.exp,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(getSecretKey());

  // Robust production detection for Cloudflare Workers
  const isProduction =
    process.env['NODE_ENV'] === 'production' ||
    process.env['VERCEL_ENV'] === 'production' ||
    process.env['CF_PAGES'] === '1';

  const maxAge = SESSION_DURATION_DAYS * 24 * 60 * 60;

  console.log('[SSO Callback] Session token created:', {
    isProduction,
    tokenLength: sessionToken.length,
  });

  return {
    token: sessionToken,
    cookieOptions: {
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge,
    },
  };
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

    // Variables for session creation
    let finalAccessToken = tokens.accessToken;
    let finalRefreshToken = tokens.refreshToken;
    let finalExpiresAt = payload.exp;
    let tenantId = payload.tenant_id || '';
    let role = payload.role || 'viewer';
    let onboardingStatus = 'not_started';
    let requiresOnboarding = !payload.tenant_id;

    // Try to exchange SSO tokens for native backend tokens
    // This is CRITICAL for API calls to work properly
    if (INTERNAL_API_KEY) {
      try {
        console.log('[SSO Callback] Exchanging SSO tokens for backend native tokens...');

        const exchangeResponse = await fetch(`${API_URL}/api/v1/auth/oauth/exchange`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-API-Key': INTERNAL_API_KEY,
          },
          body: JSON.stringify({
            userId: payload.sub,
            email: payload.email,
            fullName: payload.name || payload.given_name,
            avatarUrl: payload.picture,
            provider: 'zuclubit-sso',
            // Pass SSO tenant info for automatic membership sync
            ssoTenantId: payload.tenant_id || undefined,
            ssoRole: payload.role || 'owner',
          }),
          cache: 'no-store',
        });

        if (exchangeResponse.ok) {
          const exchangeData: BackendExchangeResponse = await exchangeResponse.json();
          console.log('[SSO Callback] Backend token exchange successful');

          // Use native backend tokens instead of SSO tokens
          if (exchangeData.tokens) {
            finalAccessToken = exchangeData.tokens.accessToken;
            finalRefreshToken = exchangeData.tokens.refreshToken;
            finalExpiresAt = exchangeData.tokens.expiresAt;
            console.log('[SSO Callback] Using backend native tokens for session');
          }

          // Get tenant info from backend response
          if (exchangeData.tenants && exchangeData.tenants.length > 0) {
            const firstTenant = exchangeData.tenants[0];
            if (firstTenant) {
              tenantId = firstTenant.id;
              role = firstTenant.role || 'viewer';
            }
          }

          // Get onboarding status from backend
          if (exchangeData.onboarding) {
            onboardingStatus = exchangeData.onboarding.status;
            requiresOnboarding = onboardingStatus !== 'completed';
          }
        } else {
          const errorText = await exchangeResponse.text();
          console.warn('[SSO Callback] Backend token exchange failed:', exchangeResponse.status, errorText);
          console.warn('[SSO Callback] Falling back to SSO tokens - API calls may fail with 401');
        }
      } catch (exchangeError) {
        console.warn('[SSO Callback] Backend exchange error:', exchangeError);
        console.warn('[SSO Callback] Falling back to SSO tokens - API calls may fail with 401');
      }
    } else {
      console.warn('[SSO Callback] INTERNAL_API_KEY not configured - using SSO tokens');
      console.warn('[SSO Callback] API calls to backend may fail with 401');
    }

    // Create session token with the best available tokens
    const { cookieOptions } = await createSessionToken(
      finalAccessToken,
      finalRefreshToken,
      {
        ...payload,
        tenant_id: tenantId,
        role: role,
        exp: finalExpiresAt,
      }
    );

    // Determine redirect destination
    let redirectTo = '/app/dashboard';

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

    // Check if user needs onboarding based on tenant and onboarding status
    if (!tenantId) {
      redirectTo = '/onboarding/create-business';
    } else if (requiresOnboarding && onboardingStatus !== 'completed') {
      // Map onboarding status to route
      const stepToRoute: Record<string, string> = {
        not_started: '/onboarding/create-business',
        profile_created: '/onboarding/create-business',
        business_created: '/onboarding/setup',
        setup_completed: '/onboarding/invite-team',
        team_invited: '/onboarding/complete',
      };
      redirectTo = stepToRoute[onboardingStatus] || '/app/dashboard';
    }

    console.log('[SSO Callback] Redirecting to:', redirectTo);

    // CRITICAL FIX for Cloudflare Workers/OpenNext:
    // The issue is that Set-Cookie headers get stripped by the OpenNext runtime.
    // Solution: Use NextResponse with headers.append() which properly handles cookies.

    const absoluteRedirectUrl = new URL(redirectTo, request.url).toString();

    // Build Set-Cookie header manually for maximum compatibility
    const cookieParts = [
      `${cookieOptions.name}=${cookieOptions.value}`,
      `Path=${cookieOptions.path}`,
      `Max-Age=${cookieOptions.maxAge}`,
      'HttpOnly',
      `SameSite=${cookieOptions.sameSite.charAt(0).toUpperCase() + cookieOptions.sameSite.slice(1)}`,
    ];

    if (cookieOptions.secure) {
      cookieParts.push('Secure');
    }

    const setCookieValue = cookieParts.join('; ');

    console.log('[SSO Callback] Setting cookie via HTML redirect page');
    console.log('[SSO Callback] Cookie value preview:', setCookieValue.substring(0, 100));

    // Return HTML page that sets the cookie via document.cookie (client-side)
    // AND includes the Set-Cookie header (server-side)
    // This double approach ensures the cookie is set in all scenarios
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Autenticando...</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #003c3b 0%, #052828 100%);
      color: white;
    }
    .loader { text-align: center; }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: #5eead4;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Iniciando sesion...</p>
  </div>
  <script>
    // Set cookie via JavaScript as fallback (non-HttpOnly version for testing)
    // The real HttpOnly cookie should be set via header
    try {
      // Store session token in localStorage as backup
      localStorage.setItem('zcrm_session_backup', '${cookieOptions.value}');
      console.log('[Auth] Session backup stored');
    } catch(e) {
      console.error('[Auth] Could not store backup:', e);
    }
    // Redirect after a brief moment to ensure cookie is processed
    setTimeout(function() {
      window.location.href = "${absoluteRedirectUrl}";
    }, 100);
  </script>
</body>
</html>`;

    // Use NextResponse which properly handles headers in OpenNext
    const response = new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

    // Set cookie using NextResponse's cookie API
    response.cookies.set(cookieOptions.name, cookieOptions.value, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      maxAge: cookieOptions.maxAge,
    });

    // Also append raw Set-Cookie header as fallback
    response.headers.append('Set-Cookie', setCookieValue);

    console.log('[SSO Callback] Response cookies set');
    return response;

  } catch (err) {
    console.error('[SSO Callback] Token exchange failed:', err);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'token_exchange_failed');
    return NextResponse.redirect(loginUrl);
  }
}
