/**
 * Next.js Middleware - SSO Authentication with Auto-Refresh
 *
 * All authentication is handled via Zuclubit SSO (RS256/JWKS).
 *
 * Architecture:
 * 1. Check if route is protected/public/guest-only
 * 2. Validate session cookie (HS256 encrypted, contains SSO tokens)
 * 3. CHECK IF ACCESS TOKEN IS EXPIRED/EXPIRING - Auto refresh if needed
 * 4. Map SSO claims to request headers
 * 5. Redirect based on auth state
 *
 * IMPORTANT: This middleware now handles automatic token refresh to prevent
 * session expiration errors that occur when the SSO access token expires
 * (15min-1h) while the local session cookie is still valid (7 days).
 *
 * @see https://nextjs.org/docs/app/guides/authentication
 */

import { type NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

// ============================================
// Configuration
// ============================================

const SESSION_COOKIE_NAME = 'zcrm_session';
const SESSION_DURATION_DAYS = 7;

// Buffer time before token expiry to trigger refresh (5 minutes)
const TOKEN_REFRESH_BUFFER_SECONDS = 5 * 60;

// SSO Configuration
const SSO_CONFIG = {
  issuerUrl: process.env['SSO_ISSUER_URL'] || 'https://sso.zuclubit.com',
  clientId: process.env['SSO_CLIENT_ID'] || 'ventazo',
  clientSecret: process.env['SSO_CLIENT_SECRET'] || '',
};

/**
 * Development fallback key - MUST be consistent across all files
 * This fallback is shared between: middleware.ts, callback route, session/index.ts, proxy
 * IMPORTANT: In production, always set SESSION_SECRET environment variable
 */
const DEV_FALLBACK_KEY = 'zuclubit-dev-session-key-do-not-use-in-production';

// Session secret for encrypting local session cookie
const getSecretKey = () => {
  const secret = process.env['SESSION_SECRET'] ||
    process.env['NEXTAUTH_SECRET'] ||
    (globalThis as Record<string, unknown>)['SESSION_SECRET'] as string | undefined;

  if (!secret) {
    const isProduction = process.env['NODE_ENV'] === 'production' ||
      process.env['VERCEL_ENV'] === 'production' ||
      process.env['CF_PAGES'] === '1';

    if (isProduction) {
      console.error(
        '[Middleware] CRITICAL: SESSION_SECRET not configured in production! ' +
        'Using fallback key. Run: wrangler pages secret put SESSION_SECRET'
      );
    }

    return new TextEncoder().encode(DEV_FALLBACK_KEY);
  }

  return new TextEncoder().encode(secret);
};

// ============================================
// Route Configuration
// ============================================

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/terms',
  '/privacy',
  '/api/health',
  '/api/webhooks',
  '/api/auth/callback', // SSO callback
];

// Routes that authenticated users should NOT access
const GUEST_ONLY_ROUTES = [
  '/login',
];

// Static assets and API routes to skip
const SKIP_PATTERNS = [
  '/_next',
  '/favicon.ico',
  '/images',
  '/fonts',
];

// ============================================
// Session Types
// ============================================

interface SessionData {
  userId: string;
  email: string;
  tenantId: string;
  tenantSlug?: string;
  role: string;
  permissions?: string[];
  // Token data for refresh functionality
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp of access token expiration
  createdAt: number;
  authMode: 'sso' | 'legacy';
}

interface SessionValidationResult {
  session: SessionData | null;
  newCookie: string | null;
  refreshed: boolean;
}

// ============================================
// Token Utilities
// ============================================

/**
 * Decode JWT payload without verification (for reading claims)
 * Only use for extracting expiration, NOT for security decisions
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return null;

    // Handle base64url encoding
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const decoded = atob(base64 + padding);

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Get token expiration timestamp from JWT
 */
function getTokenExpiry(token: string): number | null {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload['exp'] !== 'number') return null;
  return payload['exp'];
}

/**
 * Check if access token needs refresh
 * Returns true if token is expired or will expire within buffer time
 */
function tokenNeedsRefresh(accessToken: string): boolean {
  const expiry = getTokenExpiry(accessToken);
  if (!expiry) return true; // If we can't determine expiry, try to refresh

  const now = Math.floor(Date.now() / 1000);
  return expiry - now < TOKEN_REFRESH_BUFFER_SECONDS;
}

// ============================================
// Token Refresh
// ============================================

/**
 * Refresh tokens using SSO server
 * Uses the refresh_token grant type to get new access and refresh tokens
 */
async function refreshTokensFromSSO(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> {
  try {
    const tokenEndpoint = `${SSO_CONFIG.issuerUrl}/oauth/token`;

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: SSO_CONFIG.clientId,
        client_secret: SSO_CONFIG.clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[Middleware] Token refresh failed:', response.status, errorText);
      return null;
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // SSO may return same or new refresh token
      expiresIn: data.expires_in || 900, // Default to 15 minutes if not provided
    };
  } catch (error) {
    console.error('[Middleware] Token refresh error:', error);
    return null;
  }
}

// ============================================
// Session Cookie Management
// ============================================

/**
 * Create encrypted session cookie JWT
 */
async function createSessionCookie(session: SessionData): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    userId: session.userId,
    email: session.email,
    tenantId: session.tenantId,
    tenantSlug: session.tenantSlug,
    role: session.role,
    permissions: session.permissions,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt || now,
    authMode: session.authMode || 'sso',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(getSecretKey());
}

/**
 * Verify and potentially refresh session
 *
 * This is the core function that:
 * 1. Validates the session cookie
 * 2. Checks if the access token needs refresh
 * 3. Refreshes tokens if needed
 * 4. Returns session data and new cookie if refreshed
 */
