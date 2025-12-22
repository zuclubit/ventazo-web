/**
 * Advanced Permissions Types
 *
 * Comprehensive permission system combining:
 * - RBAC (Role-Based Access Control)
 * - ABAC (Attribute-Based Access Control)
 * - Field-Level Security
 * - Record-Level Security
 * - Data Masking
 */

/**
 * Permission Action Types
 */
export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'export'
  | 'import'
  | 'share'
  | 'assign'
  | 'approve'
  | 'bulk_edit'
  | 'bulk_delete';

/**
 * Resource Types (CRM Entities)
 */
export type ResourceType =
  | 'lead'
  | 'contact'
  | 'account'
  | 'opportunity'
  | 'contract'
  | 'quote'
  | 'task'
  | 'note'
  | 'email'
  | 'call'
  | 'meeting'
  | 'campaign'
  | 'report'
  | 'dashboard'
  | 'workflow'
  | 'user'
  | 'team'
  | 'territory'
  | 'product'
  | 'price_book';

/**
 * Field Access Level
 */
export type FieldAccessLevel =
  | 'none'        // No access
  | 'read'        // Read only
  | 'write'       // Read and write
  | 'masked';     // Read with masking (e.g., ****)

/**
 * Record Visibility Level
 */
export type RecordVisibility =
  | 'private'         // Only owner and admins
  | 'team'            // Owner's team members
  | 'territory'       // Territory members
  | 'hierarchy'       // User's hierarchy (manager chain)
  | 'department'      // Same department
  | 'organization';   // Everyone in org

/**
 * Permission Role
 */
export interface PermissionRole {
  id: string;
  tenantId: string;
  name: string;
  description?: string;

  // Role hierarchy
  level: number;              // 0 = highest (admin), higher = lower privilege
  parentRoleId?: string;      // Inherits permissions from parent

  // System flags
  isSystemRole: boolean;      // Cannot be deleted
  isDefault: boolean;         // Assigned to new users

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Resource Permission
 * Defines what actions a role can perform on a resource type
 */
export interface ResourcePermission {
  id: string;
  tenantId: string;
  roleId: string;
  resourceType: ResourceType;

  // CRUD permissions
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;

  // Extended permissions
  canExport: boolean;
  canImport: boolean;
  canShare: boolean;
  canAssign: boolean;
  canApprove: boolean;
  canBulkEdit: boolean;
  canBulkDelete: boolean;

  // Record scope
  readScope: RecordVisibility;     // What records can be read
  updateScope: RecordVisibility;   // What records can be updated
  deleteScope: RecordVisibility;   // What records can be deleted

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Field Permission
 * Defines field-level access for a role
 */
export interface FieldPermission {
  id: string;
  tenantId: string;
  roleId: string;
  resourceType: ResourceType;
  fieldName: string;

  accessLevel: FieldAccessLevel;

  // Masking configuration
  maskPattern?: string;       // e.g., "XXX-XX-{last4}" for SSN
  maskCharacter?: string;     // Character to use for masking (default: *)

  // Conditional access
  conditions?: PermissionCondition[];  // ABAC conditions

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission Condition (ABAC)
 * Attribute-based conditions for dynamic permissions
 */
export interface PermissionCondition {
  id: string;

  // Attribute type
  attributeType: 'user' | 'resource' | 'environment' | 'action';

  // Attribute path (dot notation)
  attribute: string;          // e.g., "user.department", "resource.status", "environment.time"

  // Comparison
  operator: ConditionOperator;
  value: string | number | boolean | string[];

  // Logical grouping
  logicalOperator?: 'and' | 'or';  // For combining multiple conditions
}

export type ConditionOperator =
  | 'eq'          // Equal
  | 'ne'          // Not equal
  | 'gt'          // Greater than
  | 'gte'         // Greater than or equal
  | 'lt'          // Less than
  | 'lte'         // Less than or equal
  | 'in'          // In array
  | 'not_in'      // Not in array
  | 'contains'    // String contains
  | 'starts_with' // String starts with
  | 'ends_with'   // String ends with
  | 'is_null'     // Is null/undefined
  | 'not_null'    // Is not null/undefined
  | 'between';    // Between two values

/**
 * Permission Policy
 * Complex ABAC policy combining multiple conditions
 */
export interface PermissionPolicy {
  id: string;
  tenantId: string;
  name: string;
  description?: string;

