// ============================================
// Tenant Security Hooks - FASE 4
// Safe tenant access with validation
// ============================================

'use client';

import * as React from 'react';

import type { Tenant } from '@/lib/auth';
import { useAuthStore, useTenantStore } from '@/store';

// ============================================
// Types
// ============================================

export interface TenantSafeResult {
  tenant: Tenant;
  tenantId: string;
  isValid: boolean;
}

export interface TenantValidation {
  isValid: boolean;
  error: string | null;
  tenantId: string | null;
}

export class TenantError extends Error {
  constructor(
    message: string,
    public code: TenantErrorCode,
    public tenantId?: string
  ) {
    super(message);
    this.name = 'TenantError';
  }
}

export enum TenantErrorCode {
  NO_TENANT = 'NO_TENANT',
  INVALID_TENANT = 'INVALID_TENANT',
  ACCESS_DENIED = 'ACCESS_DENIED',
  TENANT_MISMATCH = 'TENANT_MISMATCH',
  TENANT_INACTIVE = 'TENANT_INACTIVE',
}

// ============================================
// UUID Validation
// ============================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate UUID format
 */
export function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * Validate tenant ID format
 */
export function isValidTenantId(tenantId: unknown): tenantId is string {
  if (!isValidUUID(tenantId)) {
    return false;
  }
  return true;
}

/**
 * Assert tenant ID is valid (throws if not)
 */
export function assertTenantId(tenantId: unknown, context?: string): asserts tenantId is string {
  if (!isValidTenantId(tenantId)) {
    throw new TenantError(
      `Invalid tenant ID${context ? ` in ${context}` : ''}`,
      TenantErrorCode.INVALID_TENANT,
      typeof tenantId === 'string' ? tenantId : undefined
    );
  }
}

// ============================================
// useTenantSafe Hook
// ============================================

/**
 * Safe tenant hook that guarantees tenant exists
 * Throws TenantError if no valid tenant
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { tenant, tenantId } = useTenantSafe();
 *   // tenant and tenantId are guaranteed to be valid
 * }
 * ```
 */
export function useTenantSafe(): TenantSafeResult {
  const currentTenant = useTenantStore((state) => state.currentTenant);
  const user = useAuthStore((state) => state.user);

  // Validate tenant exists
  if (!currentTenant) {
    throw new TenantError(
      'No tenant selected. Please select a tenant to continue.',
      TenantErrorCode.NO_TENANT
    );
  }

  // Validate tenant ID format
  if (!isValidTenantId(currentTenant.id)) {
    throw new TenantError(
      'Invalid tenant configuration.',
      TenantErrorCode.INVALID_TENANT,
      currentTenant.id
    );
  }

  // Validate user has access to tenant
  if (user && user.tenantId !== currentTenant.id) {
    throw new TenantError(
      'Access denied to this tenant.',
      TenantErrorCode.ACCESS_DENIED,
      currentTenant.id
    );
  }

  // Validate tenant is active
  if (!currentTenant.isActive) {
    throw new TenantError(
      'This tenant has been deactivated.',
      TenantErrorCode.TENANT_INACTIVE,
      currentTenant.id
    );
  }

  return {
    tenant: currentTenant,
    tenantId: currentTenant.id,
    isValid: true,
  };
}

// ============================================
// useTenantId Hook
// ============================================

/**
 * Get current tenant ID with validation
 * Throws TenantError if no valid tenant
 */
export function useTenantIdSafe(): string {
  const { tenantId } = useTenantSafe();
  return tenantId;
}

// ============================================
// useTenantValidation Hook
// ============================================

/**
 * Non-throwing tenant validation hook
 * Returns validation result instead of throwing
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isValid, error, tenantId } = useTenantValidation();
 *   if (!isValid) {
 *     return <TenantError error={error} />;
 *   }
 * }
 * ```
 */
