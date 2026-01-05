import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { eq, and, desc, asc } from 'drizzle-orm';
import { z } from 'zod';
import { ICommandBus, IQueryBus } from '../../application/common';
import {
  CreateLeadCommand,
  UpdateLeadCommand,
  ChangeLeadStatusCommand,
  UpdateLeadScoreCommand,
  AssignLeadCommand,
  QualifyLeadCommand,
  ScheduleFollowUpCommand,
  ConvertLeadCommand,
  ConvertLeadResult,
} from '../../application/commands';
import {
  GetLeadByIdQuery,
  FindLeadsQuery,
  GetLeadStatsQuery,
  GetOverdueFollowUpsQuery,
} from '../../application/queries';
import {
  createLeadSchema,
  updateLeadSchema,
  findLeadsQuerySchema,
  changeStatusSchema,
  updateScoreSchema,
  assignLeadSchema,
  qualifyLeadSchema,
  scheduleFollowUpSchema,
  convertLeadSchema,
  activityLogQuerySchema,
} from '../schemas/lead.schema';
import { ActivityLogService, EntityType, ActionType } from '../../infrastructure/services';
import { validate, getTenantId, getUserId } from '../middlewares/validation.middleware';
import { LeadMapper, LeadResponseDTO, PaginatedLeadsResponseDTO } from '../../application/dtos';
import { Lead } from '../../domain/aggregates';
import { LeadStatusEnum } from '../../domain/value-objects';
import { db } from '../../infrastructure/database';
import { leads, leadNotes, leadActivity, pipelineStages } from '../../infrastructure/database/schema';

// Type for CreateLeadHandler result
interface CreateLeadResult {
  leadId: string;
}

// ==========================================================================
// Performance optimization: In-memory stats cache
// See: docs/PERFORMANCE_REMEDIATION_LOG.md - P2.1 Stats Cache
// ==========================================================================

interface StatsCacheEntry {
  data: unknown;
  expiresAt: number;
}

// Stats cache with 5-minute TTL
const STATS_CACHE_TTL_MS = 300_000; // 5 minutes
const statsCache = new Map<string, StatsCacheEntry>();

/**
 * Get cached stats or execute query
 * Performance optimization: Reduces stats endpoint latency from ~374ms to ~5ms (on cache hit)
 */
async function getCachedStats(
  tenantId: string,
  queryBus: IQueryBus
): Promise<{ data: unknown; fromCache: boolean }> {
  const cacheKey = `stats:${tenantId}`;
  const cached = statsCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return { data: cached.data, fromCache: true };
  }

  // Cache miss - execute query
  const query = new GetLeadStatsQuery(tenantId);
  const result = await queryBus.execute(query);

  if (result.isSuccess) {
    const data = result.getValue();
    statsCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + STATS_CACHE_TTL_MS,
    });
    return { data, fromCache: false };
  }

  throw new Error(result.error || 'Failed to get stats');
}

/**
 * Invalidate stats cache for a tenant
 * Call this after lead mutations (create, update, delete, status change)
 */
export function invalidateStatsCache(tenantId: string): void {
  statsCache.delete(`stats:${tenantId}`);
}

// Periodic cache cleanup (every minute)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of statsCache.entries()) {
    if (entry.expiresAt < now) {
      statsCache.delete(key);
    }
  }
}, 60_000);

/**
 * Lead Routes Plugin
 * Fastify plugin that registers all lead-related routes following CQRS pattern
 */
