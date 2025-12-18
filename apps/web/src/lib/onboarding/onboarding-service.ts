// ============================================
// Onboarding Service - Backend API Integration
// All operations now use backend API
// ============================================

import { getAccessToken } from '@/lib/auth/token-manager';

import type {
  SignupFormData,
  CreateBusinessFormData,
  TenantSettings,
  UserOnboarding,
  UserInvitation,
  CRMModules,
  BusinessHours,
  OnboardingStatus,
} from './types';

// Backend API URL
const API_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3000';

// Helper to get auth headers
function getAuthHeaders(tenantId?: string): HeadersInit {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }
  return headers;
}

// ============================================
// Auth Functions (Backend API)
// ============================================

/**
 * Register a new user via backend API
 */
export async function signupUser(data: SignupFormData): Promise<{ userId: string; confirmationRequired: boolean }> {
  const response = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: data.email,
      password: data.password,
      fullName: `${data.firstName} ${data.lastName}`,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Registration failed');
  }

  return {
    userId: result.user.id,
    confirmationRequired: result.confirmationRequired,
  };
}

// ============================================
// Onboarding Progress Functions (Backend API)
// ============================================

/**
 * Get user onboarding status via backend API
 */
export async function getOnboardingStatus(userId: string): Promise<UserOnboarding | null> {
  try {
    const headers = getAuthHeaders();

    const response = await fetch(`${API_URL}/api/v1/onboarding/status`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      console.error('Error fetching onboarding status:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data) return null;

    return {
      id: data.id,
      userId: data.userId,
      status: data.status,
      currentStep: data.currentStep,
      completedSteps: data.completedSteps || [],
      metadata: data.metadata || {},
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    return null;
  }
}

/**
 * Update onboarding progress via backend API
 */
export async function updateOnboardingProgress(
  userId: string,
  status: OnboardingStatus,
  currentStep: number,
  completedSteps: string[]
): Promise<void> {
  const headers = getAuthHeaders();

  const response = await fetch(`${API_URL}/api/v1/onboarding/progress`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      status,
      currentStep,
      completedSteps,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Failed to update onboarding: ${error.message || response.statusText}`);
  }
}

/**
 * Complete a specific onboarding step via backend API
 */
export async function completeOnboardingStep(step: string): Promise<void> {
  const headers = getAuthHeaders();

  const response = await fetch(`${API_URL}/api/v1/onboarding/complete-step`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ step }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Failed to complete step: ${error.message || response.statusText}`);
  }
}

/**
 * Complete entire onboarding via backend API
 */
export async function completeOnboarding(tenantId?: string): Promise<void> {
  const headers = getAuthHeaders(tenantId);

  const response = await fetch(`${API_URL}/api/v1/onboarding/complete`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Failed to complete onboarding: ${error.message || response.statusText}`);
  }
}

// ============================================
// Tenant Functions (Backend API)
// ============================================

/**
 * Create a new tenant (business) via backend API
 */
export async function createTenant(
  userId: string,
  data: CreateBusinessFormData
): Promise<{ tenantId: string }> {
  const headers = getAuthHeaders();

  const response = await fetch(`${API_URL}/api/v1/auth/create-tenant`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: data.businessName,
      businessType: data.businessType,
      businessSize: data.businessSize,
      phone: data.phone,
      city: data.city,
      country: data.country,
      timezone: data.timezone,
      settings: {
        currency: 'MXN',
        locale: 'es-MX',
        timezone: data.timezone,
        dateFormat: 'DD/MM/YYYY',
        features: {
          whatsapp: false,
          cfdi: false,
          analytics: false,
          workflows: false,
          ai_scoring: false,
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Failed to create tenant: ${error.message || response.statusText}`);
  }

  const result = await response.json();
  return { tenantId: result.tenantId || result.id };
}

/**
 * Get tenant settings via backend API
 */
export async function getTenantSettings(tenantId: string): Promise<TenantSettings | null> {
  try {
    const headers = getAuthHeaders(tenantId);

    const response = await fetch(`${API_URL}/api/v1/tenant/settings`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error('Error fetching tenant settings:', response.statusText);
      return null;
    }

    const data = await response.json();

    return {
      id: data.id,
      tenantId: data.tenantId || tenantId,
      businessType: data.businessType,
      businessSize: data.businessSize,
      phone: data.phone,
      website: data.website,
      address: data.address,
      city: data.city,
      country: data.country,
      logoUrl: data.logoUrl,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      companyEmail: data.companyEmail,
      modules: data.modules,
      businessHours: data.businessHours,
      notifications: data.notifications,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    console.error('Error fetching tenant settings:', error);
    return null;
  }
}

/**
 * Update tenant branding via backend API
 */
export async function updateTenantBranding(
  tenantId: string,
  data: {
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    companyEmail?: string;
  }
): Promise<void> {
  const headers = getAuthHeaders(tenantId);

  const response = await fetch(`${API_URL}/api/v1/tenant/branding`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Failed to update branding: ${error.message || response.statusText}`);
  }
}

/**
 * Update tenant modules via backend API
 */
export async function updateTenantModules(
  tenantId: string,
  modules: CRMModules
): Promise<void> {
  const headers = getAuthHeaders(tenantId);

  const response = await fetch(`${API_URL}/api/v1/tenant/modules`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(modules),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Failed to update modules: ${error.message || response.statusText}`);
  }
}

/**
 * Update business hours via backend API
 */
export async function updateBusinessHours(
  tenantId: string,
  businessHours: BusinessHours,
  timezone: string
): Promise<void> {
  const headers = getAuthHeaders(tenantId);

  const response = await fetch(`${API_URL}/api/v1/tenant/business-hours`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      ...businessHours,
      timezone,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Failed to update business hours: ${error.message || response.statusText}`);
  }
}

// ============================================
// Invitation Functions (Backend API)
// ============================================

/**
 * Send team invitations via backend API
 * This uses the InvitationService which handles email sending
 */
export async function sendInvitations(
  tenantId: string,
  _invitedBy: string, // Not needed - backend gets user from auth
  invitations: Array<{ email: string; role: 'admin' | 'manager' | 'sales_rep' | 'viewer' }>
): Promise<{ sent: number; failed: string[] }> {
  try {
    const headers = getAuthHeaders(tenantId);

    // Use bulk invitations endpoint for efficiency
    const response = await fetch(`${API_URL}/api/v1/invitations/bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        invitations: invitations.map((inv) => ({
          email: inv.email.trim().toLowerCase(),
          role: inv.role,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const result = await response.json();

    return {
      sent: result.success?.length || 0,
      failed: result.failed?.map((f: { email: string; error: string }) => `${f.email}: ${f.error}`) || [],
    };
  } catch (error) {
    console.error('Error sending invitations:', error);
    return {
      sent: 0,
      failed: invitations.map((inv) => `${inv.email}: ${error instanceof Error ? error.message : 'Error desconocido'}`),
    };
  }
}

/**
 * Get pending invitations for a tenant via backend API
 */
export async function getPendingInvitations(tenantId: string): Promise<UserInvitation[]> {
  try {
    const headers = getAuthHeaders(tenantId);

    const response = await fetch(`${API_URL}/api/v1/invitations`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error('Error fetching invitations:', response.statusText);
      return [];
    }

    const data = await response.json();
    const invitations = Array.isArray(data) ? data : data.data || [];

    return invitations.map((inv: Record<string, unknown>) => ({
      id: inv['id'] as string,
      tenantId: inv['tenantId'] as string,
      email: inv['email'] as string,
      role: inv['role'] as 'admin' | 'manager' | 'sales_rep' | 'viewer',
      token: '', // Token is not exposed in list response
      status: inv['status'] as 'pending' | 'accepted' | 'expired' | 'cancelled',
      invitedBy: inv['invitedBy'] as string | undefined,
      message: inv['customMessage'] as string | undefined,
      expiresAt: inv['expiresAt'] as string,
      acceptedAt: inv['acceptedAt'] as string | undefined,
      createdAt: inv['createdAt'] as string,
    }));
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }
}

/**
 * Cancel invitation via backend API
 */
export async function cancelInvitation(invitationId: string, tenantId?: string): Promise<void> {
  const headers = getAuthHeaders(tenantId);

  const response = await fetch(`${API_URL}/api/v1/invitations/${invitationId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Failed to cancel invitation: ${error.message || response.statusText}`);
  }
}

/**
 * Accept invitation via backend API
 * User must be authenticated
 */
export async function acceptInvitation(
  token: string,
  _userId: string // Not needed - backend gets user from auth
): Promise<{ tenantId: string; role: string }> {
  const headers = getAuthHeaders();

  const response = await fetch(`${API_URL}/api/v1/invitations/accept`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Failed to accept invitation: ${error.message || response.statusText}`);
  }

  const data = await response.json();

  return {
    tenantId: data.membership?.tenantId || data.tenantId,
    role: data.membership?.role || data.role,
  };
}

/**
 * Get invitation by token via backend API (public endpoint)
 */
export async function getInvitationByToken(token: string): Promise<UserInvitation | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/invitations/token/${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      id: data.id,
      tenantId: data.tenantId,
      email: data.email,
      role: data.role,
      token: '', // Token not exposed
      status: data.status,
      invitedBy: data.inviterName,
      message: data.customMessage,
      expiresAt: data.expiresAt,
      acceptedAt: data.acceptedAt,
      createdAt: data.createdAt,
    };
  } catch (error) {
    console.error('Error fetching invitation by token:', error);
    return null;
  }
}

/**
 * Resend invitation via backend API
 */
export async function resendInvitation(invitationId: string, tenantId?: string): Promise<void> {
  const headers = getAuthHeaders(tenantId);

  const response = await fetch(`${API_URL}/api/v1/invitations/${invitationId}/resend`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Failed to resend invitation: ${error.message || response.statusText}`);
  }
}

/**
 * Get invitations sent to the current user's email
 */
export async function getMyInvitations(): Promise<UserInvitation[]> {
  try {
    const headers = getAuthHeaders();

    const response = await fetch(`${API_URL}/api/v1/invitations/my-invitations`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error('Error fetching my invitations:', response.statusText);
      return [];
    }

    const data = await response.json();
    const invitations = Array.isArray(data) ? data : data.data || [];

    return invitations.map((inv: Record<string, unknown>) => ({
      id: inv['id'] as string,
      tenantId: inv['tenantId'] as string,
      email: inv['email'] as string,
      role: inv['role'] as 'admin' | 'manager' | 'sales_rep' | 'viewer',
      token: inv['token'] as string, // Token is included for user's own invitations
      status: inv['status'] as 'pending' | 'accepted' | 'expired' | 'cancelled',
      invitedBy: inv['inviterName'] as string | undefined,
      message: inv['customMessage'] as string | undefined,
      expiresAt: inv['expiresAt'] as string,
      acceptedAt: inv['acceptedAt'] as string | undefined,
      createdAt: inv['createdAt'] as string,
    }));
  } catch (error) {
    console.error('Error fetching my invitations:', error);
    return [];
  }
}

// ============================================
// Audit Functions (Backend API)
// ============================================

// Audit action types for onboarding
export type OnboardingAuditAction =
  | 'user_signup'
  | 'tenant_created'
  | 'branding_updated'
  | 'modules_updated'
  | 'business_hours_updated'
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'invitation_cancelled'
  | 'onboarding_completed'
  | 'user_login'
  | 'tenant_switched';

/**
 * Log audit event via backend API
 */
export async function logAuditEvent(
  tenantId: string | null,
  userId: string,
  action: OnboardingAuditAction | string,
  entityType: string,
  entityId: string,
  newValues: Record<string, unknown>,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const headers = getAuthHeaders(tenantId || undefined);

    await fetch(`${API_URL}/api/v1/audit/log`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action,
        entityType,
        entityId,
        newValues,
        metadata: {
          ...metadata,
          source: 'web_app',
        },
      }),
    });
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}

