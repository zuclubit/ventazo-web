/**
 * Campaign Management API Routes
 *
 * RESTful endpoints for campaign management:
 * - Campaigns
 * - Audiences
 * - Messages
 * - A/B Testing
 * - Sending & Tracking
 * - Suppression Lists
 * - Templates
 * - Analytics
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CampaignService } from './campaign.service';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const campaignTypeEnum = z.enum(['email', 'sms', 'social', 'ads', 'direct_mail', 'event', 'content', 'multi_channel']);
const campaignStatusEnum = z.enum(['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled', 'archived']);
const goalTypeEnum = z.enum(['awareness', 'engagement', 'leads', 'conversions', 'retention', 'reactivation']);
const channelTypeEnum = z.enum([
  'email', 'sms', 'whatsapp', 'facebook', 'instagram', 'linkedin', 'twitter',
  'google_ads', 'facebook_ads', 'linkedin_ads', 'push_notification', 'in_app', 'direct_mail', 'phone'
]);
const segmentOperatorEnum = z.enum([
  'equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with',
  'greater_than', 'less_than', 'between', 'in', 'not_in', 'is_empty', 'is_not_empty',
  'before', 'after', 'within_last', 'not_within_last'
]);

const campaignGoalSchema = z.object({
  id: z.string(),
  name: z.string(),
  metric: z.string(),
  targetValue: z.number(),
  currentValue: z.number().optional(),
  unit: z.string().optional(),
  isPrimary: z.boolean(),
});

const campaignSettingsSchema = z.object({
  trackOpens: z.boolean().optional(),
  trackClicks: z.boolean().optional(),
  enableUnsubscribe: z.boolean().optional(),
  unsubscribeText: z.string().optional(),
  sendRate: z.number().optional(),
  throttleEnabled: z.boolean().optional(),
  respectTimeZone: z.boolean().optional(),
  sendWindow: z.object({
    enabled: z.boolean(),
    startHour: z.number(),
    endHour: z.number(),
    days: z.array(z.number()),
  }).optional(),
  abTestEnabled: z.boolean().optional(),
  abTestId: z.string().uuid().optional(),
  automationEnabled: z.boolean().optional(),
  triggerType: z.string().optional(),
  triggerConditions: z.record(z.unknown()).optional(),
  suppressionListIds: z.array(z.string().uuid()).optional(),
  excludeUnsubscribed: z.boolean().optional(),
  excludeBounced: z.boolean().optional(),
  excludeComplained: z.boolean().optional(),
  requireApproval: z.boolean().optional(),
  approverIds: z.array(z.string().uuid()).optional(),
  doubleOptIn: z.boolean().optional(),
  personalizeContent: z.boolean().optional(),
}).optional();

const createCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: campaignTypeEnum,
  goalType: goalTypeEnum.optional(),
  channels: z.array(channelTypeEnum).optional(),
  primaryChannel: channelTypeEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timezone: z.string().optional(),
  audienceId: z.string().uuid().optional(),
  audienceName: z.string().optional(),
  budgetAmount: z.number().int().optional(),
  budgetCurrency: z.string().length(3).optional(),
  goals: z.array(campaignGoalSchema).optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  subject: z.string().max(500).optional(),
  previewText: z.string().max(500).optional(),
  fromName: z.string().optional(),
  fromEmail: z.string().email().optional(),
  replyTo: z.string().email().optional(),
  templateId: z.string().uuid().optional(),
  settings: campaignSettingsSchema,
  tags: z.array(z.string()).optional(),
  folderId: z.string().uuid().optional(),
  ownerId: z.string().uuid(),
  ownerName: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
});

const updateCampaignSchema = createCampaignSchema.partial().omit({ type: true, ownerId: true });

const searchCampaignsSchema = z.object({
  search: z.string().optional(),
  status: z.array(campaignStatusEnum).optional(),
  type: z.array(campaignTypeEnum).optional(),
  channel: z.array(channelTypeEnum).optional(),
  goalType: z.array(goalTypeEnum).optional(),
  tags: z.array(z.string()).optional(),
  ownerId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional(),
  startDateFrom: z.string().datetime().optional(),
  startDateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const audienceRuleSchema = z.object({
  id: z.string(),
  field: z.string(),
  operator: segmentOperatorEnum,
  value: z.unknown(),
  dataType: z.enum(['string', 'number', 'date', 'boolean', 'array']),
  sourceTable: z.string().optional(),
});

const createAudienceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(['static', 'dynamic']),
  rules: z.array(audienceRuleSchema).optional(),
  ruleLogic: z.enum(['and', 'or']).optional(),
  memberIds: z.array(z.string().uuid()).optional(),
  refreshInterval: z.number().int().optional(),
  autoRefresh: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const mergeFieldSchema = z.object({
  tag: z.string(),
  field: z.string(),
  fallback: z.string().optional(),
});

const createMessageSchema = z.object({
  channel: channelTypeEnum,
  name: z.string().min(1).max(255),
  subject: z.string().max(500).optional(),
  previewText: z.string().max(500).optional(),
  bodyHtml: z.string().optional(),
  bodyText: z.string().optional(),
  bodyJson: z.record(z.unknown()).optional(),
  templateId: z.string().uuid().optional(),
  mergeFields: z.array(mergeFieldSchema).optional(),
  isVariant: z.boolean().optional(),
  variantName: z.string().optional(),
  variantWeight: z.number().min(0).max(100).optional(),
  sendAt: z.string().datetime().optional(),
  delayMinutes: z.number().int().optional(),
});

const abTestVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  weight: z.number(),
  messageId: z.string().uuid(),
});

const createAbTestSchema = z.object({
  name: z.string().min(1).max(255),
  testType: z.enum(['subject', 'content', 'from_name', 'send_time', 'full_message']),
  variants: z.array(abTestVariantSchema).min(2),
  sampleSize: z.number().min(1).max(100).optional(),
  winnerCriteria: z.enum(['open_rate', 'click_rate', 'conversion_rate', 'revenue']).optional(),
  testDurationHours: z.number().int().min(1).optional(),
});

const recordSendSchema = z.object({
  recipientId: z.string().uuid(),
  recipientEmail: z.string().email().optional(),
  recipientPhone: z.string().optional(),
  channel: channelTypeEnum,
  variantId: z.string().uuid().optional(),
  externalId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateSendStatusSchema = z.object({
  status: z.enum(['pending', 'queued', 'sending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed', 'complained']),
  externalId: z.string().optional(),
  messageIdExternal: z.string().optional(),
  bounceType: z.enum(['hard', 'soft', 'block']).optional(),
  bounceReason: z.string().optional(),
  failureReason: z.string().optional(),
});

const recordClickSchema = z.object({
  url: z.string().url(),
  linkId: z.string().optional(),
  linkName: z.string().optional(),
  deviceType: z.string().optional(),
  browser: z.string().optional(),
  os: z.string().optional(),
  ip: z.string().optional(),
  country: z.string().length(2).optional(),
  city: z.string().optional(),
});

const recordConversionSchema = z.object({
  recipientId: z.string().uuid(),
  conversionType: z.string(),
  conversionValue: z.number().int().optional(),
  currency: z.string().length(3).optional(),
  attributionModel: z.enum(['first_touch', 'last_touch', 'linear', 'time_decay']).optional(),
  attributionWeight: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const createSuppressionListSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(['manual', 'unsubscribed', 'bounced', 'complained', 'imported']),
});

const addToSuppressionSchema = z.object({
  entries: z.array(z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    contactId: z.string().uuid().optional(),
    reason: z.string().optional(),
    source: z.string().optional(),
  })).min(1),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(['marketing', 'transactional', 'notification', 'system']).optional(),
  category: z.string().optional(),
  subject: z.string().max(500).optional(),
  previewText: z.string().max(500).optional(),
  bodyHtml: z.string(),
  bodyText: z.string().optional(),
  designJson: z.record(z.unknown()).optional(),
  thumbnailUrl: z.string().url().optional(),
  mergeFields: z.array(mergeFieldSchema).optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().optional(),
  color: z.string().optional(),
});

const createTriggerSchema = z.object({
  triggerType: z.enum(['event', 'date', 'segment_entry', 'segment_exit', 'api', 'form_submission', 'page_visit', 'email_event']),
  triggerEvent: z.string().optional(),
  triggerConditions: z.array(audienceRuleSchema).optional(),
  delayType: z.enum(['none', 'fixed', 'until_time']).optional(),
  delayMinutes: z.number().int().optional(),
  delayUntilHour: z.number().int().min(0).max(23).optional(),
  delayUntilDay: z.number().int().min(0).max(6).optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

export async function campaignRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions): Promise<void> {
  const campaignService = container.resolve(CampaignService);

  const getContext = (request: any) => ({
    tenantId: request.headers['x-tenant-id'] as string || 'default-tenant',
    userId: request.headers['x-user-id'] as string || 'system',
  });

  // ============================================================================
  // CAMPAIGN ENDPOINTS
  // ============================================================================

  // Create campaign
  fastify.post('/', async (request, reply) => {
    const { tenantId, userId } = getContext(request);
    const input = createCampaignSchema.parse(request.body);

    const result = await campaignService.createCampaign(tenantId, userId, {
      ...input,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get campaign by ID
  fastify.get('/:campaignId', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { campaignId } = request.params as { campaignId: string };

    const result = await campaignService.getCampaignById(tenantId, campaignId);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    if (!result.value) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    return result.value;
  });

  // Search campaigns
  fastify.get('/', async (request, reply) => {
    const { tenantId } = getContext(request);
    const filters = searchCampaignsSchema.parse(request.query);
    const { page, limit, ...searchFilters } = filters;

    const result = await campaignService.searchCampaigns(
      tenantId,
      {
        ...searchFilters,
        startDateFrom: searchFilters.startDateFrom ? new Date(searchFilters.startDateFrom) : undefined,
        startDateTo: searchFilters.startDateTo ? new Date(searchFilters.startDateTo) : undefined,
      },
      { page, limit }
    );

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return result.value;
  });

  // Update campaign
  fastify.patch('/:campaignId', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { campaignId } = request.params as { campaignId: string };
    const updates = updateCampaignSchema.parse(request.body);

    const result = await campaignService.updateCampaign(tenantId, campaignId, {
      ...updates,
      startDate: updates.startDate ? new Date(updates.startDate) : undefined,
      endDate: updates.endDate ? new Date(updates.endDate) : undefined,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return result.value;
  });

  // Update campaign status
  fastify.patch('/:campaignId/status', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { campaignId } = request.params as { campaignId: string };
    const { status } = z.object({ status: campaignStatusEnum }).parse(request.body);

    const result = await campaignService.updateCampaignStatus(tenantId, campaignId, status);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return result.value;
  });

  // Delete campaign
  fastify.delete('/:campaignId', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { campaignId } = request.params as { campaignId: string };

    const result = await campaignService.deleteCampaign(tenantId, campaignId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(204).send();
  });

  // ============================================================================
  // AUDIENCE ENDPOINTS
  // ============================================================================

  // Create audience
  fastify.post('/audiences', async (request, reply) => {
    const { tenantId, userId } = getContext(request);
    const input = createAudienceSchema.parse(request.body);

    const result = await campaignService.createAudience(tenantId, userId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get audience by ID
  fastify.get('/audiences/:audienceId', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { audienceId } = request.params as { audienceId: string };

    const result = await campaignService.getAudienceById(tenantId, audienceId);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    if (!result.value) {
      return reply.status(404).send({ error: 'Audience not found' });
    }

    return result.value;
  });

  // Get all audiences
  fastify.get('/audiences', async (request, reply) => {
    const { tenantId } = getContext(request);

    const result = await campaignService.getAudiences(tenantId);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return result.value;
  });

  // ============================================================================
  // MESSAGE ENDPOINTS
  // ============================================================================

  // Create message
  fastify.post('/:campaignId/messages', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { campaignId } = request.params as { campaignId: string };
    const input = createMessageSchema.parse(request.body);

    const result = await campaignService.createMessage(tenantId, campaignId, {
      ...input,
      sendAt: input.sendAt ? new Date(input.sendAt) : undefined,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get campaign messages
  fastify.get('/:campaignId/messages', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { campaignId } = request.params as { campaignId: string };

    const result = await campaignService.getCampaignMessages(tenantId, campaignId);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return result.value;
  });

  // ============================================================================
  // A/B TEST ENDPOINTS
  // ============================================================================

  // Create A/B test
  fastify.post('/:campaignId/ab-tests', async (request, reply) => {
    const { tenantId, userId } = getContext(request);
    const { campaignId } = request.params as { campaignId: string };
    const input = createAbTestSchema.parse(request.body);

    const result = await campaignService.createAbTest(tenantId, userId, campaignId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Start A/B test
  fastify.post('/ab-tests/:testId/start', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { testId } = request.params as { testId: string };

    const result = await campaignService.startAbTest(tenantId, testId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return result.value;
  });

  // Declare A/B test winner
  fastify.post('/ab-tests/:testId/winner', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { testId } = request.params as { testId: string };
    const { winnerId, declaredBy } = z.object({
      winnerId: z.string().uuid(),
      declaredBy: z.enum(['automatic', 'manual']),
    }).parse(request.body);

    const result = await campaignService.declareAbTestWinner(tenantId, testId, winnerId, declaredBy);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return result.value;
  });

  // ============================================================================
  // SENDING & TRACKING ENDPOINTS
  // ============================================================================

  // Record send
  fastify.post('/:campaignId/messages/:messageId/sends', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { campaignId, messageId } = request.params as { campaignId: string; messageId: string };
    const input = recordSendSchema.parse(request.body);

    const result = await campaignService.recordSend(tenantId, campaignId, messageId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Update send status
  fastify.patch('/sends/:sendId/status', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { sendId } = request.params as { sendId: string };
    const input = updateSendStatusSchema.parse(request.body);
    const { status, ...additionalData } = input;

    const result = await campaignService.updateSendStatus(tenantId, sendId, status, additionalData);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return result.value;
  });

  // Record click
  fastify.post('/sends/:sendId/clicks', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { sendId } = request.params as { sendId: string };
    const { campaignId } = z.object({ campaignId: z.string().uuid() }).parse(request.query);
    const input = recordClickSchema.parse(request.body);

    const result = await campaignService.recordClick(tenantId, sendId, campaignId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Record conversion
  fastify.post('/sends/:sendId/conversions', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { sendId } = request.params as { sendId: string };
    const { campaignId } = z.object({ campaignId: z.string().uuid() }).parse(request.query);
    const input = recordConversionSchema.parse(request.body);

    const result = await campaignService.recordConversion(tenantId, sendId, campaignId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // ============================================================================
  // SUPPRESSION LIST ENDPOINTS
  // ============================================================================

  // Create suppression list
  fastify.post('/suppression-lists', async (request, reply) => {
    const { tenantId, userId } = getContext(request);
    const input = createSuppressionListSchema.parse(request.body);

    const result = await campaignService.createSuppressionList(tenantId, userId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Add to suppression list
  fastify.post('/suppression-lists/:listId/entries', async (request, reply) => {
    const { tenantId, userId } = getContext(request);
    const { listId } = request.params as { listId: string };
    const { entries } = addToSuppressionSchema.parse(request.body);

    const result = await campaignService.addToSuppressionList(tenantId, userId, listId, entries);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return { added: result.value };
  });

  // Check suppression
  fastify.get('/suppression/check', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { email } = z.object({ email: z.string().email() }).parse(request.query);

    const result = await campaignService.isEmailSuppressed(tenantId, email);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return { suppressed: result.value };
  });

  // ============================================================================
  // TEMPLATE ENDPOINTS
  // ============================================================================

  // Create template
  fastify.post('/templates', async (request, reply) => {
    const { tenantId, userId } = getContext(request);
    const input = createTemplateSchema.parse(request.body);

    const result = await campaignService.createEmailTemplate(tenantId, userId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get templates
  fastify.get('/templates', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { type, category } = request.query as { type?: string; category?: string };

    const result = await campaignService.getEmailTemplates(tenantId, { type, category });

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return result.value;
  });

  // ============================================================================
  // FOLDER ENDPOINTS
  // ============================================================================

  // Create folder
  fastify.post('/folders', async (request, reply) => {
    const { tenantId, userId } = getContext(request);
    const input = createFolderSchema.parse(request.body);

    const result = await campaignService.createFolder(tenantId, userId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get folders
  fastify.get('/folders', async (request, reply) => {
    const { tenantId } = getContext(request);

    const result = await campaignService.getFolders(tenantId);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return result.value;
  });

  // ============================================================================
  // ANALYTICS ENDPOINTS
  // ============================================================================

  // Get campaign analytics
  fastify.get('/:campaignId/analytics', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { campaignId } = request.params as { campaignId: string };

    const result = await campaignService.getOrCreateAnalytics(tenantId, campaignId);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return result.value;
  });

  // Refresh campaign analytics
  fastify.post('/:campaignId/analytics/refresh', async (request, reply) => {
    const { campaignId } = request.params as { campaignId: string };

    const result = await campaignService.updateAnalytics(campaignId);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return result.value;
  });

  // Get dashboard
  fastify.get('/dashboard', async (request, reply) => {
    const { tenantId } = getContext(request);

    const result = await campaignService.getDashboard(tenantId);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return result.value;
  });

  // ============================================================================
  // AUTOMATION ENDPOINTS
  // ============================================================================

  // Create trigger
  fastify.post('/:campaignId/triggers', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { campaignId } = request.params as { campaignId: string };
    const input = createTriggerSchema.parse(request.body);

    const result = await campaignService.createAutomationTrigger(tenantId, campaignId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get campaign triggers
  fastify.get('/:campaignId/triggers', async (request, reply) => {
    const { tenantId } = getContext(request);
    const { campaignId } = request.params as { campaignId: string };

    const result = await campaignService.getCampaignTriggers(tenantId, campaignId);

    if (result.isFailure) {
      return reply.status(500).send({ error: result.error });
    }

    return result.value;
  });
}
