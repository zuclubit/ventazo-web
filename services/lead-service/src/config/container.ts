import 'reflect-metadata';
import { container } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { db } from '../infrastructure/database';
import { NatsEventPublisher, IEventPublisher } from '@zuclubit/events';
import { LeadRepository } from '../infrastructure/repositories/lead.repository';
import { ActivityLogService } from '../infrastructure/services';
import { PipelineService } from '../infrastructure/pipeline';
import { NotificationService } from '../infrastructure/notifications';
import { WebhookService } from '../infrastructure/webhooks';
import { ScoringService } from '../infrastructure/scoring';
import { AnalyticsService } from '../infrastructure/analytics';
import { EmailService } from '../infrastructure/email';
import { QueueService } from '../infrastructure/queue';
import { ImportExportService } from '../infrastructure/import-export';
import { DeduplicationService } from '../infrastructure/deduplication';
import { ContactService } from '../infrastructure/contacts';
import { CommunicationService } from '../infrastructure/communications';
import { SearchService } from '../infrastructure/search';
import { TaskService } from '../infrastructure/tasks';
import { OpportunityService } from '../infrastructure/opportunities';
import { CustomerService } from '../infrastructure/customers';
import { AuthService, InvitationService, OnboardingService, OTPService, TurnstileService } from '../infrastructure/auth';
import { CalendarService } from '../infrastructure/calendar';
import { NotesService } from '../infrastructure/notes';
import { StorageService, ImageService } from '../infrastructure/storage';
import { WorkflowService } from '../infrastructure/workflows';
import { PushNotificationService } from '../infrastructure/notifications/push.service';
import { EmailSyncService } from '../infrastructure/email-sync';
import { SmsService } from '../infrastructure/sms';
import { EnrichmentService } from '../infrastructure/enrichment';
import { GdprService } from '../infrastructure/gdpr';
import { ReportService } from '../infrastructure/reports';
import { WhatsAppService } from '../infrastructure/whatsapp';
import { PaymentService } from '../infrastructure/payments';
import { QuoteService } from '../infrastructure/quotes';
import { AIService } from '../infrastructure/ai';
import { WebSocketService } from '../infrastructure/websocket';
import { TeamService, TerritoryService, QuotaService } from '../infrastructure/teams';
import { EmailTrackingService } from '../infrastructure/email-tracking';
import { ForecastingService } from '../infrastructure/forecasting';
import { CustomerSuccessService } from '../infrastructure/customer-success';
import { ContractService } from '../infrastructure/contracts';
import { PermissionService } from '../infrastructure/permissions';
import { ProductService } from '../infrastructure/products';
import { CampaignService } from '../infrastructure/campaigns';
import { DripSequenceService } from '../infrastructure/drip-campaigns';
import { ActivityTrackingService } from '../infrastructure/activity-tracking';
import { DocumentService } from '../infrastructure/documents';
import { Customer360Service } from '../infrastructure/customer-360';
import { UnifiedInboxService } from '../infrastructure/unified-inbox';
import { SubscriptionAnalyticsService } from '../infrastructure/subscription-analytics';
import { IntegrationHubService } from '../infrastructure/integration-hub';
import { MLScoringService } from '../infrastructure/ml-scoring';
import { CacheService, CacheWarmingService } from '../infrastructure/cache';
import { ResilientServiceClient } from '../infrastructure/resilience';
import { AuditService } from '../infrastructure/audit';
import { RateLimitingService } from '../infrastructure/rate-limiting';
import { WebhookDLQService, WebhookQueueService } from '../infrastructure/webhooks';
import { TracingService } from '../infrastructure/tracing';
import { OptimisticLockService } from '../infrastructure/locking';
import { SegmentationService } from '../infrastructure/segmentation';
import { EmailTemplateService } from '../infrastructure/email-templates';
import { AdvancedReportService } from '../infrastructure/advanced-reports';
import { CustomFieldService } from '../infrastructure/custom-fields';
import { WorkflowBuilderService } from '../infrastructure/workflow-builder';
import { IntegrationConnectorService } from '../infrastructure/integration-connectors';
import { ILeadRepository } from '../domain/repositories';
import { getDatabaseConfig, getEventsConfig } from './environment';

