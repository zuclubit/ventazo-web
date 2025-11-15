import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Global error handler for Fastify
 * Catches all errors and returns consistent error responses
 */
export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error(error);

  // Determine status code
  const statusCode = error.statusCode || 500;

  // Build error response
  const response: {
    statusCode: number;
    error: string;
    message: string;
    stack?: string;
  } = {
    statusCode,
    error: error.name || 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  reply.status(statusCode).send(response);
}
