// ============================================
// AI Security & Ethics Module - FASE 6.0
// Security, rate limiting, and ethical AI guardrails
// ============================================

import type { AIProvider } from './types';

// ============================================
// Types
// ============================================

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxTokensPerMinute: number;
  maxTokensPerHour: number;
}

interface RateLimitState {
  minuteRequests: number;
  hourRequests: number;
  minuteTokens: number;
  hourTokens: number;
  minuteWindow: number;
  hourWindow: number;
}

interface ContentPolicy {
  allowedTopics: string[];
  blockedPatterns: RegExp[];
  maxInputLength: number;
  maxOutputLength: number;
  requiresReview: (content: string) => boolean;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  tenantId: string;
  userId: string;
  operation: string;
  provider: AIProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// Rate Limiting
// ============================================

const rateLimitConfigs: Record<AIProvider, RateLimitConfig> = {
  openai: {
    maxRequestsPerMinute: 60,
    maxRequestsPerHour: 1000,
    maxTokensPerMinute: 90000,
    maxTokensPerHour: 1000000,
  },
  anthropic: {
    maxRequestsPerMinute: 50,
    maxRequestsPerHour: 500,
    maxTokensPerMinute: 100000,
    maxTokensPerHour: 800000,
  },
  groq: {
    maxRequestsPerMinute: 30,
    maxRequestsPerHour: 200,
    maxTokensPerMinute: 60000,
    maxTokensPerHour: 500000,
  },
  'azure-openai': {
    maxRequestsPerMinute: 60,
    maxRequestsPerHour: 1000,
    maxTokensPerMinute: 90000,
    maxTokensPerHour: 1000000,
  },
  local: {
    maxRequestsPerMinute: 100,
    maxRequestsPerHour: 10000,
    maxTokensPerMinute: 500000,
    maxTokensPerHour: 5000000,
  },
};

// In-memory rate limit state (per tenant)
const rateLimitStates = new Map<string, Map<AIProvider, RateLimitState>>();

const getOrCreateState = (tenantId: string, provider: AIProvider): RateLimitState => {
  if (!rateLimitStates.has(tenantId)) {
    rateLimitStates.set(tenantId, new Map());
  }

  const tenantStates = rateLimitStates.get(tenantId)!;
  const now = Date.now();

  if (!tenantStates.has(provider)) {
    tenantStates.set(provider, {
      minuteRequests: 0,
      hourRequests: 0,
      minuteTokens: 0,
      hourTokens: 0,
      minuteWindow: now,
      hourWindow: now,
    });
  }

  return tenantStates.get(provider)!;
};

/**
 * Check if request is within rate limits
 */
export const checkRateLimit = (
  tenantId: string,
  provider: AIProvider,
  estimatedTokens: number = 0
): { allowed: boolean; reason?: string; retryAfterMs?: number } => {
  const config = rateLimitConfigs[provider];
  const state = getOrCreateState(tenantId, provider);
  const now = Date.now();

  // Reset minute window if needed
  if (now - state.minuteWindow > 60000) {
    state.minuteRequests = 0;
    state.minuteTokens = 0;
    state.minuteWindow = now;
  }

  // Reset hour window if needed
  if (now - state.hourWindow > 3600000) {
    state.hourRequests = 0;
    state.hourTokens = 0;
    state.hourWindow = now;
  }

  // Check request limits
  if (state.minuteRequests >= config.maxRequestsPerMinute) {
    return {
      allowed: false,
      reason: 'Rate limit exceeded: too many requests per minute',
      retryAfterMs: 60000 - (now - state.minuteWindow),
    };
  }

  if (state.hourRequests >= config.maxRequestsPerHour) {
    return {
      allowed: false,
      reason: 'Rate limit exceeded: too many requests per hour',
      retryAfterMs: 3600000 - (now - state.hourWindow),
    };
  }

  // Check token limits
  if (state.minuteTokens + estimatedTokens > config.maxTokensPerMinute) {
    return {
      allowed: false,
      reason: 'Rate limit exceeded: too many tokens per minute',
      retryAfterMs: 60000 - (now - state.minuteWindow),
    };
  }

  if (state.hourTokens + estimatedTokens > config.maxTokensPerHour) {
    return {
      allowed: false,
      reason: 'Rate limit exceeded: too many tokens per hour',
      retryAfterMs: 3600000 - (now - state.hourWindow),
    };
  }

  return { allowed: true };
};

/**
 * Record a request for rate limiting
 */
export const recordRequest = (
  tenantId: string,
  provider: AIProvider,
  tokens: number
): void => {
  const state = getOrCreateState(tenantId, provider);
  state.minuteRequests++;
  state.hourRequests++;
  state.minuteTokens += tokens;
  state.hourTokens += tokens;
};

/**
 * Get current rate limit status
 */
export const getRateLimitStatus = (
  tenantId: string,
  provider: AIProvider
): {
  minuteRequests: { used: number; max: number };
  hourRequests: { used: number; max: number };
  minuteTokens: { used: number; max: number };
  hourTokens: { used: number; max: number };
} => {
  const config = rateLimitConfigs[provider];
  const state = getOrCreateState(tenantId, provider);

  return {
    minuteRequests: { used: state.minuteRequests, max: config.maxRequestsPerMinute },
    hourRequests: { used: state.hourRequests, max: config.maxRequestsPerHour },
    minuteTokens: { used: state.minuteTokens, max: config.maxTokensPerMinute },
    hourTokens: { used: state.hourTokens, max: config.maxTokensPerHour },
  };
};

// ============================================
// Content Policy & Moderation
// ============================================

const defaultContentPolicy: ContentPolicy = {
  allowedTopics: [
    'business',
    'sales',
    'marketing',
    'customer relationship',
    'lead management',
    'analytics',
    'reporting',
  ],
  blockedPatterns: [
    // Harmful content patterns
    /\b(hack|exploit|vulnerability|password\s*crack)\b/i,
    // PII patterns that shouldn't be in prompts
    /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/, // SSN
    /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/, // Credit card
    // Jailbreak attempts
    /ignore\s*(all\s*)?(previous|prior)\s*(instructions|prompts)/i,
    /pretend\s*(you\s*are|to\s*be)\s*(a|an)\s*(different|other)/i,
    /bypass\s*(your|the)\s*(safety|content|ethical)/i,
    /disable\s*(your|the)\s*(filters?|restrictions?|safety)/i,
  ],
  maxInputLength: 50000, // 50k characters
  maxOutputLength: 10000, // 10k characters
  requiresReview: (content: string) => {
    // Flag content that mentions competitors or sensitive business info
    const sensitivePatterns = [
      /competitor|rival|market\s*share/i,
      /acquisition|merger|confidential/i,
      /internal\s*only|do\s*not\s*share/i,
    ];
    return sensitivePatterns.some((p) => p.test(content));
  },
};

/**
 * Validate input content against policy
 */
export const validateInput = (
  content: string,
  policy: ContentPolicy = defaultContentPolicy
): {
  valid: boolean;
  reason?: string;
  requiresReview: boolean;
} => {
  // Check length
  if (content.length > policy.maxInputLength) {
    return {
      valid: false,
      reason: `Input exceeds maximum length of ${policy.maxInputLength} characters`,
      requiresReview: false,
    };
  }

  // Check for blocked patterns
  for (const pattern of policy.blockedPatterns) {
    if (pattern.test(content)) {
      return {
        valid: false,
        reason: 'Input contains blocked content pattern',
        requiresReview: true,
      };
    }
  }

  // Check if review is needed
  const needsReview = policy.requiresReview(content);

  return {
    valid: true,
    requiresReview: needsReview,
  };
};

/**
 * Sanitize output content
 */
export const sanitizeOutput = (
  content: string,
  policy: ContentPolicy = defaultContentPolicy
): string => {
  let sanitized = content;

  // Truncate if too long
  if (sanitized.length > policy.maxOutputLength) {
    sanitized = sanitized.slice(0, policy.maxOutputLength) + '... [output truncated]';
  }

  // Remove any PII that might have been generated
  sanitized = sanitized
    .replace(/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, '[REDACTED-SSN]')
    .replace(/\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g, '[REDACTED-CARD]');

  return sanitized;
};

// ============================================
// Prompt Injection Protection
// ============================================

const injectionPatterns = [
  // Direct instruction overrides
  /ignore\s*(all\s*)?(previous|prior|above)\s*(instructions|prompts|context)/i,
  /disregard\s*(all\s*)?(previous|prior|above)/i,
  /forget\s*(everything|all)\s*(you\s*were\s*told|above)/i,
  // Role manipulation
  /you\s*are\s*now\s*(a|an)\s*(different|new)/i,
  /pretend\s*(you\s*are|to\s*be)/i,
  /act\s*as\s*(if\s*you\s*are|a)/i,
  /roleplay\s*as/i,
  // System prompt extraction
  /what\s*(is|are)\s*(your|the)\s*(system|initial)\s*prompt/i,
  /reveal\s*(your|the)\s*(system|initial)\s*(prompt|instructions)/i,
  /show\s*(me\s*)?(your|the)\s*instructions/i,
  // Constraint bypass
  /bypass\s*(your|the|any)\s*(restrictions?|limitations?|filters?)/i,
  /disable\s*(your|the)\s*safety/i,
  /without\s*(any\s*)?(restrictions?|limitations?|filters?)/i,
];

/**
 * Detect potential prompt injection attempts
 */
export const detectPromptInjection = (
  input: string
): {
  detected: boolean;
  confidence: 'low' | 'medium' | 'high';
  patterns: string[];
} => {
  const detectedPatterns: string[] = [];

  for (const pattern of injectionPatterns) {
    if (pattern.test(input)) {
      detectedPatterns.push(pattern.source);
    }
  }

  if (detectedPatterns.length === 0) {
    return { detected: false, confidence: 'low', patterns: [] };
  }

  const confidence =
    detectedPatterns.length >= 3 ? 'high' : detectedPatterns.length >= 2 ? 'medium' : 'low';

  return {
    detected: true,
    confidence,
    patterns: detectedPatterns,
  };
};

/**
 * Sanitize input to remove potential injection attempts
 */
export const sanitizeInput = (input: string): string => {
  let sanitized = input;

  // Remove zero-width characters that could hide malicious content
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // Remove control characters
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Escape potential delimiter characters
  sanitized = sanitized.replace(/```/g, '\\`\\`\\`');

  return sanitized;
};

// ============================================
// Audit Logging
// ============================================

const auditLog: AuditLogEntry[] = [];
const MAX_AUDIT_LOG_SIZE = 10000;

/**
 * Log an AI operation for auditing
 */
export const logAIOperation = (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void => {
  const logEntry: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };

  auditLog.push(logEntry);

  // Trim log if too large
  if (auditLog.length > MAX_AUDIT_LOG_SIZE) {
    auditLog.splice(0, auditLog.length - MAX_AUDIT_LOG_SIZE);
  }

  // In production, this would also send to a persistent store
  if (process.env['NODE_ENV'] === 'development') {
    console.log('[AI Audit]', logEntry);
  }
};

/**
 * Get audit log entries
 */
export const getAuditLog = (
  filters?: {
    tenantId?: string;
    userId?: string;
    operation?: string;
    provider?: AIProvider;
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
  },
  limit: number = 100
): AuditLogEntry[] => {
  let filtered = [...auditLog];

  if (filters?.tenantId) {
    filtered = filtered.filter((e) => e.tenantId === filters.tenantId);
  }
  if (filters?.userId) {
    filtered = filtered.filter((e) => e.userId === filters.userId);
  }
  if (filters?.operation) {
    filtered = filtered.filter((e) => e.operation === filters.operation);
  }
  if (filters?.provider) {
    filtered = filtered.filter((e) => e.provider === filters.provider);
  }
  if (filters?.success !== undefined) {
    filtered = filtered.filter((e) => e.success === filters.success);
  }
  if (filters?.startDate) {
    filtered = filtered.filter((e) => new Date(e.timestamp) >= filters.startDate!);
  }
  if (filters?.endDate) {
    filtered = filtered.filter((e) => new Date(e.timestamp) <= filters.endDate!);
  }

  return filtered.slice(-limit);
};

/**
 * Get usage statistics from audit log
 */
export const getUsageStats = (
  tenantId: string,
  startDate?: Date,
  endDate?: Date
): {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  averageLatencyMs: number;
  byProvider: Record<string, { requests: number; tokens: number }>;
  byOperation: Record<string, { requests: number; tokens: number }>;
} => {
  const entries = getAuditLog(
    { tenantId, startDate, endDate },
    MAX_AUDIT_LOG_SIZE
  );

  const byProvider: Record<string, { requests: number; tokens: number }> = {};
  const byOperation: Record<string, { requests: number; tokens: number }> = {};

  let totalLatency = 0;
  let totalTokens = 0;

  for (const entry of entries) {
    totalLatency += entry.latencyMs;
    totalTokens += entry.inputTokens + entry.outputTokens;

    if (!byProvider[entry.provider]) {
      byProvider[entry.provider] = { requests: 0, tokens: 0 };
    }
    byProvider[entry.provider]!.requests++;
    byProvider[entry.provider]!.tokens += entry.inputTokens + entry.outputTokens;

    if (!byOperation[entry.operation]) {
      byOperation[entry.operation] = { requests: 0, tokens: 0 };
    }
    byOperation[entry.operation]!.requests++;
    byOperation[entry.operation]!.tokens += entry.inputTokens + entry.outputTokens;
  }

  return {
    totalRequests: entries.length,
    successfulRequests: entries.filter((e) => e.success).length,
    failedRequests: entries.filter((e) => !e.success).length,
    totalTokens,
    averageLatencyMs: entries.length > 0 ? totalLatency / entries.length : 0,
    byProvider,
    byOperation,
  };
};

// ============================================
// Exports
// ============================================

export type { RateLimitConfig, ContentPolicy, AuditLogEntry };