/**
 * Log user signup event
 */
export async function logUserSignup(userId: string, email: string): Promise<void> {
  await logAuditEvent(null, userId, 'user_signup', 'user', userId, {
    email,
    signupAt: new Date().toISOString(),
  });
}

/**
 * Log onboarding completion
 */
export async function logOnboardingCompleted(
  tenantId: string,
  userId: string,
  modulesEnabled: string[]
): Promise<void> {
  await logAuditEvent(tenantId, userId, 'onboarding_completed', 'user_onboarding', userId, {
    completedAt: new Date().toISOString(),
    modulesEnabled,
  });
}

/**
 * Get audit logs via backend API
 */
export async function getAuditLogs(
  tenantId?: string,
  options?: {
    action?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ logs: Array<Record<string, unknown>>; total: number }> {
  try {
    const headers = getAuthHeaders(tenantId);
    const params = new URLSearchParams();

    if (options?.action) params.append('action', options.action);
    if (options?.entityType) params.append('entityType', options.entityType);
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));

    const response = await fetch(`${API_URL}/api/v1/audit/logs?${params}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error('Error fetching audit logs:', response.statusText);
      return { logs: [], total: 0 };
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return { logs: [], total: 0 };
  }
}

/**
 * Get my audit logs via backend API
 */
export async function getMyAuditLogs(
  options?: {
    action?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ logs: Array<Record<string, unknown>>; total: number }> {
  try {
    const headers = getAuthHeaders();
    const params = new URLSearchParams();

    if (options?.action) params.append('action', options.action);
    if (options?.entityType) params.append('entityType', options.entityType);
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));

    const response = await fetch(`${API_URL}/api/v1/audit/my-logs?${params}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error('Error fetching my audit logs:', response.statusText);
      return { logs: [], total: 0 };
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching my audit logs:', error);
    return { logs: [], total: 0 };
  }
}

// ============================================
// User/Tenant Utility Functions (Backend API)
// ============================================

/**
 * Get user tenants via backend API
 */
export async function getUserTenants(_userId: string): Promise<Array<{ id: string; name: string; role: string }>> {
  try {
    const headers = getAuthHeaders();

    const response = await fetch(`${API_URL}/api/v1/auth/tenants`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error('Error fetching user tenants:', response.statusText);
      return [];
    }

    const data = await response.json();
    const memberships = Array.isArray(data) ? data : data.data || [];

    return memberships.map((m: Record<string, unknown>) => ({
      id: m['tenantId'] as string,
      name: m['tenantName'] as string,
      role: m['role'] as string,
    }));
  } catch (error) {
    console.error('Error fetching user tenants:', error);
    return [];
  }
}
