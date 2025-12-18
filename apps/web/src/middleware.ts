/**
 * Next.js Middleware - Smart Route Protection
 *
 * Implements intelligent routing based on user authentication and onboarding state:
 * - Optimistic JWT verification (no database queries)
 * - Smart redirect based on tenantId presence
 * - Onboarding flow protection
 * - Security headers for downstream use
 *
 * Route Types:
 * - PUBLIC: Anyone can access
 * - GUEST_ONLY: Only unauthenticated users
 * - PROTECTED: Only authenticated users with tenant
 * - ONBOARDING: Only authenticated users without completed setup
 */

import { type NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Session cookie name (must match session/index.ts)
const SESSION_COOKIE_NAME = 'zcrm_session';

// Secret key for session verification
const getSecretKey = () => {
  const secret =
    process.env['SESSION_SECRET'] ||
    process.env['NEXTAUTH_SECRET'] ||
    'zuclubit-crm-session-fallback-key-2025';
  return new TextEncoder().encode(secret);
};

// ============================================
// Route Configuration
// ============================================

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
  '/invite/accept',
];

// Routes that authenticated users should NOT access (redirect to appropriate destination)
const GUEST_ONLY_ROUTES = ['/login', '/register', '/forgot-password', '/signup'];

// Static assets and API routes to skip
const SKIP_PATTERNS = ['/_next', '/favicon.ico', '/images', '/fonts', '/api/auth', '/api/upload'];

// Onboarding routes - require auth but no tenant
const ONBOARDING_ROUTES = ['/onboarding'];

// ============================================
// Session Types
// ============================================

type OnboardingStatus = 'not_started' | 'profile_created' | 'business_created' | 'setup_completed' | 'team_invited' | 'completed';

interface SessionData {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  // Onboarding state for proper routing
  onboardingStatus: OnboardingStatus;
  onboardingStep: string;
  requiresOnboarding: boolean;
}

// ============================================
// Session Verification
// ============================================

/**
 * Verify session cookie (optimistic check)
 * Returns session payload if valid, null otherwise
 */
async function verifySessionCookie(sessionCookie: string | undefined): Promise<SessionData | null> {
  if (!sessionCookie) {
    console.log('[verifySession] No session cookie provided');
    return null;
  }

  try {
    console.log('[verifySession] Verifying JWT...');
    const { payload } = await jwtVerify(sessionCookie, getSecretKey(), {
      algorithms: ['HS256'],
    });

    // Basic validation - check required fields exist
    const userId = payload['userId'];
    if (!userId || typeof userId !== 'string') {
      console.log('[verifySession] Invalid payload - missing userId');
      return null;
    }

    // Extract onboarding state - default to requires onboarding if not present
    const onboardingStatus = (payload['onboardingStatus'] as OnboardingStatus) || 'not_started';
    const onboardingStep = (payload['onboardingStep'] as string) || 'create-business';
    const requiresOnboarding = (payload['requiresOnboarding'] as boolean) ?? true;

    console.log('[verifySession] Session verified for user:', userId);

    return {
      userId: userId,
      email: (payload['email'] as string) || '',
      tenantId: (payload['tenantId'] as string) || '',
      role: (payload['role'] as string) || 'viewer',
      onboardingStatus,
      onboardingStep,
      requiresOnboarding,
    };
  } catch (error) {
    // Invalid or expired session
    console.log('[verifySession] JWT verification failed:', error instanceof Error ? error.message : 'unknown error');
    return null;
  }
}

/**
 * Determine the correct redirect destination for authenticated users
 * Takes into account onboarding status for proper routing
 */
function getAuthenticatedRedirect(session: SessionData, intendedPath: string): string {
  const hasTenant = !!session.tenantId;
  const { requiresOnboarding, onboardingStep, onboardingStatus } = session;

  // If user requires onboarding, redirect to the appropriate onboarding step
  if (requiresOnboarding && onboardingStatus !== 'completed') {
    switch (onboardingStep) {
      case 'signup':
      case 'create-business':
        return '/onboarding/create-business';
      case 'branding':
      case 'modules':
      case 'business-hours':
        return '/onboarding/setup';
      case 'invite-team':
        return '/onboarding/invite-team';
      case 'complete':
        return '/onboarding/complete';
      default:
        // If no tenant, start from create-business
        // If has tenant, continue with setup
        return hasTenant ? '/onboarding/setup' : '/onboarding/create-business';
    }
  }

  // User has completed onboarding and has tenant - send to app
  // NOTE: We use /app/dashboard instead of /app due to OpenNext routing bug
  if (hasTenant) {
    // If they had a redirect param to a valid app route, use it
    if (intendedPath.startsWith('/app')) {
      return intendedPath;
    }
    return '/app/dashboard';
  }

  // Fallback: No tenant but doesn't require onboarding (edge case)
  // This shouldn't happen, but send to create-business just in case
  return '/onboarding/create-business';
}

