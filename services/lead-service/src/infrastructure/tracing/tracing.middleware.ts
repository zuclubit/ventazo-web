/**
 * Tracing Middleware
 * Fastify middleware for request tracing
 */

import { FastifyRequest, FastifyReply, FastifyInstance, FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';
import { container } from 'tsyringe';
import { TracingService, TracingSpan } from './tracing.service';
import { SemanticAttributes, mapErrorToType } from './types';

/**
 * Tracing middleware options
 */
export interface TracingMiddlewareOptions {
  /**
   * Skip tracing for certain paths
   */
  skipPaths?: string[];

  /**
   * Skip tracing for certain methods
   */
  skipMethods?: string[];

  /**
   * Extract tenant ID from request
   */
  extractTenantId?: (request: FastifyRequest) => string | undefined;

  /**
   * Extract user ID from request
   */
  extractUserId?: (request: FastifyRequest) => string | undefined;

  /**
   * Extract correlation ID from request
   */
  extractCorrelationId?: (request: FastifyRequest) => string | undefined;

  /**
   * Custom span name generator
   */
  spanNameGenerator?: (request: FastifyRequest) => string;

  /**
   * Request hook for adding custom attributes
   */
  requestHook?: (span: TracingSpan, request: FastifyRequest) => void;

  /**
   * Response hook for adding custom attributes
   */
  responseHook?: (span: TracingSpan, request: FastifyRequest, reply: FastifyReply) => void;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: TracingMiddlewareOptions = {
  skipPaths: ['/health', '/ready', '/live', '/metrics', '/favicon.ico'],
  skipMethods: ['OPTIONS'],
};

/**
 * Extend FastifyRequest with tracing info
 */
declare module 'fastify' {
  interface FastifyRequest {
    tracing?: {
      span: TracingSpan;
      traceId: string;
      spanId: string;
      startTime: number;
    };
  }
}

/**
 * Generate span name from request
 */
function defaultSpanNameGenerator(request: FastifyRequest): string {
  const routeUrl = request.routeOptions?.url || request.url.split('?')[0];
  return `${request.method} ${routeUrl}`;
}

/**
 * Extract route pattern
 */
function extractRoutePattern(request: FastifyRequest): string {
  return request.routeOptions?.url || request.url.split('?')[0];
}

/**
 * Create tracing middleware
 */
export function createTracingMiddleware(
  options: TracingMiddlewareOptions = {}
): {
  onRequest: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  onResponse: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  onError: (request: FastifyRequest, reply: FastifyReply, error: Error) => Promise<void>;
} {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return {
    onRequest: async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      // Skip certain paths
      if (opts.skipPaths?.some(path => request.url.startsWith(path))) {
        return;
      }

      // Skip certain methods
      if (opts.skipMethods?.includes(request.method)) {
        return;
      }

      let tracingService: TracingService;
      try {
        tracingService = container.resolve<TracingService>('TracingService');
      } catch {
        return;
      }

      if (!tracingService.isEnabled()) {
        return;
      }

      // Extract parent context from headers
      const parentContext = tracingService.extractContext(request.headers as Record<string, unknown>);

      // Generate span name
      const spanName = opts.spanNameGenerator
        ? opts.spanNameGenerator(request)
        : defaultSpanNameGenerator(request);

      // Create span
      const span = tracingService.startSpan({
        name: spanName,
        kind: 1, // SERVER
        attributes: {
          'http.method': request.method,
          'http.url': request.url,
          'http.target': request.url.split('?')[0],
          'http.route': extractRoutePattern(request),
          'http.user_agent': request.headers['user-agent'] || '',
          'http.client_ip': request.ip,
          'http.request_content_length': request.headers['content-length']
            ? parseInt(request.headers['content-length'], 10)
            : undefined,
          [SemanticAttributes.TENANT_ID]: opts.extractTenantId?.(request),
          [SemanticAttributes.USER_ID]: opts.extractUserId?.(request),
          [SemanticAttributes.CORRELATION_ID]:
            opts.extractCorrelationId?.(request) ||
            (request.headers['x-correlation-id'] as string),
          [SemanticAttributes.REQUEST_ID]:
            (request.headers['x-request-id'] as string) || request.id,
        },
      });

      // Apply custom request hook
      if (opts.requestHook) {
        opts.requestHook(span, request);
      }

      // Store tracing info on request
      request.tracing = {
        span,
        traceId: span.traceId,
        spanId: span.spanId,
        startTime: Date.now(),
      };

      // Set response headers for trace propagation
      _reply.header('x-trace-id', span.traceId);
      _reply.header('x-span-id', span.spanId);
    },

    onResponse: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      if (!request.tracing) {
        return;
      }

      const { span, startTime } = request.tracing;
      const duration = Date.now() - startTime;

      // Set response attributes
      span.setAttribute('http.status_code', reply.statusCode);
      span.setAttribute('performance.duration_ms', duration);

      // Apply custom response hook
      const opts2 = { ...DEFAULT_OPTIONS, ...options };
      if (opts2.responseHook) {
        opts2.responseHook(span, request, reply);
      }

      let tracingService: TracingService;
      try {
        tracingService = container.resolve<TracingService>('TracingService');
      } catch {
        return;
      }

      // Set span status based on HTTP status
      if (reply.statusCode >= 400) {
        span.setStatus({
          code: 'ERROR',
          message: `HTTP ${reply.statusCode}`,
        });
      } else {
        span.setStatus({ code: 'OK' });
      }

      tracingService.endSpan(span);
    },

    onError: async (request: FastifyRequest, reply: FastifyReply, error: Error): Promise<void> => {
      if (!request.tracing) {
        return;
      }

      const { span } = request.tracing;

      // Record exception
      span.recordException(error);

      // Set error attributes
      const errorType = mapErrorToType(error, reply.statusCode);
      span.setAttribute('error', true);
      span.setAttribute('error.type', errorType);
      span.setAttribute('error.message', error.message);
      if (error.stack) {
        span.setAttribute('error.stack', error.stack.substring(0, 500));
      }

      let tracingService: TracingService;
      try {
        tracingService = container.resolve<TracingService>('TracingService');
      } catch {
        return;
      }

      tracingService.endSpan(span, error);
    },
  };
}

