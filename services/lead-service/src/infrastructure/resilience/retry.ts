/**
 * Retry Implementation
 * Automatic retry with exponential backoff and jitter
 */
import { RetryConfig, ResilienceEvent, ResilienceEventListener } from './types';

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Retry class
 * Implements automatic retry with configurable backoff strategies
 */
export class Retry {
  private readonly config: RetryConfig;
  private readonly listeners: ResilienceEventListener[] = [];

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < this.config.maxAttempts) {
      attempt++;

      try {
        const result = await fn();
        return result;
      } catch (error) {
        lastError = error as Error;

        // Check if we should retry this error
        if (this.config.retryOn && !this.config.retryOn(lastError)) {
          throw lastError;
        }

        // Check if we have more attempts
        if (attempt >= this.config.maxAttempts) {
          this.emit({
            type: 'retry_exhausted',
            service: 'retry',
            timestamp: new Date(),
            attempt,
            error: lastError.message,
          });
          throw lastError;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt);

        // Emit retry event
        this.emit({
          type: 'retry_attempt',
          service: 'retry',
          timestamp: new Date(),
          attempt,
          error: lastError.message,
          metadata: { nextDelay: delay },
        });

        // Call retry callback
        this.config.onRetry?.(attempt, lastError, delay);

        // Wait before retry
        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('Retry exhausted with no error');
  }

  /**
   * Calculate delay for current attempt
   */
  private calculateDelay(attempt: number): number {
    // Base delay with exponential backoff
    let delay = this.config.delay * Math.pow(this.config.backoffMultiplier || 2, attempt - 1);

    // Apply max delay cap
    if (this.config.maxDelay) {
      delay = Math.min(delay, this.config.maxDelay);
    }

    // Apply jitter (add randomness to prevent thundering herd)
    if (this.config.jitter) {
      const jitterRange = delay * 0.2; // 20% jitter
      delay = delay - jitterRange + Math.random() * jitterRange * 2;
    }

    return Math.floor(delay);
  }

  /**
   * Sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Add event listener
   */
  addListener(listener: ResilienceEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeListener(listener: ResilienceEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: ResilienceEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in resilience event listener:', error);
      }
    }
  }
}

/**
 * Retry decorator
 */
export function WithRetry(config: Partial<RetryConfig> = {}) {
  const retry = new Retry(config);

  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return retry.execute(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Common retry predicates
 */
export const RetryPredicates = {
  /**
   * Retry on network errors
   */
  onNetworkError: (error: Error): boolean => {
    const networkErrors = [
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
      'EHOSTUNREACH',
      'ENETUNREACH',
    ];
    return networkErrors.some((code) => error.message.includes(code));
  },

  /**
   * Retry on specific HTTP status codes
   */
  onHttpStatus: (statuses: number[]) => (error: Error): boolean => {
    const statusMatch = error.message.match(/status[:\s]+(\d+)/i);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);
      return statuses.includes(status);
    }
    return false;
  },

  /**
   * Retry on 5xx errors
   */
  onServerError: (error: Error): boolean => {
    return RetryPredicates.onHttpStatus([500, 502, 503, 504])(error);
  },

  /**
   * Retry on rate limit (429)
   */
  onRateLimit: (error: Error): boolean => {
    return RetryPredicates.onHttpStatus([429])(error);
  },

  /**
   * Retry on transient errors
   */
  onTransientError: (error: Error): boolean => {
    return (
      RetryPredicates.onNetworkError(error) ||
      RetryPredicates.onServerError(error) ||
      RetryPredicates.onRateLimit(error)
    );
  },

  /**
   * Never retry
   */
  never: (): boolean => false,

  /**
   * Always retry
   */
  always: (): boolean => true,
};
