// ============================================
// Auth Service - Backend Integration
// All authentication goes through the backend API
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
  type LoginCredentials,
  type LoginResponse,
  type RegisterCredentials,
  type TenantMembership,
  type Permission,
  type UserRole,
  AuthError,
  AuthErrorCode,
  ROLE_PERMISSIONS,
} from './types';

// API base URL
const API_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3000';

/**
 * Backend API response types
 */
interface BackendLoginResponse {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    phone: string | null;
    isActive: boolean;
    metadata: Record<string, unknown>;
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
}

interface BackendRegisterResponse {
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
  } | null;
  confirmationRequired: boolean;
}

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
 * Login with email and password
 */
export async function login(
  credentials: LoginCredentials,
  tenantId?: string
): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error codes
      if (data.code === 'EMAIL_NOT_CONFIRMED') {
        throw new AuthError(
          AuthErrorCode.EMAIL_NOT_CONFIRMED,
          'Please verify your email address before logging in'
        );
      }
      throw new AuthError(
        AuthErrorCode.INVALID_CREDENTIALS,
        data.message || 'Invalid email or password'
      );
    }

    const loginData = data as BackendLoginResponse;

    // Create tokens object
    const tokens: AuthTokens = {
      accessToken: loginData.session.accessToken,
      refreshToken: loginData.session.refreshToken,
      expiresIn: loginData.session.expiresIn,
      expiresAt: loginData.session.expiresAt,
    };

    // Store tokens in memory and cookies
    setTokens(tokens);
    setAuthCookies({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });

    // Setup refresh callback
    setRefreshCallback(async () => {
      const currentTokens = getTokens();
      if (!currentTokens?.refreshToken) return null;
      return refreshTokenViaBackend(currentTokens.refreshToken);
    });

    // Map tenants to TenantMembership format
    const tenants: TenantMembership[] = loginData.tenants.map((t) => ({
      id: t.id,
      tenantId: t.id,
      tenant: {
        id: t.id,
        name: t.name,
        slug: t.slug,
        plan: 'pro' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      role: t.role as UserRole,
      isActive: true,
    }));

    // Determine which tenant to use
    let selectedTenantId = tenantId;
    if (!selectedTenantId && tenants.length > 0) {
      const firstTenant = tenants[0];
      if (firstTenant) {
        selectedTenantId = firstTenant.tenantId;
      }
    }

    // Find selected tenant role
    const selectedTenant = tenants.find((t) => t.tenantId === selectedTenantId);
    const selectedRole = selectedTenant?.role || 'viewer';

    // Build auth user
    const authUser: AuthUser = {
      id: loginData.user.id,
      email: loginData.user.email,
      fullName: loginData.user.fullName ?? undefined,
      avatarUrl: loginData.user.avatarUrl ?? undefined,
      tenantId: selectedTenantId || '',
      role: selectedRole as UserRole,
      permissions: getPermissionsForRole(selectedRole as UserRole),
      isActive: loginData.user.isActive,
      createdAt: new Date().toISOString(),
    };

    return {
      user: authUser,
      tokens,
      tenants,
    };
  } catch (error) {
    clearTokens();
    if (error instanceof AuthError) throw error;

    const message = error instanceof Error ? error.message : 'Login failed';
    throw new AuthError(AuthErrorCode.INVALID_CREDENTIALS, message, error);
  }
}

/**
 * Register new user
 */
export async function register(
  credentials: RegisterCredentials
): Promise<{ message: string; confirmationRequired: boolean }> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        fullName: credentials.fullName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new AuthError(
        AuthErrorCode.EMAIL_EXISTS,
        data.message || 'Registration failed'
      );
    }

    const registerData = data as BackendRegisterResponse;

    return {
      message: registerData.confirmationRequired
        ? 'Registration successful. Please check your email to verify your account.'
        : 'Registration successful.',
      confirmationRequired: registerData.confirmationRequired,
    };
  } catch (error) {
    if (error instanceof AuthError) throw error;

    const message = error instanceof Error ? error.message : 'Registration failed';
    throw new AuthError(AuthErrorCode.UNKNOWN_ERROR, message, error);
  }
}

/**
 * Logout
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
 * Restore session from stored tokens (memory or cookies)
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
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  // Always succeed to not reveal if email exists
}

/**
 * Resend confirmation email
 */
export async function resendConfirmationEmail(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/resend-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    return {
      success: true,
      message: data.message || 'Confirmation email sent',
    };
  } catch {
    // Always return success to not reveal email status
    return {
      success: true,
      message: 'If the email exists and is unconfirmed, a new confirmation link will be sent.',
    };
  }
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const tokens = getTokens();
  if (!tokens?.accessToken) {
    throw new AuthError(AuthErrorCode.SESSION_EXPIRED, 'No active session');
  }

  const response = await fetch(`${API_URL}/api/v1/auth/update-password`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password: newPassword }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new AuthError(
      AuthErrorCode.UNKNOWN_ERROR,
      data.message || 'Failed to update password'
    );
  }
}

/**
 * Subscribe to auth state changes
 * Since we're not using Supabase client-side anymore, this is a no-op
 * The auth state is managed via token-manager
 */
export function subscribeToAuthChanges(
  callback: (event: string) => void
): () => void {
  // No-op - auth state is managed locally via tokens
  // Return unsubscribe function
  return () => {};
}
