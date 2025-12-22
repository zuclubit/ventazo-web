import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DatabasePool } from '@zuclubit/database';
import { container } from 'tsyringe';
import { createServer, ServerConfig } from '../../presentation/server';
import { errorHandler } from '../../presentation/middlewares/error-handler.middleware';
import { authRoutes, memberRoutes, tenantRoutes, userSyncRoutes } from '../../presentation/routes/auth.routes';
import { AuthService, UserRole, Permission } from '../../infrastructure/auth';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * API Integration Tests for Auth Endpoints
 * Tests authentication, tenant management, and user synchronization flows
 */
describe('Auth API', () => {
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
      .withDatabase('auth_test')
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

    // Setup test data
    await setupTestData(pool);

    // Register container dependencies
    container.registerInstance(DatabasePool, pool);
    container.register(AuthService, {
      useFactory: (c) => {
        const dbPool = c.resolve(DatabasePool);
        return new AuthService(dbPool);
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

    // Register auth routes
    await server.register(authRoutes, { prefix: '/api/v1/auth' });
    await server.register(memberRoutes, { prefix: '/api/v1/members' });
    await server.register(tenantRoutes, { prefix: '/api/v1/tenant' });
    await server.register(userSyncRoutes, { prefix: '/api/v1/auth' });

    await server.ready();
  }, 90000);

  afterAll(async () => {
    await server.close();
    await pool.close();
    await postgresContainer.stop();
  });

  async function setupTestData(dbPool: DatabasePool) {
    // Create test tenant
    await dbPool.query(
      `INSERT INTO tenants (id, name, slug, plan, settings, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        TEST_TENANT_ID,
        'Test Company',
        'test-company',
        'free',
        JSON.stringify({ currency: 'USD', locale: 'en-US', timezone: 'America/New_York' }),
        JSON.stringify({
          branding: { primaryColor: '#3B82F6', secondaryColor: '#1E40AF' },
          modules: { leads: true, customers: true, tasks: true },
          businessHours: {
            monday: { enabled: true, start: '09:00', end: '17:00' },
            tuesday: { enabled: true, start: '09:00', end: '17:00' },
            wednesday: { enabled: true, start: '09:00', end: '17:00' },
            thursday: { enabled: true, start: '09:00', end: '17:00' },
            friday: { enabled: true, start: '09:00', end: '17:00' },
            saturday: { enabled: false, start: '09:00', end: '13:00' },
            sunday: { enabled: false, start: '09:00', end: '13:00' },
          },
        }),
      ]
    );

    // Create test user
    await dbPool.query(
      `INSERT INTO users (id, email, full_name, avatar_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [TEST_USER_ID, TEST_USER_EMAIL, 'Test Admin', 'https://example.com/avatar.png']
    );

    // Create tenant membership
    await dbPool.query(
      `INSERT INTO tenant_memberships (id, tenant_id, user_id, role, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, true, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [TEST_TENANT_ID, TEST_USER_ID, 'owner']
    );
  }

  describe('GET /api/v1/auth/me', () => {
    it('should return current user profile', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id', TEST_USER_ID);
      expect(body).toHaveProperty('email', TEST_USER_EMAIL);
      expect(body).toHaveProperty('role');
      expect(body).toHaveProperty('tenantId', TEST_TENANT_ID);
    });

    it('should return 401 without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/auth/tenants', () => {
    it('should return user tenants', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/auth/tenants',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body[0]).toHaveProperty('tenantId');
      expect(body[0]).toHaveProperty('tenantName');
      expect(body[0]).toHaveProperty('role');
    });
  });

  describe('POST /api/v1/auth/check-email', () => {
    it('should return false for existing email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/check-email',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: {
          email: TEST_USER_EMAIL,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('available', false);
    });

    it('should return true for non-existing email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/check-email',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: {
          email: 'nonexistent@test.com',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('available', true);
    });
  });

  describe('POST /api/v1/auth/check-slug', () => {
    it('should return false for existing slug', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/check-slug',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: {
          slug: 'test-company',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('available', false);
    });

    it('should return true for non-existing slug', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/check-slug',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: {
          slug: 'new-company-slug',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('available', true);
    });
  });

  describe('GET /api/v1/tenant/settings', () => {
    it('should return tenant settings', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/tenant/settings',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('currency');
      expect(body).toHaveProperty('locale');
      expect(body).toHaveProperty('timezone');
    });
  });

  describe('PUT /api/v1/tenant/settings', () => {
    it('should update tenant settings', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/v1/tenant/settings',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          timezone: 'America/Los_Angeles',
          currency: 'EUR',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('timezone', 'America/Los_Angeles');
      expect(body).toHaveProperty('currency', 'EUR');
    });
  });

  describe('GET /api/v1/tenant/branding', () => {
    it('should return tenant branding', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/tenant/branding',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('primaryColor');
      expect(body).toHaveProperty('secondaryColor');
    });
  });

  describe('PUT /api/v1/tenant/branding', () => {
    it('should update tenant branding', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/v1/tenant/branding',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          primaryColor: '#FF5733',
          secondaryColor: '#C70039',
          logoUrl: 'https://example.com/logo.png',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('primaryColor', '#FF5733');
      expect(body).toHaveProperty('secondaryColor', '#C70039');
    });
  });

  describe('GET /api/v1/tenant/modules', () => {
    it('should return tenant modules', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/tenant/modules',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(typeof body).toBe('object');
      expect(body).toHaveProperty('leads');
      expect(body).toHaveProperty('customers');
    });
  });

  describe('PUT /api/v1/tenant/modules', () => {
    it('should update tenant modules', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/v1/tenant/modules',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          leads: true,
          customers: true,
          opportunities: true,
          tasks: true,
          calendar: false,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('opportunities', true);
      expect(body).toHaveProperty('calendar', false);
    });
  });

  describe('GET /api/v1/tenant/business-hours', () => {
    it('should return tenant business hours', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/tenant/business-hours',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('monday');
      expect(body).toHaveProperty('friday');
      expect(body.monday).toHaveProperty('enabled');
      expect(body.monday).toHaveProperty('start');
      expect(body.monday).toHaveProperty('end');
    });
  });

  describe('PUT /api/v1/tenant/business-hours', () => {
    it('should update tenant business hours', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/v1/tenant/business-hours',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          monday: { enabled: true, start: '08:00', end: '18:00' },
          tuesday: { enabled: true, start: '08:00', end: '18:00' },
          wednesday: { enabled: true, start: '08:00', end: '18:00' },
          thursday: { enabled: true, start: '08:00', end: '18:00' },
          friday: { enabled: true, start: '08:00', end: '16:00' },
          saturday: { enabled: true, start: '09:00', end: '13:00' },
          sunday: { enabled: false, start: '09:00', end: '13:00' },
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.monday.start).toBe('08:00');
      expect(body.saturday.enabled).toBe(true);
    });
  });

  describe('GET /api/v1/members', () => {
    it('should return tenant members', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/members',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body[0]).toHaveProperty('userId');
      expect(body[0]).toHaveProperty('role');
      expect(body[0]).toHaveProperty('isActive');
    });
  });
});