// ============================================
// Middleware Handler
// ============================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and certain API routes
  if (SKIP_PATTERNS.some((pattern) => pathname.startsWith(pattern))) {
    return NextResponse.next();
  }

  // Get session from cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Debug logging for auth troubleshooting
  console.log('[Middleware] Path:', pathname);
  console.log('[Middleware] Cookie present:', !!sessionCookie);
  if (sessionCookie) {
    console.log('[Middleware] Cookie length:', sessionCookie.length);
  }

  const session = await verifySessionCookie(sessionCookie);
  const isAuthenticated = !!session;
  const hasTenant = !!(session?.tenantId);

  console.log('[Middleware] Auth status:', {
    isAuthenticated,
    hasTenant,
    requiresOnboarding: session?.requiresOnboarding,
    onboardingStatus: session?.onboardingStatus,
  });

  // Check route type
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
  const isGuestOnlyRoute = GUEST_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
  const isAppRoute = pathname.startsWith('/app');
  const isOnboardingRoute = ONBOARDING_ROUTES.some((route) => pathname.startsWith(route));

  // ============================================
  // Routing Logic
  // ============================================

  // 1. Guest-only routes (login, register, signup)
  // Authenticated users should be redirected
  if (isGuestOnlyRoute && isAuthenticated) {
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    const redirect = getAuthenticatedRedirect(session!, redirectParam || '/app/dashboard');
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  // 2. Protected routes (/app/*)
  // Must be authenticated AND have completed onboarding
  if (isAppRoute) {
    if (!isAuthenticated) {
      // Not authenticated - redirect to login with return URL
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user requires onboarding
    if (session!.requiresOnboarding && session!.onboardingStatus !== 'completed') {
      // Redirect to appropriate onboarding step
      const redirectUrl = getAuthenticatedRedirect(session!, pathname);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    if (!hasTenant) {
      // Authenticated but no tenant - redirect to onboarding
      return NextResponse.redirect(new URL('/onboarding/create-business', request.url));
    }
  }

  // 3. Onboarding routes
  // Must be authenticated and in onboarding flow
  if (isOnboardingRoute) {
    if (!isAuthenticated) {
      // Not authenticated - redirect to signup
      return NextResponse.redirect(new URL('/signup', request.url));
    }

    // Special case: /onboarding/complete can be accessed by anyone authenticated
    if (pathname === '/onboarding/complete') {
      // Allow access - they're completing onboarding
      return NextResponse.next();
    }

    // If user has completed onboarding, redirect to app
    if (!session!.requiresOnboarding || session!.onboardingStatus === 'completed') {
      return NextResponse.redirect(new URL('/app/dashboard', request.url));
    }

    // If user has tenant and tries to access create-business, redirect to next step
    if (hasTenant && pathname === '/onboarding/create-business') {
      // They already have a tenant, redirect to setup or the appropriate step
      const redirectUrl = getAuthenticatedRedirect(session!, pathname);
      if (redirectUrl !== '/onboarding/create-business') {
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }
    }

    // Allow onboarding access for users in the onboarding flow
  }

  // 4. Root path special handling
  if (pathname === '/') {
    if (isAuthenticated) {
      // Redirect to appropriate destination based on tenant status
      const redirect = getAuthenticatedRedirect(session!, '/app/dashboard');
      return NextResponse.redirect(new URL(redirect, request.url));
    }
    // Allow guests to see landing page
    return NextResponse.next();
  }

  // 5. Signup verify-email special handling
  if (pathname.startsWith('/signup/verify-email')) {
    // Allow access regardless of auth state - users need to verify email
    return NextResponse.next();
  }

  // ============================================
  // Response Headers
  // ============================================

  // WORKAROUND: OpenNext has a bug where /app route conflicts with App Router's app folder
  // The route /app matches the root page instead of /app/app/page.tsx
  // Other /app/* routes work correctly, only the index route has this issue
  // Solution: Redirect /app to /app/dashboard which works correctly
  if (pathname === '/app') {
    console.log('[Middleware] Redirecting /app to /app/dashboard (OpenNext workaround)');
    return NextResponse.redirect(new URL('/app/dashboard', request.url));
  }

  // Create response with auth headers for downstream use
  const response = NextResponse.next();

  if (session) {
    // Add auth info to headers for server components
    response.headers.set('x-user-id', session.userId);
    response.headers.set('x-tenant-id', session.tenantId || '');
    response.headers.set('x-user-role', session.role);
    // Add onboarding state headers
    response.headers.set('x-onboarding-status', session.onboardingStatus);
    response.headers.set('x-onboarding-step', session.onboardingStep);
    response.headers.set('x-requires-onboarding', String(session.requiresOnboarding));
  }

  return response;
}

// ============================================
// Middleware Configuration
// ============================================

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|images|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)',
  ],
};
