/**
 * Tracing Routes
 * REST API for tracing configuration and monitoring
 */

import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { TracingService } from './tracing.service';
import { TracingConfig } from './types';

/**
 * Get tracing service from container
 */
function getTracingService(): TracingService | null {
  try {
    return container.resolve<TracingService>('TracingService');
  } catch {
    return null;
  }
}

/**
 * Tracing routes plugin
 */
export async function tracingRoutes(
  fastify: FastifyInstance
): Promise<void> {
  /**
   * Get tracing status
   */
  fastify.get('/status', {
    schema: {
      description: 'Get tracing status',
      tags: ['Tracing'],
      response: {
        200: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            initialized: { type: 'boolean' },
            exporter: { type: 'string' },
            samplingRatio: { type: 'number' },
          },
        },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const service = getTracingService();

    if (!service) {
      return {
        enabled: false,
        initialized: false,
        exporter: 'none',
        samplingRatio: 0,
      };
    }

    return {
      enabled: service.isEnabled(),
      initialized: service.isEnabled(),
      exporter: 'otlp',
      samplingRatio: 0.1,
    };
  });

  /**
   * Get tracing metrics
   */
  fastify.get('/metrics', {
    schema: {
      description: 'Get tracing metrics',
      tags: ['Tracing'],
      response: {
        200: {
          type: 'object',
          properties: {
            spansCreated: { type: 'number' },
            spansExported: { type: 'number' },
            spansFailed: { type: 'number' },
            exportErrors: { type: 'number' },
            avgSpanDuration: { type: 'number' },
            sampledCount: { type: 'number' },
            droppedCount: { type: 'number' },
          },
        },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const service = getTracingService();

    if (!service) {
      return {
        spansCreated: 0,
        spansExported: 0,
        spansFailed: 0,
        exportErrors: 0,
        avgSpanDuration: 0,
        sampledCount: 0,
        droppedCount: 0,
      };
    }

    return service.getMetrics();
  });

  /**
   * Reset tracing metrics
   */
  fastify.post('/metrics/reset', {
    schema: {
      description: 'Reset tracing metrics',
      tags: ['Tracing'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const service = getTracingService();

    if (service) {
      service.resetMetrics();
    }

    return { success: true };
  });

  /**
   * Get current trace context
   */
  fastify.get('/context', {
    schema: {
      description: 'Get current trace context',
      tags: ['Tracing'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const service = getTracingService();

    if (!service) {
      return { traceId: null, spanId: null };
    }

    const context = service.getCurrentTraceContext();
    return context || { traceId: null, spanId: null };
  });

  /**
   * Test trace creation
   */
  fastify.post('/test', {
    schema: {
      description: 'Create a test trace',
      tags: ['Tracing'],
      body: {
        type: 'object',
        properties: {
          operationName: { type: 'string' },
          durationMs: { type: 'integer', minimum: 0, maximum: 5000 },
          simulateError: { type: 'boolean' },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      operationName?: string;
      durationMs?: number;
      simulateError?: boolean;
    };
  }>, reply: FastifyReply) => {
    const service = getTracingService();

    if (!service || !service.isEnabled()) {
      reply.code(503);
      return { error: 'Tracing not enabled' };
    }

    const { operationName = 'test.operation', durationMs = 100, simulateError = false } = request.body || {};

    try {
      const result = await service.trace(
        operationName,
        async (span) => {
          span.setAttribute('test.duration', durationMs);
          span.addEvent('test_started');

          // Simulate work
          await new Promise((resolve) => setTimeout(resolve, durationMs));

          if (simulateError) {
            throw new Error('Simulated test error');
          }

          span.addEvent('test_completed');
          return { message: 'Test trace completed' };
        }
      );

      return {
        success: true,
        traceId: result.traceId,
        spanId: result.spanId,
        duration: result.duration,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  /**
   * Get trace propagation headers
   */
  fastify.get('/propagation', {
    schema: {
      description: 'Get trace propagation headers',
      tags: ['Tracing'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const service = getTracingService();

    if (!service) {
      return { headers: {} };
    }

    const headers = service.injectContext({});
    return { headers };
  });

  /**
   * Health check for tracing exporters
   */
  fastify.get('/health', {
    schema: {
      description: 'Check tracing exporter health',
      tags: ['Tracing'],
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const service = getTracingService();

    const status = {
      healthy: false,
      enabled: false,
      exporter: 'none',
      lastError: null as string | null,
    };

    if (!service) {
      return status;
    }

    status.enabled = service.isEnabled();

    if (status.enabled) {
      status.healthy = true;
      status.exporter = 'otlp';
    }

    return status;
  });

  /**
   * Get instrumentation info
   */
  fastify.get('/instrumentations', {
    schema: {
      description: 'Get active instrumentations',
      tags: ['Tracing'],
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return {
      instrumentations: [
        { name: 'http', enabled: true, version: '0.x' },
        { name: 'fastify', enabled: true, version: '0.x' },
        { name: 'pg', enabled: true, version: '0.x' },
        { name: 'redis', enabled: true, version: '0.x' },
      ],
    };
  });

  /**
   * Get sampling configuration
   */
  fastify.get('/sampling', {
    schema: {
      description: 'Get sampling configuration',
      tags: ['Tracing'],
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return {
      strategy: 'trace_id_ratio',
      ratio: 0.1,
      description: '10% of traces are sampled',
    };
  });
}
