// ============================================
// RBAC System - FASE 4
// Role-Based Access Control Implementation
// ============================================

'use client';

import * as React from 'react';

import { useAuthStore } from '@/store';

import { ROLE_HIERARCHY, ROLE_PERMISSIONS, type Permission, type UserRole } from './types';

// ============================================
// Types
// ============================================

export interface PermissionsResult {
  // User info
  role: UserRole | null;
  permissions: Permission[];

  // Permission checks
  can: (permission: Permission) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  canAny: (permissions: Permission[]) => boolean;

  // Role checks
  hasRole: (role: UserRole) => boolean;
  hasMinRole: (minRole: UserRole) => boolean;

  // Loading state
  isLoading: boolean;
}

export interface RBACGuardProps {
  children: React.ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  role?: UserRole;
  minRole?: UserRole;
  fallback?: React.ReactNode;
}

export class PermissionError extends Error {
  constructor(
    message: string,
    public requiredPermission?: Permission,
    public requiredRole?: UserRole,
    public userRole?: UserRole
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

// ============================================
// Core Permission Functions
// ============================================

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  const rolePerms = ROLE_PERMISSIONS[role];
  return rolePerms?.includes(permission) ?? false;
}

/**
 * Check if a role has all specified permissions
 */
export function roleHasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => roleHasPermission(role, p));
}

/**
 * Check if a role has any of the specified permissions
 */
export function roleHasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => roleHasPermission(role, p));
}

/**
 * Get role index in hierarchy (higher = more permissions)
 */
export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY.indexOf(role);
}

/**
 * Check if roleA is at least as powerful as roleB
 */
export function isAtLeastRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

/**
 * Check if roleA is more powerful than roleB
 */
export function isHigherRole(roleA: UserRole, roleB: UserRole): boolean {
  return getRoleLevel(roleA) > getRoleLevel(roleB);
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// ============================================
// usePermissions Hook
// ============================================

/**
 * Main RBAC hook for permission and role checking
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { can, hasRole, hasMinRole } = usePermissions();
 *
 *   if (!can('LEAD_DELETE')) {
 *     return null;
 *   }
 *
 *   return <DeleteButton />;
 * }
 * ```
 */
export function usePermissions(): PermissionsResult {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => !state.isInitialized);

  const role = user?.role ?? null;
  const permissions = user?.permissions ?? [];

  const can = React.useCallback(
    (permission: Permission): boolean => {
      if (!role) return false;
      // Check user's explicit permissions first
      if (permissions.includes(permission)) return true;
      // Fall back to role-based permissions
      return roleHasPermission(role, permission);
    },
    [role, permissions]
  );

  const canAll = React.useCallback(
    (perms: Permission[]): boolean => {
      return perms.every((p) => can(p));
    },
    [can]
  );

  const canAny = React.useCallback(
    (perms: Permission[]): boolean => {
      return perms.some((p) => can(p));
    },
    [can]
  );

  const hasRole = React.useCallback(
    (targetRole: UserRole): boolean => {
      if (!role) return false;
      return role === targetRole;
    },
    [role]
  );

  const hasMinRole = React.useCallback(
    (minRole: UserRole): boolean => {
      if (!role) return false;
      return isAtLeastRole(role, minRole);
    },
    [role]
  );

  return {
    role,
    permissions,
    can,
    canAll,
    canAny,
    hasRole,
    hasMinRole,
    isLoading,
  };
}

// ============================================
// Individual Hooks
// ============================================

/**
 * Check single permission
 */
export function useCan(permission: Permission): boolean {
  const { can, isLoading } = usePermissions();
  return !isLoading && can(permission);
}

/**
 * Check all permissions
 */
export function useCanAll(permissions: Permission[]): boolean {
  const { canAll, isLoading } = usePermissions();
  return !isLoading && canAll(permissions);
}

/**
 * Check any permission
 */
export function useCanAny(permissions: Permission[]): boolean {
  const { canAny, isLoading } = usePermissions();
  return !isLoading && canAny(permissions);
}

/**
 * Check exact role
 */
export function useHasRole(targetRole: UserRole): boolean {
  const { hasRole, isLoading } = usePermissions();
  return !isLoading && hasRole(targetRole);
}

/**
 * Check minimum role
 */
export function useHasMinRole(minRole: UserRole): boolean {
  const { hasMinRole, isLoading } = usePermissions();
  return !isLoading && hasMinRole(minRole);
}

/**
 * Get current user's role
 */
export function useRole(): UserRole | null {
  const { role } = usePermissions();
  return role;
}

// ============================================
// Guard Component
// ============================================

/**
 * Component that guards children based on permissions/roles
 *
 * @example
 * ```tsx
 * <RBACGuard permission="LEAD_DELETE" fallback={<NoAccess />}>
 *   <DeleteButton />
 * </RBACGuard>
 *
 * <RBACGuard minRole="manager">
 *   <ManagerPanel />
 * </RBACGuard>
 *
 * <RBACGuard permissions={['LEAD_CREATE', 'LEAD_UPDATE']} requireAll>
 *   <EditForm />
 * </RBACGuard>
 * ```
 */
