import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Request Logger Middleware
 *
 * Logs incoming requests and outgoing responses with correlation ID for tracing.
 * Provides structured logging with request/response details and timing information.
 *
 * Logged information includes:
 * - Correlation ID
 * - HTTP method and URL
 * - Request body (for POST/PUT/PATCH)
 * - Response status code
 * - Response time in milliseconds
 * - User agent and IP address
 *
 * Usage:
 * ```typescript
 * server.addHook('onRequest', requestLoggerOnRequest);
 * server.addHook('onResponse', requestLoggerOnResponse);
 * ```
 */

/**
 * Log incoming requests
 */
export async function requestLoggerOnRequest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const correlationId = request.correlationId || 'unknown';
  const { method, url, headers } = request;

  request.log.info({
    correlationId,
    type: 'request',
    method,
    url,
    userAgent: headers['user-agent'],
    ip: request.ip,
    body: shouldLogBody(method) ? sanitizeBody(request.body) : undefined,
  }, `Incoming ${method} ${url}`);
}

/**
 * Log outgoing responses
 */
export async function requestLoggerOnResponse(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const correlationId = request.correlationId || 'unknown';
  const { method, url } = request;
  const { statusCode } = reply;
  const responseTime = reply.getResponseTime();

  const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

  request.log[logLevel]({
    correlationId,
    type: 'response',
    method,
    url,
    statusCode,
    responseTime: `${responseTime.toFixed(2)}ms`,
  }, `${method} ${url} ${statusCode} - ${responseTime.toFixed(2)}ms`);
}

/**
 * Check if request body should be logged
 */
function shouldLogBody(method: string): boolean {
  return ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase());
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'creditCard',
    'credit_card',
    'ssn',
    'socialSecurity',
  ];

  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***';
    }
  }

  return sanitized;
}
