/**
 * Circuit Breaker Implementation
 * Prevents cascading failures when external services are unavailable
 */
import {
  CircuitState,
  CircuitBreakerConfig,
  CircuitBreakerMetrics,
  ResilienceEvent,
  ResilienceEventListener,
} from './types';

/**
 * Default circuit breaker configuration
 */
const DEFAULT_CONFIG: Partial<CircuitBreakerConfig> = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 30000, // 30 seconds
  volumeThreshold: 10,
  failureRateThreshold: 50,
  slowCallDurationThreshold: 5000, // 5 seconds
  slowCallRateThreshold: 80,
  permittedNumberOfCallsInHalfOpen: 3,
};

/**
 * Circuit Breaker class
 * Implements the circuit breaker pattern for fault tolerance
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private consecutiveSuccesses = 0;
  private consecutiveFailures = 0;
  private totalCalls = 0;
  private slowCalls = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private stateChangedAt = new Date();
  private halfOpenCalls = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly listeners: ResilienceEventListener[] = [];
  private windowStart = Date.now();
  private windowCalls: { success: boolean; duration: number; timestamp: number }[] = [];

  constructor(config: CircuitBreakerConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as CircuitBreakerConfig;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      // Check if timeout has passed
      if (this.shouldAttemptReset()) {
        this.transitionTo('half-open');
      } else {
        const error = new CircuitBreakerError(
          `Circuit breaker '${this.config.name}' is open`,
          this.config.name
        );
        throw error;
      }
    }

    // In half-open, limit the number of calls
    if (this.state === 'half-open') {
      if (this.halfOpenCalls >= (this.config.permittedNumberOfCallsInHalfOpen || 3)) {
        throw new CircuitBreakerError(
          `Circuit breaker '${this.config.name}' is half-open and at capacity`,
          this.config.name
        );
      }
      this.halfOpenCalls++;
    }

    const startTime = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      this.recordSuccess(duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Check if we should record this exception
      if (this.shouldRecordException(error as Error)) {
        this.recordFailure(error as Error, duration);
      }

      throw error;
    }
  }

  /**
   * Record a successful call
   */
  private recordSuccess(duration: number): void {
    this.totalCalls++;
    this.successCount++;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    this.lastSuccessTime = new Date();

    // Track in sliding window
    this.addToWindow(true, duration);

    // Check for slow call
    if (duration > (this.config.slowCallDurationThreshold || 5000)) {
      this.slowCalls++;
    }

    // Emit success event
    this.emit({
      type: 'success',
      service: this.config.name,
      timestamp: new Date(),
      duration,
    });

    // Call success callback
    this.config.onSuccess?.(duration);

    // Handle state transitions
    if (this.state === 'half-open') {
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        this.transitionTo('closed');
      }
    }
  }

  /**
   * Record a failed call
   */
  private recordFailure(error: Error, duration: number): void {
    this.totalCalls++;
    this.failureCount++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = new Date();

    // Track in sliding window
    this.addToWindow(false, duration);

    // Emit failure event
    this.emit({
      type: 'failure',
      service: this.config.name,
      timestamp: new Date(),
      duration,
      error: error.message,
    });

    // Call failure callback
    this.config.onFailure?.(error, duration);

    // Handle state transitions
    if (this.state === 'half-open') {
      // Any failure in half-open immediately opens the circuit
      this.transitionTo('open');
    } else if (this.state === 'closed') {
      // Check if we should open the circuit
      if (this.shouldOpen()) {
        this.transitionTo('open');
      }
    }
  }

  /**
   * Add call to sliding window
   */
  private addToWindow(success: boolean, duration: number): void {
    const now = Date.now();
    this.windowCalls.push({ success, duration, timestamp: now });

    // Remove calls outside the window (last 60 seconds)
    const windowDuration = 60000;
    this.windowCalls = this.windowCalls.filter(
      (call) => now - call.timestamp < windowDuration
    );
  }

  /**
   * Check if circuit should open
   */
  private shouldOpen(): boolean {
    // Check volume threshold
    if (this.windowCalls.length < (this.config.volumeThreshold || 10)) {
      return false;
    }

    // Check failure rate
    const failures = this.windowCalls.filter((c) => !c.success).length;
    const failureRate = (failures / this.windowCalls.length) * 100;

    if (failureRate >= (this.config.failureRateThreshold || 50)) {
      return true;
    }

    // Check slow call rate
    const slowCalls = this.windowCalls.filter(
      (c) => c.duration > (this.config.slowCallDurationThreshold || 5000)
    ).length;
    const slowCallRate = (slowCalls / this.windowCalls.length) * 100;

    if (slowCallRate >= (this.config.slowCallRateThreshold || 80)) {
      return true;
    }

    // Check consecutive failures (legacy support)
    if (this.consecutiveFailures >= this.config.failureThreshold) {
      return true;
    }

    return false;
  }

  /**
   * Check if we should attempt to reset (transition to half-open)
   */
  private shouldAttemptReset(): boolean {
    const timeSinceStateChange = Date.now() - this.stateChangedAt.getTime();
    return timeSinceStateChange >= this.config.timeout;
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;

    if (oldState === newState) return;

    this.state = newState;
    this.stateChangedAt = new Date();

    // Reset counters based on state
    if (newState === 'closed') {
      this.failureCount = 0;
      this.consecutiveFailures = 0;
      this.halfOpenCalls = 0;
      this.windowCalls = [];
      this.config.onClose?.();
    } else if (newState === 'open') {
      this.halfOpenCalls = 0;
      this.consecutiveSuccesses = 0;
      this.config.onOpen?.();
    } else if (newState === 'half-open') {
      this.halfOpenCalls = 0;
      this.consecutiveSuccesses = 0;
      this.config.onHalfOpen?.();
    }

    // Emit state change event
    this.emit({
      type: newState === 'open'
        ? 'circuit_open'
        : newState === 'closed'
        ? 'circuit_close'
        : 'circuit_half_open',
      service: this.config.name,
      timestamp: new Date(),
      metadata: { from: oldState, to: newState },
    });

    // Call state change callback
    this.config.onStateChange?.(oldState, newState);

    console.log(
      `Circuit breaker '${this.config.name}' transitioned from ${oldState} to ${newState}`
    );
  }

  /**
   * Check if exception should be recorded
   */
  private shouldRecordException(error: Error): boolean {
    // Check ignore list first
    if (this.config.ignoreExceptions) {
      for (const ExceptionType of this.config.ignoreExceptions) {
        if (error instanceof ExceptionType) {
          return false;
        }
      }
    }

    // If record list is specified, only record those
    if (this.config.recordExceptions && this.config.recordExceptions.length > 0) {
      for (const ExceptionType of this.config.recordExceptions) {
        if (error instanceof ExceptionType) {
          return true;
        }
      }
      return false;
    }

    // Record all exceptions by default
    return true;
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const failures = this.windowCalls.filter((c) => !c.success).length;
    const slowCalls = this.windowCalls.filter(
      (c) => c.duration > (this.config.slowCallDurationThreshold || 5000)
    ).length;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalCalls: this.totalCalls,
      failureRate:
        this.windowCalls.length > 0
          ? (failures / this.windowCalls.length) * 100
          : 0,
      slowCallRate:
        this.windowCalls.length > 0
          ? (slowCalls / this.windowCalls.length) * 100
          : 0,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateChangedAt: this.stateChangedAt,
      consecutiveSuccesses: this.consecutiveSuccesses,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Force reset the circuit breaker
   */
  reset(): void {
    this.transitionTo('closed');
    this.failureCount = 0;
    this.successCount = 0;
    this.totalCalls = 0;
    this.slowCalls = 0;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.windowCalls = [];
    console.log(`Circuit breaker '${this.config.name}' manually reset`);
  }

  /**
   * Force open the circuit
   */
  forceOpen(): void {
    this.transitionTo('open');
  }

  /**
   * Force close the circuit
   */
  forceClose(): void {
    this.transitionTo('closed');
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

  /**
   * Check if circuit is allowing requests
   */
  isAllowingRequests(): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'open') {
      return this.shouldAttemptReset();
    }
    // half-open
    return this.halfOpenCalls < (this.config.permittedNumberOfCallsInHalfOpen || 3);
  }
}

/**
 * Circuit Breaker Error
 */
export class CircuitBreakerError extends Error {
  readonly circuitName: string;
  readonly isCircuitBreakerError = true;

  constructor(message: string, circuitName: string) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.circuitName = circuitName;
  }
}
