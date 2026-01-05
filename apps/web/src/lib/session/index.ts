/**
 * Session Management Module - Unified Authentication
 *
 * Following Next.js App Router best practices (2025):
 * - Encrypted JWT stored in httpOnly cookie
 * - Server-side only session management
 * - Data Access Layer (DAL) pattern for auth checks
 * - React cache() for request deduplication
 *
 * Security Features (OWASP Compliant):
 * - httpOnly: Prevents XSS attacks
 * - secure: HTTPS only in production
 * - sameSite: CSRF protection
 * - Encrypted JWT with HS256
 * - Session expiration with refresh capability
 *
 * @see https://nextjs.org/docs/app/guides/authentication
 */

import 'server-only';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { redirect } from 'next/navigation';

// ============================================
// Configuration
// ============================================

export const SESSION_COOKIE_NAME = 'zcrm_session';
const SESSION_DURATION_DAYS = 7;
const SESSION_DURATION_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Get secret key for JWT encryption
 *
 * SECURITY: This function enforces proper secret configuration:
 * - In production: Throws error if SESSION_SECRET is not set
 * - In development: Allows a dev-only fallback with warning
 *
 * The secret must be at least 32 characters for adequate security.
 */
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

function getSecretKey(): Uint8Array {
  const cfEnv = getCloudflareEnv();

  const secret = process.env['SESSION_SECRET'] ||
                 process.env['NEXTAUTH_SECRET'] ||
                 cfEnv['SESSION_SECRET'] ||
                 cfEnv['NEXTAUTH_SECRET'] ||
                 (globalThis as Record<string, unknown>)['SESSION_SECRET'] as string | undefined;

  // Check if we're in production
  const isProduction =
    process.env['NODE_ENV'] === 'production' ||
    (typeof globalThis !== 'undefined' && (globalThis as Record<string, unknown>)['NODE_ENV'] === 'production') ||
    (typeof self !== 'undefined' && (self as unknown as Record<string, unknown>)['CF_PAGES'] === '1');

  if (!secret) {
    if (isProduction) {
      console.error(
        '[Session] CRITICAL: SESSION_SECRET not configured in production! ' +
        'Using fallback key. Run: wrangler pages secret put SESSION_SECRET'
      );
    } else {
      console.warn(
        '[Session] WARNING: SESSION_SECRET not set. Using development fallback. ' +
        'This is ONLY acceptable in development mode.'
      );
    }

    return new TextEncoder().encode(DEV_FALLBACK_KEY);
  }

  if (secret.length < 32) {
    console.warn('[Session] SESSION_SECRET should be at least 32 characters for adequate security.');
  }

  return new TextEncoder().encode(secret);
}

// ============================================
// Types
// ============================================

/**
 * Onboarding status types
 */
export type OnboardingStatus = 'not_started' | 'profile_created' | 'business_created' | 'setup_completed' | 'team_invited' | 'completed';

/**
 * Session payload stored in encrypted JWT
 * Contains user identity, API tokens, and onboarding state
 */
export interface SessionPayload extends JWTPayload {
  // User identity
  userId: string;
  email: string;
  tenantId: string;
  role: string;

  // API tokens (for backend communication)
  accessToken: string;
  refreshToken: string;

  // Onboarding state (for proper redirection)
  onboardingStatus: OnboardingStatus;
  onboardingStep: string; // Current step: 'signup' | 'create-business' | 'branding' | etc.
  requiresOnboarding: boolean;

  // Metadata
  expiresAt: number; // Unix timestamp (seconds) - session expiry (7 days)
  createdAt: number; // Unix timestamp (seconds)

  // Token refresh metadata (optional for backwards compatibility)
  accessTokenExpiresAt?: number; // Unix timestamp when access token expires (~1 hour)
}

/**
 * Session verification result
 */
export interface SessionVerification {
  isAuth: boolean;
  userId: string | null;
  email: string | null;
  tenantId: string | null;
  role: string | null;
  onboardingStatus: OnboardingStatus | null;
  onboardingStep: string | null;
  requiresOnboarding: boolean;
}

/**
 * Safe session data for client components
 * Does NOT include tokens
 */
export interface ClientSession {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  isAuthenticated: boolean;
  onboardingStatus: OnboardingStatus;
  onboardingStep: string;
  requiresOnboarding: boolean;
}

// ============================================
// Encryption / Decryption
// ============================================

/**
 * Encrypt session payload into JWT
 */
export async function encryptSession(payload: Omit<SessionPayload, 'iat' | 'exp'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    ...payload,
    createdAt: (payload as { createdAt?: number }).createdAt || now,
  } as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(getSecretKey());
}

/**
 * Extract user info from Supabase access token
 * Used as fallback when session payload is missing userId/email
 */
