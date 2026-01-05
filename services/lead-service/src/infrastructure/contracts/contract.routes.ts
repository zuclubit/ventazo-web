/**
 * Contract Management Routes
 *
 * REST API endpoints for:
 * - Contract CRUD operations
 * - Version control
 * - Approval workflows
 * - Signature management
 * - Renewal tracking
 * - Obligation management
 * - Templates and clauses
 * - Analytics and dashboard
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { container } from 'tsyringe';
import { ContractService } from './contract.service';
import type { ContractStatus, ContractType } from './types';

// Validation schemas
const createContractSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['master_agreement', 'service_agreement', 'subscription', 'license', 'nda', 'sow', 'amendment', 'renewal', 'other']),
  customerName: z.string().min(1).max(255),
  customerId: z.string().uuid().optional(),
  totalValue: z.number().nonnegative(),
  effectiveDate: z.string().datetime(),
  expirationDate: z.string().datetime(),
  description: z.string().optional(),
  vendorName: z.string().optional(),
  vendorId: z.string().uuid().optional(),
  currency: z.string().default('USD'),
  recurringValue: z.number().optional(),
  billingFrequency: z.enum(['monthly', 'quarterly', 'annually', 'one_time']).optional(),
  paymentTerms: z.string().optional(),
  autoRenew: z.boolean().default(false),
  renewalTermMonths: z.number().optional(),
  noticePeriodDays: z.number().optional(),
  terminationClause: z.string().optional(),
  templateId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
  parentContractId: z.string().uuid().optional(),
  ownerId: z.string().uuid(),
  ownerName: z.string().min(1).max(255),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
});

const updateContractSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  totalValue: z.number().nonnegative().optional(),
  recurringValue: z.number().optional(),
  effectiveDate: z.string().datetime().optional(),
  expirationDate: z.string().datetime().optional(),
  autoRenew: z.boolean().optional(),
  renewalTermMonths: z.number().optional(),
  noticePeriodDays: z.number().optional(),
  terminationClause: z.string().optional(),
  paymentTerms: z.string().optional(),
  billingFrequency: z.enum(['monthly', 'quarterly', 'annually', 'one_time']).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
});

const uploadVersionSchema = z.object({
  documentUrl: z.string().url(),
  documentHash: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  changes: z.string().optional(),
});

const approvalOperatorEnum = z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'contains']);

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  triggerType: z.enum(['contract_value', 'contract_type', 'manual', 'always']),
  triggerConditions: z.array(z.object({
    field: z.string(),
    operator: approvalOperatorEnum,
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  })).optional(),
  steps: z.array(z.object({
    order: z.number(),
    name: z.string(),
    type: z.enum(['single', 'parallel', 'any_of']),
    approvers: z.array(z.object({
      type: z.enum(['user', 'role', 'manager', 'dynamic']),
      userId: z.string().optional(),
      roleId: z.string().optional(),
      dynamicField: z.string().optional(),
    })),
    dueInHours: z.number(),
    escalationConfig: z.object({
      afterHours: z.number(),
      escalateTo: z.object({
        type: z.enum(['user', 'role', 'manager', 'dynamic']),
        userId: z.string().optional(),
        roleId: z.string().optional(),
        dynamicField: z.string().optional(),
      }),
      notifyOriginal: z.boolean(),
    }).optional(),
    autoApproveConditions: z.array(z.object({
      field: z.string(),
      operator: approvalOperatorEnum,
      value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
    })).optional(),
  })),
  requireAllApprovers: z.boolean().optional(),
  allowSkip: z.boolean().optional(),
});

const createSignatureRequestSchema = z.object({
  documentUrl: z.string().url(),
  signatories: z.array(z.object({
    name: z.string().min(1).max(255),
    email: z.string().email(),
    role: z.enum(['signer', 'cc', 'witness']),
    order: z.number(),
  })),
  message: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  externalProvider: z.enum(['docusign', 'adobe_sign', 'hellosign', 'pandadoc']).optional(),
});

const createRenewalSchema = z.object({
  renewalDate: z.string().datetime(),
  proposedValue: z.number().optional(),
  proposedTermMonths: z.number().optional(),
  assignedTo: z.string().uuid().optional(),
  churnRisk: z.enum(['low', 'medium', 'high']).optional(),
});

const processRenewalSchema = z.object({
  newValue: z.number().positive(),
  newTermMonths: z.number().positive(),
  newExpirationDate: z.string().datetime(),
});

const createObligationSchema = z.object({
  type: z.enum(['payment', 'delivery', 'compliance', 'reporting', 'milestone', 'other']),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  responsibleParty: z.enum(['customer', 'vendor', 'mutual']),
  dueDate: z.string().datetime(),
  assignedTo: z.string().uuid().optional(),
  recurringPattern: z.string().optional(),
  reminderDays: z.array(z.number()).optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(['master_agreement', 'service_agreement', 'subscription', 'license', 'nda', 'sow', 'amendment', 'renewal', 'other']),
  category: z.string().optional(),
  documentUrl: z.string().url(),
  placeholders: z.array(z.object({
    key: z.string(),
    label: z.string(),
    type: z.enum(['text', 'date', 'number', 'currency', 'select', 'signature']),
    required: z.boolean(),
    defaultValue: z.string().optional(),
    options: z.array(z.string()).optional(),
    validation: z.string().optional(),
  })).optional(),
  requiresApproval: z.boolean().optional(),
  approvalWorkflowId: z.string().uuid().optional(),
  defaultTermMonths: z.number().optional(),
  defaultAutoRenew: z.boolean().optional(),
});

const createClauseSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  content: z.string().min(1),
  isStandard: z.boolean().optional(),
  requiresReview: z.boolean().optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
});

export const contractRoutes: FastifyPluginAsync = async (fastify) => {
  const service = container.resolve(ContractService);

  // ============================================================================
  // CONTRACT CRUD
  // ============================================================================

  // Create contract
  fastify.post<{
    Body: z.infer<typeof createContractSchema>;
  }>('/', {
    schema: {
      description: 'Create a new contract',
      tags: ['Contracts'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = createContractSchema.parse(request.body);

    const result = await service.createContract(tenantId, userId || 'system', {
      ...body,
      effectiveDate: new Date(body.effectiveDate),
      expirationDate: new Date(body.expirationDate),
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get contract by ID
  fastify.get<{
    Params: { contractId: string };
  }>('/:contractId', {
    schema: {
      description: 'Get contract by ID',
      tags: ['Contracts'],
      params: {
        type: 'object',
        properties: {
          contractId: { type: 'string', format: 'uuid' },
        },
        required: ['contractId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getContract(request.params.contractId, tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    if (!result.value) {
      return reply.status(404).send({ error: 'Contract not found' });
    }

    return reply.status(200).send(result.value);
  });

  // Update contract
  fastify.patch<{
    Params: { contractId: string };
    Body: z.infer<typeof updateContractSchema>;
  }>('/:contractId', {
    schema: {
      description: 'Update contract',
      tags: ['Contracts'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    const userName = request.headers['x-user-name'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = updateContractSchema.parse(request.body);

    const updates: Record<string, unknown> = { ...body };
    if (body.effectiveDate) {
      updates.effectiveDate = new Date(body.effectiveDate);
    }
    if (body.expirationDate) {
      updates.expirationDate = new Date(body.expirationDate);
    }

    const result = await service.updateContract(
      request.params.contractId,
      tenantId,
      userId || 'system',
      userName || 'System',
      updates as Parameters<typeof service.updateContract>[4]
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Change contract status
  fastify.patch<{
    Params: { contractId: string };
    Body: { status: ContractStatus };
  }>('/:contractId/status', {
    schema: {
      description: 'Change contract status',
      tags: ['Contracts'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    const userName = request.headers['x-user-name'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.changeStatus(
      request.params.contractId,
      tenantId,
      request.body.status,
      userId || 'system',
      userName || 'System'
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Search contracts
  fastify.get<{
    Querystring: {
      status?: ContractStatus[];
      type?: ContractType[];
      customerId?: string;
      ownerId?: string;
      expiringBefore?: string;
      expiringAfter?: string;
      minValue?: number;
      maxValue?: number;
      tags?: string[];
      search?: string;
      limit?: number;
      offset?: number;
    };
  }>('/', {
    schema: {
      description: 'Search contracts with filters',
      tags: ['Contracts'],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'array', items: { type: 'string' } },
          type: { type: 'array', items: { type: 'string' } },
          customerId: { type: 'string', format: 'uuid' },
          ownerId: { type: 'string', format: 'uuid' },
          expiringBefore: { type: 'string', format: 'date-time' },
          expiringAfter: { type: 'string', format: 'date-time' },
          minValue: { type: 'number' },
          maxValue: { type: 'number' },
          tags: { type: 'array', items: { type: 'string' } },
          search: { type: 'string' },
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

    const { limit, offset, ...filters } = request.query;

    const result = await service.searchContracts(
      tenantId,
      {
        ...filters,
        expiringBefore: filters.expiringBefore ? new Date(filters.expiringBefore) : undefined,
        expiringAfter: filters.expiringAfter ? new Date(filters.expiringAfter) : undefined,
      },
      { limit, offset }
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // VERSION CONTROL
  // ============================================================================

  // Upload new version
  fastify.post<{
    Params: { contractId: string };
    Body: z.infer<typeof uploadVersionSchema>;
  }>('/:contractId/versions', {
    schema: {
      description: 'Upload new contract version',
      tags: ['Contracts'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = uploadVersionSchema.parse(request.body);

    const result = await service.uploadVersion(
      request.params.contractId,
      tenantId,
      userId || 'system',
      body
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get version history
  fastify.get<{
    Params: { contractId: string };
  }>('/:contractId/versions', {
    schema: {
      description: 'Get contract version history',
      tags: ['Contracts'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getVersionHistory(request.params.contractId, tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // APPROVAL WORKFLOWS
  // ============================================================================

  // Create workflow
  fastify.post<{
    Body: z.infer<typeof createWorkflowSchema>;
  }>('/approval-workflows', {
    schema: {
      description: 'Create approval workflow',
      tags: ['Contracts'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = createWorkflowSchema.parse(request.body);

    const result = await service.createApprovalWorkflow(tenantId, body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Submit for approval
  fastify.post<{
    Params: { contractId: string };
    Body: { workflowId: string };
  }>('/:contractId/submit-approval', {
    schema: {
      description: 'Submit contract for approval',
      tags: ['Contracts'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.submitForApproval(
      request.params.contractId,
      tenantId,
      request.body.workflowId,
      userId || 'system'
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Process approval decision
  fastify.post<{
    Params: { approvalId: string };
    Body: { decision: 'approved' | 'rejected'; comments?: string };
  }>('/approvals/:approvalId/decision', {
    schema: {
      description: 'Process approval decision',
      tags: ['Contracts'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    const userName = request.headers['x-user-name'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.processApprovalDecision(
      request.params.approvalId,
      tenantId,
      userId || 'system',
      userName || 'System',
      request.body.decision,
      request.body.comments
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // SIGNATURE MANAGEMENT
  // ============================================================================

  // Create signature request
  fastify.post<{
    Params: { contractId: string };
    Body: z.infer<typeof createSignatureRequestSchema>;
  }>('/:contractId/signature-requests', {
    schema: {
      description: 'Create signature request',
      tags: ['Contracts'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = createSignatureRequestSchema.parse(request.body);

    const result = await service.createSignatureRequest(
      request.params.contractId,
      tenantId,
      userId || 'system',
      {
        ...body,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      }
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Send signature request
  fastify.post<{
    Params: { requestId: string };
  }>('/signature-requests/:requestId/send', {
    schema: {
      description: 'Send signature request',
      tags: ['Contracts'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.sendSignatureRequest(
      request.params.requestId,
      tenantId,
      userId || 'system'
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Record signature (webhook endpoint)
  fastify.post<{
    Params: { requestId: string };
    Body: { signatoryId: string; ipAddress?: string };
  }>('/signature-requests/:requestId/sign', {
    schema: {
      description: 'Record signature (webhook from e-sign provider)',
      tags: ['Contracts'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.recordSignature(
      request.params.requestId,
      tenantId,
      request.body.signatoryId,
      request.body.ipAddress
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // RENEWALS
  // ============================================================================

  // Create renewal
  fastify.post<{
    Params: { contractId: string };
    Body: z.infer<typeof createRenewalSchema>;
  }>('/:contractId/renewals', {
    schema: {
      description: 'Create renewal record',
      tags: ['Contracts'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = createRenewalSchema.parse(request.body);

    const result = await service.createRenewal(
      request.params.contractId,
      tenantId,
      {
        ...body,
        renewalDate: new Date(body.renewalDate),
      }
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get upcoming renewals
  fastify.get<{
    Querystring: { daysAhead?: number };
  }>('/renewals/upcoming', {
    schema: {
      description: 'Get upcoming contract renewals',
      tags: ['Contracts'],
      querystring: {
        type: 'object',
        properties: {
          daysAhead: { type: 'number', default: 90 },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getUpcomingRenewals(tenantId, request.query.daysAhead);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Process renewal
  fastify.post<{
    Params: { renewalId: string };
    Body: z.infer<typeof processRenewalSchema>;
  }>('/renewals/:renewalId/process', {
    schema: {
      description: 'Process renewal (create new contract)',
      tags: ['Contracts'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = processRenewalSchema.parse(request.body);

    const result = await service.processRenewal(
      request.params.renewalId,
      tenantId,
      userId || 'system',
      {
        ...body,
        newExpirationDate: new Date(body.newExpirationDate),
      }
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // OBLIGATIONS
  // ============================================================================

  // Create obligation
  fastify.post<{
    Params: { contractId: string };
    Body: z.infer<typeof createObligationSchema>;
  }>('/:contractId/obligations', {
    schema: {
      description: 'Create contract obligation',
      tags: ['Contracts'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = createObligationSchema.parse(request.body);

    const result = await service.createObligation(
      request.params.contractId,
      tenantId,
      {
        ...body,
        dueDate: new Date(body.dueDate),
      }
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get overdue obligations
  fastify.get('/obligations/overdue', {
    schema: {
      description: 'Get overdue obligations',
      tags: ['Contracts'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getOverdueObligations(tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Complete obligation
  fastify.post<{
    Params: { obligationId: string };
  }>('/obligations/:obligationId/complete', {
    schema: {
      description: 'Mark obligation as completed',
      tags: ['Contracts'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.completeObligation(
      request.params.obligationId,
      tenantId,
      userId || 'system'
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  // Create template
  fastify.post<{
    Body: z.infer<typeof createTemplateSchema>;
  }>('/templates', {
    schema: {
      description: 'Create contract template',
      tags: ['Contracts'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = createTemplateSchema.parse(request.body);

    const result = await service.createTemplate(tenantId, userId || 'system', body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get templates
  fastify.get<{
    Querystring: { type?: ContractType };
  }>('/templates', {
    schema: {
      description: 'Get contract templates',
      tags: ['Contracts'],
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['master_agreement', 'service_agreement', 'subscription', 'license', 'nda', 'sow', 'amendment', 'renewal', 'other'] },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getTemplates(tenantId, request.query.type);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // CLAUSES
  // ============================================================================

  // Create clause
  fastify.post<{
    Body: z.infer<typeof createClauseSchema>;
  }>('/clauses', {
    schema: {
      description: 'Create contract clause',
      tags: ['Contracts'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const body = createClauseSchema.parse(request.body);

    const result = await service.createClause(tenantId, userId || 'system', body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get clauses
  fastify.get<{
    Querystring: { category?: string };
  }>('/clauses', {
    schema: {
      description: 'Get contract clauses',
      tags: ['Contracts'],
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getClauses(tenantId, request.query.category);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // ============================================================================
  // ANALYTICS & DASHBOARD
  // ============================================================================

  // Get analytics
  fastify.get<{
    Querystring: {
      period: 'month' | 'quarter' | 'year';
      startDate: string;
      endDate: string;
    };
  }>('/analytics', {
    schema: {
      description: 'Get contract analytics',
      tags: ['Contracts'],
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['month', 'quarter', 'year'] },
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

    const result = await service.getAnalytics(
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

  // Get dashboard
  fastify.get('/dashboard', {
    schema: {
      description: 'Get contract dashboard',
      tags: ['Contracts'],
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getDashboard(tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });

  // Get contract events
  fastify.get<{
    Params: { contractId: string };
    Querystring: { limit?: number };
  }>('/:contractId/events', {
    schema: {
      description: 'Get contract activity log',
      tags: ['Contracts'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const result = await service.getEvents(
      request.params.contractId,
      tenantId,
      request.query.limit
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send(result.value);
  });
};