export async function leadRoutes(
  server: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  const commandBus = container.resolve<ICommandBus>('ICommandBus');
  const queryBus = container.resolve<IQueryBus>('IQueryBus');

  // ==========================================================================
  // IMPORTANT: Static routes MUST be registered BEFORE dynamic :id routes
  // Otherwise Fastify will match /pipeline, /stats etc as :id parameter
  // ==========================================================================

  // ==========================================================================
  // GET /leads/stats/overview - Get lead statistics
  // ==========================================================================
  server.get(
    '/stats/overview',
    {
      schema: {
        description: 'Get lead statistics overview',
        tags: ['leads', 'stats'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      try {
        // Performance optimization: Use cached stats
        // See: docs/PERFORMANCE_REMEDIATION_LOG.md - P2.1 Stats Cache
        const { data, fromCache } = await getCachedStats(tenantId, queryBus);

        // Add cache header for debugging
        reply.header('X-Cache', fromCache ? 'HIT' : 'MISS');

        return reply.status(200).send(data);
      } catch (error) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: error instanceof Error ? error.message : 'Failed to get stats',
        });
      }
    }
  );

  // ==========================================================================
  // GET /leads/follow-ups/overdue - Get overdue follow-ups
  // ==========================================================================
  server.get(
    '/follow-ups/overdue',
    {
      schema: {
        description: 'Get leads with overdue follow-ups',
        tags: ['leads', 'follow-ups'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const queryParams = request.query as { assignedTo?: string };

      const query = new GetOverdueFollowUpsQuery(tenantId, queryParams.assignedTo);
      const result = await queryBus.execute(query);

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      return reply.status(200).send(result.getValue());
    }
  );

  // ==========================================================================
  // GET /leads/pipeline/stages - Get pipeline stages for tenant
  // ==========================================================================
  server.get(
    '/pipeline/stages',
    {
      schema: {
        description: 'Get pipeline stages for the tenant',
        tags: ['leads', 'pipeline'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const stages = await db.query.pipelineStages.findMany({
        where: and(
          eq(pipelineStages.tenantId, tenantId),
          eq(pipelineStages.isActive, true)
        ),
        orderBy: [asc(pipelineStages.order)],
      });

      return reply.status(200).send(stages);
    }
  );

  // ==========================================================================
  // POST /leads/pipeline/stages - Create pipeline stage
  // ==========================================================================
  const createStageSchema = z.object({
    label: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    order: z.number().int().min(0).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    isDefault: z.boolean().optional(),
  });

  server.post(
    '/pipeline/stages',
    {
      preHandler: validate({ body: createStageSchema }),
      schema: {
        description: 'Create a pipeline stage',
        tags: ['leads', 'pipeline'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const body = request.body as {
        label: string;
        description?: string;
        order?: number;
        color?: string;
        isDefault?: boolean;
      };

      // Get max order if not provided
      let order = body.order;
      if (order === undefined) {
        const stages = await db.query.pipelineStages.findMany({
          where: eq(pipelineStages.tenantId, tenantId),
          columns: { order: true },
        });
        order = stages.length > 0 ? Math.max(...stages.map((s) => s.order)) + 1 : 0;
      }

      const [stage] = await db
        .insert(pipelineStages)
        .values({
          tenantId,
          label: body.label,
          description: body.description,
          order,
          color: body.color || '#3B82F6',
          isDefault: body.isDefault || false,
        })
        .returning();

      return reply.status(201).send(stage);
    }
  );

  // ==========================================================================
  // GET /leads/pipeline/view - Get leads grouped by stage (for Kanban)
  // ==========================================================================
  server.get(
    '/pipeline/view',
    {
      schema: {
        description: 'Get leads grouped by pipeline stage for Kanban view',
        tags: ['leads', 'pipeline'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Get all active stages
      const stages = await db.query.pipelineStages.findMany({
        where: and(
          eq(pipelineStages.tenantId, tenantId),
          eq(pipelineStages.isActive, true)
        ),
        orderBy: [asc(pipelineStages.order)],
      });

      // Get leads grouped by stage
      const allLeads = await db.query.leads.findMany({
        where: and(
          eq(leads.tenantId, tenantId),
          // Exclude converted and archived leads from pipeline
        ),
        orderBy: [desc(leads.updatedAt)],
      });

      // Filter out converted/archived leads for pipeline view
      const pipelineLeads = allLeads.filter(
        (lead) => lead.status !== 'converted' && lead.status !== 'archived'
      );

      // Group leads by stage
      const pipelineView = stages.map((stage) => ({
        stage,
        leads: pipelineLeads.filter((lead) => lead.stageId === stage.id),
        count: pipelineLeads.filter((lead) => lead.stageId === stage.id).length,
      }));

      // Add "No Stage" column for leads without a stage
      const noStageLeads = pipelineLeads.filter((lead) => !lead.stageId);
      if (noStageLeads.length > 0) {
        pipelineView.unshift({
          stage: {
            id: 'no-stage',
            tenantId,
            label: 'Sin Etapa',
            description: 'Leads sin etapa asignada',
            order: -1,
            color: '#6B7280',
            isDefault: false,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          leads: noStageLeads,
          count: noStageLeads.length,
        });
      }

      return reply.status(200).send({
        stages: pipelineView,
        totalLeads: pipelineLeads.length,
      });
    }
  );

  // ==========================================================================
  // DYNAMIC ROUTES - These come AFTER static routes
  // ==========================================================================

  // ==========================================================================
  // POST /leads - Create a new lead
  // ==========================================================================
  server.post(
    '/',
    {
      preHandler: validate({ body: createLeadSchema }),
      schema: {
        description: 'Create a new lead',
        tags: ['leads'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const body = request.body as {
        fullName: string;
        email: string;
        source: string;
        companyName?: string;
        jobTitle?: string;
        phone?: string;
        website?: string;
        industry?: string;
        employeeCount?: number;
        annualRevenue?: number;
        stageId?: string;
        ownerId?: string;
        notes?: string;
        tags?: string[];
        customFields?: Record<string, unknown>;
      };

      const command = new CreateLeadCommand(
        tenantId,
        body.fullName,
        body.email,
        body.source,
        body.companyName,
        body.jobTitle,
        body.phone,
        body.website,
        body.industry,
        body.employeeCount,
        body.annualRevenue,
        body.stageId,
        body.ownerId,
        body.notes,
        body.tags,
        body.customFields
      );

      const result = await commandBus.execute<CreateLeadCommand, CreateLeadResult>(command);

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      // Performance optimization: Invalidate stats cache on lead creation
      invalidateStatsCache(tenantId);

      return reply.status(201).send(result.getValue());
    }
  );

  // ==========================================================================
  // GET /leads/:id - Get lead by ID
  // ==========================================================================
  server.get<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        description: 'Get a lead by ID',
        tags: ['leads'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const tenantId = getTenantId(request);

      const query = new GetLeadByIdQuery(id, tenantId);
      const result = await queryBus.execute<GetLeadByIdQuery, LeadResponseDTO | null>(query);

      if (result.isFailure) {
        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: result.error,
        });
      }

      const lead = result.getValue();
      if (!lead) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Lead not found: ${id}`,
        });
      }

      return reply.status(200).send(lead);
    }
  );

  // ==========================================================================
  // GET /leads - Find leads with filters
  // ==========================================================================
  server.get(
    '/',
    {
      preHandler: validate({ querystring: findLeadsQuerySchema }),
      schema: {
        description: 'Find leads with filters and pagination',
        tags: ['leads'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const queryParams = request.query as {
        page?: number;
        limit?: number;
        status?: LeadStatusEnum;
        minScore?: number;
        maxScore?: number;
        source?: string;
        industry?: string;
        assignedTo?: string;
        sortBy?: 'createdAt' | 'updatedAt' | 'score' | 'companyName';
        sortOrder?: 'asc' | 'desc';
      };

      const query = new FindLeadsQuery(
        tenantId,
        queryParams.page,
        queryParams.limit,
        queryParams.status,
        queryParams.assignedTo,
        queryParams.source,
        queryParams.industry,
        queryParams.minScore,
        queryParams.maxScore,
        undefined, // searchTerm
        queryParams.sortBy,
        queryParams.sortOrder
      );

      const result = await queryBus.execute<FindLeadsQuery, PaginatedLeadsResponseDTO>(query);

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      return reply.status(200).send(result.getValue());
    }
  );

  // ==========================================================================
  // PATCH /leads/:id - Update lead
  // ==========================================================================
  server.patch<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: validate({ body: updateLeadSchema }),
      schema: {
        description: 'Update a lead',
        tags: ['leads'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const tenantId = getTenantId(request);
      const body = request.body as {
        fullName?: string;
        companyName?: string;
        jobTitle?: string;
        email?: string;
        phone?: string;
        website?: string;
        industry?: string;
        employeeCount?: number;
        annualRevenue?: number;
        stageId?: string;
        notes?: string;
        tags?: string[];
      };

      const command = new UpdateLeadCommand(
        id,
        tenantId,
        body.fullName,
        body.companyName,
        body.jobTitle,
        body.email,
        body.phone,
        body.website,
        body.industry,
        body.employeeCount,
        body.annualRevenue,
        body.stageId,
        body.notes,
        body.tags
      );

      const result = await commandBus.execute<UpdateLeadCommand, Lead>(command);

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      // Performance optimization: Invalidate stats cache on lead update
      invalidateStatsCache(tenantId);

      const lead = result.getValue();
      return reply.status(200).send(LeadMapper.toResponseDTO(lead));
    }
  );

  // ==========================================================================
  // PATCH /leads/:id/status - Change lead status
  // ==========================================================================
  server.patch<{ Params: { id: string } }>(
    '/:id/status',
    {
      preHandler: validate({ body: changeStatusSchema }),
      schema: {
        description: 'Change lead status',
        tags: ['leads'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const tenantId = getTenantId(request);
      const body = request.body as {
        status: LeadStatusEnum;
        reason: string;
      };

      const command = new ChangeLeadStatusCommand(
        id,
        tenantId,
        body.status,
        'system' // TODO: Get from auth context
      );

      const result = await commandBus.execute<ChangeLeadStatusCommand, Lead>(command);

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      // Performance optimization: Invalidate stats cache on status change
      // Status changes directly affect stats (count by status)
      invalidateStatsCache(tenantId);

      const lead = result.getValue();
      return reply.status(200).send(LeadMapper.toResponseDTO(lead));
    }
  );

  // ==========================================================================
  // PATCH /leads/:id/score - Update lead score
  // ==========================================================================
  server.patch<{ Params: { id: string } }>(
    '/:id/score',
    {
      preHandler: validate({ body: updateScoreSchema }),
      schema: {
        description: 'Update lead score',
        tags: ['leads'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const tenantId = getTenantId(request);
      const body = request.body as {
        score: number;
        reason: string;
      };

      const command = new UpdateLeadScoreCommand(
        id,
        tenantId,
        body.score,
        body.reason
      );

      const result = await commandBus.execute<UpdateLeadScoreCommand, Lead>(command);

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      const lead = result.getValue();
      return reply.status(200).send(LeadMapper.toResponseDTO(lead));
    }
  );

  // ==========================================================================
  // POST /leads/:id/assign - Assign lead to user
  // ==========================================================================
  server.post<{ Params: { id: string } }>(
    '/:id/assign',
    {
      preHandler: validate({ body: assignLeadSchema }),
      schema: {
        description: 'Assign lead to a user',
        tags: ['leads'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const tenantId = getTenantId(request);
      const body = request.body as {
        assignedTo: string;
      };

      const command = new AssignLeadCommand(
        id,
        tenantId,
        body.assignedTo,
        'system' // TODO: Get from auth context
      );

      const result = await commandBus.execute<AssignLeadCommand, Lead>(command);

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      const lead = result.getValue();
      return reply.status(200).send(LeadMapper.toResponseDTO(lead));
    }
  );

  // ==========================================================================
  // POST /leads/:id/qualify - Qualify lead
  // ==========================================================================
  server.post<{ Params: { id: string } }>(
    '/:id/qualify',
    {
      preHandler: validate({ body: qualifyLeadSchema }),
      schema: {
        description: 'Qualify a lead',
        tags: ['leads'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const tenantId = getTenantId(request);
      const body = request.body as {
        qualifiedBy: string;
      };

      const command = new QualifyLeadCommand(
        id,
        tenantId,
        body.qualifiedBy
      );

      const result = await commandBus.execute<QualifyLeadCommand, Lead>(command);

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      const lead = result.getValue();
      return reply.status(200).send(LeadMapper.toResponseDTO(lead));
    }
  );

  // ==========================================================================
  // POST /leads/:id/follow-up - Schedule follow-up
  // ==========================================================================
  server.post<{ Params: { id: string } }>(
    '/:id/follow-up',
    {
      preHandler: validate({ body: scheduleFollowUpSchema }),
      schema: {
        description: 'Schedule a follow-up for a lead',
        tags: ['leads'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const tenantId = getTenantId(request);
      const body = request.body as {
        scheduledAt: string;
        notes: string;
      };

      const command = new ScheduleFollowUpCommand(
        id,
        tenantId,
        new Date(body.scheduledAt),
        'system' // TODO: Get from auth context
      );

      const result = await commandBus.execute<ScheduleFollowUpCommand, Lead>(command);

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      const lead = result.getValue();
      return reply.status(200).send(LeadMapper.toResponseDTO(lead));
    }
  );

  // ==========================================================================
  // POST /leads/:id/convert - Convert lead to customer
  // ==========================================================================
  server.post<{ Params: { id: string } }>(
    '/:id/convert',
    {
      preHandler: validate({ body: convertLeadSchema }),
      schema: {
        description: 'Convert a qualified lead to a customer',
        tags: ['leads', 'conversion'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const tenantId = getTenantId(request);
      const body = request.body as {
        contractValue?: number;
        contractStartDate?: string;
        contractEndDate?: string;
        notes?: string;
      };

      // TODO: Get from auth context when implemented
      const convertedBy = 'system';

      const command = new ConvertLeadCommand(
        id,
        tenantId,
        convertedBy,
        body.contractValue,
        body.contractStartDate ? new Date(body.contractStartDate) : undefined,
        body.contractEndDate ? new Date(body.contractEndDate) : undefined,
        body.notes
      );

      const result = await commandBus.execute<ConvertLeadCommand, ConvertLeadResult>(command);

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      // Performance optimization: Invalidate stats cache on lead conversion
      invalidateStatsCache(tenantId);

      return reply.status(201).send(result.getValue());
    }
  );

  // ==========================================================================
  // GET /leads/:id/activity - Get activity history for a lead
  // ==========================================================================
  server.get<{ Params: { id: string } }>(
    '/:id/activity',
    {
      preHandler: validate({ querystring: activityLogQuerySchema }),
      schema: {
        description: 'Get activity history for a lead',
        tags: ['leads', 'activity'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const tenantId = getTenantId(request);
      const queryParams = request.query as {
        page?: number;
        limit?: number;
      };

      const activityLogService = container.resolve(ActivityLogService);
      const result = await activityLogService.query({
        tenantId,
        entityType: 'lead' as EntityType,
        entityId: id,
        page: queryParams.page,
        limit: queryParams.limit,
      });

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      return reply.status(200).send(result.getValue());
    }
  );

  // ==========================================================================
  // DELETE /leads/:id - Delete a lead
  // ==========================================================================
  server.delete<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        description: 'Delete a lead',
        tags: ['leads'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const tenantId = getTenantId(request);

      // Check if lead exists
      const existingLead = await db.query.leads.findFirst({
        where: and(eq(leads.id, id), eq(leads.tenantId, tenantId)),
      });

      if (!existingLead) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Lead not found: ${id}`,
        });
      }

      // Delete lead (cascade will delete notes and activity)
      await db.delete(leads).where(and(eq(leads.id, id), eq(leads.tenantId, tenantId)));

      // Performance optimization: Invalidate stats cache on lead deletion
      invalidateStatsCache(tenantId);

      return reply.status(204).send();
    }
  );

  // ==========================================================================
  // PATCH /leads/:id/stage - Update lead stage (for Kanban)
  // ==========================================================================
  const updateStageSchema = z.object({
    stageId: z.string().uuid(),
  });

  server.patch<{ Params: { id: string } }>(
    '/:id/stage',
    {
      preHandler: validate({ body: updateStageSchema }),
      schema: {
        description: 'Update lead pipeline stage',
        tags: ['leads', 'pipeline'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const body = request.body as { stageId: string };

      // Get current lead
      const existingLead = await db.query.leads.findFirst({
        where: and(eq(leads.id, id), eq(leads.tenantId, tenantId)),
      });

      if (!existingLead) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Lead not found: ${id}`,
        });
      }

      // Verify stage exists
      const stage = await db.query.pipelineStages.findFirst({
        where: and(
          eq(pipelineStages.id, body.stageId),
          eq(pipelineStages.tenantId, tenantId)
        ),
      });

      if (!stage) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid stage ID',
        });
      }

      const previousStageId = existingLead.stageId;

      // Update lead stage
      const [updatedLead] = await db
        .update(leads)
        .set({
          stageId: body.stageId,
          updatedAt: new Date(),
          lastActivityAt: new Date(),
        })
        .where(and(eq(leads.id, id), eq(leads.tenantId, tenantId)))
        .returning();

      // Log activity
      await db.insert(leadActivity).values({
        tenantId,
        leadId: id,
        userId,
        actionType: 'stage_changed',
        description: `Stage changed to ${stage.label}`,
        changes: { from: previousStageId, to: body.stageId },
        metadata: { stageName: stage.label, stageColor: stage.color },
      });

      return reply.status(200).send(updatedLead);
    }
  );

  // ==========================================================================
  // GET /leads/:id/notes - Get notes for a lead
  // ==========================================================================
  const notesQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  });

  server.get<{ Params: { id: string } }>(
    '/:id/notes',
    {
      preHandler: validate({ querystring: notesQuerySchema }),
      schema: {
        description: 'Get notes for a lead',
        tags: ['leads', 'notes'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const tenantId = getTenantId(request);
      const queryParams = request.query as { page: number; limit: number };

      // Check if lead exists
      const existingLead = await db.query.leads.findFirst({
        where: and(eq(leads.id, id), eq(leads.tenantId, tenantId)),
      });

      if (!existingLead) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Lead not found: ${id}`,
        });
      }

      const offset = (queryParams.page - 1) * queryParams.limit;

      const notes = await db.query.leadNotes.findMany({
        where: and(eq(leadNotes.leadId, id), eq(leadNotes.tenantId, tenantId)),
        orderBy: [desc(leadNotes.isPinned), desc(leadNotes.createdAt)],
        limit: queryParams.limit,
        offset,
      });

      // Get total count
      const allNotes = await db.query.leadNotes.findMany({
        where: and(eq(leadNotes.leadId, id), eq(leadNotes.tenantId, tenantId)),
        columns: { id: true },
      });

      return reply.status(200).send({
        data: notes,
        meta: {
          page: queryParams.page,
          limit: queryParams.limit,
          total: allNotes.length,
          totalPages: Math.ceil(allNotes.length / queryParams.limit),
        },
      });
    }
  );

  // ==========================================================================
  // POST /leads/:id/notes - Add note to a lead
  // ==========================================================================
  const createNoteSchema = z.object({
    content: z.string().min(1).max(5000),
    isPinned: z.boolean().optional().default(false),
  });

  server.post<{ Params: { id: string } }>(
    '/:id/notes',
    {
      preHandler: validate({ body: createNoteSchema }),
      schema: {
        description: 'Add a note to a lead',
        tags: ['leads', 'notes'],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const body = request.body as { content: string; isPinned: boolean };

      // Check if lead exists
      const existingLead = await db.query.leads.findFirst({
        where: and(eq(leads.id, id), eq(leads.tenantId, tenantId)),
      });

      if (!existingLead) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Lead not found: ${id}`,
        });
      }

      // Create note
      const [note] = await db
        .insert(leadNotes)
        .values({
          tenantId,
          leadId: id,
          createdBy: userId,
          content: body.content,
          isPinned: body.isPinned,
        })
        .returning();

      // Log activity
      await db.insert(leadActivity).values({
        tenantId,
        leadId: id,
        userId,
        actionType: 'note_added',
        description: 'Note added',
        metadata: { noteId: note.id },
      });

      // Update lead last activity
      await db
        .update(leads)
        .set({ lastActivityAt: new Date(), updatedAt: new Date() })
        .where(eq(leads.id, id));

      return reply.status(201).send(note);
    }
  );

  // ==========================================================================
  // PATCH /leads/:id/notes/:noteId - Update a note
  // ==========================================================================
  const updateNoteSchema = z.object({
    content: z.string().min(1).max(5000).optional(),
    isPinned: z.boolean().optional(),
  });

  server.patch<{ Params: { id: string; noteId: string } }>(
    '/:id/notes/:noteId',
    {
      preHandler: validate({ body: updateNoteSchema }),
      schema: {
        description: 'Update a note',
        tags: ['leads', 'notes'],
      },
    },
    async (request, reply) => {
      const { id, noteId } = request.params;
      const tenantId = getTenantId(request);
      const body = request.body as { content?: string; isPinned?: boolean };

      // Check if note exists
      const existingNote = await db.query.leadNotes.findFirst({
        where: and(
          eq(leadNotes.id, noteId),
          eq(leadNotes.leadId, id),
          eq(leadNotes.tenantId, tenantId)
        ),
      });

      if (!existingNote) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Note not found: ${noteId}`,
        });
      }

      // Update note
      const [updatedNote] = await db
        .update(leadNotes)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(leadNotes.id, noteId),
            eq(leadNotes.leadId, id),
            eq(leadNotes.tenantId, tenantId)
          )
        )
        .returning();

      return reply.status(200).send(updatedNote);
    }
  );

  // ==========================================================================
  // DELETE /leads/:id/notes/:noteId - Delete a note
  // ==========================================================================
  server.delete<{ Params: { id: string; noteId: string } }>(
    '/:id/notes/:noteId',
    {
      schema: {
        description: 'Delete a note',
        tags: ['leads', 'notes'],
      },
    },
    async (request, reply) => {
      const { id, noteId } = request.params;
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      // Check if note exists
      const existingNote = await db.query.leadNotes.findFirst({
        where: and(
          eq(leadNotes.id, noteId),
          eq(leadNotes.leadId, id),
          eq(leadNotes.tenantId, tenantId)
        ),
      });

      if (!existingNote) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Note not found: ${noteId}`,
        });
      }

      // Delete note
      await db
        .delete(leadNotes)
        .where(
          and(
            eq(leadNotes.id, noteId),
            eq(leadNotes.leadId, id),
            eq(leadNotes.tenantId, tenantId)
          )
        );

      // Log activity
      await db.insert(leadActivity).values({
        tenantId,
        leadId: id,
        userId,
        actionType: 'note_deleted',
        description: 'Note deleted',
        metadata: { noteId },
      });

      return reply.status(204).send();
    }
  );
}
