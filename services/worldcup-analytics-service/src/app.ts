import 'reflect-metadata';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { forecastRoutes } from './presentation/routes/forecast.routes';

/**
 * WorldCup Analytics Service
 * Demand forecasting and analytics for local businesses during FIFA World Cup 2026
 */
async function bootstrap() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: { colorize: true }
      } : undefined
    }
  });

  // Security middleware
  await fastify.register(helmet);
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  });
  await fastify.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute'
  });

  // Health check
  fastify.get('/health', async () => ({
    status: 'healthy',
    service: 'worldcup-analytics-service',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  }));

  // API info
  fastify.get('/api/v1/worldcup', async () => ({
    service: 'WorldCup Analytics API',
    version: '1.0.0',
    description: 'Demand forecasting and analytics for FIFA World Cup 2026',
    endpoints: {
      forecasts: {
        generate: 'POST /api/v1/worldcup/forecasts',
        byBusiness: 'GET /api/v1/worldcup/forecasts/business/:businessId'
      },
      matches: {
        list: 'GET /api/v1/worldcup/matches'
      },
      cities: {
        list: 'GET /api/v1/worldcup/cities',
        get: 'GET /api/v1/worldcup/cities/:code'
      },
      dashboard: {
        get: 'GET /api/v1/worldcup/dashboard'
      },
      alerts: {
        subscribe: 'POST /api/v1/worldcup/alerts/subscribe'
      }
    },
    worldCup2026: {
      dates: 'June 11 - July 19, 2026',
      hostCountries: ['USA', 'Mexico', 'Canada'],
      hostCities: 16,
      teams: 48,
      matches: 104
    }
  }));

  // Register routes
  await fastify.register(forecastRoutes, { prefix: '/api/v1/worldcup' });

  // Error handler
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error({ error, url: request.url }, 'Request error');

    // Zod validation errors
    if (error.name === 'ZodError') {
      return reply.status(400).send({
        error: 'Validation error',
        details: error.issues
      });
    }

    // Default error response
    return reply.status(error.statusCode || 500).send({
      error: error.message || 'Internal server error',
      code: error.code
    });
  });

  // Start server
  const port = parseInt(process.env.PORT || '3002', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    await fastify.listen({ port, host });
    fastify.log.info(`
╔══════════════════════════════════════════════════════════════╗
║          WorldCup Analytics Service v0.1.0                   ║
║                                                              ║
║  Server running at: http://${host}:${port}                    ║
║  API Docs: http://${host}:${port}/api/v1/worldcup             ║
║                                                              ║
║  FIFA World Cup 2026: June 11 - July 19, 2026                ║
║  16 Host Cities | 48 Teams | 104 Matches                     ║
╚══════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    fastify.log.info(`Received ${signal}, shutting down...`);
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Failed to start WorldCup Analytics Service:', err);
  process.exit(1);
});
