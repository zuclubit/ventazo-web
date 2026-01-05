/**
 * Routes Index
 * Export all route plugins for the Lead Service
 *
 * The leadRoutes is a Fastify plugin that registers all lead-related endpoints.
 * It follows the CQRS pattern using CommandBus and QueryBus for proper
 * separation of concerns.
 */
export { leadRoutes } from './lead.routes';
export { pipelineRoutes } from './pipeline.routes';
export { analyticsRoutes } from './analytics.routes';
export { webhookRoutes } from './webhooks.routes';
export { bulkRoutes } from './bulk.routes';
export { deduplicationRoutes } from './deduplication.routes';
export { contactRoutes } from './contact.routes';
export { contactsStandaloneRoutes } from './contacts-standalone.routes';
export { communicationRoutes } from './communication.routes';
export { searchRoutes } from './search.routes';
export { taskRoutes } from './task.routes';
export { opportunityRoutes } from './opportunity.routes';
export { customerRoutes } from './customer.routes';
export { authRoutes, memberRoutes, tenantRoutes, userSyncRoutes } from './auth.routes';
export { invitationRoutes } from './invitation.routes';
export { onboardingRoutes, auditLogRoutes } from './onboarding.routes';
export { calendarRoutes } from './calendar.routes';
export { notesRoutes } from './notes.routes';
export { attachmentsRoutes } from './attachments.routes';
export { workflowsRoutes } from './workflows.routes';
export { pushRoutes } from './push.routes';
export { emailSyncRoutes } from './email-sync.routes';
export { smsRoutes } from './sms.routes';
export { enrichmentRoutes } from './enrichment.routes';
export { gdprRoutes } from './gdpr.routes';
export { reportsRoutes } from './reports.routes';
export { whatsappRoutes } from './whatsapp.routes';
export { messengerRoutes } from './messenger.routes';
export { messengerOAuthRoutes } from './messenger-oauth.routes';
export { paymentRoutes } from './payment.routes';
export { quoteRoutes } from './quote.routes';
export { proposalTemplateRoutes } from './proposal-template.routes';
export { aiRoutes } from './ai.routes';
export { realtimeRoutes } from './realtime.routes';
export { teamRoutes, territoryRoutes, quotaRoutes } from './team.routes';
export { emailTrackingRoutes } from './email-tracking.routes';
export { forecastingRoutes } from './forecasting.routes';
export { customerSuccessRoutes } from './customer-success.routes';
export { contractRoutes } from './contract.routes';
export { permissionRoutes } from './permission.routes';
export { productRoutes } from './product.routes';
export { campaignRoutes } from './campaign.routes';
export { dripSequenceRoutes } from './drip-sequence.routes';
export { activityTrackingRoutes } from './activity-tracking.routes';
export { documentRoutes } from './document.routes';
export { customer360Routes } from './customer-360.routes';
export { unifiedInboxRoutes } from './unified-inbox.routes';
export { subscriptionAnalyticsRoutes } from './subscription-analytics.routes';
export { integrationHubRoutes } from './integration-hub.routes';
export { mlScoringRoutes } from './ml-scoring.routes';
export { cacheRoutes } from './cache.routes';
export { resilienceRoutes } from './resilience.routes';
export { auditRoutes } from './audit.routes';
export { rateLimitingRoutes } from './rate-limiting.routes';
export { webhookDLQRoutes } from './webhook-dlq.routes';
export { tracingRoutes } from './tracing.routes';
export { lockingRoutes } from './locking.routes';
export { segmentationRoutes } from './segmentation.routes';
export { emailTemplateRoutes } from './email-template.routes';
export { advancedReportRoutes } from './advanced-report.routes';
export { customFieldRoutes } from './custom-field.routes';
export { workflowBuilderRoutes } from './workflow-builder.routes';
export { integrationConnectorRoutes } from './integration-connector.routes';
export { notificationRoutes } from './notification.routes';
export { messagingRoutes } from './messaging.routes';
export { kanbanRoutes } from './kanban.routes';
export { securityRoutes } from './security.routes';
export { dataManagementRoutes } from './data-management.routes';
export { userTagsRoutes, userTagsUserRoutes } from './user-tags.routes';
