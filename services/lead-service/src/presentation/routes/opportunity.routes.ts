/**
 * Opportunity Routes - FASE 5.4
 * REST API endpoints for opportunity/deal management
 * Includes: CRUD, notes, activity, pipeline stages, win/lost flow
 */
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';

import { db } from '../../infrastructure/database';
import {
  opportunities,
  opportunityPipelineStages,
  opportunityNotes,
  opportunityActivity,
  customers,
  leads,
} from '../../infrastructure/database/schema';
import {
  OpportunityService,
  OpportunityStatus,
  OpportunitySource,
} from '../../infrastructure/opportunities';
import { toJsonSchema } from '../../utils/zod-schema';

// Zod Schemas for validation
const createOpportunitySchema = z.object({
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  pipelineId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  stage: z.string().min(1).max(100),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  probability: z.number().min(0).max(100).optional(),
  ownerId: z.string().uuid().optional(),
  expectedCloseDate: z.coerce.date().optional(),
  source: z.nativeEnum(OpportunitySource).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateOpportunitySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  stage: z.string().min(1).max(100).optional(),
  amount: z.number().positive().nullable().optional(),
  currency: z.string().length(3).optional(),
  probability: z.number().min(0).max(100).optional(),
  ownerId: z.string().uuid().nullable().optional(),
  expectedCloseDate: z.coerce.date().nullable().optional(),
  pipelineId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const winOpportunitySchema = z.object({
  wonReason: z.string().optional(),
  actualCloseDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

const loseOpportunitySchema = z.object({
  lostReason: z.string().min(1),
  competitorId: z.string().uuid().optional(),
  actualCloseDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

const reopenOpportunitySchema = z.object({
  stage: z.string().min(1).max(100).optional(),
});

const bulkOperationSchema = z.object({
  opportunityIds: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['reassign', 'updateStage', 'delete', 'updatePipeline']),
  ownerId: z.string().uuid().optional(),
  stage: z.string().min(1).max(100).optional(),
  pipelineId: z.string().uuid().optional(),
});

const convertLeadSchema = z.object({
  leadId: z.string().uuid(),
  opportunityName: z.string().min(1).max(255),
  stage: z.string().min(1).max(100).optional(),
  amount: z.number().positive().optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.coerce.date().optional(),
  pipelineId: z.string().uuid().optional(),
  createCustomer: z.boolean().optional(),
  customerName: z.string().optional(),
});

// FASE 5.4 - Additional schemas
const createNoteSchema = z.object({
  content: z.string().min(1),
  isPinned: z.boolean().optional(),
});

const updateNoteSchema = z.object({
  content: z.string().min(1).optional(),
  isPinned: z.boolean().optional(),
});

const updateStageSchema = z.object({
  stageId: z.string().uuid(),
});

const updateStatusSchema = z.object({
  status: z.enum(['open', 'won', 'lost', 'stalled']),
  reason: z.string().optional(),
});

const updateOwnerSchema = z.object({
  ownerId: z.string().uuid(),
});

const createPipelineStageSchema = z.object({
  label: z.string().min(1).max(100),
  description: z.string().optional(),
  order: z.number().int().min(0).optional(),
  color: z.string().max(20).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  stageType: z.enum(['open', 'won', 'lost']).optional(),
  isDefault: z.boolean().optional(),
});

const activityQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const filterQuerySchema = z.object({
  status: z.union([z.nativeEnum(OpportunityStatus), z.array(z.nativeEnum(OpportunityStatus))]).optional(),
  stage: z.union([z.string(), z.array(z.string())]).optional(),
  ownerId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  pipelineId: z.string().uuid().optional(),
  source: z.union([z.nativeEnum(OpportunitySource), z.array(z.nativeEnum(OpportunitySource))]).optional(),
  amountMin: z.coerce.number().optional(),
  amountMax: z.coerce.number().optional(),
  probabilityMin: z.coerce.number().min(0).max(100).optional(),
  probabilityMax: z.coerce.number().min(0).max(100).optional(),
  expectedCloseDateFrom: z.coerce.date().optional(),
  expectedCloseDateTo: z.coerce.date().optional(),
  isOverdue: z.coerce.boolean().optional(),
  searchTerm: z.string().optional(),
  sortBy: z.enum(['name', 'amount', 'probability', 'expectedCloseDate', 'createdAt', 'updatedAt', 'stage']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const entityQuerySchema = z.object({
  entityType: z.enum(['lead', 'customer']),
  entityId: z.string().uuid(),
});

export async function opportunityRoutes(fastify: FastifyInstance) {
  const opportunityService = container.resolve(OpportunityService);

  /**
   * POST /opportunities - Create a new opportunity
   */
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new opportunity',
        tags: ['Opportunities'],
        body: toJsonSchema(createOpportunitySchema),
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createOpportunitySchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string | undefined;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await opportunityService.createOpportunity(tenantId, request.body, userId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(201).send(result.getValue());
    }
  );

  /**
   * GET /opportunities - List opportunities with filters
   */
  fastify.get(
    '/',
    {
      schema: {
        description: 'List opportunities with filters',
        tags: ['Opportunities'],
        querystring: toJsonSchema(filterQuerySchema),
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof filterQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const { page, limit, sortBy, sortOrder, ...filters } = request.query;

      const result = await opportunityService.getOpportunities(
        tenantId,
        filters,
        { sortBy, sortOrder },
        page || 1,
        limit || 20
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      const { opportunities, total, page: currentPage, limit: pageSize } = result.getValue();

      // Return in frontend-expected format
      return reply.send({
        data: opportunities,
        meta: {
          page: currentPage,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    }
  );

  /**
   * GET /opportunities/statistics - Get opportunity statistics
   */
  fastify.get(
    '/statistics',
    {
      schema: {
        description: 'Get opportunity statistics',
        tags: ['Opportunities'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const query = request.query as {
        ownerId?: string;
        pipelineId?: string;
        dateFrom?: string;
        dateTo?: string;
      };

      const result = await opportunityService.getOpportunityStatistics(tenantId, {
        ownerId: query.ownerId,
        pipelineId: query.pipelineId,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      });

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      const stats = result.getValue();

      // Transform to frontend-expected format
      return reply.send({
        total: stats.total,
        open: stats.byStatus.open,
        won: stats.byStatus.won,
        lost: stats.byStatus.lost,
        stalled: stats.byStatus.onHold,
        totalAmount: stats.totalValue,
        totalForecast: stats.weightedValue,
        wonAmount: 0, // TODO: Calculate from won opportunities
        lostAmount: 0, // TODO: Calculate from lost opportunities
        averageDealSize: stats.averageDealSize,
        winRate: stats.winRate,
        averageSalesCycle: stats.averageTimeToClose,
        closingThisMonth: stats.closingThisMonth,
        closingThisQuarter: stats.closingThisQuarter,
        overdueCount: stats.overdueCount,
        byStage: Object.entries(stats.byStage).map(([stageId, count]) => ({
          stageId,
          stageName: stageId,
          count: count as number,
          amount: 0,
          forecast: 0,
        })),
        byOwner: [],
      });
    }
  );

  /**
   * GET /opportunities/forecast - Get pipeline forecast
   */
  fastify.get(
    '/forecast',
    {
      schema: {
        description: 'Get pipeline forecast',
        tags: ['Opportunities'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const query = request.query as {
        months?: string;
        pipelineId?: string;
      };

      const months = query.months ? parseInt(query.months, 10) : 6;
      const result = await opportunityService.getPipelineForecast(tenantId, months, query.pipelineId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * GET /opportunities/by-entity - Get opportunities by lead or customer
   */
  fastify.get(
    '/by-entity',
    {
      schema: {
        description: 'Get opportunities by entity (lead or customer)',
        tags: ['Opportunities'],
        querystring: toJsonSchema(entityQuerySchema),
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof entityQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const { entityType, entityId } = request.query;

      const result = await opportunityService.getOpportunitiesByEntity(
        tenantId,
        entityType,
        entityId
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * GET /opportunities/:id - Get opportunity by ID
   */
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get opportunity by ID',
        tags: ['Opportunities'],
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await opportunityService.getOpportunityById(tenantId, id);

      if (result.isFailure) {
        return reply.status(404).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * PATCH /opportunities/:id - Update opportunity
   */
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update opportunity',
        tags: ['Opportunities'],
        body: toJsonSchema(updateOpportunitySchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof updateOpportunitySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string | undefined;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await opportunityService.updateOpportunity(tenantId, id, request.body, userId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * POST /opportunities/:id/win - Mark opportunity as won
   */
  fastify.post(
    '/:id/win',
    {
      schema: {
        description: 'Mark opportunity as won',
        tags: ['Opportunities'],
        body: toJsonSchema(winOpportunitySchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof winOpportunitySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string | undefined;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await opportunityService.winOpportunity(tenantId, id, request.body, userId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * POST /opportunities/:id/lose - Mark opportunity as lost
   */
  fastify.post(
    '/:id/lose',
    {
      schema: {
        description: 'Mark opportunity as lost',
        tags: ['Opportunities'],
        body: toJsonSchema(loseOpportunitySchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof loseOpportunitySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string | undefined;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await opportunityService.loseOpportunity(tenantId, id, request.body, userId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * POST /opportunities/:id/reopen - Reopen a closed opportunity
   */
  fastify.post(
    '/:id/reopen',
    {
      schema: {
        description: 'Reopen a closed opportunity',
        tags: ['Opportunities'],
        body: toJsonSchema(reopenOpportunitySchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof reopenOpportunitySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string | undefined;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await opportunityService.reopenOpportunity(tenantId, id, request.body.stage, userId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * DELETE /opportunities/:id - Delete opportunity
   */
  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Delete opportunity',
        tags: ['Opportunities'],
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await opportunityService.deleteOpportunity(tenantId, id);

      if (result.isFailure) {
        return reply.status(404).send({ error: result.error });
      }

      return reply.status(204).send();
    }
  );

  /**
   * POST /opportunities/bulk - Bulk operations on opportunities
   */
  fastify.post(
    '/bulk',
    {
      schema: {
        description: 'Bulk operations on opportunities',
        tags: ['Opportunities'],
        body: toJsonSchema(bulkOperationSchema),
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof bulkOperationSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string | undefined;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await opportunityService.bulkOperation(tenantId, request.body, userId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * POST /opportunities/convert-lead - Convert a lead to an opportunity
   */
  fastify.post(
    '/convert-lead',
    {
      schema: {
        description: 'Convert a lead to an opportunity',
        tags: ['Opportunities'],
        body: toJsonSchema(convertLeadSchema),
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof convertLeadSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string | undefined;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await opportunityService.convertLeadToOpportunity(tenantId, request.body, userId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(201).send(result.getValue());
    }
  );

  // ============================================
  // FASE 5.4 - Notes Endpoints
  // ============================================

  /**
   * GET /opportunities/:id/notes - Get opportunity notes
   */
  fastify.get(
    '/:id/notes',
    {
      schema: {
        description: 'Get opportunity notes',
        tags: ['Opportunities', 'Notes'],
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const notes = await db
        .select()
        .from(opportunityNotes)
        .where(
          and(
            eq(opportunityNotes.tenantId, tenantId),
            eq(opportunityNotes.opportunityId, id)
          )
        )
        .orderBy(desc(opportunityNotes.isPinned), desc(opportunityNotes.createdAt));

      // Return in frontend-expected format
      return reply.send({
        data: notes,
        meta: {
          page: 1,
          pageSize: notes.length,
          total: notes.length,
          totalPages: 1,
        },
      });
    }
  );

  /**
   * POST /opportunities/:id/notes - Add note to opportunity
   */
  fastify.post(
    '/:id/notes',
    {
      schema: {
        description: 'Add note to opportunity',
        tags: ['Opportunities', 'Notes'],
        body: toJsonSchema(createNoteSchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof createNoteSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }
      if (!userId) {
        return reply.status(400).send({ error: 'User ID required' });
      }

      const [note] = await db
        .insert(opportunityNotes)
        .values({
          tenantId,
          opportunityId: id,
          createdBy: userId,
          content: request.body.content,
          isPinned: request.body.isPinned ?? false,
        })
        .returning();

      // Log activity
      await db.insert(opportunityActivity).values({
        tenantId,
        opportunityId: id,
        userId,
        actionType: 'note_added',
        description: 'Note added to opportunity',
        metadata: { noteId: note.id },
      });

      // Update opportunity lastActivityAt
      await db
        .update(opportunities)
        .set({ lastActivityAt: new Date(), updatedAt: new Date() })
        .where(and(eq(opportunities.tenantId, tenantId), eq(opportunities.id, id)));

      return reply.status(201).send(note);
    }
  );

  /**
   * PATCH /opportunities/:id/notes/:noteId - Update note
   */
  fastify.patch(
    '/:id/notes/:noteId',
    {
      schema: {
        description: 'Update opportunity note',
        tags: ['Opportunities', 'Notes'],
        body: toJsonSchema(updateNoteSchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string; noteId: string };
        Body: z.infer<typeof updateNoteSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id, noteId } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const [updated] = await db
        .update(opportunityNotes)
        .set({
          ...request.body,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(opportunityNotes.tenantId, tenantId),
            eq(opportunityNotes.opportunityId, id),
            eq(opportunityNotes.id, noteId)
          )
        )
        .returning();

      if (!updated) {
        return reply.status(404).send({ error: 'Note not found' });
      }

      return reply.send(updated);
    }
  );

  /**
   * DELETE /opportunities/:id/notes/:noteId - Delete note
   */
  fastify.delete(
    '/:id/notes/:noteId',
    {
      schema: {
        description: 'Delete opportunity note',
        tags: ['Opportunities', 'Notes'],
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string; noteId: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;
      const { id, noteId } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const [deleted] = await db
        .delete(opportunityNotes)
        .where(
          and(
            eq(opportunityNotes.tenantId, tenantId),
            eq(opportunityNotes.opportunityId, id),
            eq(opportunityNotes.id, noteId)
          )
        )
        .returning();

      if (!deleted) {
        return reply.status(404).send({ error: 'Note not found' });
      }

      // Log activity
      if (userId) {
        await db.insert(opportunityActivity).values({
          tenantId,
          opportunityId: id,
          userId,
          actionType: 'note_deleted',
          description: 'Note deleted from opportunity',
        });
      }

      return reply.status(204).send();
    }
  );

  // ============================================
  // FASE 5.4 - Activity Endpoint
  // ============================================

  /**
   * GET /opportunities/:id/activity - Get opportunity activity timeline
   */
  fastify.get(
    '/:id/activity',
    {
      schema: {
        description: 'Get opportunity activity timeline',
        tags: ['Opportunities', 'Activity'],
        querystring: toJsonSchema(activityQuerySchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: z.infer<typeof activityQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id } = request.params;
      const { page = 1, limit = 20 } = request.query;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const offset = (page - 1) * limit;

      const [activity, countResult] = await Promise.all([
        db
          .select()
          .from(opportunityActivity)
          .where(
            and(
              eq(opportunityActivity.tenantId, tenantId),
              eq(opportunityActivity.opportunityId, id)
            )
          )
          .orderBy(desc(opportunityActivity.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(opportunityActivity)
          .where(
            and(
              eq(opportunityActivity.tenantId, tenantId),
              eq(opportunityActivity.opportunityId, id)
            )
          ),
      ]);

      const total = countResult[0]?.count ?? 0;

      // Return in frontend-expected format
      return reply.send({
        data: activity,
        meta: {
          page,
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }
  );

  // ============================================
  // FASE 5.4 - Stage, Status, Owner Updates
  // ============================================

  /**
   * PATCH /opportunities/:id/stage - Update opportunity stage (for Kanban)
   */
  fastify.patch(
    '/:id/stage',
    {
      schema: {
        description: 'Update opportunity stage',
        tags: ['Opportunities'],
        body: toJsonSchema(updateStageSchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof updateStageSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;
      const { id } = request.params;
      const { stageId } = request.body;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      // Get old opportunity data
      const [oldOpp] = await db
        .select()
        .from(opportunities)
        .where(and(eq(opportunities.tenantId, tenantId), eq(opportunities.id, id)));

      if (!oldOpp) {
        return reply.status(404).send({ error: 'Opportunity not found' });
      }

      // Get new stage to update probability
      const [newStage] = await db
        .select()
        .from(opportunityPipelineStages)
        .where(
          and(
            eq(opportunityPipelineStages.tenantId, tenantId),
            eq(opportunityPipelineStages.id, stageId)
          )
        );

      // Update opportunity
      const updateData: Record<string, unknown> = {
        stageId,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      };

      // Update probability based on stage if stage has a default probability
      if (newStage?.probability) {
        updateData.probability = newStage.probability;
      }

      const [updated] = await db
        .update(opportunities)
        .set(updateData)
        .where(and(eq(opportunities.tenantId, tenantId), eq(opportunities.id, id)))
        .returning();

      // Log activity
      if (userId) {
        await db.insert(opportunityActivity).values({
          tenantId,
          opportunityId: id,
          userId,
          actionType: 'stage_changed',
          description: `Stage changed to ${newStage?.label || stageId}`,
          changes: {
            stageId: { from: oldOpp.stageId, to: stageId },
            probability: newStage?.probability
              ? { from: oldOpp.probability, to: newStage.probability }
              : undefined,
          },
        });
      }

      return reply.send(updated);
    }
  );

  /**
   * PATCH /opportunities/:id/status - Update opportunity status
   */
  fastify.patch(
    '/:id/status',
    {
      schema: {
        description: 'Update opportunity status',
        tags: ['Opportunities'],
        body: toJsonSchema(updateStatusSchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof updateStatusSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;
      const { id } = request.params;
      const { status, reason } = request.body;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      // Get old opportunity data
      const [oldOpp] = await db
        .select()
        .from(opportunities)
        .where(and(eq(opportunities.tenantId, tenantId), eq(opportunities.id, id)));

      if (!oldOpp) {
        return reply.status(404).send({ error: 'Opportunity not found' });
      }

      const updateData: Record<string, unknown> = {
        status,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      };

      if (status === 'won') {
        updateData.actualCloseDate = new Date();
        updateData.probability = 100;
        if (reason) updateData.wonNotes = reason;
      } else if (status === 'lost') {
        updateData.actualCloseDate = new Date();
        updateData.probability = 0;
        if (reason) updateData.lostReason = reason;
      }

      const [updated] = await db
        .update(opportunities)
        .set(updateData)
        .where(and(eq(opportunities.tenantId, tenantId), eq(opportunities.id, id)))
        .returning();

      // Log activity
      if (userId) {
        await db.insert(opportunityActivity).values({
          tenantId,
          opportunityId: id,
          userId,
          actionType: status === 'won' ? 'won' : status === 'lost' ? 'lost' : 'status_changed',
          description: `Status changed to ${status}${reason ? `: ${reason}` : ''}`,
          changes: { status: { from: oldOpp.status, to: status } },
          metadata: reason ? { reason } : {},
        });
      }

      return reply.send(updated);
    }
  );

  /**
   * PATCH /opportunities/:id/owner - Assign opportunity owner
   */
  fastify.patch(
    '/:id/owner',
    {
      schema: {
        description: 'Assign opportunity owner',
        tags: ['Opportunities'],
        body: toJsonSchema(updateOwnerSchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof updateOwnerSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;
      const { id } = request.params;
      const { ownerId } = request.body;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      // Get old opportunity data
      const [oldOpp] = await db
        .select()
        .from(opportunities)
        .where(and(eq(opportunities.tenantId, tenantId), eq(opportunities.id, id)));

      if (!oldOpp) {
        return reply.status(404).send({ error: 'Opportunity not found' });
      }

      const [updated] = await db
        .update(opportunities)
        .set({
          ownerId,
          updatedAt: new Date(),
          lastActivityAt: new Date(),
        })
        .where(and(eq(opportunities.tenantId, tenantId), eq(opportunities.id, id)))
        .returning();

      // Log activity
      if (userId) {
        await db.insert(opportunityActivity).values({
          tenantId,
          opportunityId: id,
          userId,
          actionType: 'owner_assigned',
          description: 'Owner assigned to opportunity',
          changes: { ownerId: { from: oldOpp.ownerId, to: ownerId } },
        });
      }

      return reply.send(updated);
    }
  );

  // ============================================
  // FASE 5.4 - Pipeline Stages Endpoints
  // ============================================

  /**
   * GET /opportunities/pipeline/stages - Get pipeline stages
   */
  fastify.get(
    '/pipeline/stages',
    {
      schema: {
        description: 'Get opportunity pipeline stages',
        tags: ['Opportunities', 'Pipeline'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const stages = await db
        .select()
        .from(opportunityPipelineStages)
        .where(
          and(
            eq(opportunityPipelineStages.tenantId, tenantId),
            eq(opportunityPipelineStages.isActive, true)
          )
        )
        .orderBy(asc(opportunityPipelineStages.order));

      return reply.send({ data: stages });
    }
  );

  /**
   * POST /opportunities/pipeline/stages - Create pipeline stage
   */
  fastify.post(
    '/pipeline/stages',
    {
      schema: {
        description: 'Create opportunity pipeline stage',
        tags: ['Opportunities', 'Pipeline'],
        body: toJsonSchema(createPipelineStageSchema),
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createPipelineStageSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      // Get max order if not specified
      let order = request.body.order;
      if (order === undefined) {
        const [maxOrder] = await db
          .select({ maxOrder: sql<number>`coalesce(max(${opportunityPipelineStages.order}), -1)` })
          .from(opportunityPipelineStages)
          .where(eq(opportunityPipelineStages.tenantId, tenantId));
        order = (maxOrder?.maxOrder ?? -1) + 1;
      }

      const [stage] = await db
        .insert(opportunityPipelineStages)
        .values({
          tenantId,
          label: request.body.label,
          description: request.body.description,
          order,
          color: request.body.color ?? '#3B82F6',
          probability: request.body.probability ?? 50,
          stageType: request.body.stageType ?? 'open',
          isDefault: request.body.isDefault ?? false,
        })
        .returning();

      return reply.status(201).send(stage);
    }
  );

  /**
   * GET /opportunities/pipeline/view - Get Kanban pipeline view
   */
  fastify.get(
    '/pipeline/view',
    {
      schema: {
        description: 'Get Kanban pipeline view with opportunities grouped by stage',
        tags: ['Opportunities', 'Pipeline'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      // Get all active stages
      const stages = await db
        .select()
        .from(opportunityPipelineStages)
        .where(
          and(
            eq(opportunityPipelineStages.tenantId, tenantId),
            eq(opportunityPipelineStages.isActive, true)
          )
        )
        .orderBy(asc(opportunityPipelineStages.order));

      // Get all open opportunities with customer/lead info
      const opps = await db
        .select({
          opportunity: opportunities,
          customerName: customers.name,
          leadName: leads.fullName,
        })
        .from(opportunities)
        .leftJoin(customers, eq(opportunities.customerId, customers.id))
        .leftJoin(leads, eq(opportunities.leadId, leads.id))
        .where(
          and(
            eq(opportunities.tenantId, tenantId),
            eq(opportunities.status, 'open')
          )
        )
        .orderBy(desc(opportunities.updatedAt));

      // Group opportunities by stage
      const stageColumns = stages.map((stage) => ({
        stage,
        opportunities: opps
          .filter((o) => o.opportunity.stageId === stage.id)
          .map((o) => ({
            ...o.opportunity,
            customerName: o.customerName,
            leadName: o.leadName,
            forecast: (o.opportunity.amount ?? 0) * ((o.opportunity.probability ?? 0) / 100),
          })),
        count: opps.filter((o) => o.opportunity.stageId === stage.id).length,
        totalAmount: opps
          .filter((o) => o.opportunity.stageId === stage.id)
          .reduce((sum, o) => sum + (o.opportunity.amount ?? 0), 0),
        totalForecast: opps
          .filter((o) => o.opportunity.stageId === stage.id)
          .reduce(
            (sum, o) =>
              sum + (o.opportunity.amount ?? 0) * ((o.opportunity.probability ?? 0) / 100),
            0
          ),
      }));

      // Add unassigned opportunities (no stage)
      const unassigned = opps.filter((o) => !o.opportunity.stageId);
      if (unassigned.length > 0) {
        stageColumns.push({
          stage: {
            id: 'no-stage',
            tenantId,
            label: 'Sin Etapa',
            description: null,
            order: -1,
            color: '#6B7280',
            probability: 0,
            stageType: 'open',
            isDefault: false,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          opportunities: unassigned.map((o) => ({
            ...o.opportunity,
            customerName: o.customerName,
            leadName: o.leadName,
            forecast: (o.opportunity.amount ?? 0) * ((o.opportunity.probability ?? 0) / 100),
          })),
          count: unassigned.length,
          totalAmount: unassigned.reduce((sum, o) => sum + (o.opportunity.amount ?? 0), 0),
          totalForecast: unassigned.reduce(
            (sum, o) =>
              sum + (o.opportunity.amount ?? 0) * ((o.opportunity.probability ?? 0) / 100),
            0
          ),
        });
      }

      const totalOpportunities = opps.length;
      const totalAmount = opps.reduce((sum, o) => sum + (o.opportunity.amount ?? 0), 0);
      const totalForecast = opps.reduce(
        (sum, o) => sum + (o.opportunity.amount ?? 0) * ((o.opportunity.probability ?? 0) / 100),
        0
      );

      // Return in frontend-expected format (columns instead of stages)
      return reply.send({
        columns: stageColumns,
        totalOpportunities,
        totalAmount,
        totalForecast,
        wonAmount: 0, // TODO: Calculate from won opportunities
        lostAmount: 0, // TODO: Calculate from lost opportunities
      });
    }
  );
}
