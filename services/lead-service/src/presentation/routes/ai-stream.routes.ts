/**
 * AI Streaming Routes (Refactored)
 *
 * SSE streaming routes that proxy to the Bot Management System.
 * The CRM does NOT process AI responses - it only proxies the stream.
 *
 * @module presentation/routes/ai-stream.routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getBotGateway, BotUserContext } from '../../infrastructure/bot-gateway';

// ============================================
// Request Schemas
// ============================================

const streamChatSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

type StreamChatRequest = z.infer<typeof streamChatSchema>;

// ============================================
// Helper Functions
// ============================================

/**
 * Extract user context from request headers
 */
function getUserContext(request: FastifyRequest): BotUserContext {
  const headers = request.headers;
  return {
    userId: (headers['x-user-id'] as string) || '',
    email: (headers['x-user-email'] as string) || '',
    displayName: (headers['x-user-name'] as string) || 'User',
    role: (headers['x-user-role'] as string) || 'user',
    permissions: ((headers['x-user-permissions'] as string) || '').split(',').filter(Boolean),
    tenantId: (headers['x-tenant-id'] as string) || '',
    timezone: (headers['x-user-timezone'] as string) || undefined,
    locale: (headers['x-user-locale'] as string) || 'es',
  };
}

// ============================================
// Route Handlers
// ============================================

/**
 * POST /stream/chat - Stream chat response via SSE
 */
async function streamChatHandler(
  request: FastifyRequest<{ Body: StreamChatRequest }>,
  reply: FastifyReply
): Promise<void> {
  const user = getUserContext(request);

  // Validate user context
  if (!user.userId || !user.tenantId) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'User context required',
    });
    return;
  }

  // Validate request body
  const parseResult = streamChatSchema.safeParse(request.body);
  if (!parseResult.success) {
    reply.code(400).send({
      error: 'Validation error',
      details: parseResult.error.errors,
    });
    return;
  }

  const { message, conversationId, metadata } = parseResult.data;

  try {
    const botGateway = getBotGateway();

    if (!botGateway.isReady()) {
      reply.code(503).send({
        error: 'Service unavailable',
        message: 'Bot Management System not configured',
      });
      return;
    }

    // Get streaming response from Bot Management System
    const response = await botGateway.createStreamRequest({
      message,
      conversationId,
      user,
      metadata,
    });

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Pipe the stream directly to the response
    if (response.body) {
      const reader = response.body.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Write chunk directly to response
          reply.raw.write(value);
        }
      } finally {
        reader.releaseLock();
      }
    }

    reply.raw.end();
  } catch (error) {
    console.error('Stream chat failed:', error);

    // If headers not sent, send error response
    if (!reply.raw.headersSent) {
      reply.code(500).send({
        error: 'Stream error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } else {
      // Send error event if streaming already started
      const errorEvent = {
        code: 'STREAM_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
        requestId: 'unknown',
      };
      reply.raw.write(`event: error\ndata: ${JSON.stringify(errorEvent)}\n\n`);
      reply.raw.end();
    }
  }
}

/**
 * GET /stream/health - Health check
 */
async function healthHandler(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const botGateway = getBotGateway();

  if (!botGateway.isReady()) {
    reply.code(503).send({
      status: 'unavailable',
      message: 'Bot Management System not configured',
    });
    return;
  }

  const isHealthy = await botGateway.healthCheck();

  if (isHealthy) {
    reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } else {
    reply.code(503).send({
      status: 'unhealthy',
      message: 'Bot Management System unreachable',
    });
  }
}

// ============================================
// Route Registration
// ============================================

export async function aiStreamRoutes(fastify: FastifyInstance): Promise<void> {
  // Streaming chat endpoint
  fastify.post('/stream/chat', streamChatHandler);

  // Health check
  fastify.get('/stream/health', healthHandler);
}

export default aiStreamRoutes;
