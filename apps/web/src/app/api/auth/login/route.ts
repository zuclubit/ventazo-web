/**
 * Login API Route
 *
 * Handles authentication via API route instead of Server Action
 * for better cookie handling in Cloudflare Workers environment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { z } from 'zod';

// ============================================
// Configuration
// ============================================

const SESSION_COOKIE_NAME = 'zcrm_session';
const SESSION_DURATION_DAYS = 7;
const rawApiUrl = process.env['API_URL'] || process.env['NEXT_PUBLIC_API_URL'] || 'https://zuclubit-lead-service.fly.dev';
const API_URL = rawApiUrl.replace(/\/api\/v1\/?$/, '');

function getSecretKey(): Uint8Array {
  const secret = process.env['SESSION_SECRET'];
  if (!secret) {
    console.warn('[Login API] WARNING: SESSION_SECRET not set. Using fallback.');
    return new TextEncoder().encode('zuclubit-crm-session-fallback-key-2025');
  }
  return new TextEncoder().encode(secret);
}

// ============================================
// Validation
// ============================================

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ============================================
// Types
// ============================================

type OnboardingStatus = 'not_started' | 'profile_created' | 'business_created' | 'setup_completed' | 'team_invited' | 'completed';

interface BackendLoginResponse {
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    expiresAt: number;
  };
  tenants: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
  }>;
  onboarding: {
    status: OnboardingStatus;
    currentStep: string;
    completedSteps: string[];
    requiresOnboarding: boolean;
  };
}

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
  try {
    console.log('[Login API] ====== LOGIN REQUEST ======');

    // Parse request body
    const body = await request.json();

    // Validate input
    const validation = LoginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;
    console.log('[Login API] Authenticating:', email);

    // Call backend API
    const backendResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });

    const data = await backendResponse.json();
    console.log('[Login API] Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      if (data.code === 'EMAIL_NOT_CONFIRMED') {
        return NextResponse.json(
          { success: false, error: 'EMAIL_NOT_CONFIRMED', errorCode: 'EMAIL_NOT_CONFIRMED' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { success: false, error: data.message || 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Extract session data
    const loginData = data as BackendLoginResponse;

    // Get tenant info
    let tenantId = '';
    let role = 'viewer';
    if (loginData.tenants && loginData.tenants.length > 0) {
      const firstTenant = loginData.tenants[0];
      if (firstTenant) {
        tenantId = firstTenant.id;
        role = firstTenant.role || 'viewer';
      }
    }

    // Get onboarding status
    const onboarding = loginData.onboarding || {
      status: 'not_started' as const,
      currentStep: tenantId ? 'branding' : 'create-business',
      completedSteps: [],
      requiresOnboarding: true,
    };

    console.log('[Login API] User:', loginData.user.id);
    console.log('[Login API] Tenant:', tenantId);
    console.log('[Login API] Onboarding:', onboarding);

    // Create JWT session
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + (SESSION_DURATION_DAYS * 24 * 60 * 60);

    const sessionToken = await new SignJWT({
      userId: loginData.user.id,
      email: loginData.user.email,
      tenantId,
      role,
      accessToken: loginData.session.accessToken,
      refreshToken: loginData.session.refreshToken,
      onboardingStatus: onboarding.status,
      onboardingStep: onboarding.currentStep,
      requiresOnboarding: onboarding.requiresOnboarding,
      expiresAt: loginData.session.expiresAt,
      createdAt: now,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
      .sign(getSecretKey());

    console.log('[Login API] Session JWT created, length:', sessionToken.length);

    // Determine redirect URL
    // NOTE: We use /app/dashboard instead of /app due to OpenNext routing bug
    // where /app conflicts with App Router's app folder naming
    let redirectTo = '/app/dashboard';
    if (onboarding.requiresOnboarding && onboarding.status !== 'completed') {
      switch (onboarding.currentStep) {
        case 'signup':
        case 'create-business':
          redirectTo = '/onboarding/create-business';
          break;
        case 'branding':
        case 'modules':
        case 'business-hours':
          redirectTo = '/onboarding/setup';
          break;
        case 'invite-team':
          redirectTo = '/onboarding/invite-team';
          break;
        case 'complete':
          redirectTo = '/onboarding/complete';
          break;
        default:
          redirectTo = tenantId ? '/onboarding/setup' : '/onboarding/create-business';
      }
    }

    console.log('[Login API] Redirect to:', redirectTo);

    // Create response with cookie
    const response = NextResponse.json(
      { success: true, redirectTo },
      { status: 200 }
    );

    // Set cookie in response headers
    const cookieExpires = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: true, // Always true for HTTPS
      sameSite: 'lax',
      path: '/',
      expires: cookieExpires,
    });

    console.log('[Login API] Cookie set in response');

    return response;
  } catch (error) {
    console.error('[Login API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: `Connection error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