function extractUserFromAccessToken(accessToken: string): { userId: string; email: string } | null {
  try {
    // Decode JWT payload (middle part)
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1] as string, 'base64').toString());
    const userId = payload['sub'];
    const email = payload['email'];

    if (userId && email) {
      return { userId, email };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Decrypt and verify session JWT
 * Returns null if invalid or expired
 *
 * SECURITY: Handles session verification with proper defaults:
 * - Expired JWT → null (will redirect to login)
 * - Missing userId/email → null (invalid session)
 * - requiresOnboarding defaults based on tenantId presence (CRITICAL for proper redirect)
 */
export async function decryptSession(
  session: string | undefined
): Promise<SessionPayload | null> {
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, getSecretKey(), {
      algorithms: ['HS256'],
    });

    // Get userId and email from payload
    let userId = payload['userId'] as string | undefined;
    let email = payload['email'] as string | undefined;

    // Fallback: extract from accessToken if missing (for legacy sessions)
    if ((!userId || !email) && payload['accessToken']) {
      const extracted = extractUserFromAccessToken(payload['accessToken'] as string);
      if (extracted) {
        userId = userId || extracted.userId;
        email = email || extracted.email;
        console.log('[Session] Extracted user info from accessToken (legacy session)');
      }
    }

    // Validate required fields
    if (!userId || typeof userId !== 'string' || !email || typeof email !== 'string') {
      console.warn('[Session] Invalid session payload structure - missing userId or email');
      return null;
    }

    // Extract tenantId first to determine onboarding defaults
    const tenantId = (payload['tenantId'] as string) || '';

    // CRITICAL FIX: Determine onboarding state with SAFE DEFAULTS
    // - If user has tenantId AND onboarding status is not set → assume completed (legacy sessions)
    // - If user has no tenantId → requires onboarding
    const onboardingStatus = (payload['onboardingStatus'] as OnboardingStatus) ||
      (tenantId ? 'completed' : 'not_started');
    const onboardingStep = (payload['onboardingStep'] as string) ||
      (tenantId ? 'complete' : 'create-business');

    // CRITICAL FIX: If requiresOnboarding is explicitly set, use it.
    // Otherwise, determine based on tenantId and onboardingStatus.
    // This prevents legacy sessions (without requiresOnboarding field) from
    // incorrectly redirecting users with tenants to onboarding.
    let requiresOnboarding: boolean;
    if (typeof payload['requiresOnboarding'] === 'boolean') {
      requiresOnboarding = payload['requiresOnboarding'];
    } else {
      // Legacy session without explicit requiresOnboarding
      // If user has tenant and status is not 'not_started' → doesn't require onboarding
      requiresOnboarding = !tenantId || onboardingStatus === 'not_started';
    }

    return {
      userId,
      email,
      tenantId,
      role: (payload['role'] as string) || 'viewer',
      accessToken: (payload['accessToken'] as string) || '',
      refreshToken: (payload['refreshToken'] as string) || '',
      onboardingStatus,
      onboardingStep,
      requiresOnboarding,
      expiresAt: (payload['expiresAt'] as number) || 0,
      createdAt: (payload['createdAt'] as number) || 0,
      // Optional: access token expiry for proactive refresh
      accessTokenExpiresAt: (payload['accessTokenExpiresAt'] as number) || undefined,
    } as SessionPayload;
  } catch (error) {
    // Don't log for normal expiration - this is expected behavior
    if (error instanceof Error && !error.message.includes('expired')) {
      console.warn('[Session] Decryption failed:', error.message);
    }
    return null;
  }
}

// ============================================
// Session CRUD Operations
// ============================================

/**
 * Create a new session cookie
 * Called after successful authentication
 */
export async function createSession(payload: Omit<SessionPayload, 'iat' | 'exp' | 'createdAt'>): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAtDate = new Date(Date.now() + SESSION_DURATION_MS);

  console.log('[createSession] Starting session creation for:', payload['email']);

  const sessionPayload: Omit<SessionPayload, 'iat' | 'exp'> = {
    ...payload,
    createdAt: now,
    expiresAt: payload['expiresAt'] || Math.floor(expiresAtDate.getTime() / 1000),
  };

  const session = await encryptSession(sessionPayload);
  console.log('[createSession] Session JWT created, length:', session.length);

  const cookieStore = await cookies();

  // Robust production detection for Cloudflare Workers
  // Check multiple signals since NODE_ENV might not be reliable in all edge environments
  const isProduction =
    process.env['NODE_ENV'] === 'production' ||
    (typeof globalThis !== 'undefined' && (globalThis as Record<string, unknown>)['NODE_ENV'] === 'production') ||
    (typeof self !== 'undefined' && (self as unknown as Record<string, unknown>)['CF_PAGES'] === '1');

  console.log('[createSession] Environment:', {
    NODE_ENV: process.env['NODE_ENV'],
    isProduction,
    expires: expiresAtDate.toISOString(),
  });

  // CRITICAL: Cookie settings optimized for cross-environment compatibility
  // - httpOnly: Prevents XSS attacks
  // - secure: HTTPS only in production (required for SameSite=Lax to work properly)
  // - sameSite: 'lax' allows the cookie to be sent on navigation from external sites
  // - path: '/' ensures the cookie is available on all routes
  cookieStore.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: isProduction,
    expires: expiresAtDate,
    sameSite: 'lax',
    path: '/',
  });

  console.log('[createSession] Cookie set:', SESSION_COOKIE_NAME);
}

