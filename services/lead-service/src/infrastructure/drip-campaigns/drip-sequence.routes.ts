/**
 * Drip Sequence Routes
 *
 * REST API endpoints for drip campaign/sequence management
 */

import { FastifyPluginAsync } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { DripSequenceService } from './drip-sequence.service';

// ===========================================
// VALIDATION SCHEMAS
// ===========================================

const SequenceTypeEnum = z.enum([
  'drip', 'nurture', 'onboarding', 'reengagement', 'follow_up', 'transactional', 'event_based'
]);

const SequenceStatusEnum = z.enum([
  'draft', 'active', 'paused', 'completed', 'archived'
]);

const EnrollmentTriggerEnum = z.enum([
  'manual', 'form_submission', 'list_membership', 'tag_added', 'lead_created',
  'deal_stage', 'page_view', 'event', 'api', 'import', 'workflow'
]);

const StepTypeEnum = z.enum([
  'email', 'sms', 'task', 'notification', 'webhook', 'delay', 'condition',
  'split', 'goal', 'update_field', 'add_tag', 'remove_tag', 'add_to_list',
  'remove_from_list', 'enroll_sequence', 'unenroll'
]);

const EnrollmentStatusEnum = z.enum([
  'active', 'completed', 'paused', 'unenrolled', 'bounced', 'unsubscribed', 'goal_reached', 'failed'
]);

const SequenceSettingsSchema = z.object({
  timezone: z.string().optional(),
  businessHoursOnly: z.boolean().optional(),
  businessHoursStart: z.number().min(0).max(23).optional(),
  businessHoursEnd: z.number().min(0).max(23).optional(),
  businessDays: z.array(z.number().min(0).max(6)).optional(),
  fromName: z.string().optional(),
  fromEmail: z.string().email().optional(),
  replyTo: z.string().email().optional(),
  trackOpens: z.boolean().optional(),
  trackClicks: z.boolean().optional(),
  maxEnrollmentsPerDay: z.number().optional(),
  pauseOnReply: z.boolean().optional(),
  pauseOnClick: z.boolean().optional(),
  pauseOnBounce: z.boolean().optional(),
  pauseOnUnsubscribe: z.boolean().optional(),
  suppressionListIds: z.array(z.string().uuid()).optional(),
  excludeUnsubscribed: z.boolean().optional(),
  respectGlobalSuppressions: z.boolean().optional(),
  enableABTesting: z.boolean().optional(),
  abTestSampleSize: z.number().optional(),
  abTestDurationHours: z.number().optional(),
}).default({});

const StepContentSchema = z.object({
  subject: z.string().optional(),
  previewText: z.string().optional(),
  bodyHtml: z.string().optional(),
  bodyText: z.string().optional(),
  templateId: z.string().uuid().optional(),
  smsBody: z.string().optional(),
  mergeFields: z.array(z.object({
    tag: z.string(),
    field: z.string(),
    fallback: z.string().optional(),
  })).optional(),
  dynamicContent: z.array(z.object({
    id: z.string(),
    placeholder: z.string(),
    variants: z.array(z.any()),
    defaultContent: z.string(),
  })).optional(),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    size: z.number().optional(),
    mimeType: z.string().optional(),
  })).optional(),
});

const StepDelaySchema = z.object({
  type: z.enum(['fixed', 'until_day', 'until_date', 'until_time', 'business_hours', 'smart']),
  value: z.number(),
  unit: z.enum(['minutes', 'hours', 'days', 'weeks']),
  targetDay: z.number().min(0).max(6).optional(),
  targetHour: z.number().min(0).max(23).optional(),
  targetMinute: z.number().min(0).max(59).optional(),
  skipWeekends: z.boolean().optional(),
  skipHolidays: z.boolean().optional(),
});

const StepConditionSchema = z.object({
  logic: z.enum(['and', 'or']),
  rules: z.array(z.object({
    id: z.string(),
    field: z.string(),
    operator: z.string(),
    value: z.unknown().optional(),
    dataType: z.enum(['string', 'number', 'date', 'boolean', 'array']),
    stepId: z.string().uuid().optional(),
    withinDays: z.number().optional(),
  })),
});

const ABSplitConfigSchema = z.object({
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    weight: z.number(),
    content: StepContentSchema,
    nextStepId: z.string().uuid().optional(),
  })),
  winnerCriteria: z.enum(['opens', 'clicks', 'conversions', 'manual']),
  testDurationHours: z.number().optional(),
  autoSelectWinner: z.boolean().optional(),
  winnerId: z.string().optional(),
});

