/**
 * Resilience Policy
 * Combines multiple resilience patterns into a single policy
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { CircuitBreaker, CircuitBreakerError } from './circuit-breaker';
import { Retry, RetryPredicates } from './retry';
import { Bulkhead, BulkheadError } from './bulkhead';
import {
  ResiliencePolicyConfig,
  PolicyExecutionResult,
  ExternalServiceConfig,
  ServiceRegistryEntry,
  HealthCheckResult,
  CircuitBreakerConfig,
  RetryConfig,
  BulkheadConfig,
  FallbackConfig,
  TimeoutConfig,
  ResilienceEvent,
  ResilienceEventListener,
} from './types';

/**
 * Pre-configured service policies
 */
export const ServicePolicies: Record<string, Partial<ExternalServiceConfig>> = {
  sendgrid: {
    timeout: 30000,
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
    },
    retry: {
      maxAttempts: 3,
      delay: 1000,
      backoffMultiplier: 2,
    },
    bulkhead: {
      maxConcurrent: 20,
      maxWaiting: 50,
    },
  },
  twilio: {
    timeout: 20000,
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 30000,
    },
    retry: {
      maxAttempts: 3,
      delay: 500,
      backoffMultiplier: 2,
    },
    bulkhead: {
      maxConcurrent: 30,
      maxWaiting: 100,
    },
  },
  stripe: {
    timeout: 30000,
    circuitBreaker: {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 60000,
    },
    retry: {
      maxAttempts: 3,
      delay: 1000,
      backoffMultiplier: 2,
    },
    bulkhead: {
      maxConcurrent: 10,
      maxWaiting: 20,
    },
  },
  openai: {
    timeout: 60000,
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 120000,
    },
    retry: {
      maxAttempts: 2,
      delay: 2000,
      backoffMultiplier: 3,
    },
    bulkhead: {
      maxConcurrent: 5,
      maxWaiting: 10,
    },
  },
  whatsapp: {
    timeout: 30000,
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
    },
    retry: {
      maxAttempts: 3,
      delay: 1000,
      backoffMultiplier: 2,
    },
    bulkhead: {
      maxConcurrent: 20,
      maxWaiting: 50,
    },
  },
  enrichment: {
    timeout: 45000,
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 120000,
    },
    retry: {
      maxAttempts: 2,
      delay: 2000,
      backoffMultiplier: 2,
    },
    bulkhead: {
      maxConcurrent: 10,
      maxWaiting: 30,
    },
  },
  google: {
    timeout: 30000,
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
    },
    retry: {
      maxAttempts: 3,
      delay: 1000,
      backoffMultiplier: 2,
    },
    bulkhead: {
      maxConcurrent: 15,
      maxWaiting: 40,
    },
  },
  microsoft: {
    timeout: 30000,
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
    },
    retry: {
      maxAttempts: 3,
      delay: 1000,
      backoffMultiplier: 2,
    },
    bulkhead: {
      maxConcurrent: 15,
      maxWaiting: 40,
    },
  },
};

/**
 * Resilience Policy class
 * Orchestrates multiple resilience patterns
 */
export class ResiliencePolicy {
  private circuitBreaker?: CircuitBreaker;
  private retry?: Retry;
  private bulkhead?: Bulkhead;
  private fallbackConfig?: FallbackConfig<unknown>;
  private timeoutConfig?: TimeoutConfig;
  private readonly listeners: ResilienceEventListener[] = [];

  constructor(private readonly config: ResiliencePolicyConfig) {
    this.initialize();
  }

  /**
   * Initialize resilience components
   */
  private initialize(): void {
    if (this.config.circuitBreaker) {
      this.circuitBreaker = new CircuitBreaker(
        this.config.circuitBreaker as CircuitBreakerConfig
      );
    }

    if (this.config.retry) {
      this.retry = new Retry(this.config.retry);
    }

    if (this.config.bulkhead) {
      this.bulkhead = new Bulkhead(this.config.bulkhead as BulkheadConfig);
    }

    if (this.config.fallback) {
      this.fallbackConfig = this.config.fallback;
    }

    if (this.config.timeout) {
      this.timeoutConfig = this.config.timeout;
    }
  }

  /**
   * Execute a function with all configured resilience patterns
   */
  async execute<T>(fn: () => Promise<T>): Promise<PolicyExecutionResult<T>> {
    const startTime = Date.now();
    let attempts = 0;
    let fromFallback = false;

    try {
      // Wrap with timeout if configured
      let wrappedFn = fn;
      if (this.timeoutConfig) {
        wrappedFn = () => this.withTimeout(fn);
      }

      // Wrap with bulkhead if configured
      if (this.bulkhead) {
        const originalFn = wrappedFn;
        wrappedFn = () => this.bulkhead!.execute(originalFn);
      }

      // Wrap with circuit breaker if configured
      if (this.circuitBreaker) {
        const originalFn = wrappedFn;
        wrappedFn = () => this.circuitBreaker!.execute(originalFn);
      }

      // Wrap with retry if configured
      let result: T;
      if (this.retry) {
        result = await this.retry.execute(wrappedFn);
        attempts = 1; // Retry tracks this internally
      } else {
        result = await wrappedFn();
        attempts = 1;
      }

      return {
        success: true,
        value: result,
        duration: Date.now() - startTime,
        attempts,
        circuitState: this.circuitBreaker?.getState(),
        fromFallback: false,
      };
    } catch (error) {
      // Try fallback if configured
      if (this.fallbackConfig) {
        try {
          const fallbackValue = await this.executeFallback();
          fromFallback = true;

          this.fallbackConfig.onFallback?.(error as Error);

          this.emit({
            type: 'fallback_executed',
            service: 'policy',
            timestamp: new Date(),
            error: (error as Error).message,
          });

          return {
            success: true,
            value: fallbackValue as T,
            duration: Date.now() - startTime,
            attempts,
            circuitState: this.circuitBreaker?.getState(),
            fromFallback: true,
          };
        } catch (fallbackError) {
          // Fallback also failed
        }
      }

      return {
        success: false,
        error: error as Error,
        duration: Date.now() - startTime,
        attempts,
        circuitState: this.circuitBreaker?.getState(),
        fromFallback,
      };
    }
  }

