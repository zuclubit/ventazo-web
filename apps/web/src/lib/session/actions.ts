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
// Remove /api/v1 suffix if present since we add the full path in fetch calls
const rawApiUrl = process.env['API_URL'] || process.env['NEXT_PUBLIC_API_URL'] || 'https://zuclubit-lead-service.fly.dev';
const API_URL = rawApiUrl.replace(/\/api\/v1\/?$/, '');

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
  // Onboarding status for proper redirection
  onboarding: {
    status: 'not_started' | 'profile_created' | 'business_created' | 'setup_completed' | 'team_invited' | 'completed';
    currentStep: string;
    completedSteps: string[];
    requiresOnboarding: boolean;
  };
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

    // Extract onboarding status from backend response
    // Default to requiresOnboarding=true if no onboarding data
    const onboarding = loginData.onboarding || {
      status: 'not_started' as const,
      currentStep: tenantId ? 'branding' : 'create-business',
      completedSteps: [],
      requiresOnboarding: true,
    };

    // If user has tenants but no explicit onboarding status, check if they need onboarding
    // A user with a tenant but incomplete onboarding should continue where they left off
    const requiresOnboarding = onboarding.requiresOnboarding;
    const onboardingStatus = onboarding.status;
    const currentStep = onboarding.currentStep;

    console.log('[LoginAction] Onboarding state:', {
      status: onboardingStatus,
      currentStep,
      requiresOnboarding,
      hasTenants: !!tenantId,
    });

    // 5. Create encrypted session cookie with onboarding state
    console.log('[LoginAction] Creating session with:', {
      userId: loginData.user.id,
      email: loginData.user.email,
      tenantId,
      role,
      onboardingStatus,
      currentStep,
      requiresOnboarding,
    });

    try {
      await createSession({
        userId: loginData.user.id,
        email: loginData.user.email,
        tenantId,
        role,
        accessToken: loginData.session.accessToken,
        refreshToken: loginData.session.refreshToken,
        expiresAt: loginData.session.expiresAt,
        onboardingStatus: onboardingStatus,
        onboardingStep: currentStep,
        requiresOnboarding: requiresOnboarding,
      });
      console.log('[LoginAction] Session cookie created successfully');
    } catch (sessionError) {
      console.error('[LoginAction] Failed to create session cookie:', sessionError);
      throw sessionError;
    }

    // 6. Determine redirect based on onboarding status
    // NOTE: We use /app/dashboard instead of /app due to OpenNext routing bug
    // where /app conflicts with App Router's app folder naming
    let redirectTo = '/app/dashboard';

    if (requiresOnboarding) {
      // User needs to complete onboarding - redirect to the appropriate step
      switch (currentStep) {
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
          // If no tenant, start from create-business
          // If has tenant, continue with setup
          redirectTo = tenantId ? '/onboarding/setup' : '/onboarding/create-business';
      }
    }

    console.log('[LoginAction] Redirecting to:', redirectTo);

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

    // Update session with new tenant and advance onboarding
    await updateSession({
      tenantId,
      role: 'owner',
      onboardingStatus: 'business_created',
      onboardingStep: 'branding',
      requiresOnboarding: true, // Still needs to complete setup
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

// ============================================
// Onboarding Setup Actions
// ============================================

/**
 * Update tenant branding during onboarding
 */
export async function updateTenantBrandingAction(
  tenantId: string,
  data: {
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    companyEmail?: string;
  }
): Promise<AuthResult> {
  const session = await getSession();

  if (!session?.accessToken) {
    return {
      success: false,
      error: 'No estás autenticado. Por favor inicia sesión nuevamente.',
    };
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/tenant/branding`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify(data),
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      return {
        success: false,
        error: error.message || 'Error al actualizar el branding',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[UpdateTenantBrandingAction] Error:', error);
    return {
      success: false,
      error: 'Error de conexión. Por favor intenta de nuevo.',
    };
  }
}

/**
 * Update tenant modules during onboarding
 */
export async function updateTenantModulesAction(
  tenantId: string,
  modules: Record<string, boolean>
): Promise<AuthResult> {
  const session = await getSession();

  if (!session?.accessToken) {
    return {
      success: false,
      error: 'No estás autenticado. Por favor inicia sesión nuevamente.',
    };
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/tenant/modules`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify(modules),
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      return {
        success: false,
        error: error.message || 'Error al actualizar los módulos',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[UpdateTenantModulesAction] Error:', error);
    return {
      success: false,
      error: 'Error de conexión. Por favor intenta de nuevo.',
    };
  }
}

/**
 * Update business hours during onboarding
 */
export async function updateBusinessHoursAction(
  tenantId: string,
  businessHours: Record<string, { open: string; close: string; enabled: boolean }>,
  timezone: string
): Promise<AuthResult> {
  const session = await getSession();

  if (!session?.accessToken) {
    return {
      success: false,
      error: 'No estás autenticado. Por favor inicia sesión nuevamente.',
    };
  }

  try {
    // Transform frontend format (open/close) to backend format (start/end)
    const transformedHours: Record<string, { enabled: boolean; start: string; end: string }> = {};
    for (const [day, hours] of Object.entries(businessHours)) {
      if (day !== 'timezone') {
        transformedHours[day] = {
          enabled: hours.enabled,
          start: hours.open,
          end: hours.close,
        };
      }
    }

    const response = await fetch(`${API_URL}/api/v1/tenant/business-hours`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify(transformedHours),
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      return {
        success: false,
        error: error.message || 'Error al actualizar los horarios',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[UpdateBusinessHoursAction] Error:', error);
    return {
      success: false,
      error: 'Error de conexión. Por favor intenta de nuevo.',
    };
  }
}

// ============================================
// Onboarding Progress Actions
// ============================================

/**
 * Update onboarding step progress in session
 * Call this after completing each onboarding step
 */
export async function updateOnboardingProgressAction(
  step: 'branding' | 'modules' | 'business-hours' | 'invite-team' | 'complete',
  status: 'profile_created' | 'business_created' | 'setup_completed' | 'team_invited' | 'completed'
): Promise<AuthResult> {
  const session = await getSession();

  if (!session) {
    return {
      success: false,
      error: 'No session found',
    };
  }

  // Determine next step
  const stepOrder = ['branding', 'modules', 'business-hours', 'invite-team', 'complete'];
  const currentIndex = stepOrder.indexOf(step);
  const nextStep = currentIndex < stepOrder.length - 1 ? stepOrder[currentIndex + 1] : 'complete';

  // Determine if onboarding is still required
  const requiresOnboarding = status !== 'completed';

  await updateSession({
    onboardingStatus: status,
    onboardingStep: nextStep || 'complete',
    requiresOnboarding,
  });

  return { success: true };
}

/**
 * Complete onboarding and update session
 * Marks user as no longer requiring onboarding
 */
export async function completeOnboardingAction(): Promise<AuthResult> {
  const session = await getSession();

  if (!session?.accessToken) {
    return {
      success: false,
      error: 'No estás autenticado. Por favor inicia sesión nuevamente.',
    };
  }

  try {
    // Notify backend that onboarding is complete
    // Use the correct endpoint: /api/v1/onboarding/complete
    const response = await fetch(`${API_URL}/api/v1/onboarding/complete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-id': session.tenantId,
      },
      cache: 'no-store',
    });

    // Even if backend call fails, update local session
    // The backend will eventually sync
    if (!response.ok) {
      console.warn('[CompleteOnboardingAction] Backend call failed, updating session anyway');
    }

    // Update session to mark onboarding as complete
    await updateSession({
      onboardingStatus: 'completed',
      onboardingStep: 'complete',
      requiresOnboarding: false,
    });

    // NOTE: We use /app/dashboard instead of /app due to OpenNext routing bug
    return { success: true, redirectTo: '/app/dashboard' };
  } catch (error) {
    console.error('[CompleteOnboardingAction] Error:', error);

    // Still update session even if backend call failed
    await updateSession({
      onboardingStatus: 'completed',
      onboardingStep: 'complete',
      requiresOnboarding: false,
    });

    // NOTE: We use /app/dashboard instead of /app due to OpenNext routing bug
    return { success: true, redirectTo: '/app/dashboard' };
  }
}

/**
 * Skip onboarding step (for optional steps like invite-team)
 */
export async function skipOnboardingStepAction(
  currentStep: 'invite-team'
): Promise<AuthResult> {
  const session = await getSession();

  if (!session) {
    return {
      success: false,
      error: 'No session found',
    };
  }

  // For invite-team, move to complete step
  if (currentStep === 'invite-team') {
    await updateSession({
      onboardingStatus: 'team_invited',
      onboardingStep: 'complete',
      requiresOnboarding: true,
    });
  }

  return { success: true };
}

// ============================================
// Team Invitation Actions
// ============================================

export interface InvitationResult {
  success: boolean;
  sent: number;
  failed: string[];
  error?: string;
}

/**
 * Send team invitations via Server Action
 * Uses server-side session for authentication
 */
export async function sendInvitationsAction(
  invitations: Array<{ email: string; role: 'admin' | 'manager' | 'sales_rep' | 'viewer' }>
): Promise<InvitationResult> {
  const session = await getSession();

  if (!session?.accessToken) {
    return {
      success: false,
      sent: 0,
      failed: invitations.map((inv) => `${inv.email}: No autenticado`),
      error: 'No estás autenticado. Por favor inicia sesión nuevamente.',
    };
  }

  if (!session.tenantId) {
    return {
      success: false,
      sent: 0,
      failed: invitations.map((inv) => `${inv.email}: Sin tenant`),
      error: 'No hay un negocio seleccionado.',
    };
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/invitations/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        'x-tenant-id': session.tenantId,
      },
      body: JSON.stringify({
        invitations: invitations.map((inv) => ({
          email: inv.email.trim().toLowerCase(),
          role: inv.role,
        })),
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
      return {
        success: false,
        sent: 0,
        failed: invitations.map((inv) => `${inv.email}: ${error.message || 'Error'}`),
        error: error.message || 'Error al enviar invitaciones',
      };
    }

    const result = await response.json();

    return {
      success: true,
      sent: result.success?.length || 0,
      failed: result.failed?.map((f: { email: string; error: string }) => `${f.email}: ${f.error}`) || [],
    };
  } catch (error) {
    console.error('[SendInvitationsAction] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error de conexión';
    return {
      success: false,
      sent: 0,
      failed: invitations.map((inv) => `${inv.email}: ${errorMessage}`),
      error: errorMessage,
    };
  }
}

// ============================================
// Tenant Details Action
// ============================================

export interface TenantDetails {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  isActive: boolean;
  settings?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Fetch tenant details for the current session
 * Used by AuthProvider to populate TenantStore
 */
export async function getTenantDetailsAction(): Promise<TenantDetails | null> {
  const session = await getSession();

  if (!session?.accessToken || !session?.tenantId) {
    return null;
  }

  try {
    // Fetch tenant details from API
    const response = await fetch(`${API_URL}/api/v1/auth/tenants`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn('[GetTenantDetailsAction] Failed to fetch tenants:', response.status);
      // Return a minimal tenant object so the app can function
      return {
        id: session.tenantId,
        name: 'Mi Negocio',
        slug: 'mi-negocio',
        plan: 'free',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
    }

    const tenants = await response.json();

    // Find the tenant matching current session
    const currentTenant = Array.isArray(tenants)
      ? tenants.find((t: { id: string }) => t.id === session.tenantId)
      : null;

    if (currentTenant) {
      return {
        id: currentTenant.id,
        name: currentTenant.name || 'Mi Negocio',
        slug: currentTenant.slug || 'mi-negocio',
        plan: currentTenant.plan || 'free',
        isActive: currentTenant.isActive ?? true,
        settings: currentTenant.settings,
        createdAt: currentTenant.createdAt || new Date().toISOString(),
      };
    }

    // If tenant not found in list, return minimal tenant
    return {
      id: session.tenantId,
      name: 'Mi Negocio',
      slug: 'mi-negocio',
      plan: 'free',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[GetTenantDetailsAction] Error:', error);
    // Return minimal tenant on error so app can function
    return {
      id: session.tenantId,
      name: 'Mi Negocio',
      slug: 'mi-negocio',
      plan: 'free',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
  }
}
