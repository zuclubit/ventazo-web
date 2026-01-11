// ============================================
// Auth Service - SSO Backend Integration
// All authentication goes through Zuclubit SSO
// ============================================

import {
  setTokens,
  getTokens,
  clearTokens,
  setRefreshCallback,
} from './token-manager';
import {
  setAuthCookies,
  getAuthCookies,
  clearAuthCookies,
} from './cookie-manager';
import {
  type AuthUser,
  type AuthTokens,
  type LoginResponse,
  type TenantMembership,
  type Tenant,
  type Permission,
  type UserRole,
  AuthError,
  AuthErrorCode,
  ROLE_PERMISSIONS,
} from './types';

// API base URL
// Remove /api/v1 suffix if present since we add the full path in fetch calls
const rawApiUrl = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3000';
const API_URL = rawApiUrl.replace(/\/api\/v1\/?$/, '');

/**
 * Backend API response types
 */
interface BackendRefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
}

/**
 * Fetch user profile from backend
 */
async function fetchUserProfile(
  accessToken: string,
  tenantId: string
): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new AuthError(
      AuthErrorCode.INVALID_CREDENTIALS,
      error.message || 'Failed to fetch user profile',
      error
    );
  }

  const data = await response.json();
  return data.data || data;
}

/**
 * Fetch full tenant details including branding
 */
export async function fetchTenantDetails(
  accessToken: string,
  tenantId: string
): Promise<Tenant | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/tenant`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('Failed to fetch tenant details:', response.status);
      return null;
    }

    const data = await response.json();

    // Map backend response to Tenant type
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      plan: data.plan || 'free',
      isActive: data.isActive ?? true,
      settings: data.settings,
      metadata: data.metadata,
      createdAt: data.createdAt,
    };
  } catch (error) {
    console.warn('Error fetching tenant details:', error);
    return null;
  }
}

/**
 * Fetch user's tenants from backend
 */
async function fetchUserTenants(
  accessToken: string
): Promise<TenantMembership[]> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/tenants`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Return empty array if tenants endpoint fails
      console.warn('Failed to fetch tenants:', response.status);
      return [];
    }

    const data = await response.json();

    // Handle different response formats
    // 1. { memberships: [...] } - new format
    // 2. { data: [...] } - wrapped format
    // 3. [...] - direct array format
    if (data.memberships && Array.isArray(data.memberships)) {
      return data.memberships.map((m: { tenantId: string; tenantName: string; role: string; isActive: boolean }) => ({
        tenantId: m.tenantId,
        tenantName: m.tenantName,
        tenantSlug: '',
        role: m.role,
        isActive: m.isActive,
      }));
    }
    if (data.data && Array.isArray(data.data)) {
      return data.data;
    }
    if (Array.isArray(data)) {
      return data;
    }

    return [];
  } catch (error) {
    console.warn('Error fetching tenants:', error);
    return [];
  }
}

/**
 * Get permissions for a role
 */
function getPermissionsForRole(role: string): Permission[] {
  const normalizedRole = role.toLowerCase() as keyof typeof ROLE_PERMISSIONS;
  return [...(ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.viewer)];
}

/**
 * Refresh token via backend
 */
async function refreshTokenViaBackend(refreshToken: string): Promise<AuthTokens | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const data: BackendRefreshResponse = await response.json();
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      expiresAt: data.expiresAt,
    };
  } catch (error) {
    console.warn('Token refresh failed:', error);
    return null;
  }
}

/**
 * Parse JWT to extract payload
 */
function parseJwtPayload(token: string): { exp?: number; sub?: string; email?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return {};
    const payload = parts[1];
    if (!payload) return {};
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64);
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

/**
 * Parse JWT to extract expiry
 */
function getExpiryFromToken(token: string): number {
  const payload = parseJwtPayload(token);
  return typeof payload.exp === 'number' ? payload.exp : 0;
}

/**
 * Logout - revoke tokens and clear session
 */
export async function logout(): Promise<void> {
  try {
    const tokens = getTokens();
    if (tokens?.accessToken) {
      await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
      }).catch(() => {
        // Ignore errors on logout
      });
    }
  } finally {
    clearTokens();
    clearAuthCookies();
    setRefreshCallback(null);
  }
}

