import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DatabasePool } from '@zuclubit/database';
import { buildTestServer, cleanupTestServer } from '../helpers/test-server';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * API Integration Tests for Health Endpoints
 * Uses Fastify .inject() for fast testing without server startup
 */
describe('Health API', () => {
  let container: StartedPostgreSqlContainer;
  let pool: DatabasePool;
  let server: FastifyInstance;

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('leads_test')
      .withUsername('test')
      .withPassword('test')
      .start();

    // Create database pool
    pool = new DatabasePool({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    });

    // Test connection
    const connectResult = await pool.connect();
    expect(connectResult.isSuccess).toBe(true);

    // Apply migrations
    const migrationSql = readFileSync(
      join(__dirname, '../../../drizzle/0000_careful_titania.sql'),
      'utf-8'
    );
    await pool.query(migrationSql, []);

    // Build test server
    server = await buildTestServer(pool);
  }, 60000);

  afterAll(async () => {
    await cleanupTestServer(server);
    await pool.close();
    await container.stop();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status', 'healthy');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('uptime');
      expect(typeof body.uptime).toBe('number');
    });
  });

  describe('GET /ready', () => {
    it('should return readiness status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('ready', true);
    });
  });
});
