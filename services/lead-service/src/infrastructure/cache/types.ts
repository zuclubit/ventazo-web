/**
 * Redis Cache Types
 * Type definitions for the caching layer
 */

/**
 * Cache configuration options
 */
export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  tls?: boolean;
  maxRetriesPerRequest?: number;
  retryDelayMs?: number;
  connectTimeout?: number;
  commandTimeout?: number;
  enableOfflineQueue?: boolean;
  lazyConnect?: boolean;
}

/**
 * Cache entry options
 */
export interface CacheSetOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for cache invalidation
  sliding?: boolean; // Reset TTL on access
  compress?: boolean; // Compress large values
}

/**
 * Cache get result
 */
export interface CacheGetResult<T> {
  value: T | null;
  hit: boolean;
  metadata?: CacheMetadata;
}

/**
 * Cache metadata
 */
export interface CacheMetadata {
  createdAt: Date;
  expiresAt?: Date;
  hits: number;
  lastAccessed: Date;
  size: number;
  compressed: boolean;
  tags: string[];
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  keys: number;
  memory: number;
  evictions: number;
  expired: number;
  avgTtl: number;
  uptime: number;
  connectedClients: number;
}

/**
 * Cache key patterns for different entities
 */
export const CacheKeys = {
  // Lead-related keys
  lead: (tenantId: string, leadId: string) => `tenant:${tenantId}:lead:${leadId}`,
  leadList: (tenantId: string, hash: string) => `tenant:${tenantId}:leads:list:${hash}`,
  leadStats: (tenantId: string) => `tenant:${tenantId}:leads:stats`,
  leadScore: (tenantId: string, leadId: string) => `tenant:${tenantId}:lead:${leadId}:score`,

  // Pipeline-related keys
  pipeline: (tenantId: string, pipelineId: string) => `tenant:${tenantId}:pipeline:${pipelineId}`,
  pipelineList: (tenantId: string) => `tenant:${tenantId}:pipelines:list`,
  pipelineStats: (tenantId: string, pipelineId: string) => `tenant:${tenantId}:pipeline:${pipelineId}:stats`,

  // Contact-related keys
  contact: (tenantId: string, contactId: string) => `tenant:${tenantId}:contact:${contactId}`,
  contactList: (tenantId: string, leadId: string) => `tenant:${tenantId}:lead:${leadId}:contacts`,

  // Customer-related keys
  customer: (tenantId: string, customerId: string) => `tenant:${tenantId}:customer:${customerId}`,
  customer360: (tenantId: string, customerId: string) => `tenant:${tenantId}:customer:${customerId}:360`,

  // Opportunity-related keys
  opportunity: (tenantId: string, opportunityId: string) => `tenant:${tenantId}:opportunity:${opportunityId}`,
  opportunityList: (tenantId: string, hash: string) => `tenant:${tenantId}:opportunities:list:${hash}`,

  // Task-related keys
  task: (tenantId: string, taskId: string) => `tenant:${tenantId}:task:${taskId}`,
  taskList: (tenantId: string, assigneeId: string) => `tenant:${tenantId}:tasks:assignee:${assigneeId}`,

  // Analytics keys
  analytics: (tenantId: string, reportType: string, period: string) =>
    `tenant:${tenantId}:analytics:${reportType}:${period}`,
  dashboard: (tenantId: string) => `tenant:${tenantId}:dashboard`,

  // Search keys
  searchResults: (tenantId: string, queryHash: string) => `tenant:${tenantId}:search:${queryHash}`,
  searchSuggestions: (tenantId: string, prefix: string) => `tenant:${tenantId}:search:suggest:${prefix}`,

  // User-related keys
  user: (tenantId: string, userId: string) => `tenant:${tenantId}:user:${userId}`,
  userSession: (tenantId: string, sessionId: string) => `tenant:${tenantId}:session:${sessionId}`,
  userPermissions: (tenantId: string, userId: string) => `tenant:${tenantId}:user:${userId}:permissions`,

  // Rate limiting keys
  rateLimit: (tenantId: string, userId: string, endpoint: string) =>
    `tenant:${tenantId}:ratelimit:${userId}:${endpoint}`,
  rateLimitGlobal: (ip: string) => `ratelimit:ip:${ip}`,

  // Webhook keys
  webhookDelivery: (webhookId: string, deliveryId: string) => `webhook:${webhookId}:delivery:${deliveryId}`,
  webhookQueue: (tenantId: string) => `tenant:${tenantId}:webhook:queue`,

  // Integration keys
  integrationToken: (tenantId: string, integrationId: string) =>
    `tenant:${tenantId}:integration:${integrationId}:token`,
  integrationSync: (tenantId: string, integrationId: string) =>
    `tenant:${tenantId}:integration:${integrationId}:sync`,

  // ML Scoring keys
  mlScore: (tenantId: string, leadId: string) => `tenant:${tenantId}:ml:score:${leadId}`,
  mlModel: (modelId: string) => `ml:model:${modelId}`,
  mlPriorityQueue: (tenantId: string) => `tenant:${tenantId}:ml:priority`,

  // Lock keys
  lock: (resource: string) => `lock:${resource}`,
  distributedLock: (tenantId: string, resource: string) => `tenant:${tenantId}:lock:${resource}`,
} as const;

