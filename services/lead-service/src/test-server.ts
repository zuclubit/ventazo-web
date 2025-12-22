/**
 * Standalone Test Server
 * For testing new modules without full application bootstrap
 */
import 'reflect-metadata';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { container } from 'tsyringe';

// Import services
import { SegmentationService } from './infrastructure/segmentation';
import { EmailTemplateService } from './infrastructure/email-templates';
import { AdvancedReportService } from './infrastructure/advanced-reports';
import { CustomFieldService } from './infrastructure/custom-fields';
import { WorkflowBuilderService } from './infrastructure/workflow-builder';
import { IntegrationConnectorService } from './infrastructure/integration-connectors';

// Import routes
import { segmentationRoutes } from './presentation/routes/segmentation.routes';
import { emailTemplateRoutes } from './presentation/routes/email-template.routes';
import { advancedReportRoutes } from './presentation/routes/advanced-report.routes';
import { customFieldRoutes } from './presentation/routes/custom-field.routes';
import { workflowBuilderRoutes } from './presentation/routes/workflow-builder.routes';
import { integrationConnectorRoutes } from './presentation/routes/integration-connector.routes';

// Mock DatabasePool
class MockDatabasePool {
  async query(_sql: string, _params?: unknown[]) {
    return { rows: [], rowCount: 0 };
  }
  async connect() {
    return { isSuccess: true, isFailure: false, value: true };
  }
  async close() {}
}

async function startTestServer() {
  const port = parseInt(process.env.PORT || '3000', 10);

  // Create mock pool
  const mockPool = new MockDatabasePool();

  // Register mock database pool
  container.registerInstance('DatabasePool', mockPool);

  // Register services with mock pool
  container.register(SegmentationService, {
    useFactory: () => new SegmentationService(mockPool as any),
  });
  container.register(EmailTemplateService, {
    useFactory: () => new EmailTemplateService(mockPool as any),
  });
  container.register(AdvancedReportService, {
    useFactory: () => new AdvancedReportService(mockPool as any),
  });
  container.register(CustomFieldService, {
    useFactory: () => new CustomFieldService(mockPool as any),
  });
  container.register(WorkflowBuilderService, {
    useFactory: () => new WorkflowBuilderService(mockPool as any),
  });
  container.register(IntegrationConnectorService, {
    useFactory: () => new IntegrationConnectorService(mockPool as any),
  });

  // Create Fastify server
  const server = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // Register CORS
  await server.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Health check
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  await server.register(segmentationRoutes, { prefix: '/api/v1/segments' });
  await server.register(emailTemplateRoutes, { prefix: '/api/v1/email-templates' });
  await server.register(advancedReportRoutes, { prefix: '/api/v1/advanced-reports' });
  await server.register(customFieldRoutes, { prefix: '/api/v1/custom-fields' });
  await server.register(workflowBuilderRoutes, { prefix: '/api/v1/workflow-builder' });
  await server.register(integrationConnectorRoutes, { prefix: '/api/v1/integration-connectors' });

  // Start server
  try {
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`\n🚀 Test Server running at http://localhost:${port}`);
    console.log('\nAvailable endpoints:');
    console.log('  GET  /health');
    console.log('  ---  /api/v1/segments/*');
    console.log('  ---  /api/v1/email-templates/*');
    console.log('  ---  /api/v1/advanced-reports/*');
    console.log('  ---  /api/v1/custom-fields/*');
    console.log('  ---  /api/v1/workflow-builder/*');
    console.log('  ---  /api/v1/integration-connectors/*');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

startTestServer();
