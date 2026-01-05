import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DatabasePool } from '@zuclubit/database';
import { container } from 'tsyringe';
import { createServer, ServerConfig } from '../../presentation/server';
import { errorHandler } from '../../presentation/middlewares/error-handler.middleware';
import { onboardingRoutes, auditLogRoutes } from '../../presentation/routes/onboarding.routes';
import { OnboardingService, UserRole, Permission } from '../../infrastructure/auth';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * API Integration Tests for Onboarding Endpoints
 * Tests the full onboarding flow: status, progress, complete-step, complete
 */
describe('Onboarding API', () => {
  let postgresContainer: StartedPostgreSqlContainer;
  let pool: DatabasePool;
  let server: FastifyInstance;

  // Test data
  const TEST_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
  const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
  const TEST_USER_EMAIL = 'admin@test.com';

  beforeAll(async () => {
    // Start PostgreSQL container
    postgresContainer = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('onboarding_test')
      .withUsername('test')
      .withPassword('test')
      .start();

    // Create database pool
    pool = new DatabasePool({
      host: postgresContainer.getHost(),
      port: postgresContainer.getPort(),
      database: postgresContainer.getDatabase(),
      user: postgresContainer.getUsername(),
      password: postgresContainer.getPassword(),
    });

    await pool.connect();

    // Apply base migrations
    const baseMigration = readFileSync(
      join(__dirname, '../../../drizzle/0000_careful_titania.sql'),
      'utf-8'
    );
    await pool.query(baseMigration, []);

    // Apply onboarding/audit migration
    const onboardingMigration = readFileSync(
      join(__dirname, '../../../drizzle/0005_onboarding_audit.sql'),
      'utf-8'
    );
    await pool.query(onboardingMigration, []);

    // Setup test data
    await setupTestData(pool);

    // Register container dependencies
    container.registerInstance(DatabasePool, pool);
    container.register('DatabasePool', { useValue: pool });
    container.register(OnboardingService, {
      useFactory: (c) => {
        const dbPool = c.resolve(DatabasePool);
        return new OnboardingService(dbPool);
      },
    });

    // Create server
    const serverConfig: ServerConfig = {
      port: 0,
      host: '127.0.0.1',
      corsOrigins: ['http://localhost:3000'],
      rateLimitMax: 1000,
      rateLimitTimeWindow: '1 minute',
    };

    server = await createServer(serverConfig);
    server.setErrorHandler(errorHandler);

    // Add mock auth decorator for testing
    server.decorateRequest('user', null);
    server.addHook('preHandler', async (request) => {
      // Mock authenticated user for tests
      const authHeader = request.headers['authorization'];
      const tenantHeader = request.headers['x-tenant-id'];

      if (authHeader?.startsWith('Bearer test-token')) {
        (request as any).user = {
          id: TEST_USER_ID,
          email: TEST_USER_EMAIL,
          tenantId: tenantHeader || TEST_TENANT_ID,
          role: UserRole.OWNER,
          permissions: Object.values(Permission),
          metadata: { fullName: 'Test Admin' },
        };
      }
    });

    // Register routes
    await server.register(onboardingRoutes, { prefix: '/api/v1/onboarding' });
    await server.register(auditLogRoutes, { prefix: '/api/v1/audit' });
    await server.ready();
  }, 90000);

  afterAll(async () => {
    await server.close();
    await pool.close();
    await postgresContainer.stop();
  });

  beforeEach(async () => {
    // Clean up onboarding and audit data between tests
    await pool.query('DELETE FROM audit_logs', []);
    await pool.query('DELETE FROM user_onboarding', []);
  });

  async function setupTestData(dbPool: DatabasePool) {
    // Create test tenant
    await dbPool.query(
      `INSERT INTO tenants (id, name, slug, plan, settings, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        TEST_TENANT_ID,
        'Test Company',
        'test-company',
        'free',
        JSON.stringify({ currency: 'USD', locale: 'en-US' }),
      ]
    );

    // Create test user
    await dbPool.query(
      `INSERT INTO users (id, email, full_name, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [TEST_USER_ID, TEST_USER_EMAIL, 'Test Admin']
    );

    // Create tenant membership
    await dbPool.query(
      `INSERT INTO tenant_memberships (id, tenant_id, user_id, role, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, true, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [TEST_TENANT_ID, TEST_USER_ID, 'owner']
    );
  }

  describe('GET /api/v1/onboarding/status', () => {
    it('should return null for new user without onboarding', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/onboarding/status',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      // Should initialize onboarding automatically
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('userId', TEST_USER_ID);
      expect(body).toHaveProperty('status', 'not_started');
      expect(body).toHaveProperty('currentStep', 0);
      expect(body).toHaveProperty('completedSteps');
    });

    it('should return 401 without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/onboarding/status',
        headers: {
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/onboarding/initialize', () => {
    it('should initialize onboarding for a new user', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/onboarding/initialize',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('userId', TEST_USER_ID);
      expect(body).toHaveProperty('status', 'not_started');
      expect(body).toHaveProperty('currentStep', 0);
      expect(body).toHaveProperty('completedSteps');
      expect(Array.isArray(body.completedSteps)).toBe(true);
    });

    it('should handle duplicate initialization gracefully', async () => {
      // First initialization
      await server.inject({
        method: 'POST',
        url: '/api/v1/onboarding/initialize',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      // Second initialization should update, not fail
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/onboarding/initialize',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe('PUT /api/v1/onboarding/progress', () => {
    it('should update onboarding progress', async () => {
      // Initialize first
      await server.inject({
        method: 'POST',
        url: '/api/v1/onboarding/initialize',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      // Update progress
      const response = await server.inject({
        method: 'PUT',
        url: '/api/v1/onboarding/progress',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          status: 'business_created',
          currentStep: 2,
          completedSteps: ['signup', 'create-business'],
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status', 'business_created');
      expect(body).toHaveProperty('currentStep', 2);
      expect(body.completedSteps).toContain('signup');
      expect(body.completedSteps).toContain('create-business');
    });

    it('should reject invalid status values', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/v1/onboarding/progress',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          status: 'invalid_status',
          currentStep: 1,
          completedSteps: ['signup'],
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/onboarding/complete-step', () => {
    it('should complete a specific onboarding step', async () => {
      // Initialize first
      await server.inject({
        method: 'POST',
        url: '/api/v1/onboarding/initialize',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      // Complete signup step
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/onboarding/complete-step',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          step: 'signup',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.completedSteps).toContain('signup');
      expect(body.status).toBe('profile_created');
    });

    it('should progress through multiple steps', async () => {
      // Initialize
      await server.inject({
        method: 'POST',
        url: '/api/v1/onboarding/initialize',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      // Complete signup
      await server.inject({
        method: 'POST',
        url: '/api/v1/onboarding/complete-step',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: { step: 'signup' },
      });

      // Complete create-business
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/onboarding/complete-step',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: { step: 'create-business' },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.completedSteps).toContain('signup');
      expect(body.completedSteps).toContain('create-business');
      expect(body.status).toBe('business_created');
    });

    it('should reject invalid step values', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/onboarding/complete-step',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          step: 'invalid-step',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/onboarding/complete', () => {
    it('should complete the entire onboarding', async () => {
      // Initialize
      await server.inject({
        method: 'POST',
        url: '/api/v1/onboarding/initialize',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      // Complete onboarding
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/onboarding/complete',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('message', 'Onboarding completed successfully');
      expect(body.onboarding).toHaveProperty('status', 'completed');
      expect(body.onboarding.completedSteps).toContain('complete');
    });
  });
});

/**
 * Audit Log API Tests
 */
describe('Audit Log API', () => {
  let postgresContainer: StartedPostgreSqlContainer;
  let pool: DatabasePool;
  let server: FastifyInstance;

  // Test data
  const TEST_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
  const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
  const TEST_USER_EMAIL = 'admin@test.com';

  beforeAll(async () => {
    // Start PostgreSQL container
    postgresContainer = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('audit_test')
      .withUsername('test')
      .withPassword('test')
      .start();

    // Create database pool
    pool = new DatabasePool({
      host: postgresContainer.getHost(),
      port: postgresContainer.getPort(),
      database: postgresContainer.getDatabase(),
      user: postgresContainer.getUsername(),
      password: postgresContainer.getPassword(),
    });

    await pool.connect();

    // Apply migrations
    const baseMigration = readFileSync(
      join(__dirname, '../../../drizzle/0000_careful_titania.sql'),
      'utf-8'
    );
    await pool.query(baseMigration, []);

    const onboardingMigration = readFileSync(
      join(__dirname, '../../../drizzle/0005_onboarding_audit.sql'),
      'utf-8'
    );
    await pool.query(onboardingMigration, []);

    // Setup test data
    await setupTestData(pool);

    // Register container dependencies
    container.registerInstance(DatabasePool, pool);
    container.register('DatabasePool', { useValue: pool });
    container.register(OnboardingService, {
      useFactory: (c) => {
        const dbPool = c.resolve(DatabasePool);
        return new OnboardingService(dbPool);
      },
    });

    // Create server
    const serverConfig: ServerConfig = {
      port: 0,
      host: '127.0.0.1',
      corsOrigins: ['http://localhost:3000'],
      rateLimitMax: 1000,
      rateLimitTimeWindow: '1 minute',
    };

    server = await createServer(serverConfig);
    server.setErrorHandler(errorHandler);

    // Add mock auth decorator
    server.decorateRequest('user', null);
    server.addHook('preHandler', async (request) => {
      const authHeader = request.headers['authorization'];
      const tenantHeader = request.headers['x-tenant-id'];

      if (authHeader?.startsWith('Bearer test-token')) {
        (request as any).user = {
          id: TEST_USER_ID,
          email: TEST_USER_EMAIL,
          tenantId: tenantHeader || TEST_TENANT_ID,
          role: UserRole.OWNER,
          permissions: Object.values(Permission),
          metadata: { fullName: 'Test Admin' },
        };
      }
    });

    await server.register(auditLogRoutes, { prefix: '/api/v1/audit' });
    await server.ready();
  }, 90000);

  afterAll(async () => {
    await server.close();
    await pool.close();
    await postgresContainer.stop();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM audit_logs', []);
  });

  async function setupTestData(dbPool: DatabasePool) {
    await dbPool.query(
      `INSERT INTO tenants (id, name, slug, plan, settings, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [TEST_TENANT_ID, 'Test Company', 'test-company', 'free', JSON.stringify({})]
    );

    await dbPool.query(
      `INSERT INTO users (id, email, full_name, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [TEST_USER_ID, TEST_USER_EMAIL, 'Test Admin']
    );

    await dbPool.query(
      `INSERT INTO tenant_memberships (id, tenant_id, user_id, role, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, true, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [TEST_TENANT_ID, TEST_USER_ID, 'owner']
    );
  }

  describe('POST /api/v1/audit/log', () => {
    it('should create an audit log entry', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/audit/log',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          action: 'user_login',
          entityType: 'user',
          entityId: TEST_USER_ID,
          newValues: {
            loginAt: new Date().toISOString(),
          },
          metadata: {
            browser: 'Chrome',
          },
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('action', 'user_login');
      expect(body).toHaveProperty('entityType', 'user');
      expect(body).toHaveProperty('entityId', TEST_USER_ID);
      expect(body).toHaveProperty('userId', TEST_USER_ID);
    });

    it('should reject missing required fields', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/audit/log',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          action: 'user_login',
          // Missing entityType, entityId, newValues
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/audit/logs', () => {
    it('should return audit logs for tenant', async () => {
      // Create some audit logs
      await server.inject({
        method: 'POST',
        url: '/api/v1/audit/log',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          action: 'user_login',
          entityType: 'user',
          entityId: TEST_USER_ID,
          newValues: { test: 'value1' },
        },
      });

      await server.inject({
        method: 'POST',
        url: '/api/v1/audit/log',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          action: 'tenant_switched',
          entityType: 'tenant',
          entityId: TEST_TENANT_ID,
          newValues: { test: 'value2' },
        },
      });

      // Get logs
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/audit/logs',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('logs');
      expect(body).toHaveProperty('total');
      expect(Array.isArray(body.logs)).toBe(true);
      expect(body.logs.length).toBe(2);
      expect(body.total).toBe(2);
    });

    it('should filter by action', async () => {
      // Create logs with different actions
      await server.inject({
        method: 'POST',
        url: '/api/v1/audit/log',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          action: 'user_login',
          entityType: 'user',
          entityId: TEST_USER_ID,
          newValues: {},
        },
      });

      await server.inject({
        method: 'POST',
        url: '/api/v1/audit/log',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          action: 'tenant_switched',
          entityType: 'tenant',
          entityId: TEST_TENANT_ID,
          newValues: {},
        },
      });

      // Filter by action
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/audit/logs?action=user_login',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.logs.length).toBe(1);
      expect(body.logs[0].action).toBe('user_login');
    });

    it('should support pagination', async () => {
      // Create multiple logs
      for (let i = 0; i < 5; i++) {
        await server.inject({
          method: 'POST',
          url: '/api/v1/audit/log',
          headers: {
            'Authorization': 'Bearer test-token',
            'x-tenant-id': TEST_TENANT_ID,
            'Content-Type': 'application/json',
          },
          payload: {
            action: `action_${i}`,
            entityType: 'test',
            entityId: `entity_${i}`,
            newValues: { index: i },
          },
        });
      }

      // Get first page
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/audit/logs?limit=2&offset=0',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.logs.length).toBe(2);
      expect(body.total).toBe(5);
    });
  });

  describe('GET /api/v1/audit/my-logs', () => {
    it('should return only current user logs', async () => {
      // Create a log for current user
      await server.inject({
        method: 'POST',
        url: '/api/v1/audit/log',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          action: 'user_login',
          entityType: 'user',
          entityId: TEST_USER_ID,
          newValues: {},
        },
      });

      // Get my logs
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/audit/my-logs',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('logs');
      expect(body.logs.length).toBeGreaterThan(0);
      expect(body.logs.every((log: any) => log.userId === TEST_USER_ID)).toBe(true);
    });
  });
});
