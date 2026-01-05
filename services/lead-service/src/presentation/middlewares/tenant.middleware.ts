import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Tenant context hook for Fastify
 * Extracts tenant ID from header (placeholder for JWT validation)
 * In production, this would validate JWT and extract tenant_id from claims
 */
export async function tenantContextHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // TODO: Implement JWT validation with Supabase Auth
  // For now, expect tenant ID in header for development
  const tenantId = request.headers['x-tenant-id'] as string;

  if (!tenantId) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Tenant ID is required (X-Tenant-Id header)',
    });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId)) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Invalid tenant ID format (must be UUID)',
    });
  }

  // Attach to request for use in routes
  (request as FastifyRequest & { tenantId: string }).tenantId = tenantId;
}

/**
 * Get tenant ID from request
 * Helper function to extract tenant ID from decorated request
 */
export function getTenantId(request: FastifyRequest): string {
  return (request as FastifyRequest & { tenantId: string }).tenantId;
}

/**
 * Get user ID from request
 * Helper function to extract user ID from decorated request or headers
 */
export function getUserId(request: FastifyRequest): string {
  // Try to get from decorated request (if auth middleware has set it)
  const decoratedRequest = request as FastifyRequest & { userId?: string };
  if (decoratedRequest.userId) {
    return decoratedRequest.userId;
  }

  // Fallback: try to get from header
  const userId = request.headers['x-user-id'] as string;
  if (userId) {
    return userId;
  }

  // Return 'system' as fallback for system operations
  return 'system';
}

/**
 * Get session ID from request
 * Helper function to extract session ID from decorated request or headers
 */
export function getSessionId(request: FastifyRequest): string | undefined {
  // Try to get from decorated request (if auth middleware has set it)
  const decoratedRequest = request as FastifyRequest & { sessionId?: string };
  if (decoratedRequest.sessionId) {
    return decoratedRequest.sessionId;
  }

  // Fallback: try to get from header
  const sessionId = request.headers['x-session-id'] as string;
  if (sessionId) {
    return sessionId;
  }

  return undefined;
}
