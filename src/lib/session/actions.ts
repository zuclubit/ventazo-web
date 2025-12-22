'use server';

/**
 * Authentication Server Actions - Unified Auth System
 *
 * All authentication operations run ONLY on the server.
 * This provides:
 * - Secure credential handling
 * - Direct backend API communication
 * - Session cookie management
 * - No client-side token exposure
 *
 * @see https://nextjs.org/docs/app/guides/authentication
 */

import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  createSession,
  deleteSession,
  getSession,
  updateSession,
  getClientSession,
  type SessionPayload,
  type ClientSession,
} from './index';

// ============================================
// Configuration
// ============================================

// For Server Actions (edge runtime), use API_URL secret
// For client-side, NEXT_PUBLIC_API_URL is embedded at build time
const API_URL = process.env['API_URL'] || process.env['NEXT_PUBLIC_API_URL'] || 'https://zuclubit-lead-service.fly.dev';

// ============================================
// Validation Schemas
// ============================================

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

// ============================================
// Response Types
// ============================================

export interface AuthResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  redirectTo?: string;
}

export interface RegisterResult {
  success: boolean;
  error?: string;
  confirmationRequired?: boolean;
}

// ============================================
// Backend API Response Types
// ============================================

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

// ============================================
// Login Action
// ============================================

/**
 * Authenticate user with email/password
 * Creates encrypted session cookie on success
 */
export async function loginAction(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    // 1. Validate input
    const validation = LoginSchema.safeParse({ email, password });
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Invalid input',
      };
    }

    // Log API URL for debugging
    console.log('[LoginAction] Calling API:', `${API_URL}/api/v1/auth/login`);

    // 2. Authenticate with backend API
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });

    console.log('[LoginAction] Response status:', response.status);

    const data = await response.json();
    console.log('[LoginAction] Response data keys:', Object.keys(data));

    // 3. Handle errors
    if (!response.ok) {
      // Handle specific error codes
      if (data.code === 'EMAIL_NOT_CONFIRMED') {
        return {
          success: false,
          error: 'EMAIL_NOT_CONFIRMED',
          errorCode: 'EMAIL_NOT_CONFIRMED',
        };
      }

      return {
        success: false,
        error: data.message || 'Invalid email or password',
      };
    }

    // 4. Extract session data
    const loginData = data as BackendLoginResponse;

    // Determine tenant and role
    let tenantId = '';
    let role = 'viewer';

    if (loginData.tenants && loginData.tenants.length > 0) {
      const firstTenant = loginData.tenants[0];
      if (firstTenant) {
        tenantId = firstTenant.id;
        role = firstTenant.role || 'viewer';
      }
    }

    // 5. Create encrypted session cookie
    await createSession({
      userId: loginData.user.id,
      email: loginData.user.email,
      tenantId,
      role,
      accessToken: loginData.session.accessToken,
      refreshToken: loginData.session.refreshToken,
      expiresAt: loginData.session.expiresAt,
    });

    // 6. Determine redirect
    let redirectTo = '/app';
    if (!tenantId) {
      // New user without tenant - go to onboarding
      redirectTo = '/onboarding/create-business';
    }

    return { success: true, redirectTo };
  } catch (error) {
    console.error('[LoginAction] Error:', error);
    // Return more detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Connection error: ${errorMessage}`,
    };
  }
}

// ============================================
// Register Action
// ============================================

/**
 * Register new user
 * Does NOT create session (requires email confirmation)
 */
export async function registerAction(
  email: string,
  password: string,
  fullName?: string
): Promise<RegisterResult> {
  try {
    // 1. Validate input
    const validation = RegisterSchema.safeParse({ email, password, fullName });
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Invalid input',
      };
    }

    // 2. Register with backend API
    const response = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, fullName }),
      cache: 'no-store',
    });

    const data = await response.json();

    // 3. Handle errors
    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Registration failed',
      };
    }

    // 4. Return success
    const registerData = data as BackendRegisterResponse;

    return {
      success: true,
      confirmationRequired: registerData.confirmationRequired ?? true,
    };
  } catch (error) {
    console.error('[RegisterAction] Error:', error);
    return {
      success: false,
      error: 'Connection error. Please try again.',
    };
  }
}

// ============================================
// Logout Action
// ============================================

/**
 * Logout user
 * Deletes session cookie and notifies backend
 */
export async function logoutAction(): Promise<void> {
  const session = await getSession();

  // Notify backend (best effort)
  if (session?.accessToken) {
    try {
      await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch {
      // Ignore errors - logout should succeed locally
    }
  }

  await deleteSession();
  redirect('/login');
}

// ============================================
// Token Refresh Action
// ============================================

/**
 * Refresh authentication tokens
 * Updates session with new tokens from backend
 */
export async function refreshSessionAction(): Promise<boolean> {
  const session = await getSession();

  if (!session?.refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      cache: 'no-store',
    });

    if (!response.ok) {
      // Refresh failed - session is invalid
      await deleteSession();
      return false;
    }

    const data = (await response.json()) as BackendRefreshResponse;

    // Update session with new tokens
    await updateSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
    });

    return true;
  } catch (error) {
    console.error('[RefreshSessionAction] Error:', error);
    return false;
  }
}

