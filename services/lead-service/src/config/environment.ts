import { config } from 'dotenv';
import { DatabaseConfig } from '@zuclubit/database';

// Load environment variables
config();

/**
 * Environment configuration
 */
export const getEnvironment = () => {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    serviceName: 'lead-service',
  };
};

/**
 * Database configuration
 */
export const getDatabaseConfig = (): DatabaseConfig => {
  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'leads',
    user: process.env.POSTGRES_USER || 'dev',
    password: process.env.POSTGRES_PASSWORD || 'dev123',
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
    statementTimeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '60000', 10),
  };
};

/**
 * Events configuration
 */
export const getEventsConfig = () => {
  return {
    natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  };
};
