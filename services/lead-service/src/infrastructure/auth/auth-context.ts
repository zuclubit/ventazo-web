/**
 * Authentication Context
 * Provides permission checking and access control utilities
 */

import { AuthUser, IAuthContext, Permission, UserRole, ROLE_PERMISSIONS } from './types';

/**
 * AuthContext class
 * Encapsulates authenticated user and provides authorization methods
 */
export class AuthContext implements IAuthContext {
  constructor(public readonly user: AuthUser) {}

  /**
   * Check if user has a specific permission
   */
  hasPermission(permission: Permission): boolean {
    return this.user.permissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some((p) => this.user.permissions.includes(p));
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every((p) => this.user.permissions.includes(p));
  }

  /**
   * Check if user can access a specific lead based on ownership
   * - Admins, Managers, Owners can access all leads
   * - Sales reps can only access their assigned leads
   * - Viewers can read all leads (if they have LEAD_READ)
   */
  canAccessLead(leadOwnerId: string | null): boolean {
    // Users with LEAD_READ_ALL can access any lead
    if (this.hasPermission(Permission.LEAD_READ_ALL)) {
      return true;
    }

    // Sales reps can access leads assigned to them
    if (leadOwnerId && leadOwnerId === this.user.id) {
      return true;
    }

    // Leads without owner (unassigned) - only those with LEAD_READ_ALL
    return false;
  }

  /**
   * Check if user can modify a specific lead
   */
  canModifyLead(leadOwnerId: string | null): boolean {
    // Users with LEAD_UPDATE_ALL can modify any lead
    if (this.hasPermission(Permission.LEAD_UPDATE_ALL)) {
      return true;
    }

    // Sales reps can modify leads assigned to them
    if (this.hasPermission(Permission.LEAD_UPDATE) && leadOwnerId === this.user.id) {
      return true;
    }

    return false;
  }

  /**
   * Get the owner filter for queries
   * Returns null if user can see all leads, or user ID if restricted
   */
  getOwnerFilter(): string | null {
    if (this.hasPermission(Permission.LEAD_READ_ALL)) {
      return null; // No filter - can see all
    }
    return this.user.id; // Filter to own leads
  }

  /**
   * Check if user is at least a certain role level
   */
  isAtLeastRole(minimumRole: UserRole): boolean {
    const roleHierarchy: UserRole[] = [
      UserRole.VIEWER,
      UserRole.SALES_REP,
      UserRole.MANAGER,
      UserRole.ADMIN,
      UserRole.OWNER,
    ];

    const userRoleIndex = roleHierarchy.indexOf(this.user.role);
    const minimumRoleIndex = roleHierarchy.indexOf(minimumRole);

    return userRoleIndex >= minimumRoleIndex;
  }
}

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Create an AuthUser from JWT payload and tenant membership
 */
export function createAuthUser(
  userId: string,
  email: string,
  tenantId: string,
  role: UserRole,
  metadata?: { fullName?: string; avatarUrl?: string }
): AuthUser {
  return {
    id: userId,
    email,
    tenantId,
    role,
    permissions: getPermissionsForRole(role),
    metadata: metadata || {},
  };
}
