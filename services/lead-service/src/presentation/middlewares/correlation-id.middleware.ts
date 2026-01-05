import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

/**
 * Correlation ID Middleware
 *
 * Adds a unique correlation ID to each request for distributed tracing.
 * The correlation ID is used to track requests across microservices and logs.
 *
 * The middleware:
 * - Checks for existing correlation ID in 'x-correlation-id' or 'x-request-id' headers
 * - Generates a new UUID if no ID is found
 * - Adds the ID to the request object for use in handlers
 * - Returns the ID in the response header for client tracking
 *
 * Usage:
 * ```typescript
 * server.addHook('onRequest', correlationIdMiddleware);
 * ```
 */
export async function correlationIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Check for existing correlation ID in headers
  const existingId =
    request.headers['x-correlation-id'] ||
    request.headers['x-request-id'];

  // Generate new ID if not present
  const correlationId = typeof existingId === 'string' ? existingId : randomUUID();

  // Add to request object for use in handlers
  (request as any).correlationId = correlationId;

  // Add to response headers
  reply.header('x-correlation-id', correlationId);
}

/**
 * Get correlation ID from request
 *
 * Helper function to safely retrieve the correlation ID from a request.
 * Returns undefined if no correlation ID is present.
 */
export function getCorrelationId(request: FastifyRequest): string | undefined {
  return (request as any).correlationId;
}

/**
 * TypeScript declaration merging to add correlationId to FastifyRequest
 * This provides type safety when accessing request.correlationId
 */
declare module 'fastify' {
  interface FastifyRequest {
    correlationId?: string;
  }
}
