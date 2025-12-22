/**
 * Notes Routes
 * API endpoints for notes and comments management
 */

import { FastifyPluginAsync } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { toJsonSchema } from '../../utils/zod-schema';
import { NotesService, SUPPORTED_REACTIONS } from '../../infrastructure/notes';
import { authenticate, getAuthUser } from '../middlewares/auth.middleware';

// Validation schemas
const entityTypeSchema = z.enum(['lead', 'customer', 'opportunity', 'task', 'contact']);
const contentTypeSchema = z.enum(['text', 'markdown', 'html']);
const noteTypeSchema = z.enum(['note', 'comment', 'internal', 'system']);

const createNoteSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  content: z.string().min(1).max(50000),
  contentType: contentTypeSchema.optional(),
  noteType: noteTypeSchema.optional(),
  isPrivate: z.boolean().optional(),
  mentions: z.array(z.object({
    userId: z.string().uuid(),
    userName: z.string().optional(),
    startIndex: z.number(),
    endIndex: z.number(),
  })).optional(),
});

const updateNoteSchema = z.object({
  content: z.string().min(1).max(50000).optional(),
  contentType: contentTypeSchema.optional(),
  isPinned: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  mentions: z.array(z.object({
    userId: z.string().uuid(),
    userName: z.string().optional(),
    startIndex: z.number(),
    endIndex: z.number(),
  })).optional(),
});

const listNotesQuerySchema = z.object({
  entityType: entityTypeSchema.optional(),
  entityId: z.string().uuid().optional(),
  noteType: noteTypeSchema.optional(),
  isPinned: z.coerce.boolean().optional(),
  includeReplies: z.coerce.boolean().optional(),
  threadId: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'isPinned']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const reactionSchema = z.object({
  emoji: z.string().refine(
    (val) => (SUPPORTED_REACTIONS as readonly string[]).includes(val),
    { message: 'Unsupported reaction emoji' }
  ),
});

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

const entityParamSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string().uuid(),
});

/**
 * Notes routes plugin
 */
