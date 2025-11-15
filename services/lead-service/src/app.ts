import 'reflect-metadata';
import { container } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { NatsEventPublisher } from '@zuclubit/events';
import { createServer, startServer, ServerConfig } from './presentation/server';
import { errorHandler } from './presentation/middlewares/error-handler.middleware';
import { leadRoutes } from './presentation/routes/lead.routes';
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
  await server.register(leadRoutes, { prefix: '/api/v1/leads' });

  // Start server
  await startServer(server, serverConfig);

  // Graceful shutdown handler
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      server.log.warn('Shutdown already in progress, ignoring signal');
      return;
    }

    isShuttingDown = true;
    server.log.info(`Received ${signal}, starting graceful shutdown...`);

    // Set a timeout for forceful shutdown if graceful shutdown takes too long
    const forceShutdownTimeout = setTimeout(() => {
      server.log.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 30000); // 30 seconds timeout

    try {
      // Stop accepting new requests
      server.log.info('Closing HTTP server...');
      await server.close();
      server.log.info('HTTP server closed');

      // Close database connections
      server.log.info('Closing database connections...');
      await databasePool.close();
      server.log.info('Database connections closed');

      // Disconnect from event bus
      server.log.info('Disconnecting from NATS...');
      await eventPublisher.disconnect();
      server.log.info('NATS disconnected');

      clearTimeout(forceShutdownTimeout);
      server.log.info('Graceful shutdown completed successfully');
      process.exit(0);
    } catch (error) {
      clearTimeout(forceShutdownTimeout);
      server.log.error({ error }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  // Register shutdown handlers for different signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    server.log.error({ error }, 'Uncaught exception');
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    server.log.error({ reason, promise }, 'Unhandled rejection');
    shutdown('unhandledRejection');
  });
}

// Start application
bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
