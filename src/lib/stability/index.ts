// ============================================
// Stability Utilities - FASE 5.12
// Error handling, retries, and resilience patterns
// ============================================

// ============================================
// Error Types
// ============================================

/**
 * Application error codes
 */
export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  OFFLINE_ERROR = 'OFFLINE_ERROR',

  // API errors
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',

  // Auth errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Client errors
  INVALID_INPUT = 'INVALID_INPUT',
  STATE_ERROR = 'STATE_ERROR',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Application error with structured data
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode?: number;
  public readonly details?: unknown;
  public readonly isRetryable: boolean;
  public readonly timestamp: number;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      statusCode?: number;
      details?: unknown;
      isRetryable?: boolean;
      cause?: Error;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = 'AppError';
    this.code = code;
    this.statusCode = options?.statusCode;
    this.details = options?.details;
    this.isRetryable = options?.isRetryable ?? this.getDefaultRetryable(code);
    this.timestamp = Date.now();
  }

  private getDefaultRetryable(code: ErrorCode): boolean {
    const retryableCodes = new Set([
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT_ERROR,
      ErrorCode.RATE_LIMITED,
    ]);
    return retryableCodes.has(code);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      isRetryable: this.isRetryable,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // Check for network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new AppError(ErrorCode.NETWORK_ERROR, 'Network request failed', {
        cause: error,
        isRetryable: true,
      });
    }

    // Check for abort errors (timeouts)
    if (error.name === 'AbortError') {
      return new AppError(ErrorCode.TIMEOUT_ERROR, 'Request timed out', {
        cause: error,
        isRetryable: true,
      });
    }

    return new AppError(ErrorCode.UNKNOWN_ERROR, error.message, {
      cause: error,
    });
  }

  return new AppError(
    ErrorCode.UNKNOWN_ERROR,
    typeof error === 'string' ? error : 'An unknown error occurred'
  );
}

// ============================================
// Retry Logic
// ============================================

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  shouldRetry?: (error: AppError, attempt: number) => boolean;
  onRetry?: (error: AppError, attempt: number, delayMs: number) => void;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const baseDelay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt);
  const cappedDelay = Math.min(baseDelay, options.maxDelayMs);
  // Add jitter (10-30% random variation)
  const jitter = cappedDelay * (0.1 + Math.random() * 0.2);
  return Math.round(cappedDelay + jitter);
}

/**
 * Sleep for specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: AppError | undefined;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = toAppError(error);

      // Check if we should retry
      const shouldRetry = opts.shouldRetry
        ? opts.shouldRetry(lastError, attempt)
        : lastError.isRetryable;

      if (!shouldRetry || attempt === opts.maxAttempts - 1) {
        throw lastError;
      }

      // Calculate delay and wait
      const delayMs = calculateDelay(attempt, opts);
      opts.onRetry?.(lastError, attempt + 1, delayMs);
      await sleep(delayMs);
    }
  }

  throw lastError ?? new AppError(ErrorCode.UNKNOWN_ERROR, 'Retry failed');
}

// ============================================
// Timeout Wrapper
// ============================================

/**
 * Wrap a promise with a timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = 'Operation timed out'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new AppError(ErrorCode.TIMEOUT_ERROR, message));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error: unknown) => {
        clearTimeout(timeoutId);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
  });
}

// ============================================
// Circuit Breaker
// ============================================

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenRequests: number;
}

const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenRequests: 3,
};

/**
 * Simple circuit breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitBreakerState;
  private options: CircuitBreakerOptions;
  private halfOpenAttempts: number = 0;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = { ...DEFAULT_CIRCUIT_BREAKER_OPTIONS, ...options };
    this.state = {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state.state === 'open') {
      const timeSinceFailure = Date.now() - this.state.lastFailure;
      if (timeSinceFailure >= this.options.resetTimeoutMs) {
        this.state.state = 'half-open';
        this.halfOpenAttempts = 0;
      } else {
        throw new AppError(
          ErrorCode.API_ERROR,
          'Service temporarily unavailable (circuit open)',
          { isRetryable: false }
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state.state === 'half-open') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.options.halfOpenRequests) {
        this.state.state = 'closed';
        this.state.failures = 0;
      }
    } else {
      this.state.failures = 0;
    }
  }

  private onFailure(): void {
    this.state.failures++;
    this.state.lastFailure = Date.now();

    if (this.state.state === 'half-open') {
      this.state.state = 'open';
    } else if (this.state.failures >= this.options.failureThreshold) {
      this.state.state = 'open';
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state.state;
  }

  reset(): void {
    this.state = {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
    };
  }
}

// ============================================
// Error Recovery Strategies
// ============================================

/**
 * Try to recover from an error with fallback
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T> | T
): Promise<T> {
  try {
    return await primary();
  } catch {
    return await fallback();
  }
}

/**
 * Try multiple strategies in order
 */
