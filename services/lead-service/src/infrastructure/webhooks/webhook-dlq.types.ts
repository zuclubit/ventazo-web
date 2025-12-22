/**
 * Webhook Dead Letter Queue Types
 * Types for DLQ management and failed delivery handling
 */

import { WebhookDelivery, WebhookEvent, DeliveryStatus } from './types';

/**
 * DLQ entry status
 */
export type DLQStatus =
  | 'pending'        // Waiting for manual action
  | 'retrying'       // Being retried
  | 'recovered'      // Successfully recovered
  | 'discarded'      // Manually discarded
  | 'expired';       // TTL expired

/**
 * DLQ failure reason categories
 */
export type FailureCategory =
  | 'network_error'      // Connection timeout, DNS failure
  | 'server_error'       // 5xx responses
  | 'client_error'       // 4xx responses
  | 'timeout'            // Request timeout
  | 'invalid_response'   // Invalid response format
  | 'circuit_open'       // Circuit breaker tripped
  | 'rate_limited'       // Rate limit exceeded
  | 'unknown';

/**
 * DLQ entry
 */
export interface DLQEntry {
  id: string;
  tenantId: string;
  webhookId: string;
  webhookName: string;
  webhookUrl: string;
  deliveryId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;

  // Failure details
  failureCategory: FailureCategory;
  failureReason: string;
  lastError: string;
  lastResponseStatus?: number;
  lastResponseBody?: string;

  // Attempt tracking
  totalAttempts: number;
  firstAttemptAt: Date;
  lastAttemptAt: Date;

  // DLQ metadata
  status: DLQStatus;
  addedToDLQAt: Date;
  expiresAt: Date;

  // Recovery tracking
  recoveryAttempts: number;
  lastRecoveryAttemptAt?: Date;
  recoveredAt?: Date;
  discardedAt?: Date;
  discardedBy?: string;
  discardReason?: string;

  // Tags for organization
  tags: string[];
  notes?: string;
}

/**
 * DLQ statistics
 */
export interface DLQStats {
  totalEntries: number;
  byStatus: Record<DLQStatus, number>;
  byCategory: Record<FailureCategory, number>;
  byWebhook: { webhookId: string; webhookName: string; count: number }[];
  byEvent: Record<WebhookEvent, number>;
  oldestEntry?: Date;
  newestEntry?: Date;
  avgAttempts: number;
  recoveryRate: number;
  entriesExpiringSoon: number;
}

/**
 * DLQ query options
 */
export interface DLQQueryOptions {
  tenantId: string;
  webhookId?: string;
  status?: DLQStatus;
  category?: FailureCategory;
  event?: WebhookEvent;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'addedToDLQAt' | 'lastAttemptAt' | 'totalAttempts';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Bulk action result
 */
export interface BulkActionResult {
  total: number;
  successful: number;
  failed: number;
  errors: { entryId: string; error: string }[];
}

/**
 * Recovery options
 */
export interface RecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  timeout?: number;
}

/**
 * DLQ configuration
 */
export interface DLQConfig {
  // TTL for DLQ entries (default: 30 days)
  entryTTLDays: number;

  // Max entries per tenant
  maxEntriesPerTenant: number;

  // Auto-retry configuration
  autoRetry: {
    enabled: boolean;
    maxAttempts: number;
    intervalMinutes: number;
    categories: FailureCategory[];
  };

  // Notifications
  notifications: {
    enabled: boolean;
    thresholdCount: number;
    notifyEmails: string[];
    notifyWebhook?: string;
  };

  // Cleanup
  cleanup: {
    enabled: boolean;
    intervalHours: number;
    keepRecoveredDays: number;
    keepDiscardedDays: number;
  };
}

/**
 * Default DLQ configuration
 */
