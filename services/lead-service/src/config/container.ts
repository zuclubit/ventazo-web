import 'reflect-metadata';
import { container } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { NatsEventPublisher, IEventPublisher } from '@zuclubit/events';
import { ILeadRepository } from '../domain/repositories';
import { LeadRepository } from '../infrastructure/repositories/lead.repository';
import { getDatabaseConfig, getEventsConfig } from './environment';

/**
 * Dependency Injection Container Setup
 * Registers all services and their dependencies
 */
export const setupContainer = async (): Promise<void> => {
  // Database
  const dbConfig = getDatabaseConfig();
  const dbPool = new DatabasePool(dbConfig);
  await dbPool.connect();
  container.registerInstance(DatabasePool, dbPool);

  // Event Publisher
  const eventsConfig = getEventsConfig();
  const eventPublisher = new NatsEventPublisher({
    servers: [eventsConfig.natsUrl],
  });
  await eventPublisher.connect();
  container.registerInstance<IEventPublisher>('IEventPublisher', eventPublisher);

  // Repositories
  container.register<ILeadRepository>('ILeadRepository', {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      const publisher = c.resolve<IEventPublisher>('IEventPublisher');
      return new LeadRepository(pool, publisher);
    },
  });

  // Register repository with token for use cases
  container.register(ILeadRepository, {
    useFactory: (c) => c.resolve<ILeadRepository>('ILeadRepository'),
  });

  console.log('✓ Dependency container configured');
};

/**
 * Cleanup function
 */
export const cleanupContainer = async (): Promise<void> => {
  try {
    const dbPool = container.resolve(DatabasePool);
    await dbPool.close();

    const eventPublisher = container.resolve<IEventPublisher>('IEventPublisher');
    await eventPublisher.disconnect();

    console.log('✓ Resources cleaned up');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};
