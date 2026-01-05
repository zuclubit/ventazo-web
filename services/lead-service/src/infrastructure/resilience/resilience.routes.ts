/**
 * Resilience Routes
 * Admin endpoints for monitoring and managing resilience patterns
 */
import { FastifyPluginAsync } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { ResilientServiceClient } from './resilience-policy';

// Validation schemas
const ServiceNameSchema = z.object({
  serviceName: z.string().min(1).max(100),
});

// JSON Schema equivalents for Fastify schema validation
const ServiceNameSchemaJSON = {
  type: 'object',
  required: ['serviceName'],
  properties: {
    serviceName: { type: 'string', minLength: 1, maxLength: 100 },
  },
};

const RegisterServiceSchemaJSON = {
  type: 'object',
  required: ['name', 'baseUrl'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    baseUrl: { type: 'string', format: 'uri' },
    timeout: { type: 'number', minimum: 1000, maximum: 300000 },
    circuitBreaker: {
      type: 'object',
      properties: {
        failureThreshold: { type: 'number', minimum: 1, maximum: 100 },
        successThreshold: { type: 'number', minimum: 1, maximum: 100 },
        timeout: { type: 'number', minimum: 1000, maximum: 300000 },
      },
    },
    retry: {
      type: 'object',
      properties: {
        maxAttempts: { type: 'number', minimum: 1, maximum: 10 },
        delay: { type: 'number', minimum: 100, maximum: 60000 },
        backoffMultiplier: { type: 'number', minimum: 1, maximum: 5 },
      },
    },
    bulkhead: {
      type: 'object',
      properties: {
        maxConcurrent: { type: 'number', minimum: 1, maximum: 100 },
        maxWaiting: { type: 'number', minimum: 0, maximum: 1000 },
      },
    },
  },
};