export function RBACGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  role: requiredRole,
  minRole,
  fallback = null,
}: RBACGuardProps): React.ReactNode {
  const { can, canAll, canAny, hasRole, hasMinRole, isLoading } = usePermissions();

  // Still loading
  if (isLoading) {
    return fallback;
  }

  // Check single permission
  if (permission && !can(permission)) {
    return fallback;
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    const hasAccess = requireAll ? canAll(permissions) : canAny(permissions);
    if (!hasAccess) {
      return fallback;
    }
  }

  // Check exact role
  if (requiredRole && !hasRole(requiredRole)) {
    return fallback;
  }

  // Check minimum role
  if (minRole && !hasMinRole(minRole)) {
    return fallback;
  }

  return <>{children}</>;
}

// ============================================
// Guard Functions (for imperative use)
// ============================================

/**
 * Create a guard function for use outside React
 */
export function createPermissionGuard(userRole: UserRole | null, userPermissions: Permission[] = []) {
  const can = (permission: Permission): boolean => {
    if (!userRole) return false;
    if (userPermissions.includes(permission)) return true;
    return roleHasPermission(userRole, permission);
  };

  const canAll = (permissions: Permission[]): boolean => {
    return permissions.every((p) => can(p));
  };

  const canAny = (permissions: Permission[]): boolean => {
    return permissions.some((p) => can(p));
  };

  const hasRole = (targetRole: UserRole): boolean => {
    return userRole === targetRole;
  };

  const hasMinRole = (minRole: UserRole): boolean => {
    if (!userRole) return false;
    return isAtLeastRole(userRole, minRole);
  };

  return {
    can,
    canAll,
    canAny,
    hasRole,
    hasMinRole,
  };
}

/**
 * Assert permission (throws if denied)
 */
export function assertPermission(
  role: UserRole | null,
  permission: Permission,
  context?: string
): void {
  if (!role || !roleHasPermission(role, permission)) {
    throw new PermissionError(
      `Permission denied: ${permission}${context ? ` (${context})` : ''}`,
      permission,
      undefined,
      role ?? undefined
    );
  }
}

/**
 * Assert minimum role (throws if denied)
 */
export function assertMinRole(
  role: UserRole | null,
  minRole: UserRole,
  context?: string
): void {
  if (!role || !isAtLeastRole(role, minRole)) {
    throw new PermissionError(
      `Role denied: requires ${minRole}${context ? ` (${context})` : ''}`,
      undefined,
      minRole,
      role ?? undefined
    );
  }
}

// ============================================
// HOC for Permission Guard
// ============================================

interface WithPermissionOptions {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  minRole?: UserRole;
  fallback?: React.ReactNode;
}

/**
 * HOC that guards component with permission check
 *
 * @example
 * ```tsx
 * const AdminPanel = withPermission(Panel, {
 *   minRole: 'admin',
 *   fallback: <AccessDenied />,
 * });
 * ```
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  options: WithPermissionOptions
): React.FC<P> {
  const { permission, permissions, requireAll, minRole, fallback } = options;

  const GuardedComponent: React.FC<P> = (props) => {
    return (
      <RBACGuard
        fallback={fallback}
        minRole={minRole}
        permission={permission}
        permissions={permissions}
        requireAll={requireAll}
      >
        <Component {...props} />
      </RBACGuard>
    );
  };

  GuardedComponent.displayName = `withPermission(${Component.displayName || Component.name || 'Component'})`;

  return GuardedComponent;
}

// ============================================
// Utility Hooks
// ============================================

/**
 * Hook to check if user can manage other users
 */
export function useCanManageUsers(): boolean {
  return useCan('USER_MANAGE');
}

/**
 * Hook to check if user can view settings
 */
export function useCanViewSettings(): boolean {
  return useCan('TENANT_SETTINGS');
}

/**
 * Hook to check if user can manage billing
 */
export function useCanManageBilling(): boolean {
  return useCan('TENANT_BILLING');
}

/**
 * Hook to check if user is admin or higher
 */
export function useIsAdmin(): boolean {
  return useHasMinRole('admin');
}

/**
 * Hook to check if user is owner
 */
export function useIsOwner(): boolean {
  return useHasRole('owner');
}

/**
 * Hook to check if user is manager or higher
 */
export function useIsManager(): boolean {
  return useHasMinRole('manager');
}

// ============================================
// Analytics Permission Hooks
// ============================================

/**
 * Hook to check if user can view analytics
 */
export function useCanViewAnalytics(): boolean {
  return useCan('ANALYTICS_VIEW');
}

/**
 * Hook to check if user can view all analytics (team-wide)
 */
export function useCanViewAllAnalytics(): boolean {
  return useCan('ANALYTICS_VIEW_ALL');
}

/**
 * Hook to check if user can export analytics
 */
export function useCanExportAnalytics(): boolean {
  return useCan('ANALYTICS_EXPORT');
}
