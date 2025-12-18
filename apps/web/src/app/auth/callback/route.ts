/**
 * OAuth Callback Route Handler
 *
 * Handles the redirect from OAuth providers (Google, Microsoft)
 * Integrates with the app's session system (zcrm_session)
 *
 * Flow:
 * 1. Receive OAuth code from provider
 * 2. Exchange code for Supabase session
 * 3. Sync user with backend (create profile if needed)
 * 4. Check onboarding status
 * 5. Create app session cookie
 * 6. Redirect to appropriate destination
 */

import { createClient } from '@supabase/supabase-js';
import { jwtVerify, SignJWT } from 'jose';
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
const API_URL = process.env['API_URL'] || process.env['NEXT_PUBLIC_API_URL'] || 'https://zuclubit-lead-service.fly.dev';

// Allowed redirect paths (security: prevent open redirect)
const ALLOWED_REDIRECTS = [
  '/app',
  '/onboarding/create-business',
  '/onboarding/setup',
  '/onboarding/invite-team',
  '/onboarding/complete',
];

/**
 * Get secret key for session encryption
 */
function getSecretKey(): Uint8Array {
  const secret = process.env['SESSION_SECRET'];
  if (!secret) {
    return new TextEncoder().encode('zuclubit-crm-session-fallback-key-2025');
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

    // 2. Sync user with backend and get tenant info
    let tenantId = '';
    let role = 'viewer';
    let onboardingStatus = 'not_started';

    try {
      const syncResponse = await fetch(`${API_URL}/api/v1/auth/oauth/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseSession.access_token}`,
        },
        body: JSON.stringify({
          email: supabaseUser.email,
          fullName: supabaseUser.user_metadata?.['full_name'] || supabaseUser.user_metadata?.['name'],
          avatarUrl: supabaseUser.user_metadata?.['avatar_url'],
          provider: supabaseUser.app_metadata?.['provider'],
        }),
        cache: 'no-store',
      });

      if (syncResponse.ok) {
        const syncData: BackendSyncResponse = await syncResponse.json();

        // Get tenant info if available
        if (syncData.tenants && syncData.tenants.length > 0) {
          const firstTenant = syncData.tenants[0];
          if (firstTenant) {
            tenantId = firstTenant.id;
            role = firstTenant.role || 'viewer';
          }
        }

        // Get onboarding status
        if (syncData.onboarding) {
          onboardingStatus = syncData.onboarding.status;
        }

        console.log('[OAuth Callback] Backend sync successful, tenantId:', tenantId || 'none');
      } else {
        // Backend sync failed - continue with basic info
        console.warn('[OAuth Callback] Backend sync failed, using basic info');
      }
    } catch (syncError) {
      // Backend unavailable - continue with Supabase data only
      console.warn('[OAuth Callback] Backend sync error:', syncError);

      // Fallback: Check tenant_memberships in Supabase directly
      const { data: memberships } = await supabase
        .from('tenant_memberships')
        .select('tenant_id, role')
        .eq('user_id', supabaseUser.id)
        .eq('is_active', true)
        .limit(1);

      if (memberships && memberships.length > 0) {
        const membership = memberships[0];
        if (membership) {
          tenantId = membership.tenant_id;
          role = membership.role || 'viewer';
        }
      }
    }

    // 3. Create app session cookie
    const sessionExpiry = supabaseSession.expires_at || Math.floor(Date.now() / 1000) + 3600;

    const sessionToken = await encryptSession({
      userId: supabaseUser.id,
      email: supabaseUser.email || '',
      tenantId,
      role,
      accessToken: supabaseSession.access_token,
      refreshToken: supabaseSession.refresh_token || '',
      expiresAt: sessionExpiry,
    });

    // 4. Determine redirect destination based on user state
    let finalRedirect: string;

    if (!tenantId) {
      // No tenant - user needs to complete onboarding
      finalRedirect = '/onboarding/create-business';
    } else if (onboardingStatus !== 'completed' && onboardingStatus !== 'not_started') {
      // Onboarding in progress - resume from where they left off
      const stepToRoute: Record<string, string> = {
        profile_created: '/onboarding/create-business',
        business_created: '/onboarding/setup',
        setup_completed: '/onboarding/invite-team',
        team_invited: '/onboarding/complete',
      };
      finalRedirect = stepToRoute[onboardingStatus] || '/app';
    } else if (tenantId && (redirectParam === '/onboarding/create-business' || redirectParam.startsWith('/onboarding'))) {
      // User has tenant but tried to access onboarding - send to app
      finalRedirect = '/app';
    } else {
      // Validate and use redirect param
      finalRedirect = validateRedirect(redirectParam);
    }

    console.log('[OAuth Callback] Redirecting to:', finalRedirect);

    // 5. Create response with session cookie
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
  } catch (error) {
    console.error('[OAuth Callback] Unexpected error:', error);
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('error', 'server_error');
    return NextResponse.redirect(loginUrl);
  }
}