export function useTenantValidation(): TenantValidation {
  const currentTenant = useTenantStore((state) => state.currentTenant);
  const user = useAuthStore((state) => state.user);

  return React.useMemo(() => {
    if (!currentTenant) {
      return {
        isValid: false,
        error: 'No tenant selected',
        tenantId: null,
      };
    }

    if (!isValidTenantId(currentTenant.id)) {
      return {
        isValid: false,
        error: 'Invalid tenant ID format',
        tenantId: null,
      };
    }

    if (user && user.tenantId !== currentTenant.id) {
      return {
        isValid: false,
        error: 'Access denied to this tenant',
        tenantId: null,
      };
    }

    if (!currentTenant.isActive) {
      return {
        isValid: false,
        error: 'Tenant is inactive',
        tenantId: currentTenant.id,
      };
    }

    return {
      isValid: true,
      error: null,
      tenantId: currentTenant.id,
    };
  }, [currentTenant, user]);
}

// ============================================
// useRequireTenant Hook
// ============================================

/**
 * Hook that requires tenant and redirects if missing
 * Returns loading state while checking
 */
export function useRequireTenant(): {
  isLoading: boolean;
  isValid: boolean;
  tenantId: string | null;
} {
  const { isValid, tenantId } = useTenantValidation();
  const isLoading = useTenantStore((state) => state.isLoading);

  return {
    isLoading,
    isValid: !isLoading && isValid,
    tenantId: isValid ? tenantId : null,
  };
}

// ============================================
// withTenantGuard HOC
// ============================================

interface WithTenantGuardOptions {
  fallback?: React.ReactNode;
  onError?: (error: TenantError) => void;
}

/**
 * HOC that guards component with tenant validation
 *
 * @example
 * ```tsx
 * const ProtectedPage = withTenantGuard(MyPage, {
 *   fallback: <Loading />,
 * });
 * ```
 */
export function withTenantGuard<P extends object>(
  Component: React.ComponentType<P & { tenantId: string }>,
  options: WithTenantGuardOptions = {}
): React.FC<P> {
  const { fallback = null, onError } = options;

  const GuardedComponent: React.FC<P> = (props) => {
    const { isLoading, isValid, tenantId } = useRequireTenant();

    React.useEffect(() => {
      if (!isLoading && !isValid && onError) {
        onError(new TenantError(
          'No valid tenant',
          TenantErrorCode.NO_TENANT
        ));
      }
    }, [isLoading, isValid]);

    if (isLoading) {
      return <>{fallback}</>;
    }

    if (!isValid || !tenantId) {
      return <>{fallback}</>;
    }

    return <Component {...props} tenantId={tenantId} />;
  };

  GuardedComponent.displayName = `withTenantGuard(${Component.displayName || Component.name || 'Component'})`;

  return GuardedComponent;
}

// ============================================
// Tenant Header Builder
// ============================================

/**
 * Build tenant header for API requests
 * Validates tenant ID before including
 */
export function buildTenantHeader(tenantId: string): Record<string, string> {
  assertTenantId(tenantId, 'buildTenantHeader');

  return {
    'x-tenant-id': tenantId,
  };
}

/**
 * Build tenant header from current store
 * Returns empty object if no valid tenant
 */
export function useTenantHeader(): Record<string, string> {
  const { isValid, tenantId } = useTenantValidation();

  return React.useMemo(() => {
    if (!isValid || !tenantId) {
      return {};
    }
    return buildTenantHeader(tenantId);
  }, [isValid, tenantId]);
}

// ============================================
// Tenant Context Verification
// ============================================

/**
 * Verify tenant ID matches current context
 * Used to prevent cross-tenant data access
 */
export function useVerifyTenantContext(): (tenantId: string) => boolean {
  const { isValid, tenantId: currentTenantId } = useTenantValidation();

  return React.useCallback((tenantId: string): boolean => {
    if (!isValid || !currentTenantId) {
      return false;
    }

    if (!isValidTenantId(tenantId)) {
      return false;
    }

    return tenantId === currentTenantId;
  }, [isValid, currentTenantId]);
}

/**
 * Assert that a tenant ID matches current context
 * Throws TenantError if mismatch
 */
export function useAssertTenantContext(): (tenantId: string, context?: string) => void {
  const verifyTenant = useVerifyTenantContext();
  const { tenantId: currentTenantId } = useTenantValidation();

  return React.useCallback((tenantId: string, context?: string): void => {
    if (!verifyTenant(tenantId)) {
      throw new TenantError(
        `Tenant mismatch${context ? ` in ${context}` : ''}: expected ${currentTenantId}, got ${tenantId}`,
        TenantErrorCode.TENANT_MISMATCH,
        tenantId
      );
    }
  }, [verifyTenant, currentTenantId]);
}

