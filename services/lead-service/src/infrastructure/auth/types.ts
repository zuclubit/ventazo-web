/**
 * Authentication and Authorization Types
 * Core types for JWT-based authentication with RBAC
 */

/**
 * User roles within a tenant
 * Hierarchical permissions model
 */
export enum UserRole {
  OWNER = 'owner',           // Full access, can manage tenant settings
  ADMIN = 'admin',           // Full access to leads, can manage users
  MANAGER = 'manager',       // Full access to leads, view-only users
  SALES_REP = 'sales_rep',   // Access to assigned leads only
  VIEWER = 'viewer',         // Read-only access
}

/**
 * Permission actions that can be performed
 */
export enum Permission {
  // Lead permissions
  LEAD_CREATE = 'lead:create',
  LEAD_READ = 'lead:read',
  LEAD_READ_ALL = 'lead:read:all',      // Read all leads vs only assigned
  LEAD_UPDATE = 'lead:update',
  LEAD_UPDATE_ALL = 'lead:update:all',  // Update all vs only assigned
  LEAD_DELETE = 'lead:delete',
  LEAD_ASSIGN = 'lead:assign',
  LEAD_QUALIFY = 'lead:qualify',
  LEAD_EXPORT = 'lead:export',

  // Stats permissions
  STATS_VIEW = 'stats:view',
  STATS_EXPORT = 'stats:export',

  // User management permissions
  USER_INVITE = 'user:invite',
  USER_MANAGE = 'user:manage',
  USER_VIEW = 'user:view',

  // Tenant permissions
  TENANT_SETTINGS = 'tenant:settings',
  TENANT_BILLING = 'tenant:billing',
}

/**
 * Role to Permissions mapping
 * Defines what each role can do
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.OWNER]: [
    // All permissions
    Permission.LEAD_CREATE,
    Permission.LEAD_READ,
    Permission.LEAD_READ_ALL,
    Permission.LEAD_UPDATE,
    Permission.LEAD_UPDATE_ALL,
    Permission.LEAD_DELETE,
    Permission.LEAD_ASSIGN,
    Permission.LEAD_QUALIFY,
    Permission.LEAD_EXPORT,
    Permission.STATS_VIEW,
    Permission.STATS_EXPORT,
    Permission.USER_INVITE,
    Permission.USER_MANAGE,
    Permission.USER_VIEW,
    Permission.TENANT_SETTINGS,
    Permission.TENANT_BILLING,
  ],
  [UserRole.ADMIN]: [
    Permission.LEAD_CREATE,
    Permission.LEAD_READ,
    Permission.LEAD_READ_ALL,
    Permission.LEAD_UPDATE,
    Permission.LEAD_UPDATE_ALL,
    Permission.LEAD_DELETE,
    Permission.LEAD_ASSIGN,
    Permission.LEAD_QUALIFY,
    Permission.LEAD_EXPORT,
    Permission.STATS_VIEW,
    Permission.STATS_EXPORT,
    Permission.USER_INVITE,
    Permission.USER_MANAGE,
    Permission.USER_VIEW,
  ],
  [UserRole.MANAGER]: [
    Permission.LEAD_CREATE,
    Permission.LEAD_READ,
    Permission.LEAD_READ_ALL,
    Permission.LEAD_UPDATE,
    Permission.LEAD_UPDATE_ALL,
    Permission.LEAD_ASSIGN,
    Permission.LEAD_QUALIFY,
    Permission.LEAD_EXPORT,
    Permission.STATS_VIEW,
    Permission.USER_VIEW,
  ],
  [UserRole.SALES_REP]: [
    Permission.LEAD_CREATE,
    Permission.LEAD_READ,           // Only assigned leads
    Permission.LEAD_UPDATE,         // Only assigned leads
    Permission.LEAD_QUALIFY,
    Permission.STATS_VIEW,
  ],
  [UserRole.VIEWER]: [
    Permission.LEAD_READ,
    Permission.STATS_VIEW,
  ],
};

/**
 * JWT Payload structure from Supabase Auth
 */
export interface JWTPayload {
  sub: string;                    // User ID
  email: string;
  role?: string;                  // Supabase role (authenticated)
  aud: string;                    // Audience
  iat: number;                    // Issued at
  exp: number;                    // Expiration
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

/**
 * Authenticated user context
 * Available on every authenticated request
 */
export interface AuthUser {
  id: string;                     // Supabase user ID
  email: string;
  tenantId: string;               // Current tenant context
  role: UserRole;                 // Role within tenant
  permissions: Permission[];      // Computed permissions
  metadata: {
    fullName?: string;
    avatarUrl?: string;
  };
}

/**
 * Tenant membership record
 * Stored in our database to track user-tenant relationships
 */
export interface TenantMembership {
  id: string;
  userId: string;
  tenantId: string;
  role: UserRole;
  invitedBy: string | null;
  invitedAt: Date;
  acceptedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Auth context for dependency injection
 */
export interface IAuthContext {
  user: AuthUser;
  hasPermission(permission: Permission): boolean;
  hasAnyPermission(permissions: Permission[]): boolean;
  hasAllPermissions(permissions: Permission[]): boolean;
  canAccessLead(leadOwnerId: string | null): boolean;
}
