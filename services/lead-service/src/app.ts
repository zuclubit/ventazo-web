import 'reflect-metadata';
import { container } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { createServer, startServer, ServerConfig } from './presentation/server';
import { errorHandler } from './presentation/middlewares/error-handler.middleware';
import { leadRoutes, pipelineRoutes, analyticsRoutes, webhookRoutes, bulkRoutes, deduplicationRoutes, contactRoutes, contactsStandaloneRoutes, communicationRoutes, searchRoutes, taskRoutes, opportunityRoutes, customerRoutes, authRoutes, memberRoutes, tenantRoutes, userSyncRoutes, invitationRoutes, onboardingRoutes, auditLogRoutes, calendarRoutes, notesRoutes, attachmentsRoutes, workflowsRoutes, pushRoutes, emailSyncRoutes, smsRoutes, enrichmentRoutes, gdprRoutes, reportsRoutes, whatsappRoutes, messengerRoutes, messengerOAuthRoutes, paymentRoutes, quoteRoutes, proposalTemplateRoutes, aiRoutes, aiStreamRoutes, realtimeRoutes, teamRoutes, territoryRoutes, quotaRoutes, emailTrackingRoutes, forecastingRoutes, customerSuccessRoutes, contractRoutes, permissionRoutes, productRoutes, campaignRoutes, dripSequenceRoutes, activityTrackingRoutes, documentRoutes, customer360Routes, unifiedInboxRoutes, subscriptionAnalyticsRoutes, integrationHubRoutes, mlScoringRoutes, cacheRoutes, resilienceRoutes, auditRoutes, rateLimitingRoutes, webhookDLQRoutes, tracingRoutes, lockingRoutes, segmentationRoutes, emailTemplateRoutes, advancedReportRoutes, customFieldRoutes, workflowBuilderRoutes, integrationConnectorRoutes, notificationRoutes, messagingRoutes, kanbanRoutes, securityRoutes, dataManagementRoutes, userTagsRoutes, userTagsUserRoutes } from './presentation/routes';
import { setupContainer, cleanupContainer } from './config/container';
import { warmupPool } from './infrastructure/database';

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

  // Setup container with all dependencies
  await setupContainer();

  // PERFORMANCE: Warm up database connections before accepting traffic
  // This reduces first-request latency by ~100-200ms
  // See: docs/PERFORMANCE_OPTIMIZATION_PLAN_V2.md - Section 1.3
  await warmupPool();

  // Create and configure server
  const server = await createServer(serverConfig);

  // Set error handler
  server.setErrorHandler(errorHandler);

  // Register routes
  await server.register(leadRoutes, { prefix: '/api/v1/leads' });
  await server.register(pipelineRoutes, { prefix: '/api/v1/pipelines' });
  await server.register(analyticsRoutes, { prefix: '/api/v1/analytics' });
  await server.register(webhookRoutes, { prefix: '/api/v1/webhooks' });
  await server.register(bulkRoutes, { prefix: '/api/v1/bulk' });
  await server.register(deduplicationRoutes, { prefix: '/api/v1/duplicates' });
  await server.register(contactRoutes, { prefix: '/api/v1/leads' });
  await server.register(contactsStandaloneRoutes, { prefix: '/api/v1/contacts' });
  await server.register(communicationRoutes, { prefix: '/api/v1/communications' });
  await server.register(searchRoutes, { prefix: '/api/v1/search' });
  await server.register(taskRoutes, { prefix: '/api/v1/tasks' });
  await server.register(opportunityRoutes, { prefix: '/api/v1/opportunities' });
  await server.register(customerRoutes, { prefix: '/api/v1/customers' });
  await server.register(authRoutes, { prefix: '/api/v1/auth' });
  await server.register(userSyncRoutes, { prefix: '/api/v1/auth' }); // User sync endpoints under /api/v1/auth
  await server.register(memberRoutes, { prefix: '/api/v1/members' });
  await server.register(invitationRoutes, { prefix: '/api/v1/invitations' }); // Team invitations
  await server.register(onboardingRoutes, { prefix: '/api/v1/onboarding' }); // User onboarding progress
  await server.register(auditLogRoutes, { prefix: '/api/v1/audit' }); // Audit logging
  await server.register(tenantRoutes, { prefix: '/api/v1/tenant' });
  await server.register(calendarRoutes, { prefix: '/api/v1/calendar' });
  await server.register(notesRoutes, { prefix: '/api/v1/notes' });
  await server.register(attachmentsRoutes, { prefix: '/api/v1/attachments' });
  await server.register(workflowsRoutes, { prefix: '/api/v1/workflows' });
  await server.register(pushRoutes, { prefix: '/api/v1/push' });
  await server.register(emailSyncRoutes, { prefix: '/api/v1/email-sync' });
  await server.register(smsRoutes, { prefix: '/api/v1/sms' });
  await server.register(enrichmentRoutes, { prefix: '/api/v1/enrichment' });
  await server.register(gdprRoutes, { prefix: '/api/v1/gdpr' });
  await server.register(reportsRoutes, { prefix: '/api/v1/reports' });
  await server.register(whatsappRoutes, { prefix: '/api/v1/whatsapp' });
  await server.register(messengerRoutes, { prefix: '/api/v1/messenger' });
  await server.register(messengerOAuthRoutes, { prefix: '/api/v1/messenger' }); // OAuth under same prefix
  await server.register(paymentRoutes, { prefix: '/api/v1/payments' });
  await server.register(quoteRoutes, { prefix: '/api/v1/quotes' });
  await server.register(proposalTemplateRoutes, { prefix: '/api/v1/proposal-templates' });
  await server.register(aiRoutes, { prefix: '/api/v1/ai' });
  await server.register(aiStreamRoutes, { prefix: '/api/v1/ai' }); // AI streaming endpoints
  await server.register(realtimeRoutes, { prefix: '/api/v1/realtime' });
  await server.register(teamRoutes, { prefix: '/api/v1/teams' });
  await server.register(territoryRoutes, { prefix: '/api/v1/territories' });
  await server.register(quotaRoutes, { prefix: '/api/v1/quotas' });
  await server.register(emailTrackingRoutes, { prefix: '' }); // Routes already include /api/v1 prefix
  await server.register(forecastingRoutes, { prefix: '/api/v1/forecasting' });
  await server.register(customerSuccessRoutes, { prefix: '/api/v1/customer-success' });
  await server.register(contractRoutes, { prefix: '/api/v1/contracts' });
  await server.register(permissionRoutes, { prefix: '/api/v1/permissions' });
  await server.register(productRoutes, { prefix: '/api/v1/products' });
  await server.register(campaignRoutes, { prefix: '/api/v1/campaigns' });
  await server.register(dripSequenceRoutes, { prefix: '/api/v1/sequences' });
  await server.register(activityTrackingRoutes, { prefix: '/api/v1/activities' });
  await server.register(documentRoutes, { prefix: '/api/v1/documents' });
  await server.register(customer360Routes, { prefix: '/api/v1/customer-360' });
  await server.register(unifiedInboxRoutes, { prefix: '/api/v1/unified-inbox' });
  await server.register(subscriptionAnalyticsRoutes, { prefix: '/api/v1/subscription-analytics' });
  await server.register(integrationHubRoutes, { prefix: '/api/v1/integrations' });
  await server.register(mlScoringRoutes, { prefix: '/api/v1/ml-scoring' });
  await server.register(cacheRoutes, { prefix: '/api/v1/admin/cache' });
  await server.register(resilienceRoutes, { prefix: '/api/v1/admin/resilience' });
  await server.register(auditRoutes, { prefix: '/api/v1/admin/audit' });
  await server.register(rateLimitingRoutes, { prefix: '/api/v1/admin/rate-limiting' });
  await server.register(webhookDLQRoutes, { prefix: '/api/v1/webhooks/dlq' });
  await server.register(tracingRoutes, { prefix: '/api/v1/admin/tracing' });
  await server.register(lockingRoutes, { prefix: '/api/v1/admin/locking' });
  await server.register(segmentationRoutes, { prefix: '/api/v1/segments' });
  await server.register(emailTemplateRoutes, { prefix: '/api/v1/email-templates' });
  await server.register(advancedReportRoutes, { prefix: '/api/v1/advanced-reports' });
  await server.register(customFieldRoutes, { prefix: '/api/v1/custom-fields' });
  await server.register(workflowBuilderRoutes, { prefix: '/api/v1/workflow-builder' });
  await server.register(integrationConnectorRoutes, { prefix: '/api/v1/integration-connectors' });
  await server.register(notificationRoutes, { prefix: '/api/v1/notifications' });
  await server.register(messagingRoutes, { prefix: '/api/v1/messages' });
  await server.register(kanbanRoutes, { prefix: '/api/v1/kanban' });
  await server.register(securityRoutes, { prefix: '/api/v1/security' });
  await server.register(dataManagementRoutes, { prefix: '/api/v1/data' });
  await server.register(userTagsRoutes, { prefix: '/api/v1/user-tags' }); // User tags for group notifications
  await server.register(userTagsUserRoutes, { prefix: '/api/v1/users' }); // User-centric tag endpoints

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

      // Cleanup container (closes database, NATS, etc.)
      server.log.info('Cleaning up container...');
      await cleanupContainer();
      server.log.info('Container cleanup complete');

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