export const DEFAULT_DLQ_CONFIG: DLQConfig = {
  entryTTLDays: 30,
  maxEntriesPerTenant: 10000,
  autoRetry: {
    enabled: true,
    maxAttempts: 3,
    intervalMinutes: 60,
    categories: ['network_error', 'server_error', 'timeout'],
  },
  notifications: {
    enabled: true,
    thresholdCount: 100,
    notifyEmails: [],
  },
  cleanup: {
    enabled: true,
    intervalHours: 24,
    keepRecoveredDays: 7,
    keepDiscardedDays: 3,
  },
};

/**
 * Retry strategy configuration
 */
export interface RetryStrategy {
  type: 'fixed' | 'exponential' | 'fibonacci';
  initialDelay: number;
  maxDelay: number;
  maxRetries: number;
  jitterFactor: number;
  retryableErrors: string[];
  retryableStatusCodes: number[];
}

/**
 * Default retry strategy
 */
export const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  type: 'exponential',
  initialDelay: 1000,
  maxDelay: 3600000, // 1 hour
  maxRetries: 5,
  jitterFactor: 0.1,
  retryableErrors: [
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'EPIPE',
  ],
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Webhook job data for queue processing
 */
export interface WebhookJobData {
  deliveryId: string;
  tenantId: string;
  webhookId: string;
  attempt: number;
  payload: Record<string, unknown>;
  timestamp: number;
  correlationId: string;
}

/**
 * Webhook job result
 */
export interface WebhookJobResult {
  success: boolean;
  deliveryId: string;
  attemptNumber: number;
  responseStatus?: number;
  responseTime: number;
  error?: string;
  movedToDLQ?: boolean;
}

/**
 * Queue metrics
 */
export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  avgProcessingTime: number;
  throughput: number;
}

/**
 * Categorize failure based on error details
 */
export function categorizeFailure(
  error: string,
  statusCode?: number
): FailureCategory {
  const errorLower = error.toLowerCase();

  if (errorLower.includes('timeout') || errorLower.includes('aborted')) {
    return 'timeout';
  }

  if (
    errorLower.includes('econnrefused') ||
    errorLower.includes('econnreset') ||
    errorLower.includes('enotfound') ||
    errorLower.includes('dns')
  ) {
    return 'network_error';
  }

  if (errorLower.includes('circuit') || errorLower.includes('breaker')) {
    return 'circuit_open';
  }

  if (errorLower.includes('rate limit') || statusCode === 429) {
    return 'rate_limited';
  }

  if (statusCode) {
    if (statusCode >= 500) return 'server_error';
    if (statusCode >= 400) return 'client_error';
  }

  if (errorLower.includes('invalid') || errorLower.includes('parse')) {
    return 'invalid_response';
  }

  return 'unknown';
}

/**
 * Calculate next retry delay
 */
export function calculateRetryDelay(
  strategy: RetryStrategy,
  attemptNumber: number
): number {
  let delay: number;

  switch (strategy.type) {
    case 'fixed':
      delay = strategy.initialDelay;
      break;

    case 'exponential':
      delay = strategy.initialDelay * Math.pow(2, attemptNumber - 1);
      break;

    case 'fibonacci':
      delay = strategy.initialDelay * fibonacci(attemptNumber);
      break;

    default:
      delay = strategy.initialDelay;
  }

  // Apply max delay cap
  delay = Math.min(delay, strategy.maxDelay);

  // Apply jitter
  if (strategy.jitterFactor > 0) {
    const jitter = delay * strategy.jitterFactor * Math.random();
    delay = delay + jitter;
  }

  return Math.round(delay);
}

function fibonacci(n: number): number {
  if (n <= 1) return 1;
  let a = 1, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(
  strategy: RetryStrategy,
  error: string,
  statusCode?: number
): boolean {
  // Check status codes
  if (statusCode && strategy.retryableStatusCodes.includes(statusCode)) {
    return true;
  }

  // Check error messages
  const errorUpper = error.toUpperCase();
  return strategy.retryableErrors.some(err => errorUpper.includes(err));
}
