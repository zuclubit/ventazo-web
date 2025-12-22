/**
 * Advanced Rate Limiting Types
 * Per-user, per-endpoint, and tenant-based rate limiting
 */

/**
 * Rate limit algorithm type
 */
export type RateLimitAlgorithm =
  | 'fixed_window'
  | 'sliding_window'
  | 'token_bucket'
  | 'leaky_bucket';

/**
 * Rate limit scope
 */
export type RateLimitScope =
  | 'global'        // All requests across all tenants
  | 'tenant'        // Per tenant
  | 'user'          // Per user within tenant
  | 'ip'            // Per IP address
  | 'endpoint'      // Per endpoint
  | 'user_endpoint' // Per user per endpoint
  | 'api_key';      // Per API key

/**
 * Rate limit tier
 */
export type RateLimitTier = 'free' | 'starter' | 'professional' | 'enterprise' | 'unlimited';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  id: string;
  name: string;
  scope: RateLimitScope;
  algorithm: RateLimitAlgorithm;
  limit: number;           // Maximum requests
  window: number;          // Window size in seconds
  burstLimit?: number;     // Allow burst above limit temporarily
  costPerRequest?: number; // For weighted rate limiting
  keyGenerator?: string;   // Custom key generation function name
  skipCondition?: string;  // Condition to skip rate limiting
  enabled: boolean;
  priority: number;        // Higher priority rules checked first
}

/**
 * Rate limit rule for specific endpoints
 */
export interface EndpointRateLimitRule {
  id: string;
  pattern: string;        // URL pattern (e.g., "/api/v1/leads/*")
  methods: string[];      // HTTP methods (GET, POST, etc.)
  config: RateLimitConfig;
  applyTo: RateLimitScope[];
  excludeRoles?: string[];
  excludeUsers?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * User rate limit quota
 */
export interface UserRateLimitQuota {
  userId: string;
  tenantId: string;
  tier: RateLimitTier;
  customLimits?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
    apiCallsPerMonth?: number;
    dataExportsPerDay?: number;
    bulkOperationsPerHour?: number;
  };
  overrides?: EndpointOverride[];
  validFrom: Date;
  validUntil?: Date;
}

/**
 * Endpoint-specific override
 */
export interface EndpointOverride {
  pattern: string;
  limit: number;
  window: number;
}

/**
 * Tenant rate limit configuration
 */
export interface TenantRateLimitConfig {
  tenantId: string;
  tier: RateLimitTier;
  limits: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    concurrentRequests: number;
    webhooksPerMinute: number;
    apiCallsPerMonth: number;
    storageBytes: number;
  };
  features: {
    priorityQueue: boolean;
    burstAllowance: boolean;
    customEndpointLimits: boolean;
    rateLimitBypass: string[];
  };
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;          // Unix timestamp when limit resets
  retryAfter?: number;    // Seconds until next request allowed
  scope: RateLimitScope;
  key: string;
  rule?: string;
  cost: number;
  tier?: RateLimitTier;
}

/**
 * Rate limit headers
 */
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-RateLimit-Policy'?: string;
  'Retry-After'?: string;
}

/**
 * Rate limit metrics
 */
export interface RateLimitMetrics {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  byScope: Record<RateLimitScope, {
    allowed: number;
    blocked: number;
  }>;
  byTier: Record<RateLimitTier, {
    allowed: number;
    blocked: number;
  }>;
  byEndpoint: Record<string, {
    allowed: number;
    blocked: number;
    avgResponseTime: number;
  }>;
  topBlockedUsers: { userId: string; count: number }[];
  topBlockedIps: { ip: string; count: number }[];
  peakHour: number;
  avgRequestsPerMinute: number;
}

/**
 * Rate limit event
 */
export interface RateLimitEvent {
  type: 'allowed' | 'blocked' | 'warning' | 'quota_reset';
  timestamp: Date;
  scope: RateLimitScope;
  key: string;
  tenantId?: string;
  userId?: string;
  ip?: string;
  endpoint?: string;
  method?: string;
  limit: number;
  remaining: number;
  cost: number;
  rule?: string;
}

/**
 * Rate limit event listener
 */
export type RateLimitEventListener = (event: RateLimitEvent) => void;

/**
 * Default tier limits
 */
export const DEFAULT_TIER_LIMITS: Record<RateLimitTier, TenantRateLimitConfig['limits']> = {
  free: {
    requestsPerSecond: 5,
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    concurrentRequests: 5,
    webhooksPerMinute: 10,
    apiCallsPerMonth: 100000,
    storageBytes: 1073741824, // 1GB
  },
  starter: {
    requestsPerSecond: 20,
    requestsPerMinute: 300,
    requestsPerHour: 5000,
    requestsPerDay: 50000,
    concurrentRequests: 20,
    webhooksPerMinute: 50,
    apiCallsPerMonth: 500000,
    storageBytes: 10737418240, // 10GB
  },
  professional: {
    requestsPerSecond: 50,
    requestsPerMinute: 1000,
    requestsPerHour: 20000,
    requestsPerDay: 200000,
    concurrentRequests: 50,
    webhooksPerMinute: 200,
    apiCallsPerMonth: 2000000,
    storageBytes: 107374182400, // 100GB
  },
  enterprise: {
    requestsPerSecond: 200,
    requestsPerMinute: 5000,
    requestsPerHour: 100000,
    requestsPerDay: 1000000,
    concurrentRequests: 200,
    webhooksPerMinute: 1000,
    apiCallsPerMonth: 10000000,
    storageBytes: 1099511627776, // 1TB
  },
  unlimited: {
    requestsPerSecond: 1000,
    requestsPerMinute: 60000,
    requestsPerHour: 3600000,
    requestsPerDay: 86400000,
    concurrentRequests: 1000,
    webhooksPerMinute: 10000,
    apiCallsPerMonth: -1, // Unlimited
    storageBytes: -1, // Unlimited
  },
};

