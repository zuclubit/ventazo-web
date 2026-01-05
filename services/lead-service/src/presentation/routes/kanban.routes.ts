/**
 * Kanban Enterprise Routes
 *
 * REST API endpoints for Kanban board operations including:
 * - Board state retrieval
 * - Move operations with validation
 * - Undo/Redo functionality
 * - Configuration management
 * - History & audit trails
 * - Analytics & metrics
 *
 * @version 1.0.0
 * @module presentation/routes/kanban
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { container } from 'tsyringe';
import { KanbanService, type KanbanEntityType } from '../../infrastructure/kanban';
import { WebSocketService } from '../../infrastructure/websocket';
import { LoggerService } from '../../infrastructure/logging';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';
import { Permission } from '../../infrastructure/auth/types';

// ============================================
// Zod Validation Schemas
// ============================================

const kanbanEntityTypeSchema = z.enum(['lead', 'opportunity', 'task', 'customer']);

const kanbanMoveSchema = z.object({
  entityType: kanbanEntityTypeSchema,
  entityId: z.string().uuid(),
  fromStageId: z.string().min(1).max(100),
  toStageId: z.string().min(1).max(100),
  newPosition: z.number().int().min(0).optional(),
  reason: z.string().max(500).optional(),
  forceWipOverride: z.boolean().optional().default(false),
  metadata: z.object({
    source: z.enum(['drag', 'keyboard', 'dialog', 'api']).optional(),
  }).optional(),
});

const kanbanUndoSchema = z.object({
  entityType: kanbanEntityTypeSchema,
  moveId: z.string().uuid().optional(),
});

const kanbanBulkMoveSchema = z.object({
  entityType: kanbanEntityTypeSchema,
  moves: z.array(z.object({
    entityId: z.string().uuid(),
    fromStageId: z.string().min(1).max(100),
    toStageId: z.string().min(1).max(100),
    newPosition: z.number().int().min(0).optional(),
  })).min(1).max(100),
  reason: z.string().max(500).optional(),
  createSnapshot: z.boolean().optional().default(true),
});

const kanbanConfigUpdateSchema = z.object({
  wipLimits: z.record(z.object({
    softLimit: z.number().int().min(0).max(1000).optional(),
    hardLimit: z.number().int().min(0).max(1000).optional(),
  })).optional(),
  collapsedColumns: z.array(z.string()).optional(),
  stageOrder: z.array(z.string()).optional(),
  transitions: z.record(z.enum(['allowed', 'warning', 'requires_data', 'blocked'])).optional(),
  version: z.number().int().min(1),
});

const kanbanMetricsQuerySchema = z.object({
  periodType: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  stageIds: z.array(z.string()).optional(),
});

const boardQuerySchema = z.object({
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(50),
  includeArchived: z.coerce.boolean().optional().default(false),
});

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================
// JSON Schemas for Fastify
// ============================================

const moveBodyJsonSchema = {
  type: 'object',
  required: ['entityType', 'entityId', 'fromStageId', 'toStageId'],
  properties: {
    entityType: { type: 'string', enum: ['lead', 'opportunity', 'task', 'customer'] },
    entityId: { type: 'string', format: 'uuid' },
    fromStageId: { type: 'string', minLength: 1, maxLength: 100 },
    toStageId: { type: 'string', minLength: 1, maxLength: 100 },
    newPosition: { type: 'integer', minimum: 0 },
    reason: { type: 'string', maxLength: 500 },
    forceWipOverride: { type: 'boolean', default: false },
    metadata: {
      type: 'object',
      properties: {
        source: { type: 'string', enum: ['drag', 'keyboard', 'dialog', 'api'] },
      },
    },
  },
};

const undoBodyJsonSchema = {
  type: 'object',
  required: ['entityType'],
  properties: {
    entityType: { type: 'string', enum: ['lead', 'opportunity', 'task', 'customer'] },
    moveId: { type: 'string', format: 'uuid' },
  },
};

const configUpdateJsonSchema = {
  type: 'object',
  required: ['version'],
  properties: {
    wipLimits: { type: 'object' },
    collapsedColumns: { type: 'array', items: { type: 'string' } },
    stageOrder: { type: 'array', items: { type: 'string' } },
    transitions: { type: 'object' },
    version: { type: 'integer', minimum: 1 },
  },
};

// ============================================
// Route Handler
// ============================================

export async function kanbanRoutes(fastify: FastifyInstance) {
  const kanbanService = container.resolve(KanbanService);
  const logger = container.resolve(LoggerService);

  // Get WebSocket service for real-time event publishing
  let wsService: WebSocketService | null = null;
  try {
    wsService = container.resolve(WebSocketService);
  } catch {
    // WebSocket service might not be registered in all environments
    fastify.log.warn('WebSocket service not available for Kanban real-time events');
  }

  // ============================================
  // GET /kanban/board/:entityType
  // Get full board state
  // ============================================
  fastify.get<{
    Params: { entityType: string };
    Querystring: { pageSize?: string; includeArchived?: string };
  }>('/board/:entityType', {
    preHandler: [authenticate, requirePermission(Permission.KANBAN_VIEW)],
    schema: {
      params: {
        type: 'object',
        required: ['entityType'],
        properties: {
          entityType: { type: 'string', enum: ['lead', 'opportunity', 'task', 'customer'] },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          pageSize: { type: 'string' },
          includeArchived: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.auth!.user.tenantId;
    const userId = request.auth!.user.id;

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'x-tenant-id header is required' },
      });
    }

    try {
      const entityType = kanbanEntityTypeSchema.parse(request.params.entityType);
      const query = boardQuerySchema.parse(request.query);

      const board = await kanbanService.getBoard(tenantId, entityType, userId, {
        pageSize: query.pageSize,
      });

      return reply.send({
        success: true,
        data: board,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const err = error as Error;
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: err.message },
      });
    }
  });

  // ============================================
  // GET /kanban/stage/:entityType/:stageId
  // Get paginated items for a specific stage
  // ============================================
  fastify.get<{
    Params: { entityType: string; stageId: string };
    Querystring: { limit?: string; cursor?: string };
  }>('/stage/:entityType/:stageId', {
    preHandler: [authenticate, requirePermission(Permission.KANBAN_VIEW)],
    schema: {
      params: {
        type: 'object',
        required: ['entityType', 'stageId'],
        properties: {
          entityType: { type: 'string', enum: ['lead', 'opportunity', 'task', 'customer'] },
          stageId: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string' },
          cursor: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.auth!.user.tenantId;

    try {
      const entityType = kanbanEntityTypeSchema.parse(request.params.entityType);
      const { stageId } = request.params;
      const limit = parseInt(request.query.limit || '50', 10);
      const cursor = request.query.cursor;

      const result = await kanbanService.getStageItems(
        tenantId,
        entityType,
        stageId,
        Math.min(limit, 100),
        cursor
      );

      return reply.send({
        success: true,
        data: {
          items: result.items,
          total: result.total,
          nextCursor: result.nextCursor,
          hasMore: !!result.nextCursor,
        },
      });
    } catch (error) {
      const err = error as Error;
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: err.message },
      });
    }
  });

  // ============================================
  // POST /kanban/move
  // Move an item to a different stage
  // ============================================
  fastify.post<{
    Body: z.infer<typeof kanbanMoveSchema>;
  }>('/move', {
    preHandler: [authenticate, requirePermission(Permission.KANBAN_MOVE)],
    schema: {
      body: moveBodyJsonSchema,
    },
  }, async (request, reply) => {
    const tenantId = request.auth!.user.tenantId;
    const userId = request.auth!.user.id;
    const correlationId = request.correlationId || 'unknown';
    const startTime = Date.now();

    try {
      const parsed = kanbanMoveSchema.parse(request.body);

      const moveRequest: import('../../infrastructure/kanban').KanbanMoveRequest = {
        entityType: parsed.entityType,
        entityId: parsed.entityId,
        fromStageId: parsed.fromStageId,
        toStageId: parsed.toStageId,
        newPosition: parsed.newPosition,
        reason: parsed.reason,
        forceWipOverride: parsed.forceWipOverride,
        metadata: {
          source: parsed.metadata?.source,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] as string,
        },
      };

      const result = await kanbanService.moveItem(tenantId, userId, moveRequest);

      // Log successful move
      logger.logMove(
        correlationId,
        tenantId,
        userId,
        parsed.entityType,
        parsed.entityId,
        parsed.fromStageId,
        parsed.toStageId,
        true,
        Date.now() - startTime,
        { moveId: result.moveId, source: parsed.metadata?.source }
      );

      // Log WIP warning if applicable
      if (result.wipStatus && (result.wipStatus.level === 'soft' || result.wipStatus.level === 'hard')) {
        logger.logWIPWarning(
          correlationId,
          tenantId,
          parsed.entityType,
          result.wipStatus.stageId,
          result.wipStatus.current,
          result.wipStatus.limit,
          result.wipStatus.level
        );
      }

      // Publish real-time event for collaboration
      if (wsService) {
        wsService.getServer().publishKanbanEvent(
          tenantId,
          'KANBAN_ITEM_MOVED',
          parsed.entityType,
          {
            entityId: parsed.entityId,
            fromStageId: parsed.fromStageId,
            toStageId: parsed.toStageId,
            moveId: result.moveId,
            userId,
            timestamp: new Date(),
            wipStatus: result.wipStatus ? {
              stageId: result.wipStatus.stageId,
              current: result.wipStatus.current,
              limit: result.wipStatus.limit,
              level: result.wipStatus.level,
            } : undefined,
          }
        );
      }

      return reply.send({
        success: true,
        data: result,
        broadcast: {
          channel: `tenant:${tenantId}:kanban:${parsed.entityType}`,
          event: 'KANBAN_ITEM_MOVED',
        },
      });
    } catch (error) {
      const err = error as Error;
      const errorMessage = err.message;

      // Parse error type
      if (errorMessage.startsWith('TRANSITION_BLOCKED:')) {
        return reply.status(422).send({
          success: false,
          error: {
            code: 'TRANSITION_BLOCKED',
            message: errorMessage.replace('TRANSITION_BLOCKED: ', ''),
            messageEs: errorMessage.replace('TRANSITION_BLOCKED: ', ''),
          },
        });
      }

      if (errorMessage.startsWith('WIP_LIMIT_EXCEEDED:')) {
        return reply.status(422).send({
          success: false,
          error: {
            code: 'WIP_LIMIT_EXCEEDED',
            message: errorMessage.replace('WIP_LIMIT_EXCEEDED: ', ''),
            messageEs: errorMessage.replace('WIP_LIMIT_EXCEEDED: ', ''),
          },
        });
      }

      if (errorMessage.startsWith('CONFLICT:')) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'CONFLICT',
            message: errorMessage.replace('CONFLICT: ', ''),
            messageEs: errorMessage.replace('CONFLICT: ', ''),
          },
        });
      }

      if (errorMessage.startsWith('REASON_REQUIRED:')) {
        return reply.status(422).send({
          success: false,
          error: {
            code: 'REASON_REQUIRED',
            message: errorMessage.replace('REASON_REQUIRED: ', ''),
            messageEs: errorMessage.replace('REASON_REQUIRED: ', ''),
          },
        });
      }

      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================
  // POST /kanban/undo
  // Undo the last move
  // ============================================
  fastify.post<{
    Body: z.infer<typeof kanbanUndoSchema>;
  }>('/undo', {
    preHandler: [authenticate, requirePermission(Permission.KANBAN_UNDO)],
    schema: {
      body: undoBodyJsonSchema,
    },
  }, async (request, reply) => {
    const tenantId = request.auth!.user.tenantId;
    const userId = request.auth!.user.id;
    const correlationId = request.correlationId || 'unknown';

    try {
      const undoRequest = kanbanUndoSchema.parse(request.body);

      const result = await kanbanService.undoMove(
        tenantId,
        userId,
        undoRequest.entityType,
        undoRequest.moveId
      );

      // Log successful undo
      logger.logUndoRedo(
        correlationId,
        tenantId,
        userId,
        undoRequest.entityType,
        'undo',
        result.undoMoveId,
        true
      );

      return reply.send({
        success: true,
        data: {
          undoMoveId: result.undoMoveId,
          originalMove: {
            id: result.originalMove.id,
            entityId: result.originalMove.entityId,
            fromStageId: result.originalMove.fromStageId,
            toStageId: result.originalMove.toStageId,
            createdAt: result.originalMove.createdAt,
          },
          restoredTo: result.restoredTo,
          redoAvailable: true,
        },
      });
    } catch (error) {
      const err = error as Error;

      if (err.message.startsWith('NO_UNDO_AVAILABLE:')) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NO_UNDO_AVAILABLE',
            message: err.message.replace('NO_UNDO_AVAILABLE: ', ''),
          },
        });
      }

      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================
  // POST /kanban/redo
  // Redo an undone move
  // ============================================
  fastify.post<{
    Body: { entityType: string };
  }>('/redo', {
    preHandler: [authenticate, requirePermission(Permission.KANBAN_UNDO)],
    schema: {
      body: {
        type: 'object',
        required: ['entityType'],
        properties: {
          entityType: { type: 'string', enum: ['lead', 'opportunity', 'task', 'customer'] },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.auth!.user.tenantId;
    const userId = request.auth!.user.id;
    const correlationId = request.correlationId || 'unknown';

    try {
      const entityType = kanbanEntityTypeSchema.parse(request.body.entityType);

      const result = await kanbanService.redoMove(tenantId, userId, entityType);

      // Log successful redo
      logger.logUndoRedo(
        correlationId,
        tenantId,
        userId,
        entityType,
        'redo',
        result.moveId || 'unknown',
        true
      );

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      const err = error as Error;

      if (err.message.startsWith('NO_REDO_AVAILABLE:')) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NO_REDO_AVAILABLE',
            message: err.message.replace('NO_REDO_AVAILABLE: ', ''),
          },
        });
      }

      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================
  // GET /kanban/config/:entityType
  // Get board configuration
  // ============================================
  fastify.get<{
    Params: { entityType: string };
  }>('/config/:entityType', {
    preHandler: [authenticate, requirePermission(Permission.KANBAN_VIEW)],
    schema: {
      params: {
        type: 'object',
        required: ['entityType'],
        properties: {
          entityType: { type: 'string', enum: ['lead', 'opportunity', 'task', 'customer'] },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.auth!.user.tenantId;

    try {
      const entityType = kanbanEntityTypeSchema.parse(request.params.entityType);

      const config = await kanbanService.getOrCreateConfig(tenantId, entityType);

      return reply.send({
        success: true,
        data: {
          entityType,
          wipLimits: config.wipLimits,
          collapsedColumns: config.collapsedColumns,
          stageOrder: config.stageOrder,
          transitions: config.transitions,
          version: config.version,
          updatedAt: config.updatedAt,
        },
      });
    } catch (error) {
      const err = error as Error;
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: err.message },
      });
    }
  });

  // ============================================
  // PUT /kanban/config/:entityType
  // Update board configuration
  // ============================================
  fastify.put<{
    Params: { entityType: string };
    Body: z.infer<typeof kanbanConfigUpdateSchema>;
  }>('/config/:entityType', {
    preHandler: [authenticate, requirePermission(Permission.KANBAN_CONFIG)],
    schema: {
      params: {
        type: 'object',
        required: ['entityType'],
        properties: {
          entityType: { type: 'string', enum: ['lead', 'opportunity', 'task', 'customer'] },
        },
      },
      body: configUpdateJsonSchema,
    },
  }, async (request, reply) => {
    const tenantId = request.auth!.user.tenantId;
    const correlationId = request.correlationId || 'unknown';

    try {
      const entityType = kanbanEntityTypeSchema.parse(request.params.entityType);
      const updates = kanbanConfigUpdateSchema.parse(request.body);

      const config = await kanbanService.updateConfig(
        tenantId,
        entityType,
        {
          wipLimits: updates.wipLimits as Record<string, { softLimit?: number; hardLimit?: number }>,
          collapsedColumns: updates.collapsedColumns,
          stageOrder: updates.stageOrder,
          transitions: updates.transitions,
        },
        updates.version
      );

      // Log config change
      const changes: string[] = [];
      if (updates.wipLimits) changes.push('wipLimits');
      if (updates.collapsedColumns) changes.push('collapsedColumns');
      if (updates.stageOrder) changes.push('stageOrder');
      if (updates.transitions) changes.push('transitions');

      logger.logConfigChange(
        correlationId,
        tenantId,
        entityType,
        changes,
        config.version
      );

      return reply.send({
        success: true,
        data: {
          entityType,
          wipLimits: config.wipLimits,
          collapsedColumns: config.collapsedColumns,
          stageOrder: config.stageOrder,
          transitions: config.transitions,
          version: config.version,
          updatedAt: config.updatedAt,
        },
      });
    } catch (error) {
      const err = error as Error;

      if (err.message.startsWith('VERSION_CONFLICT:')) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'VERSION_CONFLICT',
            message: err.message.replace('VERSION_CONFLICT: ', ''),
          },
        });
      }

      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: err.message },
      });
    }
  });

  // ============================================
  // GET /kanban/history/:entityType/:entityId
  // Get move history for a specific item
  // ============================================
  fastify.get<{
    Params: { entityType: string; entityId: string };
    Querystring: { limit?: string; offset?: string };
  }>('/history/:entityType/:entityId', {
    preHandler: [authenticate, requirePermission(Permission.KANBAN_HISTORY)],
    schema: {
      params: {
        type: 'object',
        required: ['entityType', 'entityId'],
        properties: {
          entityType: { type: 'string', enum: ['lead', 'opportunity', 'task', 'customer'] },
          entityId: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string' },
          offset: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.auth!.user.tenantId;

    try {
      const entityType = kanbanEntityTypeSchema.parse(request.params.entityType);
      const { entityId } = request.params;
      const query = historyQuerySchema.parse(request.query);

      const result = await kanbanService.getItemHistory(
        tenantId,
        entityType,
        entityId,
        { limit: query.limit, offset: query.offset }
      );

      return reply.send({
        success: true,
        data: {
          moves: result.moves.map(move => ({
            id: move.id,
            fromStageId: move.fromStageId,
            toStageId: move.toStageId,
            userId: move.userId,
            reason: move.reason,
            metadata: move.metadata,
            undoneAt: move.undoneAt,
            undoneBy: move.undoneBy,
            createdAt: move.createdAt,
          })),
          total: result.total,
          pagination: {
            limit: query.limit,
            offset: query.offset,
            hasMore: (query.offset || 0) + result.moves.length < result.total,
          },
        },
      });
    } catch (error) {
      const err = error as Error;
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: err.message },
      });
    }
  });

  // ============================================
  // GET /kanban/history/:entityType
  // Get board-level move history
  // ============================================
  fastify.get<{
    Params: { entityType: string };
    Querystring: { limit?: string; offset?: string; startDate?: string; endDate?: string };
  }>('/history/:entityType', {
    preHandler: [authenticate, requirePermission(Permission.KANBAN_HISTORY)],
    schema: {
      params: {
        type: 'object',
        required: ['entityType'],
        properties: {
          entityType: { type: 'string', enum: ['lead', 'opportunity', 'task', 'customer'] },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string' },
          offset: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.auth!.user.tenantId;

    try {
      const entityType = kanbanEntityTypeSchema.parse(request.params.entityType);
      const query = historyQuerySchema.parse(request.query);

      const result = await kanbanService.getBoardHistory(
        tenantId,
        entityType,
        {
          limit: query.limit,
          offset: query.offset,
          startDate: query.startDate ? new Date(query.startDate) : undefined,
          endDate: query.endDate ? new Date(query.endDate) : undefined,
        }
      );

      return reply.send({
        success: true,
        data: {
          moves: result.moves,
          total: result.total,
          pagination: {
            limit: query.limit,
            offset: query.offset,
            hasMore: (query.offset || 0) + result.moves.length < result.total,
          },
        },
      });
    } catch (error) {
      const err = error as Error;
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: err.message },
      });
    }
  });

  // ============================================
  // POST /kanban/snapshot/:entityType
  // Create a manual snapshot
  // ============================================
  fastify.post<{
    Params: { entityType: string };
    Body: { reason?: string };
  }>('/snapshot/:entityType', {
    preHandler: [authenticate, requirePermission(Permission.KANBAN_CONFIG)],
    schema: {
      params: {
        type: 'object',
        required: ['entityType'],
        properties: {
          entityType: { type: 'string', enum: ['lead', 'opportunity', 'task', 'customer'] },
        },
      },
      body: {
        type: 'object',
        properties: {
          reason: { type: 'string', maxLength: 100 },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.auth!.user.tenantId;

    try {
      const entityType = kanbanEntityTypeSchema.parse(request.params.entityType);
      const reason = request.body?.reason || 'manual';

      const snapshotId = await kanbanService.createSnapshot(tenantId, entityType, reason);

      return reply.send({
        success: true,
        data: {
          snapshotId,
          entityType,
          reason,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const err = error as Error;
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================
  // POST /kanban/lock/:entityType/:entityId
  // Acquire a lock on an item
  // ============================================
  fastify.post<{
    Params: { entityType: string; entityId: string };
    Body: { sessionId: string };
  }>('/lock/:entityType/:entityId', {
    preHandler: [authenticate, requirePermission(Permission.KANBAN_MOVE)],
    schema: {
      params: {
        type: 'object',
        required: ['entityType', 'entityId'],
        properties: {
          entityType: { type: 'string', enum: ['lead', 'opportunity', 'task', 'customer'] },
          entityId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['sessionId'],
        properties: {
          sessionId: { type: 'string', maxLength: 100 },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.auth!.user.tenantId;
    const userId = request.auth!.user.id;
    const correlationId = request.correlationId || 'unknown';

    try {
      const entityType = kanbanEntityTypeSchema.parse(request.params.entityType);
      const { entityId } = request.params;
      const { sessionId } = request.body;

      const result = await kanbanService.acquireLock(
        tenantId,
        entityType,
        entityId,
        userId,
        sessionId
      );

      if (result.success) {
        // Log successful lock acquisition
        logger.logLock(correlationId, tenantId, userId, entityType, entityId, 'acquire', true);

        return reply.send({
          success: true,
          data: {
            locked: true,
            expiresAt: result.expiresAt,
          },
        });
      } else {
        // Log lock conflict
        logger.logLock(correlationId, tenantId, userId, entityType, entityId, 'conflict', false, result.conflictingUser);

        return reply.status(409).send({
          success: false,
          error: {
            code: 'LOCK_CONFLICT',
            message: 'Item is locked by another user',
            conflictingUser: result.conflictingUser,
          },
        });
      }
    } catch (error) {
      const err = error as Error;
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================
  // DELETE /kanban/lock/:entityType/:entityId
  // Release a lock on an item
  // ============================================
  fastify.delete<{
    Params: { entityType: string; entityId: string };
  }>('/lock/:entityType/:entityId', {
    preHandler: [authenticate, requirePermission(Permission.KANBAN_MOVE)],
    schema: {
      params: {
        type: 'object',
        required: ['entityType', 'entityId'],
        properties: {
          entityType: { type: 'string', enum: ['lead', 'opportunity', 'task', 'customer'] },
          entityId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.auth!.user.tenantId;
    const userId = request.auth!.user.id;
    const correlationId = request.correlationId || 'unknown';

    try {
      const entityType = kanbanEntityTypeSchema.parse(request.params.entityType);
      const { entityId } = request.params;

      await kanbanService.releaseLock(entityType, entityId, userId);

      // Log lock release
      logger.logLock(correlationId, tenantId, userId, entityType, entityId, 'release', true);

      return reply.send({
        success: true,
        data: { released: true },
      });
    } catch (error) {
      const err = error as Error;
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================
  // GET /kanban/metrics/:entityType
  // Get aggregated metrics dashboard
  // ============================================
  fastify.get<{
    Params: { entityType: string };
    Querystring: { periodType?: string; limit?: string };
  }>('/metrics/:entityType', {
    preHandler: [authenticate, requirePermission(Permission.KANBAN_METRICS)],
    schema: {
      params: {
        type: 'object',
        required: ['entityType'],
        properties: {
          entityType: { type: 'string', enum: ['lead', 'opportunity', 'task', 'customer'] },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          periodType: { type: 'string', enum: ['hourly', 'daily', 'weekly'], default: 'daily' },
          limit: { type: 'string', default: '7' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.auth!.user.tenantId;

    try {
      const entityType = kanbanEntityTypeSchema.parse(request.params.entityType);
      const periodType = (request.query.periodType as 'hourly' | 'daily' | 'weekly') || 'daily';
      const limit = parseInt(request.query.limit || '7', 10);

      const dashboard = await kanbanService.getMetricsDashboard(tenantId, entityType, {
        periodType,
        limit,
      });

      return reply.send({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      const err = error as Error;
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================
  // POST /kanban/metrics/:entityType/calculate
  // Calculate and store metrics for a period
  // ============================================
  fastify.post<{
    Params: { entityType: string };
    Body: { periodType: string; periodStart: string };
  }>('/metrics/:entityType/calculate', {
    preHandler: [authenticate, requirePermission(Permission.KANBAN_METRICS)],
    schema: {
      params: {
        type: 'object',
        required: ['entityType'],
        properties: {
          entityType: { type: 'string', enum: ['lead', 'opportunity', 'task', 'customer'] },
        },
      },
      body: {
        type: 'object',
        required: ['periodType', 'periodStart'],
        properties: {
          periodType: { type: 'string', enum: ['hourly', 'daily', 'weekly'] },
          periodStart: { type: 'string', format: 'date-time' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.auth!.user.tenantId;
    const correlationId = request.correlationId || 'unknown';
    const startTime = Date.now();

    try {
      const entityType = kanbanEntityTypeSchema.parse(request.params.entityType);
      const { periodType, periodStart } = request.body;

      const metrics = await kanbanService.calculateMetrics(
        tenantId,
        entityType,
        periodType as 'hourly' | 'daily' | 'weekly',
        new Date(periodStart)
      );

      // Log metrics calculation
      logger.logMetricsCalculation(
        correlationId,
        tenantId,
        entityType,
        periodType,
        metrics.length,
        Date.now() - startTime
      );

      return reply.send({
        success: true,
        data: {
          calculated: metrics.length,
          metrics,
        },
      });
    } catch (error) {
      const err = error as Error;
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================
  // GET /kanban/consistency/:entityType
  // Verify event sourcing consistency
  // ============================================
  fastify.get<{
    Params: { entityType: string };
  }>('/consistency/:entityType', {
    preHandler: [authenticate, requirePermission(Permission.KANBAN_CONSISTENCY)],
    schema: {
      params: {
        type: 'object',
        required: ['entityType'],
        properties: {
          entityType: { type: 'string', enum: ['lead', 'opportunity', 'task', 'customer'] },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.auth!.user.tenantId;
    const correlationId = request.correlationId || 'unknown';
    const startTime = Date.now();

    try {
      const entityType = kanbanEntityTypeSchema.parse(request.params.entityType);

      const result = await kanbanService.verifyConsistency(tenantId, entityType);

      // Log consistency check
      logger.logConsistencyCheck(
        correlationId,
        tenantId,
        entityType,
        result.isConsistent,
        result.inconsistencies?.length || 0,
        Date.now() - startTime
      );

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      const err = error as Error;
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  // ============================================
  // POST /kanban/consistency/:entityType/repair
  // Repair consistency issues for a specific entity
  // ============================================
  fastify.post<{
    Params: { entityType: string };
    Body: { entityId: string };
  }>('/consistency/:entityType/repair', {
    preHandler: [authenticate, requirePermission(Permission.KANBAN_CONSISTENCY)],
    schema: {
      params: {
        type: 'object',
        required: ['entityType'],
        properties: {
          entityType: { type: 'string', enum: ['lead', 'opportunity', 'task', 'customer'] },
        },
      },
      body: {
        type: 'object',
        required: ['entityId'],
        properties: {
          entityId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.auth!.user.tenantId;
    const correlationId = request.correlationId || 'unknown';

    try {
      const entityType = kanbanEntityTypeSchema.parse(request.params.entityType);
      const { entityId } = request.body;

      const result = await kanbanService.repairConsistency(tenantId, entityType, entityId);

      // Log repair operation
      logger.info(`Kanban consistency repaired: ${entityType}/${entityId}`, {
        correlationId,
        tenantId,
        entityType,
        entityId,
        operation: 'kanban:consistency:repair',
        repaired: result.repaired,
      });

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      const err = error as Error;
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });
}