// ============================================
// Password Reset Actions
// ============================================

/**
 * Request password reset email
 * Always returns success to prevent email enumeration
 */
export async function requestPasswordResetAction(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
      cache: 'no-store',
    });
  } catch {
    // Ignore errors
  }

  // Always return success to not reveal email existence
  return {
    success: true,
    message: 'If an account exists with this email, a reset link has been sent.',
  };
}

/**
 * Reset password with token
 */
export async function resetPasswordAction(
  token: string,
  newPassword: string
): Promise<AuthResult> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, password: newPassword }),
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Password reset failed',
      };
    }

    return { success: true, redirectTo: '/login' };
  } catch (error) {
    console.error('[ResetPasswordAction] Error:', error);
    return {
      success: false,
      error: 'Connection error. Please try again.',
    };
  }
}

/**
 * Update password for authenticated user
 */
export async function updatePasswordAction(
  currentPassword: string,
  newPassword: string
): Promise<AuthResult> {
  const session = await getSession();

  if (!session?.accessToken) {
    return {
      success: false,
      error: 'Not authenticated',
    };
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/auth/update-password`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword, password: newPassword }),
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Password update failed',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[UpdatePasswordAction] Error:', error);
    return {
      success: false,
      error: 'Connection error. Please try again.',
    };
  }
}

// ============================================
// Email Confirmation Actions
// ============================================

/**
 * Resend email confirmation
 * Always returns success to prevent email enumeration
 */
export async function resendConfirmationAction(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    await fetch(`${API_URL}/api/v1/auth/resend-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
      cache: 'no-store',
    });
  } catch {
    // Ignore errors
  }

  // Always return success
  return {
    success: true,
    message: 'If the email exists and is unconfirmed, a new confirmation link has been sent.',
  };
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
 */
export async function checkAuth(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

/**
 * Get current access token for API calls
 * Used by API client for backend requests
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.accessToken ?? null;
}

/**
 * Get tenant ID for current session
 */
export async function getCurrentTenantId(): Promise<string | null> {
  const session = await getSession();
  return session?.tenantId ?? null;
}

// ============================================
// Tenant Actions
// ============================================

/**
 * Switch to a different tenant
 */
export async function switchTenantAction(tenantId: string): Promise<AuthResult> {
  const session = await getSession();

  if (!session?.accessToken) {
    return {
      success: false,
      error: 'Not authenticated',
    };
  }

  try {
    // Fetch user profile for new tenant to get role
    const response = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Unable to switch tenant',
      };
    }

    const userData = await response.json();
    const user = userData.data || userData;

    // Update session with new tenant
    await updateSession({
      tenantId,
      role: user.role || 'viewer',
    });

    return { success: true };
  } catch (error) {
    console.error('[SwitchTenantAction] Error:', error);
    return {
      success: false,
      error: 'Connection error. Please try again.',
    };
  }
}

// ============================================
// Onboarding Actions
// ============================================

/**
 * Create tenant (business) during onboarding
 * Uses authenticated session to create the tenant
 */
export async function createTenantAction(data: {
  businessName: string;
  businessType: string;
  businessSize: string;
  phone: string;
  country: string;
  city: string;
  timezone: string;
}): Promise<AuthResult & { tenantId?: string }> {
  const session = await getSession();

  if (!session?.accessToken) {
    return {
      success: false,
      error: 'No estás autenticado. Por favor inicia sesión nuevamente.',
    };
  }

  try {
    // Generate slug from business name
    const slug = data.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);

    console.log('[CreateTenantAction] Creating tenant:', { name: data.businessName, slug });

    const response = await fetch(`${API_URL}/api/v1/auth/tenants`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.businessName,
        slug: `${slug}-${Date.now().toString(36)}`, // Add unique suffix
        settings: {
          businessType: data.businessType,
          businessSize: data.businessSize,
          phone: data.phone,
          country: data.country,
          city: data.city,
          timezone: data.timezone,
          currency: 'MXN',
          locale: 'es-MX',
        },
      }),
      cache: 'no-store',
    });

    console.log('[CreateTenantAction] Response status:', response.status);

    const result = await response.json();
    console.log('[CreateTenantAction] Response:', JSON.stringify(result).substring(0, 200));

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Error al crear el negocio',
      };
    }

    const tenantId = result.tenantId || result.id || result.tenant?.id;

    if (!tenantId) {
      return {
        success: false,
        error: 'No se pudo obtener el ID del tenant',
      };
    }

    // Update session with new tenant
    await updateSession({
      tenantId,
      role: 'owner',
    });

    return {
      success: true,
      tenantId,
      redirectTo: '/onboarding/setup',
    };
  } catch (error) {
    console.error('[CreateTenantAction] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Error de conexión: ${errorMessage}`,
    };
  }
}

/**
 * Get current session user data for client components
 * Used by onboarding to check if user is logged in
 */
export async function getSessionUserAction(): Promise<{
  userId: string;
  email: string;
  tenantId: string;
  role: string;
} | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return {
    userId: session.userId,
    email: session.email,
    tenantId: session.tenantId,
    role: session.role,
  };
}
