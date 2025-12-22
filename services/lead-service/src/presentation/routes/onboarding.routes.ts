/**
 * Onboarding Routes
 * API endpoints for onboarding flow and audit logging
 */

import { FastifyPluginAsync } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { toJsonSchema } from '../../utils/zod-schema';
import {
  OnboardingService,
  OnboardingStatus,
} from '../../infrastructure/auth';
import {
  authenticate,
  optionalAuthenticate,
  getAuthUser,
} from '../middlewares/auth.middleware';

// Validation schemas
const onboardingStatusSchema = z.enum([
  'not_started',
  'profile_created',
  'business_created',
  'setup_completed',
  'team_invited',
  'completed',
]);

const onboardingStepSchema = z.enum([
  'signup',
  'create-business',
  'branding',
  'modules',
  'business-hours',
  'invite-team',
  'complete',
]);

const updateOnboardingProgressSchema = z.object({
  status: onboardingStatusSchema,
  currentStep: z.number().min(0).max(10),
  completedSteps: z.array(z.string()),
});

const completeStepSchema = z.object({
  step: onboardingStepSchema,
});

const logAuditEventSchema = z.object({
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  newValues: z.record(z.unknown()),
  metadata: z.record(z.unknown()).optional(),
});

const getAuditLogsQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  limit: z.string().transform(Number).default('50'),
  offset: z.string().transform(Number).default('0'),
});

/**
 * Onboarding routes plugin
 */
export const onboardingRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get current onboarding status
   * GET /api/v1/onboarding/status
   */
  fastify.get('/status', {
    preHandler: [authenticate],
    schema: {
      tags: ['Onboarding'],
      summary: 'Get onboarding status',
      description: 'Returns the current onboarding progress for the authenticated user',
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            status: { type: 'string' },
            currentStep: { type: 'number' },
            completedSteps: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object' },
            startedAt: { type: 'string', nullable: true },
            completedAt: { type: 'string', nullable: true },
          },
        },
      },
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const onboardingService = container.resolve(OnboardingService);

    const result = await onboardingService.getOnboardingStatus(user.id);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    // If no onboarding record exists, initialize one
    if (!result.value) {
      const initResult = await onboardingService.initializeOnboarding(user.id);
      if (initResult.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: initResult.error,
        });
      }
      return initResult.value;
    }

    return result.value;
  });

  /**
   * Update onboarding progress
   * PUT /api/v1/onboarding/progress
   */
  fastify.put('/progress', {
    preHandler: [authenticate],
    schema: {
      tags: ['Onboarding'],
      summary: 'Update onboarding progress',
      description: 'Updates the onboarding status and completed steps',
      body: toJsonSchema(updateOnboardingProgressSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const body = updateOnboardingProgressSchema.parse(request.body);
    const onboardingService = container.resolve(OnboardingService);

    const result = await onboardingService.updateOnboardingProgress(
      user.id,
      body.status as OnboardingStatus,
      body.currentStep,
      body.completedSteps
    );

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
   * Complete a specific step
   * POST /api/v1/onboarding/complete-step
   */
  fastify.post('/complete-step', {
    preHandler: [authenticate],
    schema: {
      tags: ['Onboarding'],
      summary: 'Complete onboarding step',
      description: 'Marks a specific onboarding step as completed',
      body: toJsonSchema(completeStepSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const body = completeStepSchema.parse(request.body);
    const onboardingService = container.resolve(OnboardingService);

    const result = await onboardingService.completeStep(user.id, body.step);

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
   * Complete onboarding
   * POST /api/v1/onboarding/complete
   */
  fastify.post('/complete', {
    preHandler: [authenticate],
    schema: {
      tags: ['Onboarding'],
      summary: 'Complete onboarding',
      description: 'Marks the entire onboarding process as completed',
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const onboardingService = container.resolve(OnboardingService);

    const result = await onboardingService.completeOnboarding(user.id, user.tenantId);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return {
      message: 'Onboarding completed successfully',
      onboarding: result.value,
    };
  });

  /**
   * Initialize onboarding for new user
   * POST /api/v1/onboarding/initialize
   */
  fastify.post('/initialize', {
    preHandler: [authenticate],
    schema: {
      tags: ['Onboarding'],
      summary: 'Initialize onboarding',
      description: 'Initializes onboarding tracking for a new user',
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const onboardingService = container.resolve(OnboardingService);

    const result = await onboardingService.initializeOnboarding(user.id);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return reply.status(201).send(result.value);
  });
};

/**
 * Audit log routes plugin
 */
export const auditLogRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Log an audit event
   * POST /api/v1/audit/log
   */
  fastify.post('/log', {
    preHandler: [authenticate],
    schema: {
      tags: ['Audit'],
      summary: 'Log audit event',
      description: 'Logs an audit event for tracking user actions',
      body: toJsonSchema(logAuditEventSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const body = logAuditEventSchema.parse(request.body);
    const onboardingService = container.resolve(OnboardingService);

    const result = await onboardingService.logAuditEvent(
      user.tenantId || null,
      user.id,
      body.action,
      body.entityType,
      body.entityId,
      body.newValues,
      body.metadata,
      request.ip,
      request.headers['user-agent']
    );

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
   * Get audit logs for tenant
   * GET /api/v1/audit/logs
   */
  fastify.get('/logs', {
    preHandler: [authenticate],
    schema: {
      tags: ['Audit'],
      summary: 'Get audit logs',
      description: 'Returns audit logs for the current tenant',
      querystring: toJsonSchema(getAuditLogsQuerySchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const query = getAuditLogsQuerySchema.parse(request.query);
    const onboardingService = container.resolve(OnboardingService);

    const result = await onboardingService.getAuditLogs({
      tenantId: user.tenantId,
      userId: query.userId,
      action: query.action,
      entityType: query.entityType,
      limit: query.limit,
      offset: query.offset,
    });

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
   * Get audit logs for current user
   * GET /api/v1/audit/my-logs
   */
  fastify.get('/my-logs', {
    preHandler: [authenticate],
    schema: {
      tags: ['Audit'],
      summary: 'Get my audit logs',
      description: 'Returns audit logs for the authenticated user',
      querystring: toJsonSchema(z.object({
        action: z.string().optional(),
        entityType: z.string().optional(),
        limit: z.string().transform(Number).default('50'),
        offset: z.string().transform(Number).default('0'),
      })),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const query = request.query as {
      action?: string;
      entityType?: string;
      limit: number;
      offset: number;
    };
    const onboardingService = container.resolve(OnboardingService);

    const result = await onboardingService.getAuditLogs({
      userId: user.id,
      action: query.action,
      entityType: query.entityType,
      limit: query.limit,
      offset: query.offset,
    });

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });
};