/**
 * Default TTL values in seconds
 */
export const CacheTTL = {
  // Short-lived (1-5 minutes)
  searchResults: 60,
  searchSuggestions: 120,
  rateLimit: 60,

  // Medium-lived (5-30 minutes)
  leadList: 300,
  pipelineStats: 300,
  taskList: 300,
  analytics: 600,
  dashboard: 600,

  // Long-lived (1-24 hours)
  lead: 1800,
  contact: 1800,
  customer: 3600,
  customer360: 1800,
  opportunity: 1800,
  pipeline: 3600,
  user: 3600,
  userPermissions: 3600,
  mlScore: 86400,

  // Very long-lived (24+ hours)
  mlModel: 86400 * 7,
  integrationToken: 86400,

  // Session-based
  userSession: 86400,

  // Lock timeouts
  lock: 30,
  distributedLock: 60,
} as const;

/**
 * Cache invalidation event
 */
export interface CacheInvalidationEvent {
  type: 'single' | 'pattern' | 'tag' | 'all';
  keys?: string[];
  pattern?: string;
  tags?: string[];
  reason: string;
  timestamp: Date;
  tenantId?: string;
}

/**
 * Cache warming configuration
 */
export interface CacheWarmingConfig {
  enabled: boolean;
  entities: CacheWarmingEntity[];
  schedule?: string; // Cron expression
  batchSize: number;
  concurrency: number;
}

/**
 * Entity warming configuration
 */
export interface CacheWarmingEntity {
  type: 'lead' | 'customer' | 'pipeline' | 'analytics';
  priority: 'high' | 'medium' | 'low';
  filter?: Record<string, unknown>;
  ttl?: number;
}

/**
 * Cache decorator options
 */
export interface CacheDecoratorOptions {
  keyGenerator?: (...args: unknown[]) => string;
  ttl?: number;
  tags?: string[];
  condition?: (...args: unknown[]) => boolean;
  unless?: (result: unknown) => boolean;
}

/**
 * Distributed lock options
 */
export interface DistributedLockOptions {
  ttl: number; // Lock TTL in milliseconds
  retryCount?: number;
  retryDelay?: number; // Milliseconds between retries
  onLockAcquired?: () => void;
  onLockReleased?: () => void;
  onLockFailed?: (reason: string) => void;
}

/**
 * Lock result
 */
export interface LockResult {
  acquired: boolean;
  lockId?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Cache health status
 */
export interface CacheHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  connected: boolean;
  lastError?: string;
  lastErrorTime?: Date;
  stats: CacheStats;
}

/**
 * Cached entity wrapper
 */
export interface CachedEntity<T> {
  data: T;
  metadata: CacheMetadata;
  version: number;
  etag: string;
}

/**
 * Multi-get result
 */
export interface MultiGetResult<T> {
  found: Map<string, T>;
  missing: string[];
}

/**
 * Cache operation result
 */
export interface CacheOperationResult {
  success: boolean;
  operation: 'get' | 'set' | 'delete' | 'invalidate';
  key?: string;
  duration: number;
  error?: string;
}

/**
 * Cache event types
 */
export type CacheEventType =
  | 'hit'
  | 'miss'
  | 'set'
  | 'delete'
  | 'expire'
  | 'evict'
  | 'invalidate'
  | 'error'
  | 'connect'
  | 'disconnect';

/**
 * Cache event
 */
export interface CacheEvent {
  type: CacheEventType;
  key?: string;
  tenantId?: string;
  timestamp: Date;
  duration?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Cache listener
 */
export type CacheListener = (event: CacheEvent) => void;
