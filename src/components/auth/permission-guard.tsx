'use client';

import * as React from 'react';

import type { Permission, UserRole } from '@/lib/auth';
import { useAuthStore } from '@/store';

// ============================================
// Types
// ============================================

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  role?: UserRole;
  roles?: UserRole[];
  fallback?: React.ReactNode;
  showOnUnauthorized?: boolean;
}

// ============================================
// Permission Guard Component
// ============================================

/**
 * Guard component that shows children only if user has required permissions/roles
 *
 * @example
 * // Single permission
 * <PermissionGuard permission="LEAD_CREATE">
 *   <CreateLeadButton />
 * </PermissionGuard>
 *
 * @example
 * // Multiple permissions (any)
 * <PermissionGuard permissions={['LEAD_UPDATE', 'LEAD_UPDATE_ALL']}>
 *   <EditLeadButton />
 * </PermissionGuard>
 *
 * @example
 * // Multiple permissions (all required)
 * <PermissionGuard permissions={['LEAD_DELETE', 'LEAD_READ_ALL']} requireAll>
 *   <BulkDeleteButton />
 * </PermissionGuard>
 *
 * @example
 * // Role-based
 * <PermissionGuard role="admin">
 *   <AdminPanel />
 * </PermissionGuard>
 */
export function PermissionGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  role,
  roles,
  fallback = null,
  showOnUnauthorized = false,
}: PermissionGuardProps) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const hasAllPermissions = useAuthStore((state) => state.hasAllPermissions);
  const hasRole = useAuthStore((state) => state.hasRole);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Not authenticated - hide everything
  if (!isAuthenticated) {
    return showOnUnauthorized ? <>{fallback}</> : null;
  }

  // Check permissions
  let hasAccess = true;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  // Check roles
  if (hasAccess && role) {
    hasAccess = hasRole(role);
  } else if (hasAccess && roles && roles.length > 0) {
    hasAccess = roles.some((r) => hasRole(r));
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ============================================
// Hook: usePermissions
// ============================================

/**
 * Hook for permission checks in components
 *
 * @example
 * const { can, hasRole, canAccessLead } = usePermissions();
 *
 * if (can('LEAD_CREATE')) {
 *   // Show create button
 * }
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const hasAllPermissions = useAuthStore((state) => state.hasAllPermissions);
  const hasRole = useAuthStore((state) => state.hasRole);
  const isAtLeastRole = useAuthStore((state) => state.isAtLeastRole);

  return {
    // Permission checks
    can: hasPermission,
    canAny: hasAnyPermission,
    canAll: hasAllPermissions,

    // Role checks
    hasRole,
    isAtLeastRole,

    // Current user info
    role: user?.role,
    permissions: user?.permissions || [],

    // Common permission shortcuts
    canCreateLead: hasPermission('LEAD_CREATE'),
    canReadAllLeads: hasPermission('LEAD_READ_ALL'),
    canUpdateAllLeads: hasPermission('LEAD_UPDATE_ALL'),
    canDeleteLead: hasPermission('LEAD_DELETE'),
    canAssignLead: hasPermission('LEAD_ASSIGN'),
    canExportLeads: hasPermission('LEAD_EXPORT'),
    canViewStats: hasPermission('STATS_VIEW'),
    canExportStats: hasPermission('STATS_EXPORT'),
    canInviteUsers: hasPermission('USER_INVITE'),
    canManageUsers: hasPermission('USER_MANAGE'),
    canViewUsers: hasPermission('USER_VIEW'),
    canManageTenant: hasPermission('TENANT_SETTINGS'),
    canManageBilling: hasPermission('TENANT_BILLING'),

    // Role shortcuts
    isOwner: hasRole('owner'),
    isAdmin: hasRole('admin'),
    isManager: hasRole('manager'),
    isSalesRep: hasRole('sales_rep'),
    isViewer: hasRole('viewer'),

    // Role level checks
    isAtLeastAdmin: isAtLeastRole('admin'),
    isAtLeastManager: isAtLeastRole('manager'),

    /**
     * Check if user can access a specific lead
     * Sales reps can only access their own leads
     */
    canAccessLead: (leadOwnerId: string | null): boolean => {
      if (hasPermission('LEAD_READ_ALL')) return true;
      if (!user) return false;
      return leadOwnerId === user.id;
    },

    /**
     * Check if user can modify a specific lead
     */
    canModifyLead: (leadOwnerId: string | null): boolean => {
      if (hasPermission('LEAD_UPDATE_ALL')) return true;
      if (!hasPermission('LEAD_UPDATE')) return false;
      if (!user) return false;
      return leadOwnerId === user.id;
    },

    /**
     * Get owner filter for queries
     * Returns user ID for sales reps, null for managers+
     */
    getOwnerFilter: (): string | null => {
      if (hasPermission('LEAD_READ_ALL')) return null;
      return user?.id ?? null;
    },
  };
}

// ============================================
// HOC: withPermission
// ============================================

/**
 * Higher-order component for permission-based rendering
 *
 * @example
 * const ProtectedButton = withPermission(Button, 'LEAD_CREATE');
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: Permission,
  FallbackComponent?: React.ComponentType
) {
  return function PermissionWrappedComponent(props: P) {
    const hasPermission = useAuthStore((state) => state.hasPermission);

    if (!hasPermission(permission)) {
      return FallbackComponent ? <FallbackComponent /> : null;
    }

    return <Component {...props} />;
  };
}

// ============================================
// Exports
// ============================================

export type { PermissionGuardProps };
