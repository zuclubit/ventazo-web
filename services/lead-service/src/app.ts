import 'reflect-metadata';
import { container } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { NatsEventPublisher } from '@zuclubit/events';
import { createServer, startServer, ServerConfig } from './presentation/server';
import { errorHandler } from './presentation/middlewares/error-handler.middleware';
import { CommandBus, QueryBus } from './application/common';
import {
  CreateLeadHandler,
  UpdateLeadHandler,
  ChangeLeadStatusHandler,
  UpdateLeadScoreHandler,
  AssignLeadHandler,
  QualifyLeadHandler,
  ScheduleFollowUpHandler,
} from './application/commands';
import {
  GetLeadByIdHandler,
  FindLeadsHandler,
  GetLeadStatsHandler,
  GetOverdueFollowUpsHandler,
} from './application/queries';
import { LeadRepository } from './infrastructure/repositories/lead.repository';

/**
 * Application Bootstrap
 * Sets up dependency injection and starts the server
 */
async function bootstrap() {
  // Load environment variables
  const serverConfig: ServerConfig = {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    rateLimitTimeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
  };

  // Initialize database pool
  const databasePool = new DatabasePool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'leads',
    user: process.env.POSTGRES_USER || 'dev',
    password: process.env.POSTGRES_PASSWORD || 'dev123',
  });

  // Test database connection
  const connectResult = await databasePool.connect();
  if (connectResult.isFailure) {
    console.error('Failed to connect to database:', connectResult.error);
    process.exit(1);
  }

  // Initialize event publisher
  const eventPublisher = new NatsEventPublisher({
    servers: process.env.NATS_SERVERS?.split(',') || ['nats://localhost:4222'],
  });

  const eventConnectResult = await eventPublisher.connect();
  if (eventConnectResult.isFailure) {
    console.warn('Failed to connect to NATS:', eventConnectResult.error);
    // Don't fail - continue without events for development
  }

  // Register dependencies in container
  container.registerInstance('DatabasePool', databasePool);
  container.registerInstance('IEventPublisher', eventPublisher);

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

  // Create and configure server
  const server = await createServer(serverConfig);

  // Set error handler
  server.setErrorHandler(errorHandler);

  // Register routes
  // TODO: Register route plugins here
  // await server.register(leadRoutes, { prefix: '/api/v1' });

  // Start server
  await startServer(server, serverConfig);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down gracefully...');
    await server.close();
    await databasePool.close();
    await eventPublisher.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Start application
bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
