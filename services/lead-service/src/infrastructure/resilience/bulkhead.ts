/**
 * Bulkhead Implementation
 * Limits concurrent executions to prevent resource exhaustion
 */
import { BulkheadConfig, BulkheadMetrics, ResilienceEvent, ResilienceEventListener } from './types';

/**
 * Default bulkhead configuration
 */
const DEFAULT_BULKHEAD_CONFIG: Partial<BulkheadConfig> = {
  maxConcurrent: 10,
  maxWaiting: 20,
  waitTimeout: 30000, // 30 seconds
};

/**
 * Bulkhead class
 * Implements the bulkhead pattern for concurrency control
 */
export class Bulkhead {
  private readonly config: BulkheadConfig;
  private currentConcurrent = 0;
  private waitingQueue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  private totalExecuted = 0;
  private totalRejected = 0;
  private readonly listeners: ResilienceEventListener[] = [];

  constructor(config: BulkheadConfig) {
    this.config = { ...DEFAULT_BULKHEAD_CONFIG, ...config } as BulkheadConfig;
  }

  /**
   * Execute a function with bulkhead protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we can execute immediately
    if (this.currentConcurrent < this.config.maxConcurrent) {
      return this.doExecute(fn);
    }

    // Check if we can queue
    if (
      this.config.maxWaiting !== undefined &&
      this.waitingQueue.length >= this.config.maxWaiting
    ) {
      this.totalRejected++;
      this.config.onRejected?.();

      this.emit({
        type: 'bulkhead_rejected',
        service: this.config.name,
        timestamp: new Date(),
        metadata: {
          concurrent: this.currentConcurrent,
          waiting: this.waitingQueue.length,
        },
      });

      throw new BulkheadError(
        `Bulkhead '${this.config.name}' is at capacity`,
        this.config.name
      );
    }

    // Queue the request
    return this.queueRequest(fn);
  }

  /**
   * Queue a request and wait for execution
   */
  private async queueRequest<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        // Remove from queue
        const index = this.waitingQueue.findIndex((item) => item.timeout === timeout);
        if (index > -1) {
          this.waitingQueue.splice(index, 1);
        }

        reject(
          new BulkheadError(
            `Bulkhead '${this.config.name}' wait timeout exceeded`,
            this.config.name
          )
        );
      }, this.config.waitTimeout);

      // Add to queue
      this.waitingQueue.push({
        resolve: () => {
          clearTimeout(timeout);
          this.doExecute(fn).then(resolve).catch(reject);
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timeout,
      });

      this.config.onQueued?.();

      this.emit({
        type: 'bulkhead_rejected', // Using rejected for queued state tracking
        service: this.config.name,
        timestamp: new Date(),
        metadata: {
          action: 'queued',
          queuePosition: this.waitingQueue.length,
        },
      });
    });
  }

  /**
   * Execute the function
   */
  private async doExecute<T>(fn: () => Promise<T>): Promise<T> {
    this.currentConcurrent++;
    this.config.onExecute?.();

    try {
      const result = await fn();
      this.totalExecuted++;
      return result;
    } finally {
      this.currentConcurrent--;
      this.processQueue();
    }
  }

  /**
   * Process the waiting queue
   */
  private processQueue(): void {
    if (
      this.waitingQueue.length > 0 &&
      this.currentConcurrent < this.config.maxConcurrent
    ) {
      const next = this.waitingQueue.shift();
      if (next) {
        next.resolve();
      }
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): BulkheadMetrics {
    return {
      name: this.config.name,
      concurrent: this.currentConcurrent,
      waiting: this.waitingQueue.length,
      maxConcurrent: this.config.maxConcurrent,
      maxWaiting: this.config.maxWaiting || 0,
      rejected: this.totalRejected,
      totalExecuted: this.totalExecuted,
    };
  }

  /**
   * Check if bulkhead is at capacity
   */
  isAtCapacity(): boolean {
    return this.currentConcurrent >= this.config.maxConcurrent;
  }

  /**
   * Check if queue is full
   */
  isQueueFull(): boolean {
    return (
      this.config.maxWaiting !== undefined &&
      this.waitingQueue.length >= this.config.maxWaiting
    );
  }

  /**
   * Get available permits
   */
  getAvailablePermits(): number {
    return Math.max(0, this.config.maxConcurrent - this.currentConcurrent);
  }

  /**
   * Reset the bulkhead
   */
  reset(): void {
    // Reject all waiting requests
    for (const item of this.waitingQueue) {
      clearTimeout(item.timeout);
      item.reject(new BulkheadError('Bulkhead reset', this.config.name));
    }
    this.waitingQueue = [];
    this.totalRejected = 0;
    this.totalExecuted = 0;
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
 * Bulkhead Error
 */
export class BulkheadError extends Error {
  readonly bulkheadName: string;
  readonly isBulkheadError = true;

  constructor(message: string, bulkheadName: string) {
    super(message);
    this.name = 'BulkheadError';
    this.bulkheadName = bulkheadName;
  }
}

/**
 * Bulkhead decorator
 */
export function WithBulkhead(config: BulkheadConfig) {
  const bulkhead = new Bulkhead(config);

  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return bulkhead.execute(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}
