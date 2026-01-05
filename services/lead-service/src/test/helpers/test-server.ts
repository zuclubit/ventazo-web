import 'reflect-metadata';
import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { IEventPublisher } from '@zuclubit/events';
import { Result, DomainEvent } from '@zuclubit/domain';
import { createServer, ServerConfig } from '../../presentation/server';
import { errorHandler } from '../../presentation/middlewares/error-handler.middleware';
import { leadRoutes } from '../../presentation/routes/lead.routes';
import { CommandBus, QueryBus } from '../../application/common';
import {
  CreateLeadHandler,
  UpdateLeadHandler,
  ChangeLeadStatusHandler,
  UpdateLeadScoreHandler,
  AssignLeadHandler,
  QualifyLeadHandler,
  ScheduleFollowUpHandler,
} from '../../application/commands';
import {
  GetLeadByIdHandler,
  FindLeadsHandler,
  GetLeadStatsHandler,
  GetOverdueFollowUpsHandler,
} from '../../application/queries';
import { LeadRepository } from '../../infrastructure/repositories/lead.repository';

/**
 * Mock event publisher for testing
 * Implements IEventPublisher without requiring NATS connection
 */
class MockEventPublisher implements IEventPublisher {
  private events: DomainEvent[] = [];

  async connect(): Promise<Result<void>> {
    return Result.ok();
  }

  async disconnect(): Promise<void> {
    return Promise.resolve();
  }

  isConnected(): boolean {
    return true;
  }

  async publish(event: DomainEvent): Promise<Result<void>> {
    this.events.push(event);
    return Result.ok();
  }

  async publishBatch(events: DomainEvent[]): Promise<Result<void>> {
    this.events.push(...events);
    return Result.ok();
  }

  getPublishedEvents(): DomainEvent[] {
    return this.events;
  }

  clearEvents(): void {
    this.events = [];
  }
}

/**
 * Build test server with all dependencies
 * Uses Fastify .inject() for testing without starting a real server
 */
export async function buildTestServer(databasePool: DatabasePool): Promise<FastifyInstance> {
  // Mock event publisher (no NATS needed for tests)
  const mockEventPublisher = new MockEventPublisher();

  // Register dependencies in container
  container.registerInstance('DatabasePool', databasePool);
  container.registerInstance('IEventPublisher', mockEventPublisher);

  // Register repositories
  container.registerSingleton('ILeadRepository', LeadRepository);

  // Register CQRS buses
  const commandBus = new CommandBus();
  const queryBus = new QueryBus();

  container.registerInstance<typeof commandBus>('ICommandBus', commandBus);
  container.registerInstance<typeof queryBus>('IQueryBus', queryBus);

  // Register command handlers
  const createLeadHandler = container.resolve(CreateLeadHandler);
  const updateLeadHandler = container.resolve(UpdateLeadHandler);
  const changeLeadStatusHandler = container.resolve(ChangeLeadStatusHandler);
  const updateLeadScoreHandler = container.resolve(UpdateLeadScoreHandler);
  const assignLeadHandler = container.resolve(AssignLeadHandler);
  const qualifyLeadHandler = container.resolve(QualifyLeadHandler);
  const scheduleFollowUpHandler = container.resolve(ScheduleFollowUpHandler);

  commandBus.register('CreateLeadCommand', createLeadHandler);
  commandBus.register('UpdateLeadCommand', updateLeadHandler);
  commandBus.register('ChangeLeadStatusCommand', changeLeadStatusHandler);
  commandBus.register('UpdateLeadScoreCommand', updateLeadScoreHandler);
  commandBus.register('AssignLeadCommand', assignLeadHandler);
  commandBus.register('QualifyLeadCommand', qualifyLeadHandler);
  commandBus.register('ScheduleFollowUpCommand', scheduleFollowUpHandler);

  // Register query handlers
  const getLeadByIdHandler = container.resolve(GetLeadByIdHandler);
  const findLeadsHandler = container.resolve(FindLeadsHandler);
  const getLeadStatsHandler = container.resolve(GetLeadStatsHandler);
  const getOverdueFollowUpsHandler = container.resolve(GetOverdueFollowUpsHandler);

  queryBus.register('GetLeadByIdQuery', getLeadByIdHandler);
  queryBus.register('FindLeadsQuery', findLeadsHandler);
  queryBus.register('GetLeadStatsQuery', getLeadStatsHandler);
  queryBus.register('GetOverdueFollowUpsQuery', getOverdueFollowUpsHandler);

  // Create server config for testing
  const serverConfig: ServerConfig = {
    port: 0, // Random port for testing
    host: '127.0.0.1',
    corsOrigins: ['http://localhost:3000'],
    rateLimitMax: 1000, // Higher limit for tests
    rateLimitTimeWindow: '1 minute',
  };

  // Create and configure server
  const server = await createServer(serverConfig);

  // Set error handler
  server.setErrorHandler(errorHandler);

  // Register routes
  await server.register(leadRoutes, { prefix: '/api/v1/leads' });

  // Wait for server to be ready
  await server.ready();

  return server;
}

/**
 * Clean up test server
 */
export async function cleanupTestServer(server: FastifyInstance) {
  await server.close();
}