/**
 * Tracing Fastify plugin
 */
const tracingPlugin: FastifyPluginCallback<TracingMiddlewareOptions> = (
  fastify: FastifyInstance,
  options: TracingMiddlewareOptions,
  done: (err?: Error) => void
) => {
  const middleware = createTracingMiddleware(options);

  fastify.addHook('onRequest', async (request, reply) => {
    await middleware.onRequest(request, reply);
  });

  fastify.addHook('onResponse', async (request, reply) => {
    await middleware.onResponse(request, reply);
  });

  fastify.addHook('onError', async (request, reply, error) => {
    await middleware.onError(request, reply, error);
  });

  done();
};

/**
 * Exported Fastify plugin
 */
export const tracingMiddlewarePlugin = fp(tracingPlugin, {
  fastify: '4.x',
  name: 'tracing-middleware',
});

/**
 * Decorator for tracing methods
 */
export function Traced(spanName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name = spanName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      let tracingService: TracingService;
      try {
        tracingService = container.resolve<TracingService>('TracingService');
      } catch {
        return originalMethod.apply(this, args);
      }

      if (!tracingService.isEnabled()) {
        return originalMethod.apply(this, args);
      }

      return tracingService.trace(
        name,
        async (span) => {
          span.setAttribute('code.function', propertyKey);
          span.setAttribute('code.namespace', target.constructor.name);
          return originalMethod.apply(this, args);
        }
      ).then((result) => result.result);
    };

    return descriptor;
  };
}

/**
 * Decorator for tracing database operations
 */
export function TracedDb(operation: string, table?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let tracingService: TracingService;
      try {
        tracingService = container.resolve<TracingService>('TracingService');
      } catch {
        return originalMethod.apply(this, args);
      }

      if (!tracingService.isEnabled()) {
        return originalMethod.apply(this, args);
      }

      return tracingService.trace(
        'db.query',
        async (span) => {
          span.setAttribute('db.system', 'postgresql');
          span.setAttribute('db.operation', operation);
          if (table) {
            span.setAttribute('db.sql.table', table);
          }
          return originalMethod.apply(this, args);
        }
      ).then((result) => result.result);
    };

    return descriptor;
  };
}

/**
 * Decorator for tracing external API calls
 */
export function TracedExternalCall(serviceName: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let tracingService: TracingService;
      try {
        tracingService = container.resolve<TracingService>('TracingService');
      } catch {
        return originalMethod.apply(this, args);
      }

      if (!tracingService.isEnabled()) {
        return originalMethod.apply(this, args);
      }

      return tracingService.trace(
        'external.api.call',
        async (span) => {
          span.setAttribute('peer.service', serviceName);
          span.setAttribute('code.function', propertyKey);
          return originalMethod.apply(this, args);
        }
      ).then((result) => result.result);
    };

    return descriptor;
  };
}

/**
 * Decorator for tracing cache operations
 */
export function TracedCache(operation: 'get' | 'set' | 'delete') {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const spanName = `cache.${operation}`;

    descriptor.value = async function (...args: any[]) {
      let tracingService: TracingService;
      try {
        tracingService = container.resolve<TracingService>('TracingService');
      } catch {
        return originalMethod.apply(this, args);
      }

      if (!tracingService.isEnabled()) {
        return originalMethod.apply(this, args);
      }

      return tracingService.trace(
        spanName,
        async (span) => {
          span.setAttribute('db.system', 'redis');
          span.setAttribute('db.operation', operation);
          if (args[0] && typeof args[0] === 'string') {
            span.setAttribute('cache.key', args[0]);
          }
          const result = await originalMethod.apply(this, args);
          if (operation === 'get') {
            span.setAttribute('cache.hit', result !== null && result !== undefined);
          }
          return result;
        }
      ).then((result) => result.result);
    };

    return descriptor;
  };
}

/**
 * Helper to get trace ID from request
 */
export function getTraceId(request: FastifyRequest): string | undefined {
  return request.tracing?.traceId;
}

/**
 * Helper to get span ID from request
 */
export function getSpanId(request: FastifyRequest): string | undefined {
  return request.tracing?.spanId;
}

/**
 * Helper to add attributes to current request span
 */
export function addRequestAttributes(
  request: FastifyRequest,
  attributes: Record<string, string | number | boolean>
): void {
  if (request.tracing) {
    for (const [key, value] of Object.entries(attributes)) {
      request.tracing.span.setAttribute(key, value);
    }
  }
}

/**
 * Helper to add event to current request span
 */
export function addRequestEvent(
  request: FastifyRequest,
  name: string,
  attributes?: Record<string, string | number | boolean>
): void {
  if (request.tracing) {
    request.tracing.span.addEvent(name, attributes);
  }
}
