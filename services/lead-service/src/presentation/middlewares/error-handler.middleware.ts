import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { getCorrelationId } from './correlation-id.middleware';

/**
 * Error categories for better error handling and monitoring
 */
enum ErrorCategory {
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  SERVER = 'INTERNAL_SERVER_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * Standard error response structure
 */
interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  category: ErrorCategory;
  correlationId?: string;
  timestamp: string;
  path: string;
  stack?: string;
  details?: any;
}

/**
 * Global error handler for Fastify
 *
 * Provides comprehensive error handling with:
 * - Consistent error response format
 * - Error categorization for monitoring
 * - Correlation ID tracking
 * - Sanitized error messages for production
 * - Detailed logging with context
 * - Stack traces in development only
 */
export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const correlationId = getCorrelationId(request);
  const { method, url } = request;

  // Determine error category and status code
  const category = categorizeError(error);
  const statusCode = error.statusCode || getStatusCodeForCategory(category);

  // Sanitize error message for production
  const message = sanitizeErrorMessage(error, category);

  // Log error with full context
  const logContext = {
    correlationId,
    category,
    statusCode,
    method,
    url,
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
    },
  };

  if (statusCode >= 500) {
    request.log.error(logContext, 'Server error occurred');
  } else if (statusCode >= 400) {
    request.log.warn(logContext, 'Client error occurred');
  }

  // Build error response
  const response: ErrorResponse = {
    statusCode,
    error: error.name || 'Error',
    message,
    category,
    correlationId,
    timestamp: new Date().toISOString(),
    path: url,
  };

  // Include additional details for validation errors
  if (category === ErrorCategory.VALIDATION && (error as any).validation) {
    response.details = (error as any).validation;
  }

  // Include stack trace in development only
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  reply.status(statusCode).send(response);
}

/**
 * Categorize error based on error properties
 */
function categorizeError(error: FastifyError): ErrorCategory {
  const statusCode = error.statusCode || 500;
  const errorName = error.name.toLowerCase();
  const errorCode = error.code;

  // Check error code first
  if (errorCode === 'FST_ERR_VALIDATION') {
    return ErrorCategory.VALIDATION;
  }

  if (errorCode === 'FST_ERR_NOT_FOUND') {
    return ErrorCategory.NOT_FOUND;
  }

  if (errorCode === 'FST_ERR_RATE_LIMIT_EXCEEDED') {
    return ErrorCategory.RATE_LIMIT;
  }

  // Check status code
  if (statusCode === 400 || errorName.includes('validation')) {
    return ErrorCategory.VALIDATION;
  }

  if (statusCode === 401) {
    return ErrorCategory.UNAUTHORIZED;
  }

  if (statusCode === 403) {
    return ErrorCategory.FORBIDDEN;
  }

  if (statusCode === 404) {
    return ErrorCategory.NOT_FOUND;
  }

  if (statusCode === 409) {
    return ErrorCategory.CONFLICT;
  }

  if (statusCode === 429) {
    return ErrorCategory.RATE_LIMIT;
  }

  // Check error message for database errors
  if (errorName.includes('database') || errorName.includes('postgres')) {
    return ErrorCategory.DATABASE;
  }

  // Default to server error for 5xx
  if (statusCode >= 500) {
    return ErrorCategory.SERVER;
  }

  return ErrorCategory.SERVER;
}

/**
 * Get appropriate status code for error category
 */
function getStatusCodeForCategory(category: ErrorCategory): number {
  switch (category) {
    case ErrorCategory.VALIDATION:
      return 400;
    case ErrorCategory.UNAUTHORIZED:
      return 401;
    case ErrorCategory.FORBIDDEN:
      return 403;
    case ErrorCategory.NOT_FOUND:
      return 404;
    case ErrorCategory.CONFLICT:
      return 409;
    case ErrorCategory.RATE_LIMIT:
      return 429;
    case ErrorCategory.DATABASE:
    case ErrorCategory.EXTERNAL_SERVICE:
    case ErrorCategory.SERVER:
    default:
      return 500;
  }
}

/**
 * Sanitize error message for production
 * Prevents leaking sensitive information in error messages
 */
function sanitizeErrorMessage(error: FastifyError, category: ErrorCategory): string {
  // In production, use generic messages for server errors
  if (process.env.NODE_ENV === 'production' && category === ErrorCategory.SERVER) {
    return 'An internal server error occurred. Please try again later.';
  }

  if (process.env.NODE_ENV === 'production' && category === ErrorCategory.DATABASE) {
    return 'A database error occurred. Please try again later.';
  }

  if (process.env.NODE_ENV === 'production' && category === ErrorCategory.EXTERNAL_SERVICE) {
    return 'An external service is unavailable. Please try again later.';
  }

  // For client errors, return the actual message
  return error.message || 'An error occurred';
}