  /**
   * Execute function with timeout
   */
  private withTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.timeoutConfig?.onTimeout?.();
        this.emit({
          type: 'timeout',
          service: 'policy',
          timestamp: new Date(),
          duration: this.timeoutConfig?.timeout,
        });
        reject(new TimeoutError('Operation timed out'));
      }, this.timeoutConfig!.timeout);

      fn()
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Execute fallback
   */
  private async executeFallback(): Promise<unknown> {
    if (!this.fallbackConfig) {
      throw new Error('No fallback configured');
    }

    const fallback = this.fallbackConfig.fallback;

    if (typeof fallback === 'function') {
      return fallback();
    }

    return fallback;
  }

  /**
   * Get metrics
   */
  getMetrics(): Record<string, unknown> {
    return {
      circuitBreaker: this.circuitBreaker?.getMetrics(),
      bulkhead: this.bulkhead?.getMetrics(),
    };
  }

  /**
   * Reset all components
   */
  reset(): void {
    this.circuitBreaker?.reset();
    this.bulkhead?.reset();
  }

  /**
   * Add event listener
   */
  addListener(listener: ResilienceEventListener): void {
    this.listeners.push(listener);
    this.circuitBreaker?.addListener(listener);
    this.retry?.addListener(listener);
    this.bulkhead?.addListener(listener);
  }

  /**
   * Emit event
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
 * Timeout Error
 */
export class TimeoutError extends Error {
  readonly isTimeoutError = true;

  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * External Service Client with built-in resilience
 */
@injectable()
export class ResilientServiceClient {
  private readonly services: Map<string, {
    policy: ResiliencePolicy;
    config: ExternalServiceConfig;
  }> = new Map();
  private readonly listeners: ResilienceEventListener[] = [];

  constructor() {
    // Initialize with default service configurations
    for (const [name, defaultConfig] of Object.entries(ServicePolicies)) {
      this.registerService({
        name,
        baseUrl: '',
        ...defaultConfig,
      } as ExternalServiceConfig);
    }
  }

  /**
   * Register an external service
   */
  registerService(config: ExternalServiceConfig): void {
    const policy = new ResiliencePolicy({
      circuitBreaker: config.circuitBreaker
        ? { name: config.name, ...config.circuitBreaker } as CircuitBreakerConfig
        : undefined,
      retry: config.retry,
      bulkhead: config.bulkhead
        ? { name: config.name, ...config.bulkhead } as BulkheadConfig
        : undefined,
      timeout: config.timeout ? { timeout: config.timeout } : undefined,
    });

    // Add listeners
    for (const listener of this.listeners) {
      policy.addListener(listener);
    }

    this.services.set(config.name, { policy, config });
  }

  /**
   * Execute a call to an external service
   */
  async call<T>(
    serviceName: string,
    fn: () => Promise<T>
  ): Promise<PolicyExecutionResult<T>> {
    const service = this.services.get(serviceName);

    if (!service) {
      // Use default policy
      const defaultPolicy = new ResiliencePolicy({
        retry: {
          maxAttempts: 3,
          delay: 1000,
          backoffMultiplier: 2,
          jitter: true,
          retryOn: RetryPredicates.onTransientError,
        },
        timeout: { timeout: 30000 },
      });
      return defaultPolicy.execute(fn);
    }

    return service.policy.execute(fn);
  }

  /**
   * Get service registry
   */
  getServiceRegistry(): ServiceRegistryEntry[] {
    const entries: ServiceRegistryEntry[] = [];

    for (const [name, { policy, config }] of this.services) {
      const metrics = policy.getMetrics();
      entries.push({
        name,
        config,
        circuitBreaker: metrics.circuitBreaker as any,
        bulkhead: metrics.bulkhead as any,
        healthy: true, // Would be determined by health checks
      });
    }

    return entries;
  }

  /**
   * Health check for a service
   */
  async healthCheck(
    serviceName: string,
    checkFn: () => Promise<void>
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      await checkFn();
      return {
        service: serviceName,
        healthy: true,
        latency: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        service: serviceName,
        healthy: false,
        latency: Date.now() - startTime,
        error: (error as Error).message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get metrics for a service
   */
  getServiceMetrics(serviceName: string): Record<string, unknown> | null {
    const service = this.services.get(serviceName);
    return service ? service.policy.getMetrics() : null;
  }

  /**
   * Reset a service's resilience state
   */
  resetService(serviceName: string): boolean {
    const service = this.services.get(serviceName);
    if (service) {
      service.policy.reset();
      return true;
    }
    return false;
  }

  /**
   * Add global event listener
   */
  addListener(listener: ResilienceEventListener): void {
    this.listeners.push(listener);
    for (const service of this.services.values()) {
      service.policy.addListener(listener);
    }
  }
}

/**
 * Create a resilience policy for a specific use case
 */
export function createPolicy(config: ResiliencePolicyConfig): ResiliencePolicy {
  return new ResiliencePolicy(config);
}

/**
 * Decorator to apply resilience policy to a method
 */
export function WithResilience(policyConfig: ResiliencePolicyConfig) {
  const policy = new ResiliencePolicy(policyConfig);

  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const result = await policy.execute(() => originalMethod.apply(this, args));

      if (!result.success) {
        throw result.error;
      }

      return result.value;
    };

    return descriptor;
  };
}