export async function tryStrategies<T>(
  strategies: Array<() => Promise<T>>
): Promise<T> {
  let lastError: Error | undefined;

  for (const strategy of strategies) {
    try {
      return await strategy();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new AppError(ErrorCode.UNKNOWN_ERROR, 'All strategies failed');
}

// ============================================
// Graceful Degradation
// ============================================

export interface GracefulResult<T> {
  data: T | null;
  isStale: boolean;
  error?: AppError;
}

/**
 * Execute with graceful degradation
 * Returns cached data on error if available
 */
export async function withGracefulDegradation<T>(
  fetchFn: () => Promise<T>,
  getCached: () => T | null,
  setCached: (data: T) => void
): Promise<GracefulResult<T>> {
  try {
    const data = await fetchFn();
    setCached(data);
    return { data, isStale: false };
  } catch (error) {
    const cached = getCached();
    if (cached !== null) {
      return {
        data: cached,
        isStale: true,
        error: toAppError(error),
      };
    }
    throw toAppError(error);
  }
}

// ============================================
// Error Reporting
// ============================================

export interface ErrorReport {
  error: AppError;
  context: {
    url?: string;
    route?: string;
    userId?: string;
    tenantId?: string;
    action?: string;
    component?: string;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Report error (placeholder for actual implementation)
 */
export function reportError(report: ErrorReport): void {
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Report]', report);
  }
  // In production, this would send to Sentry or similar service
}

/**
 * Create error reporter bound to a context
 */
export function createErrorReporter(
  context: ErrorReport['context']
): (error: unknown, metadata?: Record<string, unknown>) => void {
  return (error: unknown, metadata?: Record<string, unknown>) => {
    reportError({
      error: toAppError(error),
      context,
      metadata,
    });
  };
}

// ============================================
// Offline Detection
// ============================================

/**
 * Check if browser is online
 */
export function isOnline(): boolean {
  if (typeof navigator !== 'undefined') {
    return navigator.onLine;
  }
  return true;
}

/**
 * Subscribe to online/offline events
 */
export function onConnectionChange(
  callback: (isOnline: boolean) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// ============================================
// User-Friendly Error Messages
// ============================================

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  const appError = toAppError(error);

  const messages: Record<ErrorCode, string> = {
    [ErrorCode.NETWORK_ERROR]: 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
    [ErrorCode.TIMEOUT_ERROR]: 'La operación tardó demasiado. Intenta de nuevo.',
    [ErrorCode.OFFLINE_ERROR]: 'No hay conexión a internet.',
    [ErrorCode.API_ERROR]: 'Ocurrió un error en el servidor. Intenta de nuevo más tarde.',
    [ErrorCode.VALIDATION_ERROR]: 'Los datos ingresados no son válidos.',
    [ErrorCode.NOT_FOUND]: 'El recurso solicitado no fue encontrado.',
    [ErrorCode.CONFLICT]: 'Hubo un conflicto con los datos. Recarga la página.',
    [ErrorCode.RATE_LIMITED]: 'Demasiadas solicitudes. Espera un momento.',
    [ErrorCode.UNAUTHORIZED]: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
    [ErrorCode.FORBIDDEN]: 'No tienes permiso para realizar esta acción.',
    [ErrorCode.SESSION_EXPIRED]: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
    [ErrorCode.INVALID_INPUT]: 'Los datos ingresados no son válidos.',
    [ErrorCode.STATE_ERROR]: 'Ocurrió un error inesperado. Recarga la página.',
    [ErrorCode.UNKNOWN_ERROR]: 'Ocurrió un error inesperado. Intenta de nuevo.',
  };

  return messages[appError.code] || messages[ErrorCode.UNKNOWN_ERROR];
}

// ============================================
// Safe Async Handlers
// ============================================

/**
 * Wrap async event handler to prevent unhandled promise rejections
 */
export function safeHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<void>,
  onError?: (error: AppError) => void
): (...args: T) => void {
  return (...args: T) => {
    handler(...args).catch((error) => {
      const appError = toAppError(error);
      if (onError) {
        onError(appError);
      } else {
        reportError({
          error: appError,
          context: { action: 'event_handler' },
        });
      }
    });
  };
}

/**
 * Create a safe mutation wrapper for React Query
 */
export function createSafeMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onError?: (error: AppError, variables: TVariables) => void;
    retryable?: boolean;
  }
): (variables: TVariables) => Promise<TData> {
  return async (variables: TVariables) => {
    try {
      return await mutationFn(variables);
    } catch (error) {
      const appError = toAppError(error);
      options?.onError?.(appError, variables);
      throw appError;
    }
  };
}