async function verifyAndRefreshSession(
  sessionCookie: string | undefined
): Promise<SessionValidationResult> {
  if (!sessionCookie) {
    return { session: null, newCookie: null, refreshed: false };
  }

  try {
    // Verify the local session cookie (HS256)
    const { payload } = await jwtVerify(sessionCookie, getSecretKey(), {
      algorithms: ['HS256'],
    });

    const userId = payload['userId'] as string;
    const accessToken = payload['accessToken'] as string;
    const refreshToken = payload['refreshToken'] as string;

    // Validate required fields
    if (!userId || typeof userId !== 'string') {
      console.warn('[Middleware] Invalid session: missing userId');
      return { session: null, newCookie: null, refreshed: false };
    }

    // Build session data from payload
    let session: SessionData = {
      userId,
      email: (payload['email'] as string) || '',
      tenantId: (payload['tenantId'] as string) || '',
      tenantSlug: (payload['tenantSlug'] as string) || undefined,
      role: (payload['role'] as string) || 'viewer',
      permissions: (payload['permissions'] as string[]) || undefined,
      accessToken: accessToken || '',
      refreshToken: refreshToken || '',
      expiresAt: (payload['expiresAt'] as number) || 0,
      createdAt: (payload['createdAt'] as number) || Math.floor(Date.now() / 1000),
      authMode: (payload['authMode'] as 'sso' | 'legacy') || 'sso',
    };

    // If no access token, session is invalid
    if (!accessToken) {
      console.warn('[Middleware] Invalid session: missing accessToken');
      return { session: null, newCookie: null, refreshed: false };
    }

    // Check if access token needs refresh
    if (tokenNeedsRefresh(accessToken)) {
      console.log('[Middleware] Access token needs refresh, attempting...');

      if (!refreshToken) {
        console.warn('[Middleware] No refresh token available, session expired');
        return { session: null, newCookie: null, refreshed: false };
      }

      // Attempt to refresh tokens
      const newTokens = await refreshTokensFromSSO(refreshToken);

      if (newTokens) {
        // Get new expiration from the refreshed access token
        const newExpiry = getTokenExpiry(newTokens.accessToken);
        const now = Math.floor(Date.now() / 1000);

        // Update session with new tokens
        session = {
          ...session,
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresAt: newExpiry || (now + newTokens.expiresIn),
        };

        // Create new cookie with refreshed tokens
        const newCookie = await createSessionCookie(session);
        console.log('[Middleware] Token refreshed successfully');

        return { session, newCookie, refreshed: true };
      } else {
        // Refresh failed - session is invalid
        console.warn('[Middleware] Token refresh failed, session invalidated');
        return { session: null, newCookie: null, refreshed: false };
      }
    }

    // Token is still valid, return session without refresh
    return { session, newCookie: null, refreshed: false };

  } catch (error) {
    // JWT verification failed (expired, invalid signature, etc.)
    if (error instanceof Error && !error.message.includes('expired')) {
      console.warn('[Middleware] Session verification failed:', error.message);
    }
    return { session: null, newCookie: null, refreshed: false };
  }
}

// ============================================
// Middleware
// ============================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and certain routes
  if (SKIP_PATTERNS.some((pattern) => pathname.startsWith(pattern))) {
    return NextResponse.next();
  }

  // Get and validate session from cookie (with auto-refresh)
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { session, newCookie, refreshed } = await verifyAndRefreshSession(sessionCookie);
  const isAuthenticated = !!session;

  // Check route type
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname === route || pathname.startsWith(route + '/')
  );
  const isGuestOnlyRoute = GUEST_ONLY_ROUTES.some((route) =>
    pathname === route || pathname.startsWith(route + '/')
  );
  const isAppRoute = pathname.startsWith('/app');
  const isOnboardingRoute = pathname.startsWith('/onboarding');
  const isApiRoute = pathname.startsWith('/api');

  // Handle guest-only routes (login page)
  if (isGuestOnlyRoute && isAuthenticated) {
    const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/app';
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));

    // Update cookie if refreshed
    if (newCookie) {
      response.cookies.set(SESSION_COOKIE_NAME, newCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
      });
    }

    return response;
  }

  // Handle protected routes (/app/*)
  if (isAppRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    loginUrl.searchParams.set('error', 'session_expired');
    return NextResponse.redirect(loginUrl);
  }

  // Handle onboarding routes
  if (isOnboardingRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'session_expired');
    return NextResponse.redirect(loginUrl);
  }

  // Handle API routes - return 401 instead of redirect
  if (isApiRoute && !isPublicRoute && !isAuthenticated) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'SESSION_EXPIRED',
      },
      { status: 401 }
    );
  }

  // Handle root path
  if (pathname === '/') {
    if (isAuthenticated) {
      const response = NextResponse.redirect(new URL('/app', request.url));

      // Update cookie if refreshed
      if (newCookie) {
        response.cookies.set(SESSION_COOKIE_NAME, newCookie, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
        });
      }

      return response;
    }
    return NextResponse.next();
  }

  // Create response with auth headers
  const response = NextResponse.next();

  // Update cookie if tokens were refreshed
  if (newCookie) {
    response.cookies.set(SESSION_COOKIE_NAME, newCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    });

    // Add header to indicate refresh happened (useful for debugging)
    response.headers.set('x-session-refreshed', 'true');
  }

  // Add auth info to headers for server components
  if (session) {
    response.headers.set('x-user-id', session.userId);
    response.headers.set('x-user-email', session.email);
    response.headers.set('x-tenant-id', session.tenantId);

    if (session.tenantSlug) {
      response.headers.set('x-tenant-slug', session.tenantSlug);
    }

    response.headers.set('x-user-role', session.role);

    if (session.permissions?.length) {
      response.headers.set('x-user-permissions', session.permissions.join(','));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
