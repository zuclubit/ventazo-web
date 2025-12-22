/**
 * Permission Routes
 *
 * REST API endpoints for:
 * - Role management
 * - Resource permissions
 * - Field permissions
 * - ABAC policies
 * - Sharing rules
 * - Data masking
 * - Permission sets
 * - Access checking
 * - Audit logs
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { container } from 'tsyringe';
import { PermissionService } from './permission.service';
import type { ResourceType, PermissionAction, FieldAccessLevel, RecordVisibility } from './types';

// Validation schemas
const resourceTypeEnum = z.enum([
  'lead', 'contact', 'account', 'opportunity', 'contract', 'quote',
  'task', 'note', 'email', 'call', 'meeting', 'campaign', 'report',
  'dashboard', 'workflow', 'user', 'team', 'territory', 'product', 'price_book'
]);

const actionEnum = z.enum([
  'create', 'read', 'update', 'delete', 'export', 'import',
  'share', 'assign', 'approve', 'bulk_edit', 'bulk_delete'
]);

const accessLevelEnum = z.enum(['none', 'read', 'write', 'masked']);
const visibilityEnum = z.enum(['private', 'team', 'territory', 'hierarchy', 'department', 'organization']);
const conditionOperatorEnum = z.enum([
  'eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in',
  'contains', 'starts_with', 'ends_with', 'is_null', 'not_null', 'between'
]);

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  level: z.number().min(0).optional(),
  parentRoleId: z.string().uuid().optional(),
  isDefault: z.boolean().optional(),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  level: z.number().min(0).optional(),
  parentRoleId: z.string().uuid().optional(),
  isDefault: z.boolean().optional(),
});

const setResourcePermissionSchema = z.object({
  roleId: z.string().uuid(),
  resourceType: resourceTypeEnum,
  canCreate: z.boolean().optional(),
  canRead: z.boolean().optional(),
  canUpdate: z.boolean().optional(),
  canDelete: z.boolean().optional(),
  canExport: z.boolean().optional(),
  canImport: z.boolean().optional(),
  canShare: z.boolean().optional(),
  canAssign: z.boolean().optional(),
  canApprove: z.boolean().optional(),
  canBulkEdit: z.boolean().optional(),
  canBulkDelete: z.boolean().optional(),
  readScope: visibilityEnum.optional(),
  updateScope: visibilityEnum.optional(),
  deleteScope: visibilityEnum.optional(),
});

const setFieldPermissionSchema = z.object({
  roleId: z.string().uuid(),
  resourceType: resourceTypeEnum,
  fieldName: z.string().min(1).max(100),
  accessLevel: accessLevelEnum,
  maskPattern: z.string().optional(),
  maskCharacter: z.string().max(5).optional(),
  conditions: z.array(z.object({
    id: z.string(),
    attributeType: z.enum(['user', 'resource', 'environment', 'action']),
    attribute: z.string(),
    operator: conditionOperatorEnum,
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
    logicalOperator: z.enum(['and', 'or']).optional(),
  })).optional(),
});

const createPolicySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  resourceType: resourceTypeEnum,
  action: actionEnum,
  conditions: z.array(z.object({
    id: z.string(),
    attributeType: z.enum(['user', 'resource', 'environment', 'action']),
    attribute: z.string(),
    operator: conditionOperatorEnum,
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
    logicalOperator: z.enum(['and', 'or']).optional(),
  })),
  effect: z.enum(['allow', 'deny']),
  priority: z.number().optional(),
});

const createSharingRuleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  resourceType: resourceTypeEnum,
  criteria: z.array(z.object({
    field: z.string(),
    operator: conditionOperatorEnum,
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  })),
  sharedWith: z.object({
    type: z.enum(['user', 'role', 'team', 'territory', 'public_group']),
    targetId: z.string().optional(),
    dynamicField: z.string().optional(),
  }),
  accessLevel: z.enum(['read', 'read_write']),
});

const shareRecordSchema = z.object({
  resourceType: resourceTypeEnum,
  recordId: z.string().uuid(),
  sharedWith: z.object({
    type: z.enum(['user', 'role', 'team', 'territory', 'public_group']),
    targetId: z.string().optional(),
    dynamicField: z.string().optional(),
  }),
  accessLevel: z.enum(['read', 'read_write']),
  expiresAt: z.string().datetime().optional(),
});

const createMaskingRuleSchema = z.object({
  name: z.string().min(1).max(255),
  resourceType: resourceTypeEnum,
  fieldName: z.string().min(1).max(100),
  maskingType: z.enum(['full', 'partial', 'email', 'phone', 'credit_card', 'ssn', 'custom']),
  config: z.object({
    maskCharacter: z.string().max(5).default('*'),
    showFirst: z.number().optional(),
    showLast: z.number().optional(),
    pattern: z.string().optional(),
    replacement: z.string().optional(),
  }),
  applyTo: z.object({
    allUsers: z.boolean(),
    excludeRoleIds: z.array(z.string().uuid()).optional(),
    excludeUserIds: z.array(z.string().uuid()).optional(),
  }).optional(),
});

const assignUserRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  permissionSetIds: z.array(z.string().uuid()).optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveUntil: z.string().datetime().optional(),
});

const checkAccessSchema = z.object({
  resourceType: resourceTypeEnum,
  recordId: z.string().uuid().optional(),
  action: actionEnum,
  userAttributes: z.record(z.unknown()).optional(),
  resourceAttributes: z.record(z.unknown()).optional(),
  environment: z.object({
    ipAddress: z.string().optional(),
    timestamp: z.string().datetime().optional(),
    deviceType: z.string().optional(),
    location: z.string().optional(),
  }).optional(),
  fields: z.array(z.string()).optional(),
});

const createPermissionSetSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  resourcePermissionIds: z.array(z.string().uuid()).optional(),
  fieldPermissionIds: z.array(z.string().uuid()).optional(),
  licenseType: z.string().optional(),
});

const setHierarchyConfigSchema = z.object({
  managerField: z.string().optional(),
  maxDepth: z.number().min(1).max(10).optional(),
  sharingDirection: z.enum(['up', 'down', 'both']).optional(),
  sharingAccessLevel: z.enum(['read', 'read_write']).optional(),
});

export const permissionRoutes: FastifyPluginAsync = async (fastify) => {
  const service = container.resolve(PermissionService);

  // ============================================================================
  // LIST ALL PERMISSIONS (base endpoint)
  // ============================================================================

  // List all permissions
  fastify.get('/', {
    schema: {
      description: 'List all permissions for the tenant',
      tags: ['Permissions'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    // Return permissions summary with roles and policies
    const rolesResult = await service.getRoles(tenantId);
    const policiesResult = await service.getPolicies(tenantId);
    const permissionSetsResult = await service.getPermissionSets(tenantId);

    return reply.status(200).send({
      roles: rolesResult.isSuccess ? rolesResult.value : [],
      policies: policiesResult.isSuccess ? policiesResult.value : [],
      permissionSets: permissionSetsResult.isSuccess ? permissionSetsResult.value : [],
    });
  });

  // ============================================================================
  // ROLES
  // ============================================================================

  // Create role
  fastify.post<{
    Body: z.infer<typeof createRoleSchema>;
  }>('/roles', {
    schema: {
      description: 'Create a new permission role',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = createRoleSchema.parse(request.body);
    const result = await service.createRole(tenantId, userId || 'system', body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get roles
  fastify.get('/roles', {
    schema: {
      description: 'Get all roles for tenant',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getRoles(tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Update role
  fastify.patch<{
    Params: { roleId: string };
    Body: z.infer<typeof updateRoleSchema>;
  }>('/roles/:roleId', {
    schema: {
      description: 'Update a role',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = updateRoleSchema.parse(request.body);
    const result = await service.updateRole(request.params.roleId, tenantId, userId || 'system', body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Delete role
  fastify.delete<{
    Params: { roleId: string };
  }>('/roles/:roleId', {
    schema: {
      description: 'Delete a role',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.deleteRole(request.params.roleId, tenantId, userId || 'system');

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(204).send();
  });

  // ============================================================================
  // RESOURCE PERMISSIONS
  // ============================================================================

  // Set resource permission
  fastify.post<{
    Body: z.infer<typeof setResourcePermissionSchema>;
  }>('/resource-permissions', {
    schema: {
      description: 'Set resource permissions for a role',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = setResourcePermissionSchema.parse(request.body);
    const result = await service.setResourcePermission(tenantId, userId || 'system', body as Parameters<typeof service.setResourcePermission>[2]);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Get resource permissions for role
  fastify.get<{
    Params: { roleId: string };
  }>('/roles/:roleId/resource-permissions', {
    schema: {
      description: 'Get resource permissions for a role',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getResourcePermissions(request.params.roleId, tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // FIELD PERMISSIONS
  // ============================================================================

  // Set field permission
  fastify.post<{
    Body: z.infer<typeof setFieldPermissionSchema>;
  }>('/field-permissions', {
    schema: {
      description: 'Set field-level permission',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = setFieldPermissionSchema.parse(request.body);
    const result = await service.setFieldPermission(tenantId, userId || 'system', body as Parameters<typeof service.setFieldPermission>[2]);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Get field permissions
  fastify.get<{
    Params: { roleId: string };
    Querystring: { resourceType: ResourceType };
  }>('/roles/:roleId/field-permissions', {
    schema: {
      description: 'Get field permissions for a role and resource',
      tags: ['Permissions'],
      querystring: {
        type: 'object',
        properties: {
          resourceType: { type: 'string' },
        },
        required: ['resourceType'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getFieldPermissions(
      request.params.roleId,
      request.query.resourceType,
      tenantId
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // ABAC POLICIES
  // ============================================================================

  // Create policy
  fastify.post<{
    Body: z.infer<typeof createPolicySchema>;
  }>('/policies', {
    schema: {
      description: 'Create ABAC policy',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = createPolicySchema.parse(request.body);
    const result = await service.createPolicy(tenantId, userId || 'system', body as Parameters<typeof service.createPolicy>[2]);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get policies
  fastify.get<{
    Querystring: { resourceType?: ResourceType };
  }>('/policies', {
    schema: {
      description: 'Get ABAC policies',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getPolicies(tenantId, request.query.resourceType);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Toggle policy
  fastify.patch<{
    Params: { policyId: string };
    Body: { isActive: boolean };
  }>('/policies/:policyId/toggle', {
    schema: {
      description: 'Toggle policy active state',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.togglePolicy(
      request.params.policyId,
      tenantId,
      request.body.isActive
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // SHARING RULES
  // ============================================================================

  // Create sharing rule
  fastify.post<{
    Body: z.infer<typeof createSharingRuleSchema>;
  }>('/sharing-rules', {
    schema: {
      description: 'Create automatic sharing rule',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = createSharingRuleSchema.parse(request.body);
    const result = await service.createSharingRule(tenantId, body as Parameters<typeof service.createSharingRule>[1]);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get sharing rules
  fastify.get<{
    Querystring: { resourceType?: ResourceType };
  }>('/sharing-rules', {
    schema: {
      description: 'Get sharing rules',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getSharingRules(tenantId, request.query.resourceType);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // RECORD SHARING
  // ============================================================================

  // Share record
  fastify.post<{
    Body: z.infer<typeof shareRecordSchema>;
  }>('/record-shares', {
    schema: {
      description: 'Share a record with user/role/team',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = shareRecordSchema.parse(request.body);
    const result = await service.shareRecord(tenantId, userId || 'system', {
      ...body,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    } as Parameters<typeof service.shareRecord>[2]);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get record shares
  fastify.get<{
    Querystring: { resourceType: ResourceType; recordId: string };
  }>('/record-shares', {
    schema: {
      description: 'Get shares for a record',
      tags: ['Permissions'],
      querystring: {
        type: 'object',
        properties: {
          resourceType: { type: 'string' },
          recordId: { type: 'string', format: 'uuid' },
        },
        required: ['resourceType', 'recordId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getRecordShares(
      request.query.resourceType,
      request.query.recordId,
      tenantId
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Remove record share
  fastify.delete<{
    Params: { shareId: string };
  }>('/record-shares/:shareId', {
    schema: {
      description: 'Remove record share',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.removeRecordShare(request.params.shareId, tenantId, userId || 'system');

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(204).send();
  });

  // ============================================================================
  // DATA MASKING
  // ============================================================================

  // Create masking rule
  fastify.post<{
    Body: z.infer<typeof createMaskingRuleSchema>;
  }>('/masking-rules', {
    schema: {
      description: 'Create data masking rule',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = createMaskingRuleSchema.parse(request.body);
    const result = await service.createMaskingRule(tenantId, body as Parameters<typeof service.createMaskingRule>[1]);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get masking rules
  fastify.get<{
    Querystring: { resourceType?: ResourceType };
  }>('/masking-rules', {
    schema: {
      description: 'Get data masking rules',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getMaskingRules(tenantId, request.query.resourceType);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // USER ASSIGNMENTS
  // ============================================================================

  // Assign role to user
  fastify.post<{
    Body: z.infer<typeof assignUserRoleSchema>;
  }>('/user-assignments', {
    schema: {
      description: 'Assign role to user',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const assignedBy = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = assignUserRoleSchema.parse(request.body);
    const result = await service.assignUserRole(tenantId, assignedBy || 'system', {
      ...body,
      effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : undefined,
      effectiveUntil: body.effectiveUntil ? new Date(body.effectiveUntil) : undefined,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Get user assignment
  fastify.get<{
    Params: { userId: string };
  }>('/users/:userId/assignment', {
    schema: {
      description: 'Get user permission assignment',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getUserAssignment(request.params.userId, tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    if (!result.value) {
      return reply.status(404).send({ error: 'No assignment found' });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // ACCESS CHECKING
  // ============================================================================

  // Check access
  fastify.post<{
    Body: z.infer<typeof checkAccessSchema>;
  }>('/check-access', {
    schema: {
      description: 'Check if user has permission for action',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId || !userId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id or x-user-id header' });
    }

    const body = checkAccessSchema.parse(request.body);
    const result = await service.checkAccess({
      tenantId,
      userId,
      resourceType: body.resourceType as ResourceType,
      recordId: body.recordId,
      action: body.action as PermissionAction,
      userAttributes: body.userAttributes,
      resourceAttributes: body.resourceAttributes,
      environment: body.environment ? {
        ...body.environment,
        timestamp: body.environment.timestamp ? new Date(body.environment.timestamp) : undefined,
      } : undefined,
      fields: body.fields,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Get effective permissions
  fastify.get<{
    Params: { userId: string };
  }>('/users/:userId/effective-permissions', {
    schema: {
      description: 'Get computed effective permissions for user',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getEffectivePermissions(request.params.userId, tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // PERMISSION SETS
  // ============================================================================

  // Create permission set
  fastify.post<{
    Body: z.infer<typeof createPermissionSetSchema>;
  }>('/permission-sets', {
    schema: {
      description: 'Create permission set',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = createPermissionSetSchema.parse(request.body);
    const result = await service.createPermissionSet(tenantId, userId || 'system', body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get permission sets
  fastify.get('/permission-sets', {
    schema: {
      description: 'Get permission sets',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getPermissionSets(tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // HIERARCHY
  // ============================================================================

  // Set hierarchy config
  fastify.put<{
    Body: z.infer<typeof setHierarchyConfigSchema>;
  }>('/hierarchy-config', {
    schema: {
      description: 'Configure hierarchy settings',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = setHierarchyConfigSchema.parse(request.body);
    const result = await service.setHierarchyConfig(tenantId, body as Parameters<typeof service.setHierarchyConfig>[1]);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Get hierarchy config
  fastify.get('/hierarchy-config', {
    schema: {
      description: 'Get hierarchy configuration',
      tags: ['Permissions'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getHierarchyConfig(tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================

  // Get audit logs
  fastify.get<{
    Querystring: {
      userId?: string;
      action?: string;
      resourceType?: ResourceType;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    };
  }>('/audit-logs', {
    schema: {
      description: 'Get permission audit logs',
      tags: ['Permissions'],
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' },
          action: { type: 'string' },
          resourceType: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          limit: { type: 'number' },
          offset: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const { startDate, endDate, ...filters } = request.query;

    const result = await service.getAuditLogs(tenantId, {
      ...filters,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });
};