// Command/Query Bus and Handlers
import { CommandBus, QueryBus, ICommandBus, IQueryBus } from '../application/common';
import { CreateLeadHandler } from '../application/commands/create-lead.handler';
import { UpdateLeadHandler } from '../application/commands/update-lead.handler';
import { ChangeLeadStatusHandler } from '../application/commands/change-lead-status.handler';
import { UpdateLeadScoreHandler } from '../application/commands/update-lead-score.handler';
import { AssignLeadHandler } from '../application/commands/assign-lead.handler';
import { QualifyLeadHandler } from '../application/commands/qualify-lead.handler';
import { ScheduleFollowUpHandler } from '../application/commands/schedule-follow-up.handler';
import { ConvertLeadHandler } from '../application/commands/convert-lead.handler';
import { GetLeadByIdHandler } from '../application/queries/get-lead-by-id.handler';
import { FindLeadsHandler } from '../application/queries/find-leads.handler';
import { GetLeadStatsHandler } from '../application/queries/get-lead-stats.handler';
import { GetOverdueFollowUpsHandler } from '../application/queries/get-overdue-follow-ups.handler';

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

  // Register Drizzle ORM db instance for services that use it
  container.register('Database', { useValue: db });

  // Event Publisher
  const eventsConfig = getEventsConfig();
  const eventPublisher = new NatsEventPublisher({
    servers: [eventsConfig.natsUrl],
  });
  await eventPublisher.connect();
  container.registerInstance<IEventPublisher>('IEventPublisher', eventPublisher);

  // Register LeadRepository with token
  container.register('ILeadRepository', {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      const publisher = c.resolve<IEventPublisher>('IEventPublisher');
      return new LeadRepository(pool, publisher);
    },
  });

  // Register ActivityLogService
  container.register(ActivityLogService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new ActivityLogService(pool);
    },
  });

  // Register PipelineService
  container.register(PipelineService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new PipelineService(pool);
    },
  });

  // Register NotificationService
  container.register(NotificationService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new NotificationService(pool);
    },
  });

  // Register WebhookService
  container.register(WebhookService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new WebhookService(pool);
    },
  });

  // Register ScoringService
  container.register(ScoringService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new ScoringService(pool);
    },
  });

  // Register AnalyticsService
  container.register(AnalyticsService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new AnalyticsService(pool);
    },
  });

  // Register EmailService (singleton)
  container.registerSingleton(EmailService);

  // Register QueueService (singleton)
  container.registerSingleton(QueueService);

  // Register ImportExportService
  container.register(ImportExportService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      const leadRepository = c.resolve<ILeadRepository>('ILeadRepository');
      return new ImportExportService(pool, leadRepository);
    },
  });

  // Register DeduplicationService
  container.register(DeduplicationService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      const leadRepository = c.resolve<ILeadRepository>('ILeadRepository');
      return new DeduplicationService(pool, leadRepository);
    },
  });

  // Register ContactService
  container.register(ContactService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new ContactService(pool);
    },
  });

  // Register CommunicationService
  container.register(CommunicationService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new CommunicationService(pool);
    },
  });

  // Register SearchService
  container.register(SearchService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new SearchService(pool);
    },
  });

  // Register TaskService
  container.register(TaskService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new TaskService(pool);
    },
  });

  // Register OpportunityService
  container.register(OpportunityService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new OpportunityService(pool);
    },
  });

  // Register CustomerService
  container.register(CustomerService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new CustomerService(pool);
    },
  });

  // Register AuthService
  container.register(AuthService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new AuthService(pool);
    },
  });

  // Register InvitationService
  container.register(InvitationService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      const emailService = c.resolve(EmailService);
      return new InvitationService(pool, emailService);
    },
  });
  container.register('InvitationService', {
    useFactory: (c) => c.resolve(InvitationService),
  });

  // Register OnboardingService
  container.register(OnboardingService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new OnboardingService(pool);
    },
  });
  container.register('OnboardingService', {
    useFactory: (c) => c.resolve(OnboardingService),
  });

  // Register OTPService
  container.register(OTPService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new OTPService(pool);
    },
  });
  container.register('OTPService', {
    useFactory: (c) => c.resolve(OTPService),
  });

  // Register TurnstileService (P0.2 - CAPTCHA)
  container.registerSingleton(TurnstileService);
  container.register('TurnstileService', {
    useFactory: (c) => c.resolve(TurnstileService),
  });

  // Register CalendarService
  container.register(CalendarService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new CalendarService(pool);
    },
  });

  // Register NotesService
  container.register(NotesService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new NotesService(pool);
    },
  });

  // Register StorageService
  container.register(StorageService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new StorageService(pool);
    },
  });
  container.register('StorageService', {
    useFactory: (c) => c.resolve(StorageService),
  });

  // Register ImageService (P0.4 - Logo Upload with compression)
  container.registerSingleton(ImageService);
  container.register('ImageService', {
    useFactory: (c) => c.resolve(ImageService),
  });

  // Register WorkflowService
  container.register(WorkflowService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new WorkflowService(pool);
    },
  });
  container.register('WorkflowService', {
    useFactory: (c) => c.resolve(WorkflowService),
  });

  // Register PushNotificationService
  container.register(PushNotificationService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new PushNotificationService(pool);
    },
  });
  container.register('PushNotificationService', {
    useFactory: (c) => c.resolve(PushNotificationService),
  });

  // Register EmailSyncService
  container.register(EmailSyncService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new EmailSyncService(pool);
    },
  });
  container.register('EmailSyncService', {
    useFactory: (c) => c.resolve(EmailSyncService),
  });

  // Register SmsService
  container.register(SmsService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new SmsService(pool);
    },
  });
  container.register('SmsService', {
    useFactory: (c) => c.resolve(SmsService),
  });

  // Register EnrichmentService
  container.register(EnrichmentService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new EnrichmentService(pool);
    },
  });
  container.register('EnrichmentService', {
    useFactory: (c) => c.resolve(EnrichmentService),
  });

  // Register GdprService (uses raw pool)
  container.register(GdprService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new GdprService(pool);
    },
  });
  container.register('GdprService', {
    useFactory: (c) => c.resolve(GdprService),
  });

  // Register ReportService
  container.register(ReportService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new ReportService(pool);
    },
  });
  container.register('ReportService', {
    useFactory: (c) => c.resolve(ReportService),
  });

  // Register WhatsAppService
  container.register(WhatsAppService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new WhatsAppService(pool);
    },
  });
  container.register('WhatsAppService', {
    useFactory: (c) => c.resolve(WhatsAppService),
  });

  // Register PaymentService (uses raw pool)
  container.register(PaymentService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new PaymentService(pool);
    },
  });
  container.register('PaymentService', {
    useFactory: (c) => c.resolve(PaymentService),
  });

  // Register QuoteService
  container.register(QuoteService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new QuoteService(pool);
    },
  });
  container.register('QuoteService', {
    useFactory: (c) => c.resolve(QuoteService),
  });

  // Register AIService
  container.register(AIService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new AIService(pool);
    },
  });
  container.register('AIService', {
    useFactory: (c) => c.resolve(AIService),
  });

  // Register WebSocketService
  container.register(WebSocketService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new WebSocketService(pool);
    },
  });
  container.register('WebSocketService', {
    useFactory: (c) => c.resolve(WebSocketService),
  });

  // Register TeamService
  container.register(TeamService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new TeamService(pool);
    },
  });
  container.register('TeamService', {
    useFactory: (c) => c.resolve(TeamService),
  });

  // Register TerritoryService
  container.register(TerritoryService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new TerritoryService(pool);
    },
  });
  container.register('TerritoryService', {
    useFactory: (c) => c.resolve(TerritoryService),
  });

  // Register QuotaService
  container.register(QuotaService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new QuotaService(pool);
    },
  });
  container.register('QuotaService', {
    useFactory: (c) => c.resolve(QuotaService),
  });

  // Register EmailTrackingService
  container.register(EmailTrackingService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new EmailTrackingService(pool);
    },
  });
  container.register('EmailTrackingService', {
    useFactory: (c) => c.resolve(EmailTrackingService),
  });

  // Register ForecastingService (uses Drizzle ORM db)
  container.register(ForecastingService, {
    useFactory: (c) => {
      const drizzleDb = c.resolve('Database');
      return new ForecastingService(drizzleDb);
    },
  });
  container.register('ForecastingService', {
    useFactory: (c) => c.resolve(ForecastingService),
  });

  // Register CustomerSuccessService (uses Drizzle ORM db)
  container.register(CustomerSuccessService, {
    useFactory: (c) => {
      const drizzleDb = c.resolve('Database');
      return new CustomerSuccessService(drizzleDb);
    },
  });
  container.register('CustomerSuccessService', {
    useFactory: (c) => c.resolve(CustomerSuccessService),
  });

  // Register ContractService (uses Drizzle ORM db)
  container.register(ContractService, {
    useFactory: (c) => {
      const drizzleDb = c.resolve('Database');
      return new ContractService(drizzleDb);
    },
  });
  container.register('ContractService', {
    useFactory: (c) => c.resolve(ContractService),
  });

  // Register PermissionService (uses Drizzle ORM db)
  container.register(PermissionService, {
    useFactory: (c) => {
      const drizzleDb = c.resolve('Database');
      return new PermissionService(drizzleDb);
    },
  });
  container.register('PermissionService', {
    useFactory: (c) => c.resolve(PermissionService),
  });

  // Register ProductService
  container.register(ProductService, {
    useFactory: (c) => {
      const drizzleDb = c.resolve('Database');
      return new ProductService(drizzleDb);
    },
  });
  container.register('ProductService', {
    useFactory: (c) => c.resolve(ProductService),
  });

  // Register CampaignService
  container.register(CampaignService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new CampaignService(pool);
    },
  });
  container.register('CampaignService', {
    useFactory: (c) => c.resolve(CampaignService),
  });

  // Register DripSequenceService
  container.register(DripSequenceService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new DripSequenceService(pool);
    },
  });
  container.register('DripSequenceService', {
    useFactory: (c) => c.resolve(DripSequenceService),
  });

  // Register ActivityTrackingService (uses Drizzle ORM db)
  container.register(ActivityTrackingService, {
    useFactory: (c) => {
      const drizzleDb = c.resolve('Database');
      return new ActivityTrackingService(drizzleDb);
    },
  });
  container.register('ActivityTrackingService', {
    useFactory: (c) => c.resolve(ActivityTrackingService),
  });

  // Register DocumentService
  container.register(DocumentService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new DocumentService(pool);
    },
  });
  container.register('DocumentService', {
    useFactory: (c) => c.resolve(DocumentService),
  });

  // Register Customer360Service
  container.register(Customer360Service, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new Customer360Service(pool);
    },
  });
  container.register('Customer360Service', {
    useFactory: (c) => c.resolve(Customer360Service),
  });

  // Register UnifiedInboxService (uses Drizzle ORM db)
  container.register(UnifiedInboxService, {
    useFactory: (c) => {
      const drizzleDb = c.resolve('Database');
      return new UnifiedInboxService(drizzleDb);
    },
  });
  container.register('UnifiedInboxService', {
    useFactory: (c) => c.resolve(UnifiedInboxService),
  });

  // Register SubscriptionAnalyticsService
  container.register(SubscriptionAnalyticsService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new SubscriptionAnalyticsService(pool);
    },
  });
  container.register('SubscriptionAnalyticsService', {
    useFactory: (c) => c.resolve(SubscriptionAnalyticsService),
  });

  // Register IntegrationHubService (uses Drizzle ORM db)
  container.register(IntegrationHubService, {
    useFactory: (c) => {
      const drizzleDb = c.resolve('Database');
      return new IntegrationHubService(drizzleDb);
    },
  });
  container.register('IntegrationHubService', {
    useFactory: (c) => c.resolve(IntegrationHubService),
  });

  // Register MLScoringService (uses Drizzle ORM db)
  container.register(MLScoringService, {
    useFactory: (c) => {
      const drizzleDb = c.resolve('Database');
      return new MLScoringService(drizzleDb);
    },
  });
  container.register('MLScoringService', {
    useFactory: (c) => c.resolve(MLScoringService),
  });

  // Register CacheService
  container.register('CacheConfig', {
    useValue: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      keyPrefix: 'crm:',
    },
  });
  container.registerSingleton(CacheService);

  // Register CacheWarmingService
  container.register(CacheWarmingService, {
    useFactory: (c) => {
      const cacheService = c.resolve(CacheService);
      const pool = c.resolve(DatabasePool);
      return new CacheWarmingService(cacheService, pool);
    },
  });

  // Register ResilientServiceClient
  container.registerSingleton(ResilientServiceClient);

  // Register AuditService
  container.register(AuditService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new AuditService(pool);
    },
  });
  container.register('AuditService', {
    useFactory: (c) => c.resolve(AuditService),
  });

  // Register RateLimitingService
  container.registerSingleton(RateLimitingService);
  container.register('IRateLimitingService', {
    useFactory: (c) => c.resolve(RateLimitingService),
  });

  // Register WebhookDLQService
  container.register(WebhookDLQService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new WebhookDLQService(pool);
    },
  });
  container.register('WebhookDLQService', {
    useFactory: (c) => c.resolve(WebhookDLQService),
  });

  // Register WebhookQueueService
  container.register(WebhookQueueService, {
    useFactory: (c) => {
      const webhookService = c.resolve(WebhookService);
      const dlqService = c.resolve(WebhookDLQService);
      return new WebhookQueueService(webhookService, dlqService);
    },
  });
  container.register('WebhookQueueService', {
    useFactory: (c) => c.resolve(WebhookQueueService),
  });

  // Register TracingService
  container.registerSingleton(TracingService);
  container.register('TracingService', {
    useFactory: (c) => c.resolve(TracingService),
  });

  // Register OptimisticLockService
  container.register(OptimisticLockService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new OptimisticLockService(pool);
    },
  });
  container.register('OptimisticLockService', {
    useFactory: (c) => c.resolve(OptimisticLockService),
  });

  // Register SegmentationService
  container.register(SegmentationService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new SegmentationService(pool);
    },
  });
  container.register('SegmentationService', {
    useFactory: (c) => c.resolve(SegmentationService),
  });

  // Register EmailTemplateService
  container.register(EmailTemplateService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new EmailTemplateService(pool);
    },
  });
  container.register('EmailTemplateService', {
    useFactory: (c) => c.resolve(EmailTemplateService),
  });

  // Register AdvancedReportService
  container.register(AdvancedReportService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new AdvancedReportService(pool);
    },
  });
  container.register('AdvancedReportService', {
    useFactory: (c) => c.resolve(AdvancedReportService),
  });

  // Register CustomFieldService
  container.register(CustomFieldService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new CustomFieldService(pool);
    },
  });
  container.register('CustomFieldService', {
    useFactory: (c) => c.resolve(CustomFieldService),
  });

  // Register WorkflowBuilderService
  container.register(WorkflowBuilderService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new WorkflowBuilderService(pool);
    },
  });
  container.register('WorkflowBuilderService', {
    useFactory: (c) => c.resolve(WorkflowBuilderService),
  });

  // Register IntegrationConnectorService
  container.register(IntegrationConnectorService, {
    useFactory: (c) => {
      const pool = c.resolve(DatabasePool);
      return new IntegrationConnectorService(pool);
    },
  });
  container.register('IntegrationConnectorService', {
    useFactory: (c) => c.resolve(IntegrationConnectorService),
  });

  // Register DatabasePool for injection by token
  container.register('DatabasePool', { useValue: dbPool });

  // Register Command Bus with handlers
  const commandBus = new CommandBus();
  const leadRepository = container.resolve<ILeadRepository>('ILeadRepository');

  // Register command handlers
  commandBus.register('CreateLeadCommand', new CreateLeadHandler(leadRepository));
  commandBus.register('UpdateLeadCommand', new UpdateLeadHandler(leadRepository));
  commandBus.register('ChangeLeadStatusCommand', new ChangeLeadStatusHandler(leadRepository));
  commandBus.register('UpdateLeadScoreCommand', new UpdateLeadScoreHandler(leadRepository));
  commandBus.register('AssignLeadCommand', new AssignLeadHandler(leadRepository));
  commandBus.register('QualifyLeadCommand', new QualifyLeadHandler(leadRepository));
  commandBus.register('ScheduleFollowUpCommand', new ScheduleFollowUpHandler(leadRepository));
  commandBus.register('ConvertLeadCommand', new ConvertLeadHandler(leadRepository, dbPool));

  container.registerInstance<ICommandBus>('ICommandBus', commandBus);

  // Register Query Bus with handlers
  const queryBus = new QueryBus();

  // Register query handlers
  queryBus.register('GetLeadByIdQuery', new GetLeadByIdHandler(leadRepository));
  queryBus.register('FindLeadsQuery', new FindLeadsHandler(leadRepository));
  queryBus.register('GetLeadStatsQuery', new GetLeadStatsHandler(leadRepository));
  queryBus.register('GetOverdueFollowUpsQuery', new GetOverdueFollowUpsHandler(leadRepository));

  container.registerInstance<IQueryBus>('IQueryBus', queryBus);

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
