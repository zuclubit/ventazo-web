/**
 * Resilience Types
 * Type definitions for Circuit Breaker, Retry, and Bulkhead patterns
 */

/**
 * Circuit breaker states
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes to close from half-open
  timeout: number; // Time in ms before trying again (half-open)
  volumeThreshold?: number; // Minimum calls before calculating failure rate
  failureRateThreshold?: number; // Percentage (0-100) of failures to open
  slowCallDurationThreshold?: number; // Calls slower than this are considered slow (ms)
  slowCallRateThreshold?: number; // Percentage of slow calls to open
  permittedNumberOfCallsInHalfOpen?: number; // Calls allowed in half-open state
  recordExceptions?: (new (...args: any[]) => Error)[]; // Exceptions to record as failures
  ignoreExceptions?: (new (...args: any[]) => Error)[]; // Exceptions to ignore
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
  onSuccess?: (duration: number) => void;
  onFailure?: (error: Error, duration: number) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onHalfOpen?: () => void;
}

/**
 * Circuit breaker metrics
 */
export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalCalls: number;
  failureRate: number;
  slowCallRate: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  stateChangedAt: Date;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  delay: number; // Base delay in ms
  maxDelay?: number; // Maximum delay cap
  backoffMultiplier?: number; // Exponential backoff multiplier
  jitter?: boolean; // Add randomness to delay
  retryOn?: (error: Error) => boolean; // Custom retry condition
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

/**
 * Timeout configuration
 */
export interface TimeoutConfig {
  timeout: number; // Timeout in ms
  onTimeout?: () => void;
}

/**
 * Bulkhead configuration (concurrency limiter)
 */
export interface BulkheadConfig {
  name: string;
  maxConcurrent: number; // Maximum concurrent calls
  maxWaiting?: number; // Maximum queued calls
  waitTimeout?: number; // Max time to wait in queue (ms)
  onRejected?: () => void;
  onQueued?: () => void;
  onExecute?: () => void;
}

/**
 * Bulkhead metrics
 */
export interface BulkheadMetrics {
  name: string;
  concurrent: number;
  waiting: number;
  maxConcurrent: number;
  maxWaiting: number;
  rejected: number;
  totalExecuted: number;
}

/**
 * Fallback configuration
 */
export interface FallbackConfig<T> {
  fallback: T | (() => T) | (() => Promise<T>);
  onFallback?: (error: Error) => void;
}

/**
 * Rate limiter configuration (token bucket)
 */
export interface RateLimiterConfig {
  name: string;
  tokensPerInterval: number;
  interval: number; // Interval in ms
  maxTokens?: number; // Maximum bucket capacity
  onThrottled?: () => void;
}

/**
 * Rate limiter metrics
 */
export interface RateLimiterMetrics {
  name: string;
  availableTokens: number;
  maxTokens: number;
  throttledCount: number;
  passedCount: number;
}

/**
 * Combined resilience policy configuration
 */
export interface ResiliencePolicyConfig {
  circuitBreaker?: CircuitBreakerConfig;
  retry?: RetryConfig;
  timeout?: TimeoutConfig;
  bulkhead?: BulkheadConfig;
  rateLimiter?: RateLimiterConfig;
  fallback?: FallbackConfig<unknown>;
}

/**
 * Policy execution result
 */
export interface PolicyExecutionResult<T> {
  success: boolean;
  value?: T;
  error?: Error;
  duration: number;
  attempts: number;
  circuitState?: CircuitState;
  fromFallback?: boolean;
  fromCache?: boolean;
}

/**
 * External service configuration
 */
export interface ExternalServiceConfig {
  name: string;
  baseUrl: string;
  timeout?: number;
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  retry?: Partial<RetryConfig>;
  bulkhead?: Partial<BulkheadConfig>;
  rateLimiter?: Partial<RateLimiterConfig>;
  headers?: Record<string, string>;
}

/**
 * Service registry entry
 */
export interface ServiceRegistryEntry {
  name: string;
  config: ExternalServiceConfig;
  circuitBreaker: CircuitBreakerMetrics;
  bulkhead?: BulkheadMetrics;
  rateLimiter?: RateLimiterMetrics;
  lastHealthCheck?: Date;
  healthy: boolean;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  service: string;
  healthy: boolean;
  latency: number;
  error?: string;
  timestamp: Date;
}

/**
 * Resilience event types
 */
export type ResilienceEventType =
  | 'circuit_open'
  | 'circuit_close'
  | 'circuit_half_open'
  | 'retry_attempt'
  | 'retry_exhausted'
  | 'timeout'
  | 'bulkhead_rejected'
  | 'rate_limited'
  | 'fallback_executed'
  | 'success'
  | 'failure';

/**
 * Resilience event
 */
export interface ResilienceEvent {
  type: ResilienceEventType;
  service: string;
  timestamp: Date;
  duration?: number;
  attempt?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Resilience event listener
 */
export type ResilienceEventListener = (event: ResilienceEvent) => void;
