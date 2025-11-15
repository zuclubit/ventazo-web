import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DatabasePool } from '@zuclubit/database';
import { buildTestServer, cleanupTestServer } from '../helpers/test-server';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * API Integration Tests for Lead Endpoints
 * Uses Fastify .inject() for fast testing without server startup
 *
 * These tests verify the complete request/response cycle including:
 * - Request validation (Zod schemas)
 * - CQRS command/query execution
 * - Response serialization (DTOs)
 * - HTTP status codes and headers
 * - Error handling
 */
describe('Leads API', () => {
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

  describe('POST /api/v1/leads', () => {
    it('should create a new lead with valid data', async () => {
      const leadData = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        companyName: 'Acme Corp',
        contactName: 'John Doe',
        email: 'john@acme.com',
        phone: '+1234567890',
        source: 'Website',
        industry: 'Technology',
        website: 'https://acme.com',
        estimatedValue: 50000,
        notes: 'Potential high-value customer',
      };

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/leads',
        payload: leadData,
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id');
      expect(body.companyName).toBe('Acme Corp');
      expect(body.status).toBe('new');
      expect(body.score).toBe(0);
    });

    it('should reject invalid email format', async () => {
      const leadData = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        companyName: 'Acme Corp',
        email: 'invalid-email',
        source: 'Website',
      };

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/leads',
        payload: leadData,
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Bad Request');
      expect(body.message).toBe('Validation failed');
      expect(body.details).toBeDefined();
    });

    it('should reject missing required fields', async () => {
      const leadData = {
        companyName: 'Acme Corp',
      };

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/leads',
        payload: leadData,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/leads/:id', () => {
    let createdLeadId: string;

    beforeAll(async () => {
      // Create a lead for testing
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/leads',
        payload: {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          companyName: 'Test Company',
          email: 'test@example.com',
          source: 'API Test',
        },
      });

      const body = JSON.parse(response.body);
      createdLeadId = body.id;
    });

    it('should retrieve a lead by ID', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/leads/${createdLeadId}`,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.id).toBe(createdLeadId);
      expect(body.companyName).toBe('Test Company');
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/leads/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should reject invalid UUID format', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/leads/invalid-id',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/leads', () => {
    beforeAll(async () => {
      // Create multiple leads for testing pagination
      const leads = [
        {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          companyName: 'Company A',
          email: 'a@example.com',
          source: 'Website',
        },
        {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          companyName: 'Company B',
          email: 'b@example.com',
          source: 'Referral',
        },
        {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          companyName: 'Company C',
          email: 'c@example.com',
          source: 'Cold Call',
        },
      ];

      for (const lead of leads) {
        await server.inject({
          method: 'POST',
          url: '/api/v1/leads',
          payload: lead,
        });
      }
    });

    it('should list leads with pagination', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/leads?page=1&limit=10',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('pagination');
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(10);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should filter leads by status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/leads?status=new',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      body.data.forEach((lead: any) => {
        expect(lead.status).toBe('new');
      });
    });

    it('should filter leads by score range', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/leads?minScore=0&maxScore=50',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should sort leads by different fields', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/leads?sortBy=companyName&sortOrder=asc',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('PATCH /api/v1/leads/:id', () => {
    let leadId: string;

    beforeAll(async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/leads',
        payload: {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          companyName: 'Update Test',
          email: 'update@example.com',
          source: 'API',
        },
      });

      const body = JSON.parse(response.body);
      leadId = body.id;
    });

    it('should update lead information', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/api/v1/leads/${leadId}`,
        payload: {
          companyName: 'Updated Company',
          phone: '+9876543210',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.companyName).toBe('Updated Company');
      expect(body.phone).toBe('+9876543210');
    });
  });

  describe('PATCH /api/v1/leads/:id/status', () => {
    let leadId: string;

    beforeAll(async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/leads',
        payload: {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          companyName: 'Status Test',
          email: 'status@example.com',
          source: 'API',
        },
      });

      const body = JSON.parse(response.body);
      leadId = body.id;
    });

    it('should change lead status', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/api/v1/leads/${leadId}/status`,
        payload: {
          status: 'contacted',
          reason: 'Initial contact made via email',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.status).toBe('contacted');
    });

    it('should reject invalid status transitions', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/api/v1/leads/${leadId}/status`,
        payload: {
          status: 'invalid_status',
          reason: 'Test',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/v1/leads/:id/score', () => {
    let leadId: string;

    beforeAll(async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/leads',
        payload: {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          companyName: 'Score Test',
          email: 'score@example.com',
          source: 'API',
        },
      });

      const body = JSON.parse(response.body);
      leadId = body.id;
    });

    it('should update lead score', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/api/v1/leads/${leadId}/score`,
        payload: {
          score: 75,
          reason: 'High engagement metrics',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.score).toBe(75);
    });

    it('should reject score outside valid range', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/api/v1/leads/${leadId}/score`,
        payload: {
          score: 150,
          reason: 'Test',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/leads/:id/assign', () => {
    let leadId: string;

    beforeAll(async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/leads',
        payload: {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          companyName: 'Assign Test',
          email: 'assign@example.com',
          source: 'API',
        },
      });

      const body = JSON.parse(response.body);
      leadId = body.id;
    });

    it('should assign lead to user', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/leads/${leadId}/assign`,
        payload: {
          assignedTo: '123e4567-e89b-12d3-a456-426614174001',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.assignedTo).toBe('123e4567-e89b-12d3-a456-426614174001');
    });
  });

  describe('Correlation ID', () => {
    it('should add correlation ID to response headers', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.headers['x-correlation-id']).toBeDefined();
    });

    it('should preserve existing correlation ID from request', async () => {
      const correlationId = 'test-correlation-id-123';

      const response = await server.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'x-correlation-id': correlationId,
        },
      });

      expect(response.headers['x-correlation-id']).toBe(correlationId);
    });
  });
});
