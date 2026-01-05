/**
 * Advanced Permission Service
 *
 * Comprehensive permission management:
 * - RBAC (Role-Based Access Control)
 * - ABAC (Attribute-Based Access Control)
 * - Field-Level Security
 * - Record-Level Security
 * - Data Masking
 * - Sharing Rules
 */

import { injectable, inject } from 'tsyringe';
import { eq, and, desc, sql, inArray, or, isNull, gte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { Result } from '@zuclubit/domain';
import {
  permissionRoles,
  resourcePermissions,
  fieldPermissions,
  permissionPolicies,
  sharingRules,
  recordShares,
  dataMaskingRules,
  permissionSets,
  userPermissionAssignments,
  permissionAuditLogs,
  hierarchyConfigs,
  PermissionRoleRow,
  ResourcePermissionRow,
  FieldPermissionRow,
  PermissionPolicyRow,
  SharingRuleRow,
  RecordShareRow,
  DataMaskingRuleRow,
  PermissionSetRow,
  UserPermissionAssignmentRow,
  PermissionAuditLogRow,
  HierarchyConfigRow,
} from '../database/schema';
import type {
  PermissionAction,
  ResourceType,
  FieldAccessLevel,
  RecordVisibility,
  PermissionCondition,
  AccessDecision,
  EffectivePermissions,
  PermissionCheckContext,
  MaskingType,
  MaskingConfig,
  SharingTarget,
  SharingCriteria,
} from './types';

@injectable()
export class PermissionService {
  private db: any;

  constructor(@inject('Database') db: any) {
    this.db = db;
  }

  // ============================================================================
  // ROLE MANAGEMENT
  // ============================================================================

  /**
   * Create a new role
   */
  async createRole(
    tenantId: string,
    userId: string,
    input: {
      name: string;
      description?: string;
      level?: number;
      parentRoleId?: string;
      isDefault?: boolean;
    }
  ): Promise<Result<PermissionRoleRow>> {
    try {
      const [role] = await this.db.insert(permissionRoles)
        .values({
          id: uuidv4(),
          tenantId,
          name: input.name,
          description: input.description,
          level: input.level ?? 10,
          parentRoleId: input.parentRoleId,
          isSystemRole: false,
          isDefault: input.isDefault ?? false,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      await this.logAudit(tenantId, userId, 'role_created', {
        targetRoleId: role.id,
        details: { name: input.name },
      });

      return Result.ok(role);
    } catch (error) {
      return Result.fail(`Failed to create role: ${error}`);
    }
  }

  /**
   * Get roles for tenant
   */
  async getRoles(tenantId: string): Promise<Result<PermissionRoleRow[]>> {
    try {
      const roles = await this.db.select()
        .from(permissionRoles)
        .where(eq(permissionRoles.tenantId, tenantId))
        .orderBy(permissionRoles.level);

      return Result.ok(roles);
    } catch (error) {
      return Result.fail(`Failed to get roles: ${error}`);
    }
  }

  /**
   * Update role
   */
  async updateRole(
    roleId: string,
    tenantId: string,
    userId: string,
    updates: Partial<{
      name: string;
      description: string;
      level: number;
      parentRoleId: string;
      isDefault: boolean;
    }>
  ): Promise<Result<PermissionRoleRow>> {
    try {
      const [updated] = await this.db.update(permissionRoles)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(
          eq(permissionRoles.id, roleId),
          eq(permissionRoles.tenantId, tenantId),
          eq(permissionRoles.isSystemRole, false) // Can't update system roles
        ))
        .returning();

      if (!updated) {
        return Result.fail('Role not found or cannot be modified');
      }

      await this.logAudit(tenantId, userId, 'role_updated', {
        targetRoleId: roleId,
        details: updates,
      });

      return Result.ok(updated);
    } catch (error) {
      return Result.fail(`Failed to update role: ${error}`);
    }
  }

  /**
   * Delete role
   */
  async deleteRole(roleId: string, tenantId: string, userId: string): Promise<Result<void>> {
    try {
      const deleted = await this.db.delete(permissionRoles)
        .where(and(
          eq(permissionRoles.id, roleId),
          eq(permissionRoles.tenantId, tenantId),
          eq(permissionRoles.isSystemRole, false)
        ))
        .returning();

      if (!deleted.length) {
        return Result.fail('Role not found or cannot be deleted');
      }

      await this.logAudit(tenantId, userId, 'role_deleted', {
        targetRoleId: roleId,
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete role: ${error}`);
    }
  }

  // ============================================================================
  // RESOURCE PERMISSIONS
  // ============================================================================

  /**
   * Set resource permissions for a role
   */
  async setResourcePermission(
    tenantId: string,
    userId: string,
    input: {
      roleId: string;
      resourceType: ResourceType;
      canCreate?: boolean;
      canRead?: boolean;
      canUpdate?: boolean;
      canDelete?: boolean;
      canExport?: boolean;
      canImport?: boolean;
      canShare?: boolean;
      canAssign?: boolean;
      canApprove?: boolean;
      canBulkEdit?: boolean;
      canBulkDelete?: boolean;
      readScope?: RecordVisibility;
      updateScope?: RecordVisibility;
      deleteScope?: RecordVisibility;
    }
  ): Promise<Result<ResourcePermissionRow>> {
    try {
      // Upsert: update if exists, insert if not
      const existing = await this.db.select()
        .from(resourcePermissions)
        .where(and(
          eq(resourcePermissions.roleId, input.roleId),
          eq(resourcePermissions.resourceType, input.resourceType)
        ))
        .limit(1);

      let result: ResourcePermissionRow;

      if (existing.length > 0) {
        const [updated] = await this.db.update(resourcePermissions)
          .set({
            canCreate: input.canCreate ?? existing[0].canCreate,
            canRead: input.canRead ?? existing[0].canRead,
            canUpdate: input.canUpdate ?? existing[0].canUpdate,
            canDelete: input.canDelete ?? existing[0].canDelete,
            canExport: input.canExport ?? existing[0].canExport,
            canImport: input.canImport ?? existing[0].canImport,
            canShare: input.canShare ?? existing[0].canShare,
            canAssign: input.canAssign ?? existing[0].canAssign,
            canApprove: input.canApprove ?? existing[0].canApprove,
            canBulkEdit: input.canBulkEdit ?? existing[0].canBulkEdit,
            canBulkDelete: input.canBulkDelete ?? existing[0].canBulkDelete,
            readScope: input.readScope ?? existing[0].readScope,
            updateScope: input.updateScope ?? existing[0].updateScope,
            deleteScope: input.deleteScope ?? existing[0].deleteScope,
            updatedAt: new Date(),
          })
          .where(eq(resourcePermissions.id, existing[0].id))
          .returning();
        result = updated;
      } else {
        const [inserted] = await this.db.insert(resourcePermissions)
          .values({
            id: uuidv4(),
            tenantId,
            roleId: input.roleId,
            resourceType: input.resourceType,
            canCreate: input.canCreate ?? false,
            canRead: input.canRead ?? false,
            canUpdate: input.canUpdate ?? false,
            canDelete: input.canDelete ?? false,
            canExport: input.canExport ?? false,
            canImport: input.canImport ?? false,
            canShare: input.canShare ?? false,
            canAssign: input.canAssign ?? false,
            canApprove: input.canApprove ?? false,
            canBulkEdit: input.canBulkEdit ?? false,
            canBulkDelete: input.canBulkDelete ?? false,
            readScope: input.readScope ?? 'private',
            updateScope: input.updateScope ?? 'private',
            deleteScope: input.deleteScope ?? 'private',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        result = inserted;
      }

      await this.logAudit(tenantId, userId, 'permission_granted', {
        targetRoleId: input.roleId,
        resourceType: input.resourceType,
        details: input,
      });

      return Result.ok(result);
    } catch (error) {
      return Result.fail(`Failed to set resource permission: ${error}`);
    }
  }

  /**
   * Get resource permissions for a role
   */
  async getResourcePermissions(
    roleId: string,
    tenantId: string
  ): Promise<Result<ResourcePermissionRow[]>> {
    try {
      const permissions = await this.db.select()
        .from(resourcePermissions)
        .where(and(
          eq(resourcePermissions.roleId, roleId),
          eq(resourcePermissions.tenantId, tenantId)
        ));

      return Result.ok(permissions);
    } catch (error) {
      return Result.fail(`Failed to get resource permissions: ${error}`);
    }
  }

  // ============================================================================
  // FIELD PERMISSIONS
  // ============================================================================

  /**
   * Set field permission
   */
  async setFieldPermission(
    tenantId: string,
    userId: string,
    input: {
      roleId: string;
      resourceType: ResourceType;
      fieldName: string;
      accessLevel: FieldAccessLevel;
      maskPattern?: string;
      maskCharacter?: string;
      conditions?: PermissionCondition[];
    }
  ): Promise<Result<FieldPermissionRow>> {
    try {
      // Upsert
      const existing = await this.db.select()
        .from(fieldPermissions)
        .where(and(
          eq(fieldPermissions.roleId, input.roleId),
          eq(fieldPermissions.resourceType, input.resourceType),
          eq(fieldPermissions.fieldName, input.fieldName)
        ))
        .limit(1);

      let result: FieldPermissionRow;

      if (existing.length > 0) {
        const [updated] = await this.db.update(fieldPermissions)
          .set({
            accessLevel: input.accessLevel,
            maskPattern: input.maskPattern,
            maskCharacter: input.maskCharacter,
            conditions: input.conditions || [],
            updatedAt: new Date(),
          })
          .where(eq(fieldPermissions.id, existing[0].id))
          .returning();
        result = updated;
      } else {
        const [inserted] = await this.db.insert(fieldPermissions)
          .values({
            id: uuidv4(),
            tenantId,
            roleId: input.roleId,
            resourceType: input.resourceType,
            fieldName: input.fieldName,
            accessLevel: input.accessLevel,
            maskPattern: input.maskPattern,
            maskCharacter: input.maskCharacter ?? '*',
            conditions: input.conditions || [],
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        result = inserted;
      }

      return Result.ok(result);
    } catch (error) {
      return Result.fail(`Failed to set field permission: ${error}`);
    }
  }

  /**
   * Get field permissions for a role and resource
   */
  async getFieldPermissions(
    roleId: string,
    resourceType: ResourceType,
    tenantId: string
  ): Promise<Result<FieldPermissionRow[]>> {
    try {
      const permissions = await this.db.select()
        .from(fieldPermissions)
        .where(and(
          eq(fieldPermissions.roleId, roleId),
          eq(fieldPermissions.resourceType, resourceType),
          eq(fieldPermissions.tenantId, tenantId)
        ));

      return Result.ok(permissions);
    } catch (error) {
      return Result.fail(`Failed to get field permissions: ${error}`);
    }
  }

  // ============================================================================
  // ABAC POLICIES
  // ============================================================================

  /**
   * Create ABAC policy
   */
  async createPolicy(
    tenantId: string,
    userId: string,
    input: {
      name: string;
      description?: string;
      resourceType: ResourceType;
      action: PermissionAction;
      conditions: PermissionCondition[];
      effect: 'allow' | 'deny';
      priority?: number;
    }
  ): Promise<Result<PermissionPolicyRow>> {
    try {
      const [policy] = await this.db.insert(permissionPolicies)
        .values({
          id: uuidv4(),
          tenantId,
          name: input.name,
          description: input.description,
          resourceType: input.resourceType,
          action: input.action,
          conditions: input.conditions,
          effect: input.effect,
          priority: input.priority ?? 0,
          isActive: true,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(policy);
    } catch (error) {
      return Result.fail(`Failed to create policy: ${error}`);
    }
  }

  /**
   * Get policies
   */
  async getPolicies(
    tenantId: string,
    resourceType?: ResourceType
  ): Promise<Result<PermissionPolicyRow[]>> {
    try {
      const conditions = [
        eq(permissionPolicies.tenantId, tenantId),
        eq(permissionPolicies.isActive, true),
      ];

      if (resourceType) {
        conditions.push(eq(permissionPolicies.resourceType, resourceType));
      }

      const policies = await this.db.select()
        .from(permissionPolicies)
        .where(and(...conditions))
        .orderBy(desc(permissionPolicies.priority));

      return Result.ok(policies);
    } catch (error) {
      return Result.fail(`Failed to get policies: ${error}`);
    }
  }

  /**
   * Toggle policy active state
   */
  async togglePolicy(
    policyId: string,
    tenantId: string,
    isActive: boolean
  ): Promise<Result<PermissionPolicyRow>> {
    try {
      const [updated] = await this.db.update(permissionPolicies)
        .set({ isActive, updatedAt: new Date() })
        .where(and(
          eq(permissionPolicies.id, policyId),
          eq(permissionPolicies.tenantId, tenantId)
        ))
        .returning();

      if (!updated) {
        return Result.fail('Policy not found');
      }

      return Result.ok(updated);
    } catch (error) {
      return Result.fail(`Failed to toggle policy: ${error}`);
    }
  }

  // ============================================================================
  // SHARING RULES
  // ============================================================================

  /**
   * Create sharing rule
   */
  async createSharingRule(
    tenantId: string,
    input: {
      name: string;
      description?: string;
      resourceType: ResourceType;
      criteria: SharingCriteria[];
      sharedWith: SharingTarget;
      accessLevel: 'read' | 'read_write';
    }
  ): Promise<Result<SharingRuleRow>> {
    try {
      const [rule] = await this.db.insert(sharingRules)
        .values({
          id: uuidv4(),
          tenantId,
          name: input.name,
          description: input.description,
          resourceType: input.resourceType,
          criteria: input.criteria,
          sharedWith: input.sharedWith,
          accessLevel: input.accessLevel,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(rule);
    } catch (error) {
      return Result.fail(`Failed to create sharing rule: ${error}`);
    }
  }

  /**
   * Get sharing rules
   */
  async getSharingRules(
    tenantId: string,
    resourceType?: ResourceType
  ): Promise<Result<SharingRuleRow[]>> {
    try {
      const conditions = [eq(sharingRules.tenantId, tenantId)];

      if (resourceType) {
        conditions.push(eq(sharingRules.resourceType, resourceType));
      }

      const rules = await this.db.select()
        .from(sharingRules)
        .where(and(...conditions));

      return Result.ok(rules);
    } catch (error) {
      return Result.fail(`Failed to get sharing rules: ${error}`);
    }
  }

  // ============================================================================
  // RECORD SHARING
  // ============================================================================

  /**
   * Share record with user/role/team
   */
  async shareRecord(
    tenantId: string,
    userId: string,
    input: {
      resourceType: ResourceType;
      recordId: string;
      sharedWith: SharingTarget;
      accessLevel: 'read' | 'read_write';
      expiresAt?: Date;
    }
  ): Promise<Result<RecordShareRow>> {
    try {
      const [share] = await this.db.insert(recordShares)
        .values({
          id: uuidv4(),
          tenantId,
          resourceType: input.resourceType,
          recordId: input.recordId,
          sharedWith: input.sharedWith,
          accessLevel: input.accessLevel,
          shareSource: 'manual',
          expiresAt: input.expiresAt,
          sharedBy: userId,
          sharedAt: new Date(),
        })
        .returning();

      await this.logAudit(tenantId, userId, 'record_shared', {
        resourceType: input.resourceType,
        recordId: input.recordId,
        details: { sharedWith: input.sharedWith, accessLevel: input.accessLevel },
      });

      return Result.ok(share);
    } catch (error) {
      return Result.fail(`Failed to share record: ${error}`);
    }
  }

  /**
   * Get shares for a record
   */
  async getRecordShares(
    resourceType: ResourceType,
    recordId: string,
    tenantId: string
  ): Promise<Result<RecordShareRow[]>> {
    try {
      const shares = await this.db.select()
        .from(recordShares)
        .where(and(
          eq(recordShares.tenantId, tenantId),
          eq(recordShares.resourceType, resourceType),
          eq(recordShares.recordId, recordId),
          or(
            isNull(recordShares.expiresAt),
            gte(recordShares.expiresAt, new Date())
          )
        ));

      return Result.ok(shares);
    } catch (error) {
      return Result.fail(`Failed to get record shares: ${error}`);
    }
  }

  /**
   * Remove record share
   */
  async removeRecordShare(
    shareId: string,
    tenantId: string,
    userId: string
  ): Promise<Result<void>> {
    try {
      await this.db.delete(recordShares)
        .where(and(
          eq(recordShares.id, shareId),
          eq(recordShares.tenantId, tenantId)
        ));

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to remove record share: ${error}`);
    }
  }

  // ============================================================================
  // DATA MASKING
  // ============================================================================

  /**
   * Create data masking rule
   */
  async createMaskingRule(
    tenantId: string,
    input: {
      name: string;
      resourceType: ResourceType;
      fieldName: string;
      maskingType: MaskingType;
      config: MaskingConfig;
      applyTo?: {
        allUsers: boolean;
        excludeRoleIds?: string[];
        excludeUserIds?: string[];
      };
    }
  ): Promise<Result<DataMaskingRuleRow>> {
    try {
      const [rule] = await this.db.insert(dataMaskingRules)
        .values({
          id: uuidv4(),
          tenantId,
          name: input.name,
          resourceType: input.resourceType,
          fieldName: input.fieldName,
          maskingType: input.maskingType,
          config: input.config,
          applyTo: input.applyTo ?? { allUsers: true },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(rule);
    } catch (error) {
      return Result.fail(`Failed to create masking rule: ${error}`);
    }
  }

  /**
   * Get masking rules
   */
  async getMaskingRules(
    tenantId: string,
    resourceType?: ResourceType
  ): Promise<Result<DataMaskingRuleRow[]>> {
    try {
      const conditions = [
        eq(dataMaskingRules.tenantId, tenantId),
        eq(dataMaskingRules.isActive, true),
      ];

      if (resourceType) {
        conditions.push(eq(dataMaskingRules.resourceType, resourceType));
      }

      const rules = await this.db.select()
        .from(dataMaskingRules)
        .where(and(...conditions));

      return Result.ok(rules);
    } catch (error) {
      return Result.fail(`Failed to get masking rules: ${error}`);
    }
  }

  /**
   * Apply masking to a value
   */
  applyMask(value: string, maskingType: MaskingType, config: MaskingConfig): string {
    const maskChar = config.maskCharacter || '*';

    switch (maskingType) {
      case 'full':
        return config.replacement || maskChar.repeat(value.length);

      case 'partial': {
        const showFirst = config.showFirst ?? 0;
        const showLast = config.showLast ?? 0;
        const maskedLength = Math.max(0, value.length - showFirst - showLast);
        return value.slice(0, showFirst) +
               maskChar.repeat(maskedLength) +
               value.slice(-showLast || value.length);
      }

      case 'email': {
        const atIndex = value.indexOf('@');
        if (atIndex === -1) return value;
        const local = value.slice(0, atIndex);
        const domain = value.slice(atIndex);
        return local[0] + maskChar.repeat(local.length - 1) + domain;
      }

      case 'phone':
        return value.replace(/\d(?=\d{4})/g, maskChar);

      case 'credit_card':
        return maskChar.repeat(12) + value.slice(-4);

      case 'ssn':
        return maskChar.repeat(5) + '-' + maskChar.repeat(2) + '-' + value.slice(-4);

      case 'custom':
        if (config.pattern) {
          return config.pattern
            .replace('{first3}', value.slice(0, 3))
            .replace('{last4}', value.slice(-4))
            .replace('***', maskChar.repeat(3));
        }
        return value;

      default:
        return value;
    }
  }

  // ============================================================================
  // USER ASSIGNMENTS
  // ============================================================================

  /**
   * Assign role to user
   */
  async assignUserRole(
    tenantId: string,
    assignedBy: string,
    input: {
      userId: string;
      roleId: string;
      permissionSetIds?: string[];
      effectiveFrom?: Date;
      effectiveUntil?: Date;
    }
  ): Promise<Result<UserPermissionAssignmentRow>> {
    try {
      // Check if assignment exists
      const existing = await this.db.select()
        .from(userPermissionAssignments)
        .where(and(
          eq(userPermissionAssignments.tenantId, tenantId),
          eq(userPermissionAssignments.userId, input.userId)
        ))
        .limit(1);

      let result: UserPermissionAssignmentRow;

      if (existing.length > 0) {
        const [updated] = await this.db.update(userPermissionAssignments)
          .set({
            roleId: input.roleId,
            permissionSetIds: input.permissionSetIds ?? existing[0].permissionSetIds,
            effectiveFrom: input.effectiveFrom,
            effectiveUntil: input.effectiveUntil,
            updatedAt: new Date(),
            assignedBy,
          })
          .where(eq(userPermissionAssignments.id, existing[0].id))
          .returning();
        result = updated;
      } else {
        const [inserted] = await this.db.insert(userPermissionAssignments)
          .values({
            id: uuidv4(),
            tenantId,
            userId: input.userId,
            roleId: input.roleId,
            permissionSetIds: input.permissionSetIds ?? [],
            customPermissions: [],
            effectiveFrom: input.effectiveFrom,
            effectiveUntil: input.effectiveUntil,
            createdAt: new Date(),
            updatedAt: new Date(),
            assignedBy,
          })
          .returning();
        result = inserted;
      }

      await this.logAudit(tenantId, assignedBy, 'role_assigned', {
        targetUserId: input.userId,
        targetRoleId: input.roleId,
      });

      return Result.ok(result);
    } catch (error) {
      return Result.fail(`Failed to assign role: ${error}`);
    }
  }

  /**
   * Get user's permission assignment
   */
  async getUserAssignment(
    userId: string,
    tenantId: string
  ): Promise<Result<UserPermissionAssignmentRow | null>> {
    try {
      const [assignment] = await this.db.select()
        .from(userPermissionAssignments)
        .where(and(
          eq(userPermissionAssignments.tenantId, tenantId),
          eq(userPermissionAssignments.userId, userId)
        ))
        .limit(1);

      return Result.ok(assignment || null);
    } catch (error) {
      return Result.fail(`Failed to get user assignment: ${error}`);
    }
  }

  // ============================================================================
  // ACCESS CHECKING
  // ============================================================================

  /**
   * Check if user has permission to perform action on resource
   */
  async checkAccess(context: PermissionCheckContext): Promise<Result<AccessDecision>> {
    try {
      // Get user's role assignment
      const [assignment] = await this.db.select()
        .from(userPermissionAssignments)
        .where(and(
          eq(userPermissionAssignments.tenantId, context.tenantId),
          eq(userPermissionAssignments.userId, context.userId)
        ))
        .limit(1);

      if (!assignment) {
        return Result.ok({
          allowed: false,
          reason: 'No role assigned to user',
        });
      }

      // Check if assignment is within effective dates
      const now = new Date();
      if (assignment.effectiveFrom && assignment.effectiveFrom > now) {
        return Result.ok({
          allowed: false,
          reason: 'Role assignment not yet effective',
        });
      }
      if (assignment.effectiveUntil && assignment.effectiveUntil < now) {
        return Result.ok({
          allowed: false,
          reason: 'Role assignment expired',
        });
      }

      // Get resource permission for the role
      const [resourcePerm] = await this.db.select()
        .from(resourcePermissions)
        .where(and(
          eq(resourcePermissions.roleId, assignment.roleId),
          eq(resourcePermissions.resourceType, context.resourceType)
        ))
        .limit(1);

      if (!resourcePerm) {
        return Result.ok({
          allowed: false,
          reason: 'No permission defined for this resource',
        });
      }

      // Check basic action permission
      const actionAllowed = this.checkActionPermission(resourcePerm, context.action);
      if (!actionAllowed) {
        return Result.ok({
          allowed: false,
          reason: `Action '${context.action}' not permitted`,
        });
      }

      // Check ABAC policies
      const policies = await this.db.select()
        .from(permissionPolicies)
        .where(and(
          eq(permissionPolicies.tenantId, context.tenantId),
          eq(permissionPolicies.resourceType, context.resourceType),
          eq(permissionPolicies.action, context.action),
          eq(permissionPolicies.isActive, true)
        ))
        .orderBy(desc(permissionPolicies.priority));

      const matchedPolicies: string[] = [];
      let policyDenied = false;

      for (const policy of policies) {
        const conditions = policy.conditions as PermissionCondition[];
        const matches = this.evaluateConditions(conditions, context);

        if (matches) {
          matchedPolicies.push(policy.id);
          if (policy.effect === 'deny') {
            policyDenied = true;
            break;
          }
        }
      }

      if (policyDenied) {
        return Result.ok({
          allowed: false,
          reason: 'Access denied by policy',
          matchedPolicies,
        });
      }

      // Get field permissions
      let fieldAccess: Record<string, FieldAccessLevel> | undefined;
      let maskedFields: string[] | undefined;

      if (context.fields?.length) {
        const fieldPerms = await this.db.select()
          .from(fieldPermissions)
          .where(and(
            eq(fieldPermissions.roleId, assignment.roleId),
            eq(fieldPermissions.resourceType, context.resourceType),
            inArray(fieldPermissions.fieldName, context.fields)
          ));

        fieldAccess = {};
        maskedFields = [];

        for (const field of context.fields) {
          const perm = fieldPerms.find((p: FieldPermissionRow) => p.fieldName === field);
          const level = perm ? perm.accessLevel as FieldAccessLevel : 'write';
          fieldAccess[field] = level;
          if (level === 'masked') {
            maskedFields.push(field);
          }
        }
      }

      return Result.ok({
        allowed: true,
        fieldAccess,
        maskedFields,
        matchedPolicies,
      });
    } catch (error) {
      return Result.fail(`Failed to check access: ${error}`);
    }
  }

  /**
   * Get effective permissions for a user
   */
  async getEffectivePermissions(
    userId: string,
    tenantId: string
  ): Promise<Result<EffectivePermissions>> {
    try {
      // Get user's role assignment
      const [assignment] = await this.db.select()
        .from(userPermissionAssignments)
        .where(and(
          eq(userPermissionAssignments.tenantId, tenantId),
          eq(userPermissionAssignments.userId, userId)
        ))
        .limit(1);

      if (!assignment) {
        return Result.fail('No role assigned to user');
      }

      // Get role
      const [role] = await this.db.select()
        .from(permissionRoles)
        .where(eq(permissionRoles.id, assignment.roleId))
        .limit(1);

      if (!role) {
        return Result.fail('Role not found');
      }

      // Get all resource permissions
      const resourcePerms = await this.db.select()
        .from(resourcePermissions)
        .where(eq(resourcePermissions.roleId, assignment.roleId));

      // Get all field permissions
      const fieldPerms = await this.db.select()
        .from(fieldPermissions)
        .where(eq(fieldPermissions.roleId, assignment.roleId));

      // Get active policies
      const policies = await this.db.select()
        .from(permissionPolicies)
        .where(and(
          eq(permissionPolicies.tenantId, tenantId),
          eq(permissionPolicies.isActive, true)
        ));

      // Get applicable sharing rules
      const rules = await this.db.select()
        .from(sharingRules)
        .where(and(
          eq(sharingRules.tenantId, tenantId),
          eq(sharingRules.isActive, true)
        ));

      // Build resources map
      const resources: EffectivePermissions['resources'] = {};
      for (const perm of resourcePerms) {
        resources[perm.resourceType as ResourceType] = {
          actions: {
            create: perm.canCreate,
            read: perm.canRead,
            update: perm.canUpdate,
            delete: perm.canDelete,
            export: perm.canExport,
            import: perm.canImport,
            share: perm.canShare,
            assign: perm.canAssign,
            approve: perm.canApprove,
            bulk_edit: perm.canBulkEdit,
            bulk_delete: perm.canBulkDelete,
          },
          readScope: perm.readScope as RecordVisibility,
          updateScope: perm.updateScope as RecordVisibility,
          deleteScope: perm.deleteScope as RecordVisibility,
        };
      }

      // Build fields map
      const fields: EffectivePermissions['fields'] = {};
      for (const perm of fieldPerms) {
        if (!fields[perm.resourceType as ResourceType]) {
          fields[perm.resourceType as ResourceType] = {};
        }
        fields[perm.resourceType as ResourceType]![perm.fieldName] = perm.accessLevel as FieldAccessLevel;
      }

      return Result.ok({
        userId,
        tenantId,
        computedAt: new Date(),
        roleId: role.id,
        roleName: role.name,
        roleLevel: role.level,
        resources,
        fields,
        activePolicies: policies.map((p: PermissionPolicyRow) => p.id),
        applicableSharingRules: rules.map((r: SharingRuleRow) => r.id),
      });
    } catch (error) {
      return Result.fail(`Failed to get effective permissions: ${error}`);
    }
  }

  // ============================================================================
  // PERMISSION SETS
  // ============================================================================

  /**
   * Create permission set
   */
  async createPermissionSet(
    tenantId: string,
    userId: string,
    input: {
      name: string;
      description?: string;
      resourcePermissionIds?: string[];
      fieldPermissionIds?: string[];
      licenseType?: string;
    }
  ): Promise<Result<PermissionSetRow>> {
    try {
      const [set] = await this.db.insert(permissionSets)
        .values({
          id: uuidv4(),
          tenantId,
          name: input.name,
          description: input.description,
          resourcePermissionIds: input.resourcePermissionIds ?? [],
          fieldPermissionIds: input.fieldPermissionIds ?? [],
          licenseType: input.licenseType,
          isActive: true,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(set);
    } catch (error) {
      return Result.fail(`Failed to create permission set: ${error}`);
    }
  }

  /**
   * Get permission sets
   */
  async getPermissionSets(tenantId: string): Promise<Result<PermissionSetRow[]>> {
    try {
      const sets = await this.db.select()
        .from(permissionSets)
        .where(and(
          eq(permissionSets.tenantId, tenantId),
          eq(permissionSets.isActive, true)
        ));

      return Result.ok(sets);
    } catch (error) {
      return Result.fail(`Failed to get permission sets: ${error}`);
    }
  }

  // ============================================================================
  // HIERARCHY
  // ============================================================================

  /**
   * Set hierarchy configuration
   */
  async setHierarchyConfig(
    tenantId: string,
    input: {
      managerField?: string;
      maxDepth?: number;
      sharingDirection?: 'up' | 'down' | 'both';
      sharingAccessLevel?: 'read' | 'read_write';
    }
  ): Promise<Result<HierarchyConfigRow>> {
    try {
      // Upsert
      const existing = await this.db.select()
        .from(hierarchyConfigs)
        .where(eq(hierarchyConfigs.tenantId, tenantId))
        .limit(1);

      let result: HierarchyConfigRow;

      if (existing.length > 0) {
        const [updated] = await this.db.update(hierarchyConfigs)
          .set({
            managerField: input.managerField ?? existing[0].managerField,
            maxDepth: input.maxDepth ?? existing[0].maxDepth,
            sharingDirection: input.sharingDirection ?? existing[0].sharingDirection,
            sharingAccessLevel: input.sharingAccessLevel ?? existing[0].sharingAccessLevel,
            updatedAt: new Date(),
          })
          .where(eq(hierarchyConfigs.id, existing[0].id))
          .returning();
        result = updated;
      } else {
        const [inserted] = await this.db.insert(hierarchyConfigs)
          .values({
            id: uuidv4(),
            tenantId,
            managerField: input.managerField ?? 'managerId',
            maxDepth: input.maxDepth ?? 5,
            sharingDirection: input.sharingDirection ?? 'up',
            sharingAccessLevel: input.sharingAccessLevel ?? 'read',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        result = inserted;
      }

      return Result.ok(result);
    } catch (error) {
      return Result.fail(`Failed to set hierarchy config: ${error}`);
    }
  }

  /**
   * Get hierarchy configuration
   */
  async getHierarchyConfig(tenantId: string): Promise<Result<HierarchyConfigRow | null>> {
    try {
      const [config] = await this.db.select()
        .from(hierarchyConfigs)
        .where(eq(hierarchyConfigs.tenantId, tenantId))
        .limit(1);

      return Result.ok(config || null);
    } catch (error) {
      return Result.fail(`Failed to get hierarchy config: ${error}`);
    }
  }

  // ============================================================================
  // AUDIT
  // ============================================================================

  /**
   * Get audit logs
   */
  async getAuditLogs(
    tenantId: string,
    filters?: {
      userId?: string;
      action?: string;
      resourceType?: ResourceType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<Result<{ logs: PermissionAuditLogRow[]; total: number }>> {
    try {
      const conditions = [eq(permissionAuditLogs.tenantId, tenantId)];

      if (filters?.userId) {
        conditions.push(eq(permissionAuditLogs.userId, filters.userId));
      }
      if (filters?.action) {
        conditions.push(eq(permissionAuditLogs.action, filters.action));
      }
      if (filters?.resourceType) {
        conditions.push(eq(permissionAuditLogs.resourceType, filters.resourceType));
      }

      const logs = await this.db.select()
        .from(permissionAuditLogs)
        .where(and(...conditions))
        .orderBy(desc(permissionAuditLogs.occurredAt))
        .limit(filters?.limit ?? 100)
        .offset(filters?.offset ?? 0);

      const [{ count }] = await this.db.select({ count: sql<number>`count(*)` })
        .from(permissionAuditLogs)
        .where(and(...conditions));

      return Result.ok({ logs, total: Number(count) });
    } catch (error) {
      return Result.fail(`Failed to get audit logs: ${error}`);
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private checkActionPermission(perm: ResourcePermissionRow, action: PermissionAction): boolean {
    switch (action) {
      case 'create': return perm.canCreate;
      case 'read': return perm.canRead;
      case 'update': return perm.canUpdate;
      case 'delete': return perm.canDelete;
      case 'export': return perm.canExport;
      case 'import': return perm.canImport;
      case 'share': return perm.canShare;
      case 'assign': return perm.canAssign;
      case 'approve': return perm.canApprove;
      case 'bulk_edit': return perm.canBulkEdit;
      case 'bulk_delete': return perm.canBulkDelete;
      default: return false;
    }
  }

  private evaluateConditions(
    conditions: PermissionCondition[],
    context: PermissionCheckContext
  ): boolean {
    if (!conditions.length) return true;

    for (const condition of conditions) {
      const value = this.getAttributeValue(condition, context);
      const matches = this.evaluateCondition(condition, value);

      // Default to AND logic
      if (!matches) return false;
    }

    return true;
  }

  private getAttributeValue(condition: PermissionCondition, context: PermissionCheckContext): unknown {
    const parts = condition.attribute.split('.');

    switch (condition.attributeType) {
      case 'user':
        return this.getNestedValue(context.userAttributes || {}, parts.slice(1));
      case 'resource':
        return this.getNestedValue(context.resourceAttributes || {}, parts.slice(1));
      case 'environment':
        return this.getNestedValue(context.environment || {}, parts.slice(1));
      default:
        return undefined;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
    let current: unknown = obj;
    for (const key of path) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }

  private evaluateCondition(condition: PermissionCondition, value: unknown): boolean {
    const condValue = condition.value;

    switch (condition.operator) {
      case 'eq': return value === condValue;
      case 'ne': return value !== condValue;
      case 'gt': return typeof value === 'number' && value > (condValue as number);
      case 'gte': return typeof value === 'number' && value >= (condValue as number);
      case 'lt': return typeof value === 'number' && value < (condValue as number);
      case 'lte': return typeof value === 'number' && value <= (condValue as number);
      case 'in': return Array.isArray(condValue) && condValue.includes(value as string);
      case 'not_in': return Array.isArray(condValue) && !condValue.includes(value as string);
      case 'contains': return typeof value === 'string' && value.includes(condValue as string);
      case 'starts_with': return typeof value === 'string' && value.startsWith(condValue as string);
      case 'ends_with': return typeof value === 'string' && value.endsWith(condValue as string);
      case 'is_null': return value === null || value === undefined;
      case 'not_null': return value !== null && value !== undefined;
      default: return false;
    }
  }

  private async logAudit(
    tenantId: string,
    userId: string,
    action: string,
    data: {
      targetUserId?: string;
      targetRoleId?: string;
      resourceType?: string;
      recordId?: string;
      details?: Record<string, unknown>;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    await this.db.insert(permissionAuditLogs)
      .values({
        id: uuidv4(),
        tenantId,
        action,
        userId,
        targetUserId: data.targetUserId,
        targetRoleId: data.targetRoleId,
        resourceType: data.resourceType,
        recordId: data.recordId,
        details: data.details || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        occurredAt: new Date(),
      });
  }
}
