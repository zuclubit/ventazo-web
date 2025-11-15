import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { ICommandBus, IQueryBus } from '@zuclubit-crm/domain';
import {
  CreateLeadCommand,
  UpdateLeadCommand,
  ChangeLeadStatusCommand,
  UpdateLeadScoreCommand,
  AssignLeadCommand,
  QualifyLeadCommand,
  ScheduleFollowUpCommand,
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
} from '../schemas/lead.schema';
import { validate } from '../middlewares/validation.middleware';
import { LeadMapper } from '../../application/dtos/lead.dto';
import { Lead } from '../../domain/aggregates/lead.aggregate';

/**
 * Lead Routes Plugin
 *
 * Fastify plugin that registers all lead-related routes following
 * the plugin architecture pattern for proper encapsulation and organization.
 *
 * All routes are CQRS-based, using CommandBus and QueryBus for proper
 * separation of concerns.
 */
export async function leadRoutes(
  server: FastifyInstance,
  options: FastifyPluginOptions
): Promise<void> {
  const commandBus = container.resolve<ICommandBus>('ICommandBus');
  const queryBus = container.resolve<IQueryBus>('IQueryBus');

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
        body: {
          type: 'object',
          required: ['tenantId', 'companyName', 'email', 'source'],
          properties: {
            tenantId: { type: 'string', format: 'uuid' },
            companyName: { type: 'string', minLength: 1, maxLength: 255 },
            contactName: { type: 'string', maxLength: 255 },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', maxLength: 50 },
            source: { type: 'string', minLength: 1, maxLength: 100 },
            industry: { type: 'string', maxLength: 100 },
            website: { type: 'string', maxLength: 255 },
            estimatedValue: { type: 'number', minimum: 0 },
            notes: { type: 'string', maxLength: 2000 },
          },
        },
        response: {
          201: {
            description: 'Lead created successfully',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              tenantId: { type: 'string', format: 'uuid' },
              companyName: { type: 'string' },
              status: { type: 'string' },
              score: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as any;

      const command = new CreateLeadCommand({
        tenantId: body.tenantId,
        companyName: body.companyName,
        contactName: body.contactName,
        email: body.email,
        phone: body.phone,
        source: body.source,
        industry: body.industry,
        website: body.website,
        estimatedValue: body.estimatedValue,
        notes: body.notes,
        createdBy: 'system', // TODO: Get from auth context
      });

      const result = await commandBus.execute<CreateLeadCommand, Lead>(command);

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      const lead = result.getValue();
      const dto = LeadMapper.toResponseDTO(lead);

      return reply.status(201).send(dto);
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
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Lead found',
            type: 'object',
          },
          404: {
            description: 'Lead not found',
            type: 'object',
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const query = new GetLeadByIdQuery(id);
      const result = await queryBus.execute<GetLeadByIdQuery, Lead>(query);

      if (result.isFailure) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: result.error,
        });
      }

      const lead = result.getValue();
      const dto = LeadMapper.toResponseDTO(lead);

      return reply.status(200).send(dto);
    }
  );

  // ==========================================================================
  // GET /leads - Find leads with filters
  // ==========================================================================
  server.get(
    '/',
    {
      preHandler: validate({ query: findLeadsQuerySchema }),
      schema: {
        description: 'Find leads with filters and pagination',
        tags: ['leads'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
            status: { type: 'string' },
            minScore: { type: 'integer', minimum: 0, maximum: 100 },
            maxScore: { type: 'integer', minimum: 0, maximum: 100 },
            source: { type: 'string' },
            industry: { type: 'string' },
            assignedTo: { type: 'string', format: 'uuid' },
            sortBy: { type: 'string', default: 'createdAt' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          },
        },
        response: {
          200: {
            description: 'Leads found',
            type: 'object',
            properties: {
              data: { type: 'array' },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                  total: { type: 'integer' },
                  totalPages: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryParams = request.query as any;

      const query = new FindLeadsQuery({
        page: queryParams.page,
        limit: queryParams.limit,
        status: queryParams.status,
        minScore: queryParams.minScore,
        maxScore: queryParams.maxScore,
        source: queryParams.source,
        industry: queryParams.industry,
        assignedTo: queryParams.assignedTo,
        sortBy: queryParams.sortBy,
        sortOrder: queryParams.sortOrder,
      });

      const result = await queryBus.execute(query);

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      const { leads, total } = result.getValue() as any;
      const data = leads.map((lead: Lead) => LeadMapper.toResponseDTO(lead));

      return reply.status(200).send({
        data,
        pagination: {
          page: queryParams.page,
          limit: queryParams.limit,
          total,
          totalPages: Math.ceil(total / queryParams.limit),
        },
      });
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
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            companyName: { type: 'string', minLength: 1, maxLength: 255 },
            contactName: { type: 'string', maxLength: 255 },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', maxLength: 50 },
            industry: { type: 'string', maxLength: 100 },
            website: { type: 'string', maxLength: 255 },
            estimatedValue: { type: 'number', minimum: 0 },
            notes: { type: 'string', maxLength: 2000 },
          },
        },
        response: {
          200: {
            description: 'Lead updated successfully',
            type: 'object',
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body as any;

      const command = new UpdateLeadCommand({
        leadId: id,
        companyName: body.companyName,
        contactName: body.contactName,
        email: body.email,
        phone: body.phone,
        industry: body.industry,
        website: body.website,
        estimatedValue: body.estimatedValue,
        notes: body.notes,
        updatedBy: 'system', // TODO: Get from auth context
      });

      const result = await commandBus.execute<UpdateLeadCommand, Lead>(command);

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      const lead = result.getValue();
      const dto = LeadMapper.toResponseDTO(lead);

      return reply.status(200).send(dto);
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
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['status', 'reason'],
          properties: {
            status: { type: 'string' },
            reason: { type: 'string', minLength: 1, maxLength: 500 },
          },
        },
        response: {
          200: {
            description: 'Status changed successfully',
            type: 'object',
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body as any;

      const command = new ChangeLeadStatusCommand({
        leadId: id,
        newStatus: body.status,
        reason: body.reason,
        changedBy: 'system', // TODO: Get from auth context
      });

      const result = await commandBus.execute<ChangeLeadStatusCommand, Lead>(command);

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      const lead = result.getValue();
      const dto = LeadMapper.toResponseDTO(lead);

      return reply.status(200).send(dto);
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
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['score', 'reason'],
          properties: {
            score: { type: 'number', minimum: 0, maximum: 100 },
            reason: { type: 'string', minLength: 1, maxLength: 500 },
          },
        },
        response: {
          200: {
            description: 'Score updated successfully',
            type: 'object',
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body as any;

      const command = new UpdateLeadScoreCommand({
        leadId: id,
        newScore: body.score,
        reason: body.reason,
        updatedBy: 'system', // TODO: Get from auth context
      });

      const result = await commandBus.execute<UpdateLeadScoreCommand, Lead>(command);

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      const lead = result.getValue();
      const dto = LeadMapper.toResponseDTO(lead);

      return reply.status(200).send(dto);
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
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['assignedTo'],
          properties: {
            assignedTo: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Lead assigned successfully',
            type: 'object',
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body as any;

      const command = new AssignLeadCommand({
        leadId: id,
        assignedTo: body.assignedTo,
        assignedBy: 'system', // TODO: Get from auth context
      });

      const result = await commandBus.execute<AssignLeadCommand, Lead>(command);

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      const lead = result.getValue();
      const dto = LeadMapper.toResponseDTO(lead);

      return reply.status(200).send(dto);
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
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['qualifiedBy'],
          properties: {
            qualifiedBy: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Lead qualified successfully',
            type: 'object',
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body as any;

      const command = new QualifyLeadCommand({
        leadId: id,
        qualifiedBy: body.qualifiedBy,
      });

      const result = await commandBus.execute<QualifyLeadCommand, Lead>(command);

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      const lead = result.getValue();
      const dto = LeadMapper.toResponseDTO(lead);

      return reply.status(200).send(dto);
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
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['scheduledAt', 'notes'],
          properties: {
            scheduledAt: { type: 'string', format: 'date-time' },
            notes: { type: 'string', minLength: 1, maxLength: 1000 },
          },
        },
        response: {
          200: {
            description: 'Follow-up scheduled successfully',
            type: 'object',
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body as any;

      const command = new ScheduleFollowUpCommand({
        leadId: id,
        scheduledAt: new Date(body.scheduledAt),
        notes: body.notes,
        scheduledBy: 'system', // TODO: Get from auth context
      });

      const result = await commandBus.execute<ScheduleFollowUpCommand, Lead>(command);

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      const lead = result.getValue();
      const dto = LeadMapper.toResponseDTO(lead);

      return reply.status(200).send(dto);
    }
  );

  // ==========================================================================
  // GET /leads/stats/overview - Get lead statistics
  // ==========================================================================
  server.get(
    '/stats/overview',
    {
      schema: {
        description: 'Get lead statistics overview',
        tags: ['leads', 'stats'],
        querystring: {
          type: 'object',
          properties: {
            tenantId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Statistics retrieved successfully',
            type: 'object',
            properties: {
              totalLeads: { type: 'integer' },
              byStatus: { type: 'object' },
              byScore: { type: 'object' },
              conversionRate: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryParams = request.query as any;

      const query = new GetLeadStatsQuery({
        tenantId: queryParams.tenantId,
      });

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
  // GET /leads/follow-ups/overdue - Get overdue follow-ups
  // ==========================================================================
  server.get(
    '/follow-ups/overdue',
    {
      schema: {
        description: 'Get leads with overdue follow-ups',
        tags: ['leads', 'follow-ups'],
        querystring: {
          type: 'object',
          properties: {
            tenantId: { type: 'string', format: 'uuid' },
            assignedTo: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Overdue follow-ups retrieved successfully',
            type: 'array',
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryParams = request.query as any;

      const query = new GetOverdueFollowUpsQuery({
        tenantId: queryParams.tenantId,
        assignedTo: queryParams.assignedTo,
      });

      const result = await queryBus.execute(query);

      if (result.isFailure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: result.error,
        });
      }

      const leads = result.getValue() as Lead[];
      const data = leads.map((lead) => LeadMapper.toResponseDTO(lead));

      return reply.status(200).send(data);
    }
  );
}
