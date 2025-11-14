import 'reflect-metadata';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { setupContainer, cleanupContainer, getEnvironment } from './config';
import { createLeadRoutes } from './presentation/routes';
import { errorHandler } from './presentation/middlewares';

/**
 * Create and configure Express application
 */
const createApp = (): Express => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Compression
  app.use(compression());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use(limiter);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'lead-service',
      timestamp: new Date().toISOString(),
    });
  });

  // API routes
  app.use('/api/leads', createLeadRoutes());

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};

/**
 * Start server
 */
const start = async (): Promise<void> => {
  try {
    const env = getEnvironment();

    console.log(`Starting ${env.serviceName} in ${env.nodeEnv} mode...`);

    // Setup dependency injection
    await setupContainer();

    // Create Express app
    const app = createApp();

    // Start listening
    const server = app.listen(env.port, () => {
      console.log(`✓ Server listening on port ${env.port}`);
      console.log(`✓ Environment: ${env.nodeEnv}`);
      console.log(`✓ Health check: http://localhost:${env.port}/health`);
      console.log(`✓ API endpoint: http://localhost:${env.port}/api/leads`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      server.close(() => {
        console.log('✓ HTTP server closed');
      });

      await cleanupContainer();

      process.exit(0);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
void start();