export const notesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Create a new note
   */
  fastify.post('/', {
    preHandler: [authenticate],
    schema: {
      tags: ['Notes'],
      summary: 'Create a new note',
      description: 'Create a note or comment on a CRM entity',
      body: toJsonSchema(createNoteSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const body = createNoteSchema.parse(request.body);
    const notesService = container.resolve(NotesService);

    const result = await notesService.createNote(user.tenantId, user.id, body);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return reply.status(201).send(result.value);
  });

  /**
   * Get a note by ID
   */
  fastify.get('/:id', {
    preHandler: [authenticate],
    schema: {
      tags: ['Notes'],
      summary: 'Get note by ID',
      params: toJsonSchema(uuidParamSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const { id } = uuidParamSchema.parse(request.params);
    const notesService = container.resolve(NotesService);

    const result = await notesService.getNoteById(user.tenantId, id);

    if (result.isFailure) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: result.error,
      });
    }

    if (!result.value) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Note not found',
      });
    }

    return result.value;
  });

  /**
   * Update a note
   */
  fastify.patch('/:id', {
    preHandler: [authenticate],
    schema: {
      tags: ['Notes'],
      summary: 'Update a note',
      params: toJsonSchema(uuidParamSchema),
      body: toJsonSchema(updateNoteSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const { id } = uuidParamSchema.parse(request.params);
    const body = updateNoteSchema.parse(request.body);
    const notesService = container.resolve(NotesService);

    const result = await notesService.updateNote(user.tenantId, id, user.id, body);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Delete a note
   */
  fastify.delete('/:id', {
    preHandler: [authenticate],
    schema: {
      tags: ['Notes'],
      summary: 'Delete a note',
      params: toJsonSchema(uuidParamSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const { id } = uuidParamSchema.parse(request.params);
    const notesService = container.resolve(NotesService);

    const result = await notesService.deleteNote(user.tenantId, id, user.id);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return reply.status(204).send();
  });

  /**
   * List notes with filtering
   */
  fastify.get('/', {
    preHandler: [authenticate],
    schema: {
      tags: ['Notes'],
      summary: 'List notes',
      description: 'List notes with filtering and pagination',
      querystring: toJsonSchema(listNotesQuerySchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const query = listNotesQuerySchema.parse(request.query);
    const notesService = container.resolve(NotesService);

    const result = await notesService.listNotes(user.tenantId, query);

    if (result.isFailure) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Get notes for a specific entity
   */
  fastify.get('/entity/:entityType/:entityId', {
    preHandler: [authenticate],
    schema: {
      tags: ['Notes'],
      summary: 'Get notes for entity',
      description: 'Get all notes for a specific CRM entity (lead, customer, etc.)',
      params: toJsonSchema(entityParamSchema),
      querystring: toJsonSchema(z.object({
        includeReplies: z.coerce.boolean().optional(),
        page: z.coerce.number().min(1).optional(),
        limit: z.coerce.number().min(1).max(100).optional(),
      })),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const { entityType, entityId } = entityParamSchema.parse(request.params);
    const query = request.query as { includeReplies?: boolean; page?: number; limit?: number };
    const notesService = container.resolve(NotesService);

    const result = await notesService.getNotesForEntity(user.tenantId, entityType, entityId, query);

    if (result.isFailure) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Get pinned notes for entity
   */
  fastify.get('/entity/:entityType/:entityId/pinned', {
    preHandler: [authenticate],
    schema: {
      tags: ['Notes'],
      summary: 'Get pinned notes',
      description: 'Get all pinned notes for a specific entity',
      params: toJsonSchema(entityParamSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const { entityType, entityId } = entityParamSchema.parse(request.params);
    const notesService = container.resolve(NotesService);

    const result = await notesService.getPinnedNotes(user.tenantId, entityType, entityId);

    if (result.isFailure) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Get replies to a note
   */
  fastify.get('/:id/replies', {
    preHandler: [authenticate],
    schema: {
      tags: ['Notes'],
      summary: 'Get note replies',
      description: 'Get all replies to a specific note',
      params: toJsonSchema(uuidParamSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const { id } = uuidParamSchema.parse(request.params);
    const notesService = container.resolve(NotesService);

    const result = await notesService.getReplies(user.tenantId, id);

    if (result.isFailure) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Get thread summary
   */
  fastify.get('/thread/:id', {
    preHandler: [authenticate],
    schema: {
      tags: ['Notes'],
      summary: 'Get thread summary',
      description: 'Get summary of a note thread including participants and reply count',
      params: toJsonSchema(uuidParamSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const { id } = uuidParamSchema.parse(request.params);
    const notesService = container.resolve(NotesService);

    const result = await notesService.getThreadSummary(user.tenantId, id);

    if (result.isFailure) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: result.error,
      });
    }

    if (!result.value) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Thread not found',
      });
    }

    return result.value;
  });

  /**
   * Add reaction to a note
   */
  fastify.post('/:id/reactions', {
    preHandler: [authenticate],
    schema: {
      tags: ['Notes'],
      summary: 'Add reaction',
      description: 'Add a reaction emoji to a note',
      params: toJsonSchema(uuidParamSchema),
      body: toJsonSchema(reactionSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const { id } = uuidParamSchema.parse(request.params);
    const { emoji } = reactionSchema.parse(request.body);
    const notesService = container.resolve(NotesService);

    const result = await notesService.addReaction(user.tenantId, id, user.id, emoji);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Remove reaction from a note
   */
  fastify.delete('/:id/reactions/:emoji', {
    preHandler: [authenticate],
    schema: {
      tags: ['Notes'],
      summary: 'Remove reaction',
      description: 'Remove a reaction emoji from a note',
      params: toJsonSchema(z.object({
        id: z.string().uuid(),
        emoji: z.string(),
      })),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const { id, emoji } = (request.params as { id: string; emoji: string });
    const notesService = container.resolve(NotesService);

    const result = await notesService.removeReaction(user.tenantId, id, user.id, emoji);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Pin/unpin a note
   */
  fastify.post('/:id/pin', {
    preHandler: [authenticate],
    schema: {
      tags: ['Notes'],
      summary: 'Pin note',
      description: 'Pin a note to keep it at the top',
      params: toJsonSchema(uuidParamSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const { id } = uuidParamSchema.parse(request.params);
    const notesService = container.resolve(NotesService);

    const result = await notesService.togglePin(user.tenantId, id, true);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Unpin a note
   */
  fastify.delete('/:id/pin', {
    preHandler: [authenticate],
    schema: {
      tags: ['Notes'],
      summary: 'Unpin note',
      description: 'Remove pin from a note',
      params: toJsonSchema(uuidParamSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const { id } = uuidParamSchema.parse(request.params);
    const notesService = container.resolve(NotesService);

    const result = await notesService.togglePin(user.tenantId, id, false);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Get supported reactions
   */
  fastify.get('/reactions/supported', {
    preHandler: [authenticate],
    schema: {
      tags: ['Notes'],
      summary: 'Get supported reactions',
      description: 'Get list of supported reaction emojis',
    },
  }, async () => {
    return {
      reactions: SUPPORTED_REACTIONS,
    };
  });
};
