/**
 * Webhook Types and Interfaces
 * Defines webhook events, configurations, and delivery types
 */

export enum WebhookEvent {
  // Lead Events
  LEAD_CREATED = 'lead.created',
  LEAD_UPDATED = 'lead.updated',
  LEAD_DELETED = 'lead.deleted',
  LEAD_STATUS_CHANGED = 'lead.status_changed',
  LEAD_SCORE_CHANGED = 'lead.score_changed',
  LEAD_ASSIGNED = 'lead.assigned',
  LEAD_QUALIFIED = 'lead.qualified',
  LEAD_CONVERTED = 'lead.converted',
  LEAD_LOST = 'lead.lost',

  // Follow-up Events
  FOLLOW_UP_SCHEDULED = 'follow_up.scheduled',
  FOLLOW_UP_COMPLETED = 'follow_up.completed',
  FOLLOW_UP_OVERDUE = 'follow_up.overdue',

  // Pipeline Events
  PIPELINE_STAGE_CHANGED = 'pipeline.stage_changed',

  // Catch-all
  ALL = '*',
}

export enum WebhookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FAILED = 'failed', // Auto-disabled after too many failures
}

export enum DeliveryStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

export interface WebhookConfig {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  url: string;
  events: WebhookEvent[];
  status: WebhookStatus;
  secret?: string; // For signature verification
  headers?: Record<string, string>;
  retryPolicy: {
    maxRetries: number;
    retryDelayMs: number;
    backoffMultiplier: number;
  };
  filters?: {
    // Optional filters for when to trigger
    statuses?: string[];
    scoreRange?: { min?: number; max?: number };
    sources?: string[];
    owners?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
  failureCount: number;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  tenantId: string;
  event: WebhookEvent;
  payload: WebhookPayload;
  status: DeliveryStatus;
  url: string;
  requestHeaders: Record<string, string>;
  responseStatus?: number;
  responseBody?: string;
  responseHeaders?: Record<string, string>;
  error?: string;
  attemptCount: number;
  nextRetryAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  duration?: number; // ms
}

export interface WebhookPayload {
  id: string;
  event: WebhookEvent;
  timestamp: string;
  tenantId: string;
  data: WebhookEventData;
  metadata?: Record<string, unknown>;
}

export interface WebhookEventData {
  // Common fields
  entityType: 'lead' | 'follow_up' | 'pipeline';
  entityId: string;
  action: string;

  // Entity data
  current?: Record<string, unknown>;
  previous?: Record<string, unknown>;
  changes?: Record<string, { before: unknown; after: unknown }>;

  // Context
  triggeredBy?: string;
  correlationId?: string;
}

export interface CreateWebhookInput {
  tenantId: string;
  name: string;
  description?: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  headers?: Record<string, string>;
  retryPolicy?: Partial<WebhookConfig['retryPolicy']>;
  filters?: WebhookConfig['filters'];
}

export interface UpdateWebhookInput {
  name?: string;
  description?: string;
  url?: string;
  events?: WebhookEvent[];
  status?: WebhookStatus;
  secret?: string;
  headers?: Record<string, string>;
  retryPolicy?: Partial<WebhookConfig['retryPolicy']>;
  filters?: WebhookConfig['filters'];
}

export interface WebhookQueryOptions {
  tenantId: string;
  status?: WebhookStatus;
  event?: WebhookEvent;
  page?: number;
  limit?: number;
}

export interface DeliveryQueryOptions {
  tenantId: string;
  webhookId?: string;
  status?: DeliveryStatus;
  event?: WebhookEvent;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// Default retry policy
export const DEFAULT_RETRY_POLICY: WebhookConfig['retryPolicy'] = {
  maxRetries: 5,
  retryDelayMs: 1000,
  backoffMultiplier: 2,
};

// Max failures before auto-disable
export const MAX_CONSECUTIVE_FAILURES = 10;

// Webhook timeout (ms)
export const WEBHOOK_TIMEOUT_MS = 30000;

// Webhook signature header
export const WEBHOOK_SIGNATURE_HEADER = 'x-webhook-signature';
export const WEBHOOK_TIMESTAMP_HEADER = 'x-webhook-timestamp';
export const WEBHOOK_ID_HEADER = 'x-webhook-id';
