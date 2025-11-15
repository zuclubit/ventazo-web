import Fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

/**
 * Server configuration options
 */
export interface ServerConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  rateLimitMax: number;
  rateLimitTimeWindow: string;
}

/**
 * Create and configure Fastify server
 * Implements security best practices and performance optimizations
 */
export async function createServer(config: ServerConfig): Promise<FastifyInstance> {
  // Fastify options for optimal performance
  const fastifyOptions: FastifyServerOptions = {
    logger: process.env.NODE_ENV === 'production'
      ? { level: 'info' }
      : {
          level: 'debug',
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
            },
          },
        },
    // Increase request timeout for complex queries
    requestTimeout: 30000,
    // Trust proxy for accurate IP addresses
    trustProxy: true,
    // Improve JSON parsing performance
    ignoreTrailingSlash: true,
    caseSensitive: false,
  };

  const server = Fastify(fastifyOptions);

  // Security plugins
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
      },
    },
  });

  // CORS configuration
  await server.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  // Compression for responses
  await server.register(compress, {
    global: true,
    threshold: 1024, // Only compress responses > 1KB
    encodings: ['gzip', 'deflate', 'br'],
  });

  // Rate limiting
  await server.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitTimeWindow,
    cache: 10000,
    allowList: ['127.0.0.1'],
    errorResponseBuilder: (req, context) => {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
      };
    },
  });

  // Swagger/OpenAPI documentation
  await server.register(swagger, {
    openapi: {
      info: {
        title: 'Lead Service API',
        description: 'RESTful API for managing leads in Zuclubit CRM',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
      ],
      tags: [
        { name: 'leads', description: 'Lead management endpoints' },
        { name: 'health', description: 'Health check endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
  });

  // Health check endpoint
  server.get('/health', {
    schema: {
      tags: ['health'],
      description: 'Health check endpoint',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Ready check endpoint (for Kubernetes)
  server.get('/ready', {
    schema: {
      tags: ['health'],
      description: 'Readiness check endpoint',
      response: {
        200: {
          type: 'object',
          properties: {
            ready: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return { ready: true };
  });

  // Graceful shutdown
  const signals = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      server.log.info(`Received ${signal}, shutting down gracefully...`);
      await server.close();
      process.exit(0);
    });
  });

  return server;
}

/**
 * Start the server
 */
export async function startServer(
  server: FastifyInstance,
  config: ServerConfig
): Promise<void> {
  try {
    await server.listen({
      port: config.port,
      host: config.host,
    });

    server.log.info(
      `🚀 Lead Service API is running at http://${config.host}:${config.port}`
    );
    server.log.info(
      `📚 API Documentation available at http://${config.host}:${config.port}/docs`
    );
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}
