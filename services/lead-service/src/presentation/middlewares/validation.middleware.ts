import { FastifyRequest, FastifyReply } from 'fastify';
import { z, ZodSchema } from 'zod';

/**
 * Validation middleware factory for Fastify with Zod
 * Provides type-safe request validation with automatic error handling
 */

/**
 * Custom HTTP Error class for consistent error handling
 */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public error: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

interface ValidationSchemas {
  body?: ZodSchema;
  querystring?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}

/**
 * Create validation handler for Fastify routes
 * Validates request data against Zod schemas
 */
export function validate(schemas: ValidationSchemas) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate body
      if (schemas.body) {
        request.body = schemas.body.parse(request.body);
      }

      // Validate query parameters
      if (schemas.querystring) {
        request.query = schemas.querystring.parse(request.query);
      }

      // Validate route parameters
      if (schemas.params) {
        request.params = schemas.params.parse(request.params);
      }

      // Validate headers
      if (schemas.headers) {
        request.headers = schemas.headers.parse(request.headers);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation failed',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
      }

      // Re-throw unexpected errors
      throw error;
    }
  };
}

/**
 * Extract tenant ID from headers
 * Throws HttpError 400 if tenant ID is missing or invalid
 */
export function getTenantId(request: FastifyRequest): string {
  const tenantId = (request.headers as Record<string, string>)['x-tenant-id'];

  if (!tenantId) {
    throw new HttpError(400, 'Bad Request', 'Missing x-tenant-id header');
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId)) {
    throw new HttpError(400, 'Bad Request', 'Invalid tenant ID format - must be a valid UUID');
  }

  return tenantId;
}

/**
 * Extract user ID from headers (optional)
 * Throws HttpError 400 if provided but invalid
 */
export function getUserId(request: FastifyRequest): string | undefined {
  const userId = (request.headers as Record<string, string>)['x-user-id'];

  if (!userId) {
    return undefined;
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new HttpError(400, 'Bad Request', 'Invalid user ID format - must be a valid UUID');
  }

  return userId;
}