const StepActionSchema = z.object({
  fieldName: z.string().optional(),
  fieldValue: z.unknown().optional(),
  tagName: z.string().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  listId: z.string().uuid().optional(),
  taskTitle: z.string().optional(),
  taskDescription: z.string().optional(),
  taskAssigneeId: z.string().uuid().optional(),
  taskDueInDays: z.number().optional(),
  taskPriority: z.enum(['low', 'medium', 'high']).optional(),
  notificationMessage: z.string().optional(),
  notifyUserIds: z.array(z.string().uuid()).optional(),
  notifyChannel: z.enum(['email', 'push', 'sms', 'slack']).optional(),
  webhookUrl: z.string().url().optional(),
  webhookMethod: z.enum(['GET', 'POST', 'PUT']).optional(),
  webhookHeaders: z.record(z.string()).optional(),
  webhookBody: z.record(z.unknown()).optional(),
  targetSequenceId: z.string().uuid().optional(),
});

const CreateSequenceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: SequenceTypeEnum,
  enrollmentTrigger: EnrollmentTriggerEnum,
  settings: SequenceSettingsSchema,
  ownerId: z.string().uuid(),
  ownerName: z.string().optional(),
  tags: z.array(z.string()).optional(),
  folderId: z.string().uuid().optional(),
});

const UpdateSequenceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  type: SequenceTypeEnum.optional(),
  enrollmentTrigger: EnrollmentTriggerEnum.optional(),
  enrollmentConditions: z.array(z.unknown()).optional(),
  allowReenrollment: z.boolean().optional(),
  reenrollmentCooldownDays: z.number().optional(),
  exitConditions: z.array(z.unknown()).optional(),
  goalConditions: z.array(z.unknown()).optional(),
  settings: SequenceSettingsSchema.optional(),
  tags: z.array(z.string()).optional(),
  folderId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  ownerName: z.string().optional(),
});

const CreateStepSchema = z.object({
  order: z.number(),
  name: z.string().min(1).max(255),
  type: StepTypeEnum,
  content: StepContentSchema.optional(),
  delay: StepDelaySchema.optional(),
  condition: StepConditionSchema.optional(),
  abSplit: ABSplitConfigSchema.optional(),
  action: StepActionSchema.optional(),
  nextStepId: z.string().uuid().optional(),
  trueBranchStepId: z.string().uuid().optional(),
  falseBranchStepId: z.string().uuid().optional(),
});

const UpdateStepSchema = z.object({
  order: z.number().optional(),
  name: z.string().min(1).max(255).optional(),
  type: StepTypeEnum.optional(),
  content: StepContentSchema.optional(),
  delay: StepDelaySchema.optional(),
  condition: StepConditionSchema.optional(),
  abSplit: ABSplitConfigSchema.optional(),
  action: StepActionSchema.optional(),
  nextStepId: z.string().uuid().optional(),
  trueBranchStepId: z.string().uuid().optional(),
  falseBranchStepId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

const EnrollContactSchema = z.object({
  contactId: z.string().uuid(),
  contactEmail: z.string().email().optional(),
  contactName: z.string().optional(),
  enrollmentSource: EnrollmentTriggerEnum.optional().default('manual'),
  enrolledBy: z.string().uuid().optional(),
  enrollmentData: z.record(z.unknown()).optional(),
  startAtStepId: z.string().uuid().optional(),
});

const BulkEnrollSchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1),
  enrollmentData: z.record(z.unknown()).optional(),
  startAtStep: z.string().uuid().optional(),
  skipExisting: z.boolean().optional().default(true),
});

const ReorderStepsSchema = z.object({
  stepOrders: z.array(z.object({
    stepId: z.string().uuid(),
    order: z.number(),
  })),
});

const CreateFolderSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
});

// ===========================================
// ROUTES
// ===========================================

