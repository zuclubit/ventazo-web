import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DatabasePool } from '@zuclubit/database';
import { container } from 'tsyringe';
import { createServer, ServerConfig } from '../../presentation/server';
import { errorHandler } from '../../presentation/middlewares/error-handler.middleware';
import { invitationRoutes } from '../../presentation/routes/invitation.routes';
import { InvitationService, AuthService, UserRole, Permission } from '../../infrastructure/auth';
import { EmailService } from '../../infrastructure/email';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * API Integration Tests for Invitation Endpoints
 * Tests the full invitation flow: create, list, accept, cancel, resend
 */
describe('Invitations API', () => {
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
      .withDatabase('invitations_test')
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

    // Apply invitation migration
    const invitationMigration = readFileSync(
      join(__dirname, '../../../drizzle/0004_user_invitations.sql'),
      'utf-8'
    );
    await pool.query(invitationMigration, []);

    // Setup test data
    await setupTestData(pool);

    // Register container dependencies
    container.registerInstance(DatabasePool, pool);
    container.registerSingleton(EmailService);
    container.register(InvitationService, {
      useFactory: (c) => {
        const dbPool = c.resolve(DatabasePool);
        const emailService = c.resolve(EmailService);
        return new InvitationService(dbPool, emailService);
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
          role: UserRole.ADMIN,
          permissions: [
            Permission.USER_INVITE,
            Permission.USER_VIEW,
            Permission.USER_MANAGE,
          ],
          metadata: { fullName: 'Test Admin' },
        };
      }
    });

    await server.register(invitationRoutes, { prefix: '/api/v1/invitations' });
    await server.ready();
  }, 90000);

  afterAll(async () => {
    await server.close();
    await pool.close();
    await postgresContainer.stop();
  });

  beforeEach(async () => {
    // Clean up invitations between tests
    await pool.query('DELETE FROM user_invitations', []);
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
      [TEST_TENANT_ID, TEST_USER_ID, 'admin']
    );
  }

  describe('POST /api/v1/invitations', () => {
    it('should create a new invitation', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/invitations',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          email: 'newuser@test.com',
          role: 'sales_rep',
          message: 'Welcome to the team!',
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('email', 'newuser@test.com');
      expect(body).toHaveProperty('role', 'sales_rep');
      expect(body).toHaveProperty('status', 'pending');
      expect(body).toHaveProperty('expiresAt');
      // Token should not be exposed
      expect(body).not.toHaveProperty('token');
    });

    it('should reject invitation with higher role than inviter', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/invitations',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          email: 'owner@test.com',
          role: 'owner', // Admin trying to invite owner
        },
      });

      expect(response.statusCode).toBe(403);

      const body = JSON.parse(response.body);
      expect(body.message).toContain('higher role');
    });

    it('should reject duplicate pending invitation', async () => {
      // Create first invitation
      await server.inject({
        method: 'POST',
        url: '/api/v1/invitations',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          email: 'duplicate@test.com',
          role: 'sales_rep',
        },
      });

      // Try to create duplicate
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/invitations',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          email: 'duplicate@test.com',
          role: 'sales_rep',
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.message).toContain('pending invitation');
    });

    it('should reject invitation without authentication', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/invitations',
        headers: {
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          email: 'newuser@test.com',
          role: 'sales_rep',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/invitations/bulk', () => {
    it('should create multiple invitations', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/invitations/bulk',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          invitations: [
            { email: 'user1@test.com', role: 'sales_rep' },
            { email: 'user2@test.com', role: 'manager' },
            { email: 'user3@test.com', role: 'viewer' },
          ],
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('failed');
      expect(Array.isArray(body.success)).toBe(true);
      expect(body.success.length).toBe(3);
    });

    it('should handle partial failures in bulk invitations', async () => {
      // Create one invitation first
      await server.inject({
        method: 'POST',
        url: '/api/v1/invitations',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          email: 'existing@test.com',
          role: 'sales_rep',
        },
      });

      // Try bulk with one duplicate
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/invitations/bulk',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: {
          invitations: [
            { email: 'existing@test.com', role: 'sales_rep' }, // Duplicate
            { email: 'newbulk@test.com', role: 'manager' }, // New
          ],
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body.success.length).toBe(1);
      expect(body.failed.length).toBe(1);
    });
  });

  describe('GET /api/v1/invitations', () => {
    it('should list pending invitations', async () => {
      // Create some invitations
      await server.inject({
        method: 'POST',
        url: '/api/v1/invitations',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: { email: 'list1@test.com', role: 'sales_rep' },
      });

      await server.inject({
        method: 'POST',
        url: '/api/v1/invitations',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: { email: 'list2@test.com', role: 'manager' },
      });

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/invitations',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(2);
      // Tokens should not be exposed in list
      body.forEach((inv: any) => {
        expect(inv).not.toHaveProperty('token');
      });
    });
  });

  describe('GET /api/v1/invitations/token/:token', () => {
    it('should get invitation details by token (public)', async () => {
      // Create an invitation
      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/v1/invitations',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: { email: 'tokentest@test.com', role: 'sales_rep' },
      });

      expect(createResponse.statusCode).toBe(201);

      // Get the token from DB directly for testing
      const result = await pool.query(
        'SELECT token FROM user_invitations WHERE email = $1',
        ['tokentest@test.com']
      );
      const token = result.rows[0].token;

      // Get invitation by token (no auth required)
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/invitations/token/${token}`,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('email', 'tokentest@test.com');
      expect(body).toHaveProperty('role', 'sales_rep');
      expect(body).toHaveProperty('status', 'pending');
    });

    it('should return 404 for invalid token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/invitations/token/invalid-token-123',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/invitations/:id/resend', () => {
    it('should resend invitation with new token', async () => {
      // Create an invitation
      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/v1/invitations',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: { email: 'resend@test.com', role: 'sales_rep' },
      });

      const invitation = JSON.parse(createResponse.body);

      // Resend invitation
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/invitations/${invitation.id}/resend`,
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status', 'pending');
      // Token should not be exposed
      expect(body).not.toHaveProperty('token');
    });
  });

  describe('DELETE /api/v1/invitations/:id', () => {
    it('should cancel an invitation', async () => {
      // Create an invitation
      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/v1/invitations',
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
          'Content-Type': 'application/json',
        },
        payload: { email: 'cancel@test.com', role: 'sales_rep' },
      });

      const invitation = JSON.parse(createResponse.body);

      // Cancel invitation
      const response = await server.inject({
        method: 'DELETE',
        url: `/api/v1/invitations/${invitation.id}`,
        headers: {
          'Authorization': 'Bearer test-token',
          'x-tenant-id': TEST_TENANT_ID,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify it's cancelled in the database
      const result = await pool.query(
        'SELECT status FROM user_invitations WHERE id = $1',
        [invitation.id]
      );
      expect(result.rows[0].status).toBe('cancelled');
    });
  });
});
