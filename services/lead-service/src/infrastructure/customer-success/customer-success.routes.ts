/**
 * Customer Success Routes
 *
 * REST API endpoints for:
 * - Health score management
 * - Risk factor tracking
 * - Expansion opportunities
 * - Success playbooks
 * - Customer tasks
 * - Touchpoint recording
 * - Dashboard and analytics
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { container } from 'tsyringe';
import { CustomerSuccessService } from './customer-success.service';
import type { HealthStatus, RiskLevel, LifecycleStage } from './types';

// Validation schemas
const calculateHealthScoreSchema = z.object({
  productUsage: z.object({
    dailyActiveUsers: z.number().optional(),
    monthlyActiveUsers: z.number().optional(),
    licenseUtilization: z.number().min(0).max(100).optional(),
    featureAdoptionRate: z.number().min(0).max(100).optional(),
    coreFeatureUsage: z.number().optional(),
    loginFrequency: z.number().optional(),
    sessionDuration: z.number().optional(),
    apiCallVolume: z.number().optional(),
    dataVolumeGrowth: z.number().optional(),
    integrationCount: z.number().optional(),
    lastActivityDate: z.string().datetime().optional(),
  }).optional(),
  engagement: z.object({
    npsScore: z.number().min(-100).max(100).nullable().optional(),
    csatScore: z.number().min(0).max(100).nullable().optional(),
    surveyResponseRate: z.number().optional(),
    emailOpenRate: z.number().optional(),
    meetingAttendance: z.number().optional(),
    trainingCompletion: z.number().optional(),
    communityParticipation: z.number().optional(),
    eventAttendance: z.number().optional(),
    feedbackSubmissions: z.number().optional(),
    executiveSponsorEngagement: z.boolean().optional(),
  }).optional(),
  support: z.object({
    totalTickets: z.number().optional(),
    openTickets: z.number().optional(),
    escalatedTickets: z.number().optional(),
    avgResolutionTime: z.number().optional(),
    firstResponseTime: z.number().optional(),
    ticketSentiment: z.number().optional(),
    repeatIssues: z.number().optional(),
    criticalIssues: z.number().optional(),
    supportSatisfaction: z.number().optional(),
    documentationUsage: z.number().optional(),
  }).optional(),
  financial: z.object({
    currentMrr: z.number().optional(),
    contractValue: z.number().optional(),
    paymentHistory: z.number().optional(),
    daysToRenewal: z.number().optional(),
    expansionRevenue: z.number().optional(),
    contractionRisk: z.number().optional(),
    lifetimeValue: z.number().optional(),
    billingIssues: z.number().optional(),
    discountLevel: z.number().optional(),
    priceIncreaseAcceptance: z.boolean().optional(),
  }).optional(),
  relationship: z.object({
    executiveSponsorLevel: z.string().optional(),
    championCount: z.number().optional(),
    decisionMakerEngagement: z.number().optional(),
    stakeholderCoverage: z.number().optional(),
    lastExecutiveMeeting: z.string().datetime().nullable().optional(),
    communicationFrequency: z.number().optional(),
    relationshipAge: z.number().optional(),
    referralsMade: z.number().optional(),
    caseStudyParticipant: z.boolean().optional(),
    advisoryBoardMember: z.boolean().optional(),
  }).optional(),
});

const createPlaybookSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  triggerType: z.enum(['health_score', 'risk_factor', 'lifecycle', 'manual', 'scheduled']),
  triggerConditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in']),
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  })),
  steps: z.array(z.object({
    order: z.number(),
    type: z.enum(['task', 'email', 'notification', 'meeting', 'survey', 'escalation']),
    name: z.string(),
    description: z.string(),
    assigneeRole: z.string(),
    delayDays: z.number(),
    templateId: z.string().optional(),
    isRequired: z.boolean(),
  })),
  targetLifecycleStages: z.array(z.enum(['onboarding', 'adoption', 'growth', 'maturity', 'renewal'])).optional(),
  targetHealthStatuses: z.array(z.enum(['healthy', 'at_risk', 'critical'])).optional(),
  priority: z.number().optional(),
});

const createExpansionSchema = z.object({
  type: z.enum(['upsell', 'cross_sell', 'upgrade', 'seats', 'add_on']),
  product: z.string().min(1).max(255),
  estimatedValue: z.number().positive(),
  confidence: z.number().min(0).max(100),
  signals: z.array(z.string()),
  reasoning: z.string().optional(),
  suggestedApproach: z.string().optional(),
});

const createTaskSchema = z.object({
  type: z.enum(['check_in', 'qbr', 'onboarding', 'training', 'renewal', 'escalation', 'custom']),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  dueDate: z.string().datetime().optional(),
  assignedTo: z.string().uuid().optional(),
  playbookExecutionId: z.string().uuid().optional(),
});

const recordTouchpointSchema = z.object({
  type: z.enum(['call', 'meeting', 'email', 'chat', 'support', 'event', 'qbr']),
  subject: z.string().min(1).max(255),
  summary: z.string().optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  participants: z.array(z.string()).optional(),
  duration: z.number().optional(),
  nextSteps: z.array(z.string()).optional(),
  recordedBy: z.string().uuid().optional(),
  occurredAt: z.string().datetime(),
});

const updateWeightsSchema = z.object({
  productUsage: z.number().min(0).max(100),
  engagement: z.number().min(0).max(100),
  support: z.number().min(0).max(100),
  financial: z.number().min(0).max(100),
  relationship: z.number().min(0).max(100),
});

const setThresholdSchema = z.object({
  name: z.string().min(1).max(100),
  metric: z.string().min(1).max(100),
  healthyMin: z.number(),
  atRiskMin: z.number(),
  criticalMax: z.number(),
  weight: z.number().optional(),
  lifecycleStage: z.enum(['onboarding', 'adoption', 'growth', 'maturity', 'renewal']).optional(),
});

export const customerSuccessRoutes: FastifyPluginAsync = async (fastify) => {
  const service = container.resolve(CustomerSuccessService);

  // ============================================================================
  // HEALTH SCORES
  // ============================================================================

  // Calculate/update health score for a customer
  fastify.post<{
    Params: { customerId: string };
    Body: z.infer<typeof calculateHealthScoreSchema>;
  }>('/customers/:customerId/health-score', {
    schema: {
      description: 'Calculate and update health score for a customer',
      tags: ['Customer Success'],
      params: {
        type: 'object',
        properties: {
          customerId: { type: 'string', format: 'uuid' },
        },
        required: ['customerId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = calculateHealthScoreSchema.parse(request.body);

    // Transform date strings to Date objects
    const metrics = {
      productUsage: body.productUsage ? {
        ...body.productUsage,
        lastActivityDate: body.productUsage.lastActivityDate
          ? new Date(body.productUsage.lastActivityDate)
          : undefined,
      } : undefined,
      engagement: body.engagement,
      support: body.support,
      financial: body.financial,
      relationship: body.relationship ? {
        ...body.relationship,
        lastExecutiveMeeting: body.relationship.lastExecutiveMeeting !== undefined
          ? (body.relationship.lastExecutiveMeeting ? new Date(body.relationship.lastExecutiveMeeting) : null)
          : undefined,
      } : undefined,
    };

    const result = await service.calculateHealthScore(
      request.params.customerId,
      tenantId,
      metrics as Parameters<typeof service.calculateHealthScore>[2]
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Get health score for a customer
  fastify.get<{
    Params: { customerId: string };
  }>('/customers/:customerId/health-score', {
    schema: {
      description: 'Get health score for a customer',
      tags: ['Customer Success'],
      params: {
        type: 'object',
        properties: {
          customerId: { type: 'string', format: 'uuid' },
        },
        required: ['customerId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getHealthScore(request.params.customerId, tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    if (!result.value) {
      return reply.status(404).send({ error: 'Health score not found' });
    }

    return reply.status(200).send(result.value);
  });

  // Get all health scores
  fastify.get<{
    Querystring: {
      healthStatus?: HealthStatus;
      riskLevel?: RiskLevel;
      lifecycleStage?: LifecycleStage;
      minScore?: number;
      maxScore?: number;
      limit?: number;
      offset?: number;
    };
  }>('/health-scores', {
    schema: {
      description: 'Get all health scores with filters',
      tags: ['Customer Success'],
      querystring: {
        type: 'object',
        properties: {
          healthStatus: { type: 'string', enum: ['healthy', 'at_risk', 'critical'] },
          riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          lifecycleStage: { type: 'string', enum: ['onboarding', 'adoption', 'growth', 'maturity', 'renewal'] },
          minScore: { type: 'number' },
          maxScore: { type: 'number' },
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

    const { healthStatus, riskLevel, lifecycleStage, minScore, maxScore, limit, offset } = request.query;

    const result = await service.getAllHealthScores(
      tenantId,
      { healthStatus, riskLevel, lifecycleStage, minScore, maxScore },
      { limit, offset }
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Get health score history
  fastify.get<{
    Params: { customerId: string };
    Querystring: { startDate: string; endDate: string };
  }>('/customers/:customerId/health-score/history', {
    schema: {
      description: 'Get health score history for trend analysis',
      tags: ['Customer Success'],
      params: {
        type: 'object',
        properties: {
          customerId: { type: 'string', format: 'uuid' },
        },
        required: ['customerId'],
      },
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
        },
        required: ['startDate', 'endDate'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getHealthScoreHistory(
      request.params.customerId,
      tenantId,
      new Date(request.query.startDate),
      new Date(request.query.endDate)
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // RISK FACTORS
  // ============================================================================

  // Get risk factors for a customer
  fastify.get<{
    Params: { customerId: string };
  }>('/customers/:customerId/risk-factors', {
    schema: {
      description: 'Get active risk factors for a customer',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getRiskFactors(request.params.customerId, tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Get all risk factors for tenant
  fastify.get<{
    Querystring: {
      severity?: RiskLevel;
      category?: string;
      activeOnly?: boolean;
    };
  }>('/risk-factors', {
    schema: {
      description: 'Get all risk factors for tenant',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getAllRiskFactors(tenantId, request.query);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Resolve risk factor
  fastify.post<{
    Params: { riskId: string };
  }>('/risk-factors/:riskId/resolve', {
    schema: {
      description: 'Mark a risk factor as resolved',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.resolveRiskFactor(request.params.riskId, tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // EXPANSION OPPORTUNITIES
  // ============================================================================

  // Get expansion opportunities for a customer
  fastify.get<{
    Params: { customerId: string };
  }>('/customers/:customerId/expansion-opportunities', {
    schema: {
      description: 'Get expansion opportunities for a customer',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getExpansionOpportunities(request.params.customerId, tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Create expansion opportunity
  fastify.post<{
    Params: { customerId: string };
    Body: z.infer<typeof createExpansionSchema>;
  }>('/customers/:customerId/expansion-opportunities', {
    schema: {
      description: 'Create expansion opportunity for a customer',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = createExpansionSchema.parse(request.body);

    const result = await service.createExpansionOpportunity({
      customerId: request.params.customerId,
      tenantId,
      ...body,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Update expansion opportunity status
  fastify.patch<{
    Params: { opportunityId: string };
    Body: { status: 'identified' | 'qualified' | 'pursuing' | 'won' | 'lost' };
  }>('/expansion-opportunities/:opportunityId/status', {
    schema: {
      description: 'Update expansion opportunity status',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.updateExpansionOpportunityStatus(
      request.params.opportunityId,
      tenantId,
      request.body.status
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // PLAYBOOKS
  // ============================================================================

  // Get playbooks
  fastify.get<{
    Querystring: { activeOnly?: boolean };
  }>('/playbooks', {
    schema: {
      description: 'Get success playbooks',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getPlaybooks(tenantId, request.query.activeOnly !== false);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Create playbook
  fastify.post<{
    Body: z.infer<typeof createPlaybookSchema>;
  }>('/playbooks', {
    schema: {
      description: 'Create success playbook',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = createPlaybookSchema.parse(request.body);

    const result = await service.createPlaybook({
      tenantId,
      ...body,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Start playbook execution
  fastify.post<{
    Params: { playbookId: string };
    Body: { customerId: string; assignedTo?: string };
  }>('/playbooks/:playbookId/execute', {
    schema: {
      description: 'Start playbook execution for a customer',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.startPlaybookExecution(
      request.params.playbookId,
      request.body.customerId,
      tenantId,
      userId,
      request.body.assignedTo
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get playbook executions for customer
  fastify.get<{
    Params: { customerId: string };
    Querystring: { status?: 'active' | 'completed' | 'paused' | 'cancelled' };
  }>('/customers/:customerId/playbook-executions', {
    schema: {
      description: 'Get playbook executions for a customer',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getPlaybookExecutions(
      request.params.customerId,
      tenantId,
      request.query.status
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Complete playbook step
  fastify.post<{
    Params: { executionId: string };
    Body: { stepOrder: number; outcome?: string; notes?: string };
  }>('/playbook-executions/:executionId/complete-step', {
    schema: {
      description: 'Complete a step in playbook execution',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.completePlaybookStep(
      request.params.executionId,
      tenantId,
      request.body.stepOrder,
      userId || 'system',
      request.body.outcome,
      request.body.notes
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // TASKS
  // ============================================================================

  // Get tasks
  fastify.get<{
    Querystring: {
      customerId?: string;
      assignedTo?: string;
      status?: string;
      type?: string;
      dueBefore?: string;
    };
  }>('/tasks', {
    schema: {
      description: 'Get success tasks',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const { customerId, assignedTo, status, type, dueBefore } = request.query;

    const result = await service.getTasks(tenantId, {
      customerId,
      assignedTo,
      status,
      type,
      dueBefore: dueBefore ? new Date(dueBefore) : undefined,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Create task
  fastify.post<{
    Params: { customerId: string };
    Body: z.infer<typeof createTaskSchema>;
  }>('/customers/:customerId/tasks', {
    schema: {
      description: 'Create success task for a customer',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = createTaskSchema.parse(request.body);

    const result = await service.createTask({
      customerId: request.params.customerId,
      tenantId,
      ...body,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      priority: body.priority as RiskLevel | undefined,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Update task status
  fastify.patch<{
    Params: { taskId: string };
    Body: { status: 'pending' | 'in_progress' | 'completed' | 'cancelled'; outcome?: string };
  }>('/tasks/:taskId/status', {
    schema: {
      description: 'Update task status',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.updateTaskStatus(
      request.params.taskId,
      tenantId,
      request.body.status,
      request.body.outcome
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // TOUCHPOINTS
  // ============================================================================

  // Record touchpoint
  fastify.post<{
    Params: { customerId: string };
    Body: z.infer<typeof recordTouchpointSchema>;
  }>('/customers/:customerId/touchpoints', {
    schema: {
      description: 'Record customer touchpoint',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = recordTouchpointSchema.parse(request.body);

    const result = await service.recordTouchpoint({
      customerId: request.params.customerId,
      tenantId,
      ...body,
      occurredAt: new Date(body.occurredAt),
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get touchpoints
  fastify.get<{
    Params: { customerId: string };
    Querystring: { startDate?: string; endDate?: string };
  }>('/customers/:customerId/touchpoints', {
    schema: {
      description: 'Get touchpoints for a customer',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const { startDate, endDate } = request.query;

    const result = await service.getTouchpoints(
      request.params.customerId,
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // DASHBOARD & ANALYTICS
  // ============================================================================

  // Get health dashboard
  fastify.get('/dashboard', {
    schema: {
      description: 'Get customer success dashboard',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getHealthDashboard(tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Get success metrics
  fastify.get<{
    Querystring: {
      period: 'day' | 'week' | 'month' | 'quarter' | 'year';
      startDate: string;
      endDate: string;
    };
  }>('/metrics', {
    schema: {
      description: 'Get customer success metrics',
      tags: ['Customer Success'],
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['day', 'week', 'month', 'quarter', 'year'] },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
        },
        required: ['period', 'startDate', 'endDate'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const { period, startDate, endDate } = request.query;

    const result = await service.getSuccessMetrics(
      tenantId,
      period,
      new Date(startDate),
      new Date(endDate)
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  // Get health score weights
  fastify.get('/config/weights', {
    schema: {
      description: 'Get health score weights configuration',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const weights = await service.getHealthScoreWeights(tenantId);
    return reply.status(200).send(weights);
  });

  // Update health score weights
  fastify.put<{
    Body: z.infer<typeof updateWeightsSchema>;
  }>('/config/weights', {
    schema: {
      description: 'Update health score weights',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = updateWeightsSchema.parse(request.body);

    const result = await service.updateHealthScoreWeights(tenantId, body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Set health threshold
  fastify.post<{
    Body: z.infer<typeof setThresholdSchema>;
  }>('/config/thresholds', {
    schema: {
      description: 'Configure health threshold',
      tags: ['Customer Success'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = setThresholdSchema.parse(request.body);

    const result = await service.setHealthThreshold({
      tenantId,
      ...body,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });
};