export const dripSequenceRoutes: FastifyPluginAsync = async (fastify) => {
  const service = container.resolve(DripSequenceService);

  // Helper to get tenant ID from request
  const getTenantId = (request: { headers: Record<string, string | string[] | undefined> }): string => {
    const tenantId = request.headers['x-tenant-id'];
    return typeof tenantId === 'string' ? tenantId : 'default-tenant';
  };

  const getUserId = (request: { headers: Record<string, string | string[] | undefined> }): string => {
    const userId = request.headers['x-user-id'];
    return typeof userId === 'string' ? userId : 'system';
  };

  // ===========================================
  // SEQUENCE ENDPOINTS
  // ===========================================

  // Create sequence
  fastify.post('/', async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const body = CreateSequenceSchema.parse(request.body);

    const result = await service.createSequence(tenantId, body as any, userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // List sequences
  fastify.get('/', async (request, reply) => {
    const tenantId = getTenantId(request);
    const query = request.query as {
      search?: string;
      type?: string;
      status?: string;
      tags?: string;
      folderId?: string;
      ownerId?: string;
      page?: string;
      limit?: string;
    };

    const filters = {
      search: query.search,
      type: query.type?.split(',') as any,
      status: query.status?.split(',') as any,
      tags: query.tags?.split(','),
      folderId: query.folderId,
      ownerId: query.ownerId,
    };

    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    const result = await service.listSequences(tenantId, filters, page, limit);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Get sequence
  fastify.get('/:sequenceId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { sequenceId } = request.params as { sequenceId: string };

    const result = await service.getSequence(tenantId, sequenceId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    if (!result.value) {
      return reply.status(404).send({ error: 'Sequence not found' });
    }

    // Get steps
    const stepsResult = await service.getSequenceSteps(tenantId, sequenceId);
    const sequence = result.value;
    if (stepsResult.isSuccess) {
      sequence.steps = stepsResult.value || [];
    }

    return reply.send(sequence);
  });

  // Update sequence
  fastify.patch('/:sequenceId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { sequenceId } = request.params as { sequenceId: string };
    const body = UpdateSequenceSchema.parse(request.body);

    const result = await service.updateSequence(tenantId, sequenceId, body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Delete sequence
  fastify.delete('/:sequenceId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { sequenceId } = request.params as { sequenceId: string };

    const result = await service.deleteSequence(tenantId, sequenceId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(204).send();
  });

  // Activate sequence
  fastify.post('/:sequenceId/activate', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { sequenceId } = request.params as { sequenceId: string };

    const result = await service.activateSequence(tenantId, sequenceId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Pause sequence
  fastify.post('/:sequenceId/pause', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { sequenceId } = request.params as { sequenceId: string };

    const result = await service.pauseSequence(tenantId, sequenceId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Archive sequence
  fastify.post('/:sequenceId/archive', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { sequenceId } = request.params as { sequenceId: string };

    const result = await service.archiveSequence(tenantId, sequenceId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ===========================================
  // STEP ENDPOINTS
  // ===========================================

  // Create step
  fastify.post('/:sequenceId/steps', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { sequenceId } = request.params as { sequenceId: string };
    const body = CreateStepSchema.parse(request.body);

    const result = await service.createStep(tenantId, sequenceId, body as any);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get sequence steps
  fastify.get('/:sequenceId/steps', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { sequenceId } = request.params as { sequenceId: string };

    const result = await service.getSequenceSteps(tenantId, sequenceId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Get step
  fastify.get('/:sequenceId/steps/:stepId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { stepId } = request.params as { sequenceId: string; stepId: string };

    const result = await service.getStep(tenantId, stepId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    if (!result.value) {
      return reply.status(404).send({ error: 'Step not found' });
    }

    return reply.send(result.value);
  });

  // Update step
  fastify.patch('/:sequenceId/steps/:stepId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { stepId } = request.params as { sequenceId: string; stepId: string };
    const body = UpdateStepSchema.parse(request.body);

    const result = await service.updateStep(tenantId, stepId, body as any);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Delete step
  fastify.delete('/:sequenceId/steps/:stepId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { stepId } = request.params as { sequenceId: string; stepId: string };

    const result = await service.deleteStep(tenantId, stepId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(204).send();
  });

  // Reorder steps
  fastify.post('/:sequenceId/steps/reorder', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { sequenceId } = request.params as { sequenceId: string };
    const body = ReorderStepsSchema.parse(request.body);

    const result = await service.reorderSteps(tenantId, sequenceId, body.stepOrders);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send({ success: true });
  });

  // ===========================================
  // ENROLLMENT ENDPOINTS
  // ===========================================

  // Enroll contact
  fastify.post('/:sequenceId/enrollments', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { sequenceId } = request.params as { sequenceId: string };
    const body = EnrollContactSchema.parse(request.body);

    const result = await service.enrollContact(tenantId, sequenceId, body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Bulk enroll
  fastify.post('/:sequenceId/enrollments/bulk', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { sequenceId } = request.params as { sequenceId: string };
    const body = BulkEnrollSchema.parse(request.body);

    const result = await service.bulkEnroll(tenantId, { sequenceId, ...body });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // List enrollments
  fastify.get('/:sequenceId/enrollments', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { sequenceId } = request.params as { sequenceId: string };
    const query = request.query as {
      contactId?: string;
      status?: string;
      enrolledAfter?: string;
      enrolledBefore?: string;
      page?: string;
      limit?: string;
    };

    const filters = {
      sequenceId,
      contactId: query.contactId,
      status: query.status?.split(',') as any,
      enrolledAfter: query.enrolledAfter ? new Date(query.enrolledAfter) : undefined,
      enrolledBefore: query.enrolledBefore ? new Date(query.enrolledBefore) : undefined,
    };

    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    const result = await service.listEnrollments(tenantId, filters, page, limit);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Get enrollment
  fastify.get('/:sequenceId/enrollments/:enrollmentId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { enrollmentId } = request.params as { sequenceId: string; enrollmentId: string };

    const result = await service.getEnrollment(tenantId, enrollmentId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    if (!result.value) {
      return reply.status(404).send({ error: 'Enrollment not found' });
    }

    return reply.send(result.value);
  });

  // Pause enrollment
  fastify.post('/:sequenceId/enrollments/:enrollmentId/pause', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { enrollmentId } = request.params as { sequenceId: string; enrollmentId: string };

    const result = await service.pauseEnrollment(tenantId, enrollmentId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Resume enrollment
  fastify.post('/:sequenceId/enrollments/:enrollmentId/resume', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { enrollmentId } = request.params as { sequenceId: string; enrollmentId: string };

    const result = await service.resumeEnrollment(tenantId, enrollmentId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Unenroll contact
  fastify.post('/:sequenceId/enrollments/:enrollmentId/unenroll', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { enrollmentId } = request.params as { sequenceId: string; enrollmentId: string };
    const body = request.body as { reason?: string };

    const result = await service.unenrollContact(tenantId, enrollmentId, body?.reason);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send({ success: true });
  });

  // ===========================================
  // EXECUTION ENDPOINTS
  // ===========================================

  // Get enrollment executions
  fastify.get('/:sequenceId/enrollments/:enrollmentId/executions', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { enrollmentId } = request.params as { sequenceId: string; enrollmentId: string };

    const result = await service.listStepExecutions(tenantId, enrollmentId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Record open
  fastify.post('/tracking/open/:executionId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { executionId } = request.params as { executionId: string };

    await service.recordOpen(tenantId, executionId);

    // Return a 1x1 transparent GIF for email tracking pixel
    reply.header('Content-Type', 'image/gif');
    return reply.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  });

  // Record click
  fastify.get('/tracking/click/:executionId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { executionId } = request.params as { executionId: string };
    const query = request.query as { url?: string };

    if (query.url) {
      await service.recordClick(tenantId, executionId, query.url);
      return reply.redirect(query.url);
    }

    return reply.status(400).send({ error: 'Missing redirect URL' });
  });

  // ===========================================
  // ANALYTICS ENDPOINTS
  // ===========================================

  // Get sequence analytics
  fastify.get('/:sequenceId/analytics', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { sequenceId } = request.params as { sequenceId: string };
    const query = request.query as { period?: string };

    const period = (query.period || 'all_time') as 'day' | 'week' | 'month' | 'quarter' | 'all_time';

    const result = await service.getSequenceAnalytics(tenantId, sequenceId, period);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Calculate/refresh analytics
  fastify.post('/:sequenceId/analytics/refresh', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { sequenceId } = request.params as { sequenceId: string };

    const result = await service.calculateSequenceAnalytics(tenantId, sequenceId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Get dashboard
  fastify.get('/dashboard', async (request, reply) => {
    const tenantId = getTenantId(request);

    const result = await service.getSequenceDashboard(tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ===========================================
  // FOLDER ENDPOINTS
  // ===========================================

  // Create folder
  fastify.post('/folders', async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const body = CreateFolderSchema.parse(request.body);

    const result = await service.createFolder(tenantId, body, userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // List folders
  fastify.get('/folders', async (request, reply) => {
    const tenantId = getTenantId(request);

    const result = await service.listFolders(tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Delete folder
  fastify.delete('/folders/:folderId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { folderId } = request.params as { folderId: string };

    const result = await service.deleteFolder(tenantId, folderId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(204).send();
  });
};