export const resilienceRoutes: FastifyPluginAsync = async (fastify) => {
  // Resolve or create the service client
  let serviceClient: ResilientServiceClient;
  try {
    serviceClient = container.resolve(ResilientServiceClient);
  } catch {
    serviceClient = new ResilientServiceClient();
    container.registerInstance(ResilientServiceClient, serviceClient);
  }

  // Get all registered services and their status
  fastify.get('/services', {
    schema: {
      description: 'Get all registered external services and their resilience status',
      tags: ['Resilience'],
    },
    handler: async (request, reply) => {
      const registry = serviceClient.getServiceRegistry();
      return reply.status(200).send({
        services: registry,
        count: registry.length,
      });
    },
  });

  // Get metrics for a specific service
  fastify.get('/services/:serviceName/metrics', {
    schema: {
      description: 'Get resilience metrics for a specific service',
      tags: ['Resilience'],
      params: ServiceNameSchemaJSON,
    },
    handler: async (request, reply) => {
      const { serviceName } = request.params as { serviceName: string };
      const metrics = serviceClient.getServiceMetrics(serviceName);

      if (!metrics) {
        return reply.status(404).send({ error: 'Service not found' });
      }

      return reply.status(200).send({
        service: serviceName,
        metrics,
      });
    },
  });

  // Reset a service's circuit breaker
  fastify.post('/services/:serviceName/reset', {
    schema: {
      description: 'Reset resilience state for a service (e.g., close circuit breaker)',
      tags: ['Resilience'],
      params: ServiceNameSchemaJSON,
    },
    handler: async (request, reply) => {
      const { serviceName } = request.params as { serviceName: string };
      const success = serviceClient.resetService(serviceName);

      if (!success) {
        return reply.status(404).send({ error: 'Service not found' });
      }

      return reply.status(200).send({
        success: true,
        service: serviceName,
        message: 'Service resilience state reset successfully',
      });
    },
  });

  // Health check for a specific service
  fastify.get('/services/:serviceName/health', {
    schema: {
      description: 'Run a health check for a specific service',
      tags: ['Resilience'],
      params: ServiceNameSchemaJSON,
    },
    handler: async (request, reply) => {
      const { serviceName } = request.params as { serviceName: string };

      // Simple ping health check
      const result = await serviceClient.healthCheck(serviceName, async () => {
        // In production, this would make an actual health check call
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const statusCode = result.healthy ? 200 : 503;
      return reply.status(statusCode).send(result);
    },
  });

  // Get overall resilience dashboard
  fastify.get('/dashboard', {
    schema: {
      description: 'Get resilience dashboard with all services status',
      tags: ['Resilience'],
    },
    handler: async (request, reply) => {
      const registry = serviceClient.getServiceRegistry();

      const summary = {
        total: registry.length,
        healthy: registry.filter((s) => s.healthy).length,
        unhealthy: registry.filter((s) => !s.healthy).length,
        circuitsClosed: registry.filter(
          (s) => s.circuitBreaker?.state === 'closed'
        ).length,
        circuitsOpen: registry.filter(
          (s) => s.circuitBreaker?.state === 'open'
        ).length,
        circuitsHalfOpen: registry.filter(
          (s) => s.circuitBreaker?.state === 'half-open'
        ).length,
      };

      const services = registry.map((s) => ({
        name: s.name,
        healthy: s.healthy,
        circuitState: s.circuitBreaker?.state || 'unknown',
        failureRate: s.circuitBreaker?.failureRate || 0,
        totalCalls: s.circuitBreaker?.totalCalls || 0,
        bulkheadConcurrent: s.bulkhead?.concurrent || 0,
        bulkheadWaiting: s.bulkhead?.waiting || 0,
      }));

      return reply.status(200).send({
        summary,
        services,
        timestamp: new Date(),
      });
    },
  });

  // Register a new service
  fastify.post('/services', {
    schema: {
      description: 'Register a new external service with resilience configuration',
      tags: ['Resilience'],
      body: RegisterServiceSchemaJSON,
    },
    handler: async (request, reply) => {
      const config = request.body as any;

      serviceClient.registerService({
        name: config.name,
        baseUrl: config.baseUrl,
        timeout: config.timeout,
        circuitBreaker: config.circuitBreaker,
        retry: config.retry,
        bulkhead: config.bulkhead,
      });

      return reply.status(201).send({
        success: true,
        service: config.name,
        message: 'Service registered successfully',
      });
    },
  });

  // Get circuit breaker states
  fastify.get('/circuit-breakers', {
    schema: {
      description: 'Get all circuit breaker states',
      tags: ['Resilience'],
    },
    handler: async (request, reply) => {
      const registry = serviceClient.getServiceRegistry();

      const circuitBreakers = registry
        .filter((s) => s.circuitBreaker)
        .map((s) => ({
          service: s.name,
          state: s.circuitBreaker?.state,
          failureCount: s.circuitBreaker?.failureCount,
          successCount: s.circuitBreaker?.successCount,
          failureRate: s.circuitBreaker?.failureRate,
          lastFailureTime: s.circuitBreaker?.lastFailureTime,
          lastSuccessTime: s.circuitBreaker?.lastSuccessTime,
          stateChangedAt: s.circuitBreaker?.stateChangedAt,
        }));

      return reply.status(200).send({
        circuitBreakers,
        count: circuitBreakers.length,
      });
    },
  });

  // Get bulkhead states
  fastify.get('/bulkheads', {
    schema: {
      description: 'Get all bulkhead states',
      tags: ['Resilience'],
    },
    handler: async (request, reply) => {
      const registry = serviceClient.getServiceRegistry();

      const bulkheads = registry
        .filter((s) => s.bulkhead)
        .map((s) => ({
          service: s.name,
          concurrent: s.bulkhead?.concurrent,
          waiting: s.bulkhead?.waiting,
          maxConcurrent: s.bulkhead?.maxConcurrent,
          maxWaiting: s.bulkhead?.maxWaiting,
          rejected: s.bulkhead?.rejected,
          totalExecuted: s.bulkhead?.totalExecuted,
        }));

      return reply.status(200).send({
        bulkheads,
        count: bulkheads.length,
      });
    },
  });
};
