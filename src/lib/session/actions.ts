'use server';

/**
 * Session Server Actions - SSO Only
 *
 * All authentication is handled via Zuclubit SSO.
 * These actions manage session operations for SSO-authenticated users.
 *
 * Features:
 * - Session validation with real access token expiration check
 * - Smart token refresh (only when needed)
 * - Secure logout with SSO token revocation
 *
 * @see https://nextjs.org/docs/app/guides/authentication
 * @see middleware.ts for automatic refresh during navigation
 */

import { redirect } from 'next/navigation';
import {
  createSession,
  deleteSession,
  getSession,
  updateSession,
  getClientSession,
  type SessionPayload,
  type ClientSession,
} from './index';
import { revokeToken, refreshAccessToken } from '@/lib/auth/sso-config';

// ============================================
// Configuration
// ============================================

/**
 * Buffer time before token expiry to trigger refresh (5 minutes)
 * This should match the middleware configuration
 */
const TOKEN_REFRESH_BUFFER_SECONDS = 5 * 60;

// ============================================
// Response Types
// ============================================

export interface AuthResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
}

export interface SessionStatus {
  isValid: boolean;
  needsRefresh: boolean;
  expiresIn: number | null;
  error?: string;
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
    const decoded = Buffer.from(base64 + padding, 'base64').toString('utf8');

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Get token expiration timestamp from JWT
 * Returns null if token is invalid or doesn't have exp claim
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

/**
 * Calculate seconds until token expires
 * Returns negative value if already expired, null if unknown
 */
function getSecondsUntilExpiry(accessToken: string): number | null {
  const expiry = getTokenExpiry(accessToken);
  if (!expiry) return null;

  const now = Math.floor(Date.now() / 1000);
  return expiry - now;
}

// ============================================
// Logout Action
// ============================================

/**
 * Logout user
 * Revokes tokens at SSO server and deletes local session
 */
export async function logoutAction(): Promise<void> {
  const session = await getSession();

  if (session) {
    // Revoke tokens at SSO server
    try {
      if (session.refreshToken) {
        await revokeToken(session.refreshToken, 'refresh_token');
      }
      if (session.accessToken) {
        await revokeToken(session.accessToken, 'access_token');
      }
    } catch (error) {
      console.warn('[LogoutAction] SSO token revocation failed:', error);
    }
  }

  await deleteSession();
  redirect('/login');
}

// ============================================
// Token Refresh Actions
// ============================================

/**
 * Refresh authentication tokens
 * Uses SSO token endpoint to get new tokens
 *
 * This function checks if refresh is actually needed before making the call,
 * preventing unnecessary token rotation and network requests.
 */
export async function refreshSessionAction(): Promise<boolean> {
  const session = await getSession();

  if (!session?.refreshToken) {
    console.warn('[RefreshSessionAction] No refresh token available');
    return false;
  }

  if (!session.accessToken) {
    console.warn('[RefreshSessionAction] No access token in session');
    return false;
  }

  // Check if refresh is actually needed
  if (!tokenNeedsRefresh(session.accessToken)) {
    // Token is still valid, no refresh needed
    const expiresIn = getSecondsUntilExpiry(session.accessToken);
    console.log(`[RefreshSessionAction] Token still valid for ${expiresIn}s, skipping refresh`);
    return true;
  }

  try {
    console.log('[RefreshSessionAction] Refreshing tokens...');
    const tokens = await refreshAccessToken(session.refreshToken);

    // Get new expiration from the refreshed access token
    const newExpiry = getTokenExpiry(tokens.accessToken);
    const now = Math.floor(Date.now() / 1000);

    await updateSession({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: newExpiry || (now + tokens.expiresIn),
    });

    console.log('[RefreshSessionAction] Tokens refreshed successfully');
    return true;
  } catch (error) {
    console.error('[RefreshSessionAction] Error:', error);
    // Delete session on refresh failure - forces re-login
    await deleteSession();
    return false;
  }
}

/**
 * Force refresh tokens regardless of expiration status
 * Use this when you need to ensure fresh tokens (e.g., before sensitive operations)
 */
export async function forceRefreshSession(): Promise<boolean> {
  const session = await getSession();

  if (!session?.refreshToken) {
    return false;
  }

  try {
    const tokens = await refreshAccessToken(session.refreshToken);
    const newExpiry = getTokenExpiry(tokens.accessToken);
    const now = Math.floor(Date.now() / 1000);

    await updateSession({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: newExpiry || (now + tokens.expiresIn),
    });

    return true;
  } catch (error) {
    console.error('[ForceRefreshSession] Error:', error);
    return false;
  }
}

// ============================================
// Session Status Actions
// ============================================

/**
 * Get detailed session status
 * Useful for debugging and monitoring session health
 */
export async function getSessionStatus(): Promise<SessionStatus> {
  const session = await getSession();

  if (!session) {
    return {
      isValid: false,
      needsRefresh: false,
      expiresIn: null,
      error: 'No session found',
    };
  }

  if (!session.accessToken) {
    return {
      isValid: false,
      needsRefresh: false,
      expiresIn: null,
      error: 'No access token in session',
    };
  }

  const expiresIn = getSecondsUntilExpiry(session.accessToken);
  const needsRefresh = tokenNeedsRefresh(session.accessToken);

  return {
    isValid: !needsRefresh || !!session.refreshToken,
    needsRefresh,
    expiresIn,
    error: undefined,
  };
}

/**
 * Check and refresh session if needed
 * Returns the current session status after any necessary refresh
 */
export async function checkAndRefreshSession(): Promise<SessionStatus> {
  const initialStatus = await getSessionStatus();

  if (!initialStatus.isValid && !initialStatus.needsRefresh) {
    return initialStatus;
  }

  if (initialStatus.needsRefresh) {
    const refreshed = await refreshSessionAction();
    if (!refreshed) {
      return {
        isValid: false,
        needsRefresh: false,
        expiresIn: null,
        error: 'Token refresh failed',
      };
    }
    // Return updated status after refresh
    return getSessionStatus();
  }

  return initialStatus;
}

// ============================================
// Session Data Actions
// ============================================

/**
 * Get current user data for client components
 * Returns safe data only (no tokens)
 */
export async function getCurrentUser(): Promise<ClientSession | null> {
  return getClientSession();
}

/**
 * Check if user is authenticated
 * Also verifies that the session has valid tokens
 */
export async function checkAuth(): Promise<boolean> {
  const session = await getSession();

  if (!session?.accessToken) {
    return false;
  }

  // Check if token is completely expired (past buffer)
  const expiry = getTokenExpiry(session.accessToken);
  if (expiry) {
    const now = Math.floor(Date.now() / 1000);
    // Session is invalid if token expired AND no refresh token
    if (expiry < now && !session.refreshToken) {
      return false;
    }
  }

  return true;
}

/**
 * Get current access token for API calls
 * Optionally refreshes if token is expiring soon
 *
 * @param autoRefresh - Whether to automatically refresh if needed (default: true)
 */
export async function getAccessToken(autoRefresh = true): Promise<string | null> {
  const session = await getSession();

  if (!session?.accessToken) {
    return null;
  }

  // Optionally refresh before returning
  if (autoRefresh && tokenNeedsRefresh(session.accessToken)) {
    const refreshed = await refreshSessionAction();
    if (refreshed) {
      const updatedSession = await getSession();
      return updatedSession?.accessToken ?? null;
    }
    // If refresh failed, return null (session is invalid)
    return null;
  }

  return session.accessToken;
}

/**
 * Get tenant ID for current session
 */
export async function getCurrentTenantId(): Promise<string | null> {
  const session = await getSession();
  return session?.tenantId ?? null;
}

/**
 * Get current session user data
 */
export async function getSessionUserAction(): Promise<{
  userId: string;
  email: string;
  tenantId: string;
  tenantSlug?: string;
  role: string;
  permissions?: string[];
} | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return {
    userId: session.userId,
    email: session.email,
    tenantId: session.tenantId,
    tenantSlug: session.tenantSlug,
    role: session.role,
    permissions: session.permissions,
  };
}

// ============================================
// Tenant Actions
// ============================================

/**
 * Update session with new tenant
 * Called after user selects/creates a tenant
 */
export async function updateTenantInSession(
  tenantId: string,
  tenantSlug?: string,
  role?: string
): Promise<boolean> {
  return updateSession({
    tenantId,
    tenantSlug,
    role: role || 'viewer',
  });
}
