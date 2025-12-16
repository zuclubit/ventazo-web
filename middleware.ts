/**
 * Next.js Middleware - Optimistic Route Protection
 *
 * Following Next.js best practices:
 * - Performs OPTIMISTIC checks only (reads session cookie)
 * - Does NOT make database queries or external API calls
 * - Session verification happens in Server Components/Actions
 *
 * Architecture:
 * 1. Check if route is protected/public/guest-only
 * 2. Read encrypted session cookie
 * 3. Redirect based on auth state
 */

import { type NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Session cookie name (must match session/index.ts)
const SESSION_COOKIE_NAME = 'zcrm_session';

// Secret key for session verification
const getSecretKey = () => {
  const secret = process.env['SESSION_SECRET'] || process.env['NEXTAUTH_SECRET'] || 'zuclubit-crm-session-secret-key-2024';
  return new TextEncoder().encode(secret);
};

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/terms',
  '/privacy',
  '/signup',
  '/api/health',
  '/api/webhooks',
];

// Routes that authenticated users should NOT access (redirect to app)
const GUEST_ONLY_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/signup',
];

// Static assets and API routes to skip
const SKIP_PATTERNS = [
  '/_next',
  '/favicon.ico',
  '/images',
  '/fonts',
  '/api/auth',
];

/**
 * Verify session cookie (optimistic check)
 * Returns session payload if valid, null otherwise
 */
async function verifySessionCookie(
  sessionCookie: string | undefined
): Promise<{ userId: string; tenantId: string; role: string } | null> {
  if (!sessionCookie) return null;

  try {
    const { payload } = await jwtVerify(sessionCookie, getSecretKey(), {
      algorithms: ['HS256'],
    });

    // Basic validation - check required fields exist
    const userId = payload['userId'];
    if (!userId || typeof userId !== 'string') {
      return null;
    }

    return {
      userId: userId,
      tenantId: (payload['tenantId'] as string) || '',
      role: (payload['role'] as string) || 'viewer',
    };
  } catch {
    // Invalid or expired session
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and certain API routes
  if (SKIP_PATTERNS.some((pattern) => pathname.startsWith(pattern))) {
    return NextResponse.next();
  }

  // Get session from cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionCookie(sessionCookie);
  const isAuthenticated = !!session;

  // Check route type
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
  const isGuestOnlyRoute = GUEST_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
  const isAppRoute = pathname.startsWith('/app');
  const isOnboardingRoute = pathname.startsWith('/onboarding');

  // Handle guest-only routes (login, register, etc.)
  // Redirect authenticated users to app
  if (isGuestOnlyRoute && isAuthenticated) {
    const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/app';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Handle protected routes (/app/*)
  // Redirect unauthenticated users to login
  if (isAppRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Handle onboarding routes
  // Only allow authenticated users without tenant
  if (isOnboardingRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Handle root path
  if (pathname === '/') {
    if (isAuthenticated) {
      // Redirect authenticated users to app
      return NextResponse.redirect(new URL('/app', request.url));
    }
    // Allow guests to see landing page
    return NextResponse.next();
  }

  // Create response with auth headers for downstream use
  const response = NextResponse.next();

  if (session) {
    // Add auth info to headers for server components
    response.headers.set('x-user-id', session.userId);
    response.headers.set('x-tenant-id', session.tenantId);
    response.headers.set('x-user-role', session.role);
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
