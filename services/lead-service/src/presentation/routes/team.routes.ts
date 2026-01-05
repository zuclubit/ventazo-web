/**
 * Team Routes
 * REST API endpoints for team management
 */

import { FastifyPluginAsync } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { TeamService, TerritoryService, QuotaService } from '../../infrastructure/teams';

// Validation schemas
const teamTypeSchema = z.enum(['sales', 'support', 'marketing', 'customer_success', 'operations']);
const teamRoleSchema = z.enum(['member', 'team_lead', 'manager', 'director', 'vp']);
const territoryTypeSchema = z.enum(['geographic', 'industry', 'account_size', 'product', 'named_accounts', 'hybrid']);
const assignmentTypeSchema = z.enum(['exclusive', 'shared', 'overlay']);
const quotaTypeSchema = z.enum(['revenue', 'deals', 'leads', 'activities', 'custom']);
const quotaPeriodSchema = z.enum(['monthly', 'quarterly', 'yearly']);
const quotaStatusSchema = z.enum(['draft', 'active', 'completed', 'archived']);

const createTeamSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  type: teamTypeSchema.optional(),
  parentTeamId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  settings: z.object({
    autoAssignment: z.boolean().optional(),
    roundRobinEnabled: z.boolean().optional(),
    maxLeadsPerMember: z.number().int().min(1).optional(),
    workingHours: z.object({
      start: z.string(),
      end: z.string(),
      timezone: z.string(),
      workDays: z.array(z.number().int().min(0).max(6)),
    }).optional(),
    notifications: z.object({
      newLeadAlert: z.boolean().optional(),
      quotaReminders: z.boolean().optional(),
      performanceReports: z.boolean().optional(),
    }).optional(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateTeamSchema = createTeamSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: teamRoleSchema.optional(),
  position: z.string().max(255).optional(),
});

const updateMemberRoleSchema = z.object({
  role: teamRoleSchema,
  position: z.string().max(255).optional(),
});

const createTerritorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  type: territoryTypeSchema.optional(),
  parentTerritoryId: z.string().uuid().optional(),
  criteria: z.object({
    geographic: z.object({
      countries: z.array(z.string()).optional(),
      states: z.array(z.string()).optional(),
      cities: z.array(z.string()).optional(),
      postalCodes: z.array(z.string()).optional(),
      regions: z.array(z.string()).optional(),
      coordinates: z.object({
        latitude: z.number(),
        longitude: z.number(),
        radiusKm: z.number().positive(),
      }).optional(),
    }).optional(),
    industry: z.array(z.string()).optional(),
    accountSize: z.object({
      minEmployees: z.number().int().min(0).optional(),
      maxEmployees: z.number().int().min(0).optional(),
      segments: z.array(z.string()).optional(),
    }).optional(),
    revenueRange: z.object({
      minRevenue: z.number().min(0).optional(),
      maxRevenue: z.number().min(0).optional(),
      currency: z.string().length(3),
    }).optional(),
    namedAccounts: z.array(z.string()).optional(),
    customRules: z.array(z.object({
      field: z.string(),
      operator: z.enum(['equals', 'not_equals', 'contains', 'starts_with', 'ends_with', 'in', 'not_in', 'greater_than', 'less_than']),
      value: z.unknown(),
    })).optional(),
  }).optional(),
  settings: z.object({
    autoLeadRouting: z.boolean().optional(),
    allowOverlap: z.boolean().optional(),
    roundRobinWithinTerritory: z.boolean().optional(),
    conflictResolution: z.enum(['first_assigned', 'primary_owner', 'manager_decides']).optional(),
    leadCapacity: z.number().int().min(1).optional(),
  }).optional(),
});

const updateTerritorySchema = createTerritorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

const assignTerritorySchema = z.object({
  userId: z.string().uuid(),
  teamId: z.string().uuid().optional(),
  assignmentType: assignmentTypeSchema.optional(),
  isPrimary: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const createQuotaSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  type: quotaTypeSchema.optional(),
  period: quotaPeriodSchema.optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  target: z.number().int().min(0),
  currency: z.string().length(3).optional(),
  settings: z.object({
    allowOverachievement: z.boolean().optional(),
    prorateForiNewHires: z.boolean().optional(),
    includeInForecasting: z.boolean().optional(),
    rollupToParent: z.boolean().optional(),
    accelerators: z.array(z.object({
      threshold: z.number().min(0).max(500), // Percentage of quota (100 = 100%, 150 = 150%)
      multiplier: z.number().positive(),
      name: z.string(),
    })).optional(),
  }).optional(),
});

const updateQuotaSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  target: z.number().int().min(0).optional(),
  settings: createQuotaSchema.shape.settings.optional(),
  status: quotaStatusSchema.optional(),
});

const assignQuotaSchema = z.object({
  userId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  territoryId: z.string().uuid().optional(),
  target: z.number().int().min(0),
});

const adjustQuotaSchema = z.object({
  amount: z.number().int(),
  reason: z.string().min(1).max(500),
});