/**
 * Restore session from stored tokens (memory or cookies)
 * Used after SSO callback to hydrate auth state
 */
export async function restoreSession(
  tenantId?: string
): Promise<LoginResponse | null> {
  try {
    // First try memory tokens
    let tokens = getTokens();

    // If no memory tokens, try cookies
    if (!tokens?.accessToken) {
      const cookieTokens = getAuthCookies();
      if (cookieTokens.accessToken && cookieTokens.refreshToken) {
        // Parse expiry from the access token JWT
        const expiresAt = getExpiryFromToken(cookieTokens.accessToken);
        const now = Math.floor(Date.now() / 1000);

        // Restore to memory from cookies
        tokens = {
          accessToken: cookieTokens.accessToken,
          refreshToken: cookieTokens.refreshToken,
          expiresAt: expiresAt,
          expiresIn: expiresAt > 0 ? expiresAt - now : 0,
        };
        setTokens(tokens);
      }
    }

    if (!tokens?.accessToken) return null;

    // Check if token is expired (or unknown expiry from cookies)
    const now = Math.floor(Date.now() / 1000);
    if (!tokens.expiresAt || tokens.expiresAt < now) {
      // Try to refresh
      if (tokens.refreshToken) {
        const newTokens = await refreshTokenViaBackend(tokens.refreshToken);
        if (!newTokens) {
          clearTokens();
          clearAuthCookies();
          return null;
        }
        setTokens(newTokens);
        setAuthCookies({
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresIn: newTokens.expiresIn,
        });
        tokens.accessToken = newTokens.accessToken;
        tokens.refreshToken = newTokens.refreshToken;
        tokens.expiresAt = newTokens.expiresAt;
        tokens.expiresIn = newTokens.expiresIn;
      } else {
        clearTokens();
        clearAuthCookies();
        return null;
      }
    }

    // Setup refresh callback
    setRefreshCallback(async () => {
      const currentTokens = getTokens();
      if (!currentTokens?.refreshToken) return null;
      return refreshTokenViaBackend(currentTokens.refreshToken);
    });

    // Fetch user's tenants
    const tenants = await fetchUserTenants(tokens.accessToken);

    // Determine tenant
    let selectedTenantId = tenantId;
    if (!selectedTenantId && tenants.length > 0) {
      const activeTenant = tenants.find((t) => t.isActive);
      selectedTenantId = activeTenant?.tenantId || tenants[0]?.tenantId;
    }

    if (!selectedTenantId) {
      // User has no tenant access - this is ok for new users
      return {
        user: {
          id: '',
          email: '',
          tenantId: '',
          role: 'viewer' as UserRole,
          permissions: [],
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        tokens,
        tenants: [],
      };
    }

    // Fetch user profile - handle failures gracefully
    try {
      const authUser = await fetchUserProfile(tokens.accessToken, selectedTenantId);

      return {
        user: {
          ...authUser,
          permissions: getPermissionsForRole(authUser.role),
        },
        tokens,
        tenants,
      };
    } catch (profileError) {
      console.warn('Failed to fetch user profile, using JWT info:', profileError);
      // Return user info from JWT if profile fetch fails
      const jwtPayload = parseJwtPayload(tokens.accessToken);
      const membership = tenants.find((t) => t.tenantId === selectedTenantId);
      const role = (membership?.role || 'viewer') as UserRole;
      return {
        user: {
          id: jwtPayload.sub || '',
          email: jwtPayload.email || '',
          tenantId: selectedTenantId,
          role,
          permissions: getPermissionsForRole(role),
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        tokens,
        tenants,
      };
    }
  } catch (error) {
    console.warn('Session restoration failed:', error);
    clearTokens();
    clearAuthCookies();
    return null;
  }
}

/**
 * Switch tenant
 */
export async function switchTenant(
  tenantId: string,
  accessToken: string
): Promise<AuthUser> {
  const authUser = await fetchUserProfile(accessToken, tenantId);
  return {
    ...authUser,
    permissions: getPermissionsForRole(authUser.role),
  };
}

/**
 * Subscribe to auth state changes
 * No-op - auth state is managed via token-manager
 */
export function subscribeToAuthChanges(
  _callback: (event: string) => void
): () => void {
  // No-op - auth state is managed locally via tokens
  // Return unsubscribe function
  return () => {};
}