  // Target
  resourceType: ResourceType;
  action: PermissionAction;

  // Conditions (evaluated with AND by default)
  conditions: PermissionCondition[];

  // Effect
  effect: 'allow' | 'deny';

  // Priority (higher = evaluated first)
  priority: number;

  // State
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Sharing Rule
 * Automatic record sharing based on criteria
 */
export interface SharingRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;

  resourceType: ResourceType;

  // Criteria for which records this rule applies
  criteria: SharingCriteria[];

  // Who to share with
  sharedWith: SharingTarget;

  // Access level granted
  accessLevel: 'read' | 'read_write';

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sharing Criteria
 */
export interface SharingCriteria {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean | string[];
}

/**
 * Sharing Target
 */
export interface SharingTarget {
  type: 'user' | 'role' | 'team' | 'territory' | 'public_group';
  targetId?: string;      // Specific user/role/team ID
  dynamicField?: string;  // Dynamic reference (e.g., "resource.ownerId.managerId")
}

/**
 * Record Share
 * Individual record sharing (manual)
 */
export interface RecordShare {
  id: string;
  tenantId: string;

  resourceType: ResourceType;
  recordId: string;

  // Shared with
  sharedWith: SharingTarget;

  // Access
  accessLevel: 'read' | 'read_write';

  // Source
  shareSource: 'manual' | 'rule' | 'team' | 'hierarchy';
  sharingRuleId?: string;

  // Expiration
  expiresAt?: Date;

  // Metadata
  sharedBy: string;
  sharedAt: Date;
}

/**
 * Data Masking Rule
 */
export interface DataMaskingRule {
  id: string;
  tenantId: string;
  name: string;

  resourceType: ResourceType;
  fieldName: string;

  // Masking type
  maskingType: MaskingType;

  // Configuration based on type
  config: MaskingConfig;

  // Who this rule applies to
  applyTo: {
    allUsers: boolean;
    excludeRoleIds?: string[];  // These roles see unmasked data
    excludeUserIds?: string[];  // These users see unmasked data
  };

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type MaskingType =
  | 'full'          // Replace entire value
  | 'partial'       // Show some characters
  | 'email'         // j***@example.com
  | 'phone'         // ***-***-1234
  | 'credit_card'   // ****-****-****-1234
  | 'ssn'           // ***-**-1234
  | 'custom';       // Custom pattern

export interface MaskingConfig {
  maskCharacter: string;

  // For partial masking
  showFirst?: number;
  showLast?: number;

  // For custom pattern
  pattern?: string;        // e.g., "{first3}***{last4}"

  // Replacement value for full masking
  replacement?: string;    // e.g., "[REDACTED]"
}

/**
 * Permission Set
 * Collection of permissions that can be assigned
 */
export interface PermissionSet {
  id: string;
  tenantId: string;
  name: string;
  description?: string;

  // Permissions included
  resourcePermissions: string[];   // ResourcePermission IDs
  fieldPermissions: string[];      // FieldPermission IDs

  // License type requirement
  licenseType?: string;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * User Permission Assignment
 */
export interface UserPermissionAssignment {
  id: string;
  tenantId: string;
  userId: string;

  // Role assignment
  roleId: string;

  // Additional permission sets
  permissionSetIds: string[];

  // Direct permissions (override)
  customPermissions?: {
    resourceType: ResourceType;
    action: PermissionAction;
    effect: 'allow' | 'deny';
  }[];

  // Effective dates
  effectiveFrom?: Date;
  effectiveUntil?: Date;