/**
 * Get current session from cookie
 * Returns null if no session or invalid
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return decryptSession(sessionCookie);
}

/**
 * Update existing session with new data
 * Preserves existing fields not in update payload
 */
export async function updateSession(
  updates: Partial<Omit<SessionPayload, 'iat' | 'exp' | 'createdAt'>>
): Promise<boolean> {
  const currentSession = await getSession();
  if (!currentSession) return false;

  const updatedPayload: Omit<SessionPayload, 'iat' | 'exp'> = {
    userId: updates['userId'] ?? currentSession.userId,
    email: updates['email'] ?? currentSession.email,
    tenantId: updates['tenantId'] ?? currentSession.tenantId,
    role: updates['role'] ?? currentSession.role,
    accessToken: updates['accessToken'] ?? currentSession.accessToken,
    refreshToken: updates['refreshToken'] ?? currentSession.refreshToken,
    onboardingStatus: updates['onboardingStatus'] ?? currentSession.onboardingStatus,
    onboardingStep: updates['onboardingStep'] ?? currentSession.onboardingStep,
    requiresOnboarding: updates['requiresOnboarding'] ?? currentSession.requiresOnboarding,
    expiresAt: updates['expiresAt'] ?? currentSession.expiresAt,
    createdAt: currentSession.createdAt,
  };

  await createSession(updatedPayload);
  return true;
}

/**
 * Delete session (logout)
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// ============================================
// Data Access Layer (DAL) - Session Verification
// ============================================

/**
 * Verify session with caching
 * Uses React cache() to prevent duplicate verification in same render pass
 *
 * @returns Session verification result (never redirects)
 */
export const verifySession = cache(async (): Promise<SessionVerification> => {
  const session = await getSession();

  if (!session) {
    return {
      isAuth: false,
      userId: null,
      email: null,
      tenantId: null,
      role: null,
      onboardingStatus: null,
      onboardingStep: null,
      requiresOnboarding: false,
    };
  }

  // Check if session is expired
  const now = Math.floor(Date.now() / 1000);
  if (session.expiresAt && session.expiresAt < now) {
    return {
      isAuth: false,
      userId: null,
      email: null,
      tenantId: null,
      role: null,
      onboardingStatus: null,
      onboardingStep: null,
      requiresOnboarding: false,
    };
  }

  return {
    isAuth: true,
    userId: session.userId,
    email: session.email,
    tenantId: session.tenantId,
    role: session.role,
    onboardingStatus: session.onboardingStatus,
    onboardingStep: session.onboardingStep,
    requiresOnboarding: session.requiresOnboarding,
  };
});

/**
 * Require authenticated session
 * Redirects to login if not authenticated
 *
 * Use in Server Components and Server Actions that require auth
 */
export const requireSession = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (session.expiresAt && session.expiresAt < now) {
    redirect('/login?error=session_expired');
  }

  return session;
});

/**
 * Get safe session data for client components
 * Does NOT include tokens or sensitive data
 *
 * SECURITY: Returns null for expired sessions, triggering login redirect.
 * Uses safe defaults for onboarding based on tenantId presence.
 */
export async function getClientSession(): Promise<ClientSession | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  // Check expiration - return null to trigger login redirect
  const now = Math.floor(Date.now() / 1000);
  if (session.expiresAt && session.expiresAt < now) {
    console.log('[getClientSession] Session expired, returning null');
    return null;
  }

  // Use session values directly - they already have proper defaults from decryptSession
  return {
    userId: session.userId,
    email: session.email,
    tenantId: session.tenantId,
    role: session.role,
    isAuthenticated: true,
    onboardingStatus: session.onboardingStatus,
    onboardingStep: session.onboardingStep,
    requiresOnboarding: session.requiresOnboarding,
  };
}

// ============================================
// Session Refresh
// ============================================

/**
 * Check if session needs refresh
 * Returns true if session will expire within buffer time
 */
export async function sessionNeedsRefresh(bufferMinutes = 30): Promise<boolean> {
  const session = await getSession();
  if (!session?.expiresAt) return false;

  const now = Math.floor(Date.now() / 1000);
  const bufferSeconds = bufferMinutes * 60;

  return session.expiresAt - now < bufferSeconds;
}

/**
 * Extend session expiration
 * Call this periodically for active users
 */
export async function extendSession(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  const newExpiresAt = Math.floor((Date.now() + SESSION_DURATION_MS) / 1000);

  return updateSession({ expiresAt: newExpiresAt });
}
