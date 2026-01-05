import 'reflect-metadata';
import Fastify, { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { errorHandler } from './src/presentation/middlewares/error-handler.middleware';
import { leadRoutes } from './src/presentation/routes/lead.routes';
import { correlationIdMiddleware, requestLoggerOnRequest, requestLoggerOnResponse } from './src/presentation/middlewares';
import { CommandBus, QueryBus } from './src/application/common';
import {
  CreateLeadHandler,
  UpdateLeadHandler,
  ChangeLeadStatusHandler,
  UpdateLeadScoreHandler,
  AssignLeadHandler,
  QualifyLeadHandler,
  ScheduleFollowUpHandler,
} from './src/application/commands';
import {
  GetLeadByIdHandler,
  FindLeadsHandler,
  GetLeadStatsHandler,
  GetOverdueFollowUpsHandler,
} from './src/application/queries';
import { LeadRepository } from './src/infrastructure/repositories/lead.repository';
import { IEventPublisher } from '@zuclubit/events';
import { Result } from '@zuclubit/domain';

/**
 * Mock implementations for testing without DB
 */
class MockEventPublisher implements IEventPublisher {
  async connect() {
    return Result.ok(undefined);
  }

  async disconnect() {
    return Promise.resolve();
  }

  isConnected() {
    return true;
  }

  async publish(event: unknown) {
    return Result.ok(undefined);
  }

  async publishBatch(events: unknown[]) {
    return Result.ok(undefined);
  }
}

class MockDatabasePool {
  async connect() {
    return Result.ok(undefined);
  }

  async close() {
    return Promise.resolve();
  }

  async query() {
    return Result.fail('Database not available in test mode');
  }
}

/**
 * Setup simple test server without heavy plugins
 */
async function setupSimpleTestServer(): Promise<FastifyInstance> {
  console.log('🚀 Configurando servidor de pruebas (modo simplificado)...\n');

  const server = Fastify({
    logger: {
      level: 'warn', // Menos verbose
    },
  });

  // Add basic middlewares
  server.addHook('onRequest', correlationIdMiddleware);
  server.addHook('onRequest', requestLoggerOnRequest);
  server.addHook('onResponse', requestLoggerOnResponse);

  // Mock dependencies
  const mockEventPublisher = new MockEventPublisher();
  const mockDatabasePool = new MockDatabasePool();

  container.registerInstance('DatabasePool', mockDatabasePool);
  container.registerInstance('IEventPublisher', mockEventPublisher);
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

  // Set error handler
  server.setErrorHandler(errorHandler);

  // Add health routes manually
  server.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  server.get('/ready', async () => ({ ready: true }));

  // Register lead routes
  await server.register(leadRoutes, { prefix: '/api/v1/leads' });

  await server.ready();

  console.log('✅ Servidor de pruebas configurado\n');
  return server;
}

/**
 * Run basic tests
 */
async function runTests() {
  console.log('\n🧪 PRUEBAS DE ENDPOINTS - MODO SIMPLIFICADO\n');
  console.log('='.repeat(60));

  const server = await setupSimpleTestServer();

  let totalTests = 0;
  let passedTests = 0;

  async function test(name: string, fn: () => Promise<boolean>) {
    totalTests++;
    try {
      const result = await fn();
      if (result) {
        passedTests++;
        console.log(`✅ ${name}`);
      } else {
        console.log(`❌ ${name}`);
      }
    } catch (error: any) {
      console.log(`❌ ${name} - Error: ${error.message}`);
    }
  }

  // Test 1: Health endpoint
  await test('Health endpoint responde', async () => {
    const res = await server.inject({ method: 'GET', url: '/health' });
    const body = JSON.parse(res.body);
    return res.statusCode === 200 && body.status === 'healthy';
  });

  // Test 2: Ready endpoint
  await test('Ready endpoint responde', async () => {
    const res = await server.inject({ method: 'GET', url: '/ready' });
    const body = JSON.parse(res.body);
    return res.statusCode === 200 && body.ready === true;
  });

  // Test 3: Correlation ID en respuesta
  await test('Correlation ID en headers de respuesta', async () => {
    const res = await server.inject({ method: 'GET', url: '/health' });
    return typeof (res.headers as any)['x-correlation-id'] === 'string';
  });

  // Test 4: Correlation ID preservation
  await test('Correlation ID se preserva', async () => {
    const testId = 'test-correlation-123';
    const res = await server.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-correlation-id': testId },
    });
    return (res.headers as any)['x-correlation-id'] === testId;
  });

  // Test 5: Validation - campos faltantes
  await test('Validación rechaza campos faltantes', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/leads',
      payload: { companyName: 'Test' },
    });
    return res.statusCode === 400;
  });

  // Test 6: Validation - email inválido
  await test('Validación rechaza email inválido', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/leads',
      payload: {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        companyName: 'Test',
        email: 'not-an-email',
        source: 'Web',
      },
    });
    return res.statusCode === 400;
  });

  // Test 7: Validation - UUID inválido
  await test('Validación rechaza UUID inválido', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/leads',
      payload: {
        tenantId: 'not-a-uuid',
        companyName: 'Test',
        email: 'test@example.com',
        source: 'Web',
      },
    });
    return res.statusCode === 400;
  });

  // Test 8: Rutas registradas
  await test('Ruta GET /api/v1/leads existe', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/v1/leads' });
    // Fallará por falta de DB, pero la ruta debe existir (no 404)
    return res.statusCode !== 404;
  });

  // Test 9: Ruta con parámetro existe
  await test('Ruta GET /api/v1/leads/:id existe', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/leads/123e4567-e89b-12d3-a456-426614174000',
    });
    return res.statusCode !== 404;
  });

  // Test 10: Error handler funciona
  await test('Error handler formatea errores correctamente', async () => {
    const res = await server.inject({ method: 'GET', url: '/ruta-inexistente-12345' });
    const body = JSON.parse(res.body);
    return (
      res.statusCode === 404 &&
      typeof body.category === 'string' &&
      typeof body.correlationId === 'string'
    );
  });

  await server.close();

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 RESULTADOS: ${passedTests}/${totalTests} pruebas pasaron\n`);

  if (passedTests === totalTests) {
    console.log('✅ TODAS LAS PRUEBAS PASARON');
    console.log('\n💡 Estructura y middlewares funcionan correctamente');
    console.log('⚠️  Para pruebas completas con DB, usar tests de integración\n');
    process.exit(0);
  } else {
    console.log(`❌ ${totalTests - passedTests} pruebas fallaron\n`);
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