  createdAt: Date;
  updatedAt: Date;
  assignedBy: string;
}

/**
 * Permission Audit Log
 */
export interface PermissionAuditLog {
  id: string;
  tenantId: string;

  // What happened
  action: 'role_assigned' | 'role_removed' | 'permission_granted' | 'permission_revoked' | 'access_denied' | 'access_granted';

  // Who
  userId: string;

  // Target (if applicable)
  targetUserId?: string;
  targetRoleId?: string;

  // Resource (if applicable)
  resourceType?: ResourceType;
  recordId?: string;

  // Details
  details: Record<string, unknown>;

  // Context
  ipAddress?: string;
  userAgent?: string;

  occurredAt: Date;
}

/**
 * Access Decision Result
 */
export interface AccessDecision {
  allowed: boolean;
  reason?: string;

  // Field-level decisions
  fieldAccess?: Record<string, FieldAccessLevel>;

  // Masking requirements
  maskedFields?: string[];

  // Matching policies
  matchedPolicies?: string[];

  // For debugging
  evaluationPath?: string[];
}

/**
 * Effective Permissions
 * Computed permissions for a user
 */
export interface EffectivePermissions {
  userId: string;
  tenantId: string;
  computedAt: Date;

  // Role
  roleId: string;
  roleName: string;
  roleLevel: number;

  // Resource permissions
  resources: {
    [key in ResourceType]?: {
      actions: Record<PermissionAction, boolean>;
      readScope: RecordVisibility;
      updateScope: RecordVisibility;
      deleteScope: RecordVisibility;
    };
  };

  // Field permissions by resource
  fields: {
    [resource in ResourceType]?: {
      [field: string]: FieldAccessLevel;
    };
  };

  // Applied policies
  activePolicies: string[];

  // Sharing rules that apply
  applicableSharingRules: string[];
}

/**
 * Permission Check Context
 */
export interface PermissionCheckContext {
  tenantId: string;
  userId: string;

  // User attributes for ABAC
  userAttributes?: Record<string, unknown>;

  // Resource being accessed
  resourceType: ResourceType;
  recordId?: string;

  // Resource attributes for ABAC
  resourceAttributes?: Record<string, unknown>;

  // Action being performed
  action: PermissionAction;

  // Environment attributes
  environment?: {
    ipAddress?: string;
    timestamp?: Date;
    deviceType?: string;
    location?: string;
  };

  // Specific fields being accessed
  fields?: string[];
}

/**
 * Permission Summary for UI
 */
export interface PermissionSummary {
  tenantId: string;

  // Role summary
  roles: {
    id: string;
    name: string;
    userCount: number;
    level: number;
  }[];

  // Permission set summary
  permissionSets: {
    id: string;
    name: string;
    userCount: number;
  }[];

  // Policy summary
  policies: {
    id: string;
    name: string;
    resourceType: ResourceType;
    effect: 'allow' | 'deny';
    isActive: boolean;
  }[];

  // Sharing rules summary
  sharingRules: {
    id: string;
    name: string;
    resourceType: ResourceType;
    isActive: boolean;
  }[];
}

/**
 * Permission Template
 * Pre-configured permission setup for common roles
 */
export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'marketing' | 'support' | 'admin' | 'executive' | 'custom';

  // Template configuration
  roleConfig: Partial<PermissionRole>;
  resourcePermissions: Partial<ResourcePermission>[];
  fieldPermissions: Partial<FieldPermission>[];

  // Usage
  isBuiltIn: boolean;
}

/**
 * Hierarchy Configuration
 */
export interface HierarchyConfig {
  id: string;
  tenantId: string;

  // Manager relationship field
  managerField: string;          // e.g., "managerId", "reportsTo"

  // Hierarchy depth
  maxDepth: number;              // How many levels up/down to traverse

  // Data sharing in hierarchy
  sharingDirection: 'up' | 'down' | 'both';
  sharingAccessLevel: 'read' | 'read_write';

  createdAt: Date;
  updatedAt: Date;
}