/**
 * Default endpoint rate limits
 */
export const DEFAULT_ENDPOINT_LIMITS: EndpointRateLimitRule[] = [
  // Auth endpoints - stricter limits to prevent brute force
  {
    id: 'auth-login',
    pattern: '/api/v1/auth/login',
    methods: ['POST'],
    config: {
      id: 'auth-login-config',
      name: 'Login Rate Limit',
      scope: 'ip',
      algorithm: 'sliding_window',
      limit: 5,
      window: 300, // 5 minutes
      enabled: true,
      priority: 100,
    },
    applyTo: ['ip', 'user'],
  },
  {
    id: 'auth-register',
    pattern: '/api/v1/auth/register',
    methods: ['POST'],
    config: {
      id: 'auth-register-config',
      name: 'Registration Rate Limit',
      scope: 'ip',
      algorithm: 'sliding_window',
      limit: 3,
      window: 3600, // 1 hour
      enabled: true,
      priority: 100,
    },
    applyTo: ['ip'],
  },
  {
    id: 'password-reset',
    pattern: '/api/v1/auth/password-reset',
    methods: ['POST'],
    config: {
      id: 'password-reset-config',
      name: 'Password Reset Rate Limit',
      scope: 'ip',
      algorithm: 'fixed_window',
      limit: 3,
      window: 3600,
      enabled: true,
      priority: 100,
    },
    applyTo: ['ip'],
  },
  // Bulk operations - limited to prevent abuse
  {
    id: 'bulk-operations',
    pattern: '/api/v1/bulk/*',
    methods: ['POST', 'PUT', 'DELETE'],
    config: {
      id: 'bulk-config',
      name: 'Bulk Operations Rate Limit',
      scope: 'user',
      algorithm: 'token_bucket',
      limit: 10,
      window: 3600,
      burstLimit: 3,
      enabled: true,
      priority: 90,
    },
    applyTo: ['user', 'tenant'],
  },
  // Export operations
  {
    id: 'data-export',
    pattern: '/api/v1/*/export',
    methods: ['GET', 'POST'],
    config: {
      id: 'export-config',
      name: 'Data Export Rate Limit',
      scope: 'user',
      algorithm: 'fixed_window',
      limit: 5,
      window: 3600,
      enabled: true,
      priority: 85,
    },
    applyTo: ['user'],
  },
  // AI endpoints - expensive operations
  {
    id: 'ai-operations',
    pattern: '/api/v1/ai/*',
    methods: ['POST'],
    config: {
      id: 'ai-config',
      name: 'AI Operations Rate Limit',
      scope: 'user',
      algorithm: 'token_bucket',
      limit: 50,
      window: 3600,
      costPerRequest: 5,
      enabled: true,
      priority: 80,
    },
    applyTo: ['user', 'tenant'],
  },
  // Search operations
  {
    id: 'search-operations',
    pattern: '/api/v1/search/*',
    methods: ['GET', 'POST'],
    config: {
      id: 'search-config',
      name: 'Search Rate Limit',
      scope: 'user',
      algorithm: 'sliding_window',
      limit: 100,
      window: 60,
      enabled: true,
      priority: 70,
    },
    applyTo: ['user'],
  },
  // Webhook endpoints
  {
    id: 'webhook-receive',
    pattern: '/api/v1/webhooks/receive/*',
    methods: ['POST'],
    config: {
      id: 'webhook-receive-config',
      name: 'Webhook Receive Rate Limit',
      scope: 'ip',
      algorithm: 'leaky_bucket',
      limit: 100,
      window: 60,
      enabled: true,
      priority: 95,
    },
    applyTo: ['ip', 'api_key'],
  },
  // Default API rate limit
  {
    id: 'default-api',
    pattern: '/api/v1/*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    config: {
      id: 'default-api-config',
      name: 'Default API Rate Limit',
      scope: 'user',
      algorithm: 'sliding_window',
      limit: 100,
      window: 60,
      enabled: true,
      priority: 1,
    },
    applyTo: ['user', 'ip'],
  },
];

/**
 * Quota usage tracking
 */
export interface QuotaUsage {
  tenantId: string;
  userId?: string;
  period: 'minute' | 'hour' | 'day' | 'month';
  periodStart: Date;
  periodEnd: Date;
  usage: {
    requests: number;
    apiCalls: number;
    dataExports: number;
    bulkOperations: number;
    aiCalls: number;
    storageUsed: number;
  };
  limits: {
    requests: number;
    apiCalls: number;
    dataExports: number;
    bulkOperations: number;
    aiCalls: number;
    storage: number;
  };
}

/**
 * Rate limit dashboard data
 */
export interface RateLimitDashboard {
  summary: {
    totalRequests24h: number;
    blockedRequests24h: number;
    blockRate: number;
    avgResponseTime: number;
    activeUsers: number;
    peakRps: number;
  };
  metrics: RateLimitMetrics;
  topEndpoints: {
    endpoint: string;
    requests: number;
    blocked: number;
    avgLatency: number;
  }[];
  alerts: {
    type: 'warning' | 'critical';
    message: string;
    scope: RateLimitScope;
    key: string;
    timestamp: Date;
  }[];
  quotaStatus: {
    tenantId: string;
    tier: RateLimitTier;
    usagePercent: number;
    resetIn: number;
  };
}
