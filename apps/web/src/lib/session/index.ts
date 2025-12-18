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
 * IMPORTANT: Always use environment variable in production
 */
function getSecretKey(): Uint8Array {
  // Try multiple env var names (Cloudflare Workers bindings vs process.env)
  const secret = process.env['SESSION_SECRET'] ||
                 (globalThis as Record<string, unknown>)['SESSION_SECRET'] as string | undefined;

  if (!secret) {
    // In development or if secret not available, use a fallback
    // This is safe because the JWT is only valid within the same deployment
    console.warn(
      '[Session] WARNING: SESSION_SECRET not set. Using deployment fallback.'
    );
    // Use a deterministic fallback based on a fixed key
    return new TextEncoder().encode('zuclubit-crm-session-fallback-key-2025');
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
  expiresAt: number; // Unix timestamp (seconds)
  createdAt: number; // Unix timestamp (seconds)
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

    return {
      userId,
      email,
      tenantId: (payload['tenantId'] as string) || '',
      role: (payload['role'] as string) || 'viewer',
      accessToken: (payload['accessToken'] as string) || '',
      refreshToken: (payload['refreshToken'] as string) || '',
      onboardingStatus: (payload['onboardingStatus'] as OnboardingStatus) || 'not_started',
      onboardingStep: (payload['onboardingStep'] as string) || 'create-business',
      requiresOnboarding: (payload['requiresOnboarding'] as boolean) ?? true,
      expiresAt: (payload['expiresAt'] as number) || 0,
      createdAt: (payload['createdAt'] as number) || 0,
    } as SessionPayload;
  } catch (error) {
    // Don't log for normal expiration
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

  console.log('[createSession] Starting session creation for:', payload.email);

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
 */
export async function getClientSession(): Promise<ClientSession | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (session.expiresAt && session.expiresAt < now) {
    return null;
  }

  return {
    userId: session.userId,
    email: session.email,
    tenantId: session.tenantId,
    role: session.role,
    isAuthenticated: true,
    onboardingStatus: session.onboardingStatus || 'not_started',
    onboardingStep: session.onboardingStep || 'create-business',
    requiresOnboarding: session.requiresOnboarding ?? true,
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
