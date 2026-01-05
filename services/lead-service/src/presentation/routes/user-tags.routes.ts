/**
 * User Tags Routes
 * API endpoints for managing user tags (group labels) for notifications and mentions
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { UserTagsService } from '../../infrastructure/user-tags';
import { authenticate } from '../middlewares/auth.middleware';

// ============================================================================
// Validation Schemas
// ============================================================================

const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

const assignMembersSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
});

const listTagsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  includeInactive: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
});

// ============================================================================
// Route Handlers
// ============================================================================

async function listTags(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = request.auth?.user?.tenantId;
  if (!tenantId) {
    return reply.status(401).send({ error: 'Tenant ID required' });
  }

  const query = listTagsQuerySchema.safeParse(request.query);
  if (!query.success) {
    return reply.status(400).send({ error: 'Invalid query parameters', details: query.error.issues });
  }

  const userTagsService = container.resolve(UserTagsService);
  const result = await userTagsService.listTags(tenantId, {
    page: query.data.page,
    pageSize: query.data.pageSize,
    includeInactive: query.data.includeInactive,
    search: query.data.search,
  });

  if (result.isFailure) {
    return reply.status(500).send({ error: result.error });
  }

  const { data, total } = result.value;
  const page = query.data.page || 1;
  const pageSize = query.data.pageSize || 50;

  return reply.send({
    data,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

async function getTagById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const tenantId = request.auth?.user?.tenantId;
  if (!tenantId) {
    return reply.status(401).send({ error: 'Tenant ID required' });
  }

  const { id } = request.params;

  const userTagsService = container.resolve(UserTagsService);
  const result = await userTagsService.getTagById(tenantId, id);

  if (result.isFailure) {
    return reply.status(500).send({ error: result.error });
  }

  if (!result.value) {
    return reply.status(404).send({ error: 'Tag not found' });
  }

  return reply.send({ data: result.value });
}

async function createTag(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = request.auth?.user?.tenantId;
  const userId = request.auth?.user?.id;
  if (!tenantId || !userId) {
    return reply.status(401).send({ error: 'Authentication required' });
  }

  const body = createTagSchema.safeParse(request.body);
  if (!body.success) {
    return reply.status(400).send({ error: 'Invalid request body', details: body.error.issues });
  }

  const userTagsService = container.resolve(UserTagsService);
  const result = await userTagsService.createTag(tenantId, userId, body.data);

  if (result.isFailure) {
    // Check for duplicate error
    if (result.error?.includes('already exists')) {
      return reply.status(409).send({ error: result.error });
    }
    return reply.status(500).send({ error: result.error });
  }

  return reply.status(201).send({ data: result.value });
}

async function updateTag(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const tenantId = request.auth?.user?.tenantId;
  if (!tenantId) {
    return reply.status(401).send({ error: 'Tenant ID required' });
  }

  const { id } = request.params;

  const body = updateTagSchema.safeParse(request.body);
  if (!body.success) {
    return reply.status(400).send({ error: 'Invalid request body', details: body.error.issues });
  }

  const userTagsService = container.resolve(UserTagsService);
  const result = await userTagsService.updateTag(tenantId, id, body.data);

  if (result.isFailure) {
    if (result.error?.includes('already exists')) {
      return reply.status(409).send({ error: result.error });
    }
    if (result.error?.includes('not found')) {
      return reply.status(404).send({ error: 'Tag not found' });
    }
    return reply.status(500).send({ error: result.error });
  }

  return reply.send({ data: result.value });
}

async function deleteTag(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const tenantId = request.auth?.user?.tenantId;
  if (!tenantId) {
    return reply.status(401).send({ error: 'Tenant ID required' });
  }

  const { id } = request.params;

  const userTagsService = container.resolve(UserTagsService);
  const result = await userTagsService.deleteTag(tenantId, id);

  if (result.isFailure) {
    return reply.status(500).send({ error: result.error });
  }

  return reply.status(204).send();
}

async function getTagMembers(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const tenantId = request.auth?.user?.tenantId;
  if (!tenantId) {
    return reply.status(401).send({ error: 'Tenant ID required' });
  }

  const { id } = request.params;

  const userTagsService = container.resolve(UserTagsService);
  const result = await userTagsService.getTagMembers(tenantId, id);

  if (result.isFailure) {
    return reply.status(500).send({ error: result.error });
  }

  return reply.send({
    data: result.value,
    meta: { total: result.value.length },
  });
}

async function assignMembers(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const tenantId = request.auth?.user?.tenantId;
  const userId = request.auth?.user?.id;
  if (!tenantId || !userId) {
    return reply.status(401).send({ error: 'Authentication required' });
  }

  const { id } = request.params;

  const body = assignMembersSchema.safeParse(request.body);
  if (!body.success) {
    return reply.status(400).send({ error: 'Invalid request body', details: body.error.issues });
  }

  const userTagsService = container.resolve(UserTagsService);
  const result = await userTagsService.assignMembers(tenantId, id, body.data.userIds, userId);

  if (result.isFailure) {
    return reply.status(500).send({ error: result.error });
  }

  return reply.send({
    message: 'Members assigned successfully',
    assigned: result.value.assigned,
    skipped: result.value.skipped,
  });
}

async function removeMember(
  request: FastifyRequest<{ Params: { id: string; userId: string } }>,
  reply: FastifyReply
) {
  const tenantId = request.auth?.user?.tenantId;
  if (!tenantId) {
    return reply.status(401).send({ error: 'Tenant ID required' });
  }

  const { id, userId: memberUserId } = request.params;

  const userTagsService = container.resolve(UserTagsService);
  const result = await userTagsService.removeMember(tenantId, id, memberUserId);

  if (result.isFailure) {
    return reply.status(500).send({ error: result.error });
  }

  return reply.status(204).send();
}

async function getUserTags(request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) {
  const tenantId = request.auth?.user?.tenantId;
  if (!tenantId) {
    return reply.status(401).send({ error: 'Tenant ID required' });
  }

  const { userId } = request.params;

  const userTagsService = container.resolve(UserTagsService);
  const result = await userTagsService.getUserTags(tenantId, userId);

  if (result.isFailure) {
    return reply.status(500).send({ error: result.error });
  }

  return reply.send({ data: result.value });
}

async function getMentionableTags(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = request.auth?.user?.tenantId;
  if (!tenantId) {
    return reply.status(401).send({ error: 'Tenant ID required' });
  }

  const userTagsService = container.resolve(UserTagsService);
  const result = await userTagsService.getMentionableTags(tenantId);

  if (result.isFailure) {
    return reply.status(500).send({ error: result.error });
  }

  return reply.send({ data: result.value });
}

// ============================================================================
// Route Registration
// ============================================================================

export async function userTagsRoutes(app: FastifyInstance): Promise<void> {
  // Apply authentication to all routes
  app.addHook('preHandler', authenticate);

  // Tag CRUD
  app.get('/', listTags);
  app.get('/mentionable', getMentionableTags); // For mention autocomplete
  app.get('/:id', getTagById);
  app.post('/', createTag);
  app.put('/:id', updateTag);
  app.delete('/:id', deleteTag);

  // Tag Members
  app.get('/:id/members', getTagMembers);
  app.post('/:id/members', assignMembers);
  app.delete('/:id/members/:userId', removeMember);
}

// User-centric routes (to be registered under /users)
export async function userTagsUserRoutes(app: FastifyInstance): Promise<void> {
  // Apply authentication to all routes
  app.addHook('preHandler', authenticate);

  app.get('/:userId/tags', getUserTags);
}

export default userTagsRoutes;