export const teamRoutes: FastifyPluginAsync = async (fastify) => {
  const teamService = container.resolve(TeamService);
  const territoryService = container.resolve(TerritoryService);
  const quotaService = container.resolve(QuotaService);

  // ==================== Team Endpoints ====================

  // Create team
  fastify.post('/', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const body = createTeamSchema.parse(request.body);
    const result = await teamService.createTeam(tenantId, body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // List teams
  fastify.get('/', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const query = request.query as {
      type?: string;
      parentTeamId?: string;
      includeInactive?: string;
      limit?: string;
      offset?: string;
    };

    const result = await teamService.listTeams(tenantId, {
      type: query.type as 'sales' | 'support' | 'marketing' | 'customer_success' | 'operations',
      parentTeamId: query.parentTeamId === 'null' ? null : query.parentTeamId,
      includeInactive: query.includeInactive === 'true',
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Get team hierarchy
  fastify.get('/hierarchy', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const query = request.query as { rootTeamId?: string };
    const result = await teamService.getTeamHierarchy(tenantId, query.rootTeamId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Get team by ID
  fastify.get('/:teamId', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { teamId } = request.params as { teamId: string };
    const result = await teamService.getTeam(tenantId, teamId);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Update team
  fastify.patch('/:teamId', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { teamId } = request.params as { teamId: string };
    const body = updateTeamSchema.parse(request.body);
    const result = await teamService.updateTeam(tenantId, teamId, body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Delete team
  fastify.delete('/:teamId', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { teamId } = request.params as { teamId: string };
    const result = await teamService.deleteTeam(tenantId, teamId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(204).send();
  });

  // Get team stats
  fastify.get('/:teamId/stats', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { teamId } = request.params as { teamId: string };
    const result = await teamService.getTeamStats(tenantId, teamId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ==================== Team Members ====================

  // Add team member
  fastify.post('/:teamId/members', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { teamId } = request.params as { teamId: string };
    const body = addMemberSchema.parse(request.body);
    const result = await teamService.addMember(tenantId, teamId, body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get team members
  fastify.get('/:teamId/members', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { teamId } = request.params as { teamId: string };
    const query = request.query as { includeInactive?: string };
    const result = await teamService.getTeamMembers(
      tenantId,
      teamId,
      query.includeInactive === 'true'
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Update member role
  fastify.patch('/:teamId/members/:userId', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { teamId, userId } = request.params as { teamId: string; userId: string };
    const body = updateMemberRoleSchema.parse(request.body);
    const result = await teamService.updateMemberRole(
      tenantId,
      teamId,
      userId,
      body.role,
      body.position
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Remove team member
  fastify.delete('/:teamId/members/:userId', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { teamId, userId } = request.params as { teamId: string; userId: string };
    const result = await teamService.removeMember(tenantId, teamId, userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(204).send();
  });

  // Get next assignee (round robin)
  fastify.get('/:teamId/next-assignee', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { teamId } = request.params as { teamId: string };
    const result = await teamService.getNextAssignee(tenantId, teamId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send({ userId: result.value });
  });
};

export const territoryRoutes: FastifyPluginAsync = async (fastify) => {
  const territoryService = container.resolve(TerritoryService);

  // ==================== Territory Endpoints ====================

  // Create territory
  fastify.post('/', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const body = createTerritorySchema.parse(request.body);
    const result = await territoryService.createTerritory(tenantId, body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // List territories
  fastify.get('/', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const query = request.query as {
      type?: string;
      parentTerritoryId?: string;
      includeInactive?: string;
      limit?: string;
      offset?: string;
    };

    const result = await territoryService.listTerritories(tenantId, {
      type: query.type as 'geographic' | 'industry' | 'account_size' | 'product' | 'named_accounts' | 'hybrid',
      parentTerritoryId: query.parentTerritoryId === 'null' ? null : query.parentTerritoryId,
      includeInactive: query.includeInactive === 'true',
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Get territory hierarchy
  fastify.get('/hierarchy', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const query = request.query as { rootTerritoryId?: string };
    const result = await territoryService.getTerritoryHierarchy(tenantId, query.rootTerritoryId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Get territory by ID
  fastify.get('/:territoryId', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { territoryId } = request.params as { territoryId: string };
    const result = await territoryService.getTerritory(tenantId, territoryId);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Update territory
  fastify.patch('/:territoryId', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { territoryId } = request.params as { territoryId: string };
    const body = updateTerritorySchema.parse(request.body);
    const result = await territoryService.updateTerritory(tenantId, territoryId, body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Delete territory
  fastify.delete('/:territoryId', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { territoryId } = request.params as { territoryId: string };
    const result = await territoryService.deleteTerritory(tenantId, territoryId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(204).send();
  });

  // Get territory stats
  fastify.get('/:territoryId/stats', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { territoryId } = request.params as { territoryId: string };
    const result = await territoryService.getTerritoryStats(tenantId, territoryId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ==================== Territory Assignments ====================

  // Assign to territory
  fastify.post('/:territoryId/assignments', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { territoryId } = request.params as { territoryId: string };
    const body = assignTerritorySchema.parse(request.body);
    const result = await territoryService.assignToTerritory(tenantId, territoryId, {
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get territory assignments
  fastify.get('/:territoryId/assignments', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { territoryId } = request.params as { territoryId: string };
    const result = await territoryService.getTerritoryAssignments(tenantId, territoryId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Remove from territory
  fastify.delete('/:territoryId/assignments/:userId', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { territoryId, userId } = request.params as { territoryId: string; userId: string };
    const result = await territoryService.removeFromTerritory(tenantId, territoryId, userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(204).send();
  });

  // Match lead to territory
  fastify.post('/match', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const body = request.body as {
      country?: string;
      state?: string;
      city?: string;
      postalCode?: string;
      industry?: string;
      employeeCount?: number;
      annualRevenue?: number;
    };

    const result = await territoryService.findMatchingTerritory(tenantId, body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send({ territory: result.value });
  });
};

export const quotaRoutes: FastifyPluginAsync = async (fastify) => {
  const quotaService = container.resolve(QuotaService);

  // ==================== Quota Endpoints ====================

  // Create quota
  fastify.post('/', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const body = createQuotaSchema.parse(request.body);
    const result = await quotaService.createQuota(tenantId, {
      ...body,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // List quotas
  fastify.get('/', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const query = request.query as {
      type?: string;
      period?: string;
      status?: string;
      startDateFrom?: string;
      startDateTo?: string;
      limit?: string;
      offset?: string;
    };

    const result = await quotaService.listQuotas(tenantId, {
      type: query.type as 'revenue' | 'deals' | 'leads' | 'activities' | 'custom',
      period: query.period as 'monthly' | 'quarterly' | 'yearly',
      status: query.status as 'draft' | 'active' | 'completed' | 'archived',
      startDateFrom: query.startDateFrom ? new Date(query.startDateFrom) : undefined,
      startDateTo: query.startDateTo ? new Date(query.startDateTo) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Get quota by ID
  fastify.get('/:quotaId', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { quotaId } = request.params as { quotaId: string };
    const result = await quotaService.getQuota(tenantId, quotaId);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Update quota
  fastify.patch('/:quotaId', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { quotaId } = request.params as { quotaId: string };
    const body = updateQuotaSchema.parse(request.body);
    const result = await quotaService.updateQuota(tenantId, quotaId, body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Activate quota
  fastify.post('/:quotaId/activate', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { quotaId } = request.params as { quotaId: string };
    const result = await quotaService.activateQuota(tenantId, quotaId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Archive quota
  fastify.post('/:quotaId/archive', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { quotaId } = request.params as { quotaId: string };
    const result = await quotaService.archiveQuota(tenantId, quotaId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ==================== Quota Assignments ====================

  // Assign quota
  fastify.post('/:quotaId/assignments', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { quotaId } = request.params as { quotaId: string };
    const body = assignQuotaSchema.parse(request.body);
    const result = await quotaService.assignQuota(tenantId, quotaId, body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get quota assignments
  fastify.get('/:quotaId/assignments', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { quotaId } = request.params as { quotaId: string };
    const result = await quotaService.getQuotaAssignments(tenantId, quotaId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Adjust quota assignment
  fastify.post('/:quotaId/assignments/:assignmentId/adjust', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId || !userId) {
      return reply.status(400).send({ error: 'Tenant ID and User ID are required' });
    }

    const { assignmentId } = request.params as { assignmentId: string };
    const body = adjustQuotaSchema.parse(request.body);
    const result = await quotaService.adjustQuota(tenantId, assignmentId, userId, body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // ==================== Quota Rollups & Leaderboard ====================

  // Get team rollup
  fastify.get('/:quotaId/rollup/teams', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { quotaId } = request.params as { quotaId: string };
    const result = await quotaService.getTeamRollup(tenantId, quotaId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Get territory rollup
  fastify.get('/:quotaId/rollup/territories', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { quotaId } = request.params as { quotaId: string };
    const result = await quotaService.getTerritoryRollup(tenantId, quotaId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Get leaderboard
  fastify.get('/:quotaId/leaderboard', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { quotaId } = request.params as { quotaId: string };
    const query = request.query as { limit?: string };
    const result = await quotaService.getLeaderboard(
      tenantId,
      quotaId,
      query.limit ? parseInt(query.limit, 10) : 10
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ==================== User Quotas ====================

  // Get user's quotas
  fastify.get('/user/:userId', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { userId } = request.params as { userId: string };
    const query = request.query as { activeOnly?: string };
    const result = await quotaService.getUserQuotas(
      tenantId,
      userId,
      query.activeOnly !== 'false'
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Get user's performance metrics
  fastify.get('/user/:userId/performance', async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID is required' });
    }

    const { userId } = request.params as { userId: string };
    const query = request.query as { startDate?: string; endDate?: string };

    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const result = await quotaService.getPerformanceMetrics(tenantId, userId, startDate, endDate);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });
};
