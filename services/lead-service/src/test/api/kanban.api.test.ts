import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DatabasePool } from '@zuclubit/database';
import { buildTestServer, cleanupTestServer } from '../helpers/test-server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuid } from 'uuid';

// ============================================
// Test Constants
// ============================================

const TEST_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_HEADERS = {
  'x-tenant-id': TEST_TENANT_ID,
  'x-user-id': TEST_USER_ID,
};

/**
 * Kanban API Integration Tests
 *
 * Tests the complete Kanban Enterprise API including:
 * - Board state retrieval
 * - Move operations with validation
 * - Undo/Redo functionality
 * - Configuration management
 * - Lock operations
 * - Metrics and history
 */
describe('Kanban API', () => {
  let container: StartedPostgreSqlContainer;
  let pool: DatabasePool;
  let server: FastifyInstance;

  // Track created resources for cleanup
  let testLeadId: string;
  let testMoveId: string;

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('kanban_test')
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

    // Create a test lead for Kanban operations
    const leadResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: TEST_HEADERS,
      payload: {
        tenantId: TEST_TENANT_ID,
        companyName: 'Kanban Test Company',
        email: 'kanban-test@example.com',
        source: 'API Test',
      },
    });

    const leadBody = JSON.parse(leadResponse.body);
    testLeadId = leadBody.leadId;
  }, 120000);

  afterAll(async () => {
    await cleanupTestServer(server);
    await pool.close();
    await container.stop();
  });

  // ============================================
  // Board Operations
  // ============================================

  describe('GET /api/v1/kanban/board/:entityType', () => {
    it('should get lead board with all stages', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/board/lead',
        headers: TEST_HEADERS,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.entityType).toBe('lead');
      expect(body.data.stages).toHaveLength(7);

      // Verify stage structure
      const firstStage = body.data.stages[0];
      expect(firstStage).toHaveProperty('id');
      expect(firstStage).toHaveProperty('label');
      expect(firstStage).toHaveProperty('color');
      expect(firstStage).toHaveProperty('wipStatus');
      expect(firstStage).toHaveProperty('items');
      expect(firstStage).toHaveProperty('pagination');

      // Verify WIP status structure
      expect(firstStage.wipStatus).toHaveProperty('current');
      expect(firstStage.wipStatus).toHaveProperty('softLimit');
      expect(firstStage.wipStatus).toHaveProperty('hardLimit');
      expect(firstStage.wipStatus).toHaveProperty('level');
      expect(firstStage.wipStatus).toHaveProperty('percentage');
    });

    it('should get opportunity board', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/board/opportunity',
        headers: TEST_HEADERS,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.data.entityType).toBe('opportunity');
      expect(body.data.stages).toHaveLength(6);
    });

    it('should get task board', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/board/task',
        headers: TEST_HEADERS,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.data.entityType).toBe('task');
      expect(body.data.stages).toHaveLength(5);
    });

    it('should get customer board', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/board/customer',
        headers: TEST_HEADERS,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.data.entityType).toBe('customer');
      expect(body.data.stages).toHaveLength(4);
    });

    it('should reject invalid entity type', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/board/invalid',
        headers: TEST_HEADERS,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should require tenant header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/board/lead',
        headers: { 'x-user-id': TEST_USER_ID },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should include config and permissions', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/board/lead',
        headers: TEST_HEADERS,
      });

      const body = JSON.parse(response.body);

      expect(body.data.config).toBeDefined();
      expect(body.data.config.wipLimits).toBeDefined();
      expect(body.data.config.version).toBeGreaterThanOrEqual(1);

      expect(body.data.permissions).toBeDefined();
      expect(body.data.permissions.canMove).toBe(true);
      expect(body.data.permissions.moveableStages).toBeInstanceOf(Array);
    });

    it('should include metadata with undo/redo availability', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/board/lead',
        headers: TEST_HEADERS,
      });

      const body = JSON.parse(response.body);

      expect(body.data.metadata).toBeDefined();
      expect(body.data.metadata.lastUpdated).toBeDefined();
      expect(typeof body.data.metadata.activeUsers).toBe('number');
      expect(typeof body.data.metadata.undoAvailable).toBe('boolean');
      expect(typeof body.data.metadata.redoAvailable).toBe('boolean');
    });
  });

  describe('GET /api/v1/kanban/stage/:entityType/:stageId', () => {
    it('should get items for a specific stage', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/stage/lead/new',
        headers: TEST_HEADERS,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.items).toBeInstanceOf(Array);
      expect(typeof body.data.total).toBe('number');
    });

    it('should support pagination', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/stage/lead/new?limit=5',
        headers: TEST_HEADERS,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.data.items.length).toBeLessThanOrEqual(5);
    });
  });

  // ============================================
  // Move Operations
  // ============================================

  describe('POST /api/v1/kanban/move', () => {
    it('should move an item between stages', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/kanban/move',
        headers: TEST_HEADERS,
        payload: {
          entityType: 'lead',
          entityId: testLeadId,
          fromStageId: 'new',
          toStageId: 'contacted',
          reason: 'Initial contact via API test',
          metadata: { source: 'api' },
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.moveId).toBeDefined();
      expect(body.data.fromStageId).toBe('new');
      expect(body.data.toStageId).toBe('contacted');
      expect(body.data.validation.type).toBe('allowed');
      expect(body.data.undoAvailable).toBe(true);

      testMoveId = body.data.moveId;
    });

    it('should reject move for non-existent entity', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/kanban/move',
        headers: TEST_HEADERS,
        payload: {
          entityType: 'lead',
          entityId: uuid(),
          fromStageId: 'new',
          toStageId: 'contacted',
        },
      });

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('ENTITY_NOT_FOUND');
    });

    it('should detect conflict when entity in wrong stage', async () => {
      // Lead is now in 'contacted' from previous test
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/kanban/move',
        headers: TEST_HEADERS,
        payload: {
          entityType: 'lead',
          entityId: testLeadId,
          fromStageId: 'new', // Wrong - it's in 'contacted'
          toStageId: 'qualified',
        },
      });

      expect(response.statusCode).toBe(409);

      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('CONFLICT');
    });

    it('should support idempotent moves', async () => {
      const idempotencyKey = uuid();

      // First request
      const response1 = await server.inject({
        method: 'POST',
        url: '/api/v1/kanban/move',
        headers: TEST_HEADERS,
        payload: {
          entityType: 'lead',
          entityId: testLeadId,
          fromStageId: 'contacted',
          toStageId: 'qualified',
          metadata: { source: 'api', idempotencyKey },
        },
      });

      expect(response1.statusCode).toBe(200);
      const body1 = JSON.parse(response1.body);
      const moveId1 = body1.data.moveId;

      // Duplicate request with same idempotency key
      const response2 = await server.inject({
        method: 'POST',
        url: '/api/v1/kanban/move',
        headers: TEST_HEADERS,
        payload: {
          entityType: 'lead',
          entityId: testLeadId,
          fromStageId: 'contacted',
          toStageId: 'qualified',
          metadata: { source: 'api', idempotencyKey },
        },
      });

      expect(response2.statusCode).toBe(200);
      const body2 = JSON.parse(response2.body);

      // Should return same move ID (idempotent)
      expect(body2.data.moveId).toBe(moveId1);
    });
  });

  // ============================================
  // Undo/Redo Operations
  // ============================================

  describe('POST /api/v1/kanban/undo', () => {
    it('should undo the last move', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/kanban/undo',
        headers: TEST_HEADERS,
        payload: {
          entityType: 'lead',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.undoMoveId).toBeDefined();
      expect(body.data.originalMove).toBeDefined();
      expect(body.data.restoredTo.stageId).toBeDefined();
    });

    it('should fail when no moves to undo', async () => {
      // Create a fresh user with no moves
      const freshUserId = uuid();

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/kanban/undo',
        headers: {
          'x-tenant-id': TEST_TENANT_ID,
          'x-user-id': freshUserId,
        },
        payload: {
          entityType: 'lead',
        },
      });

      expect(response.statusCode).toBe(422);

      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NO_UNDO_AVAILABLE');
    });
  });

  describe('POST /api/v1/kanban/redo', () => {
    it('should redo the last undone move', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/kanban/redo',
        headers: TEST_HEADERS,
        payload: {
          entityType: 'lead',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.moveId).toBeDefined();
    });

    it('should fail when no moves to redo', async () => {
      // First, we need to make sure there's no pending redo
      // by doing a new move (which clears redo stack)

      const freshUserId = uuid();

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/kanban/redo',
        headers: {
          'x-tenant-id': TEST_TENANT_ID,
          'x-user-id': freshUserId,
        },
        payload: {
          entityType: 'lead',
        },
      });

      expect(response.statusCode).toBe(422);

      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NO_REDO_AVAILABLE');
    });
  });

  // ============================================
  // Configuration Operations
  // ============================================

  describe('GET /api/v1/kanban/config/:entityType', () => {
    it('should get board configuration', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/config/lead',
        headers: TEST_HEADERS,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.entityType).toBe('lead');
      expect(body.data.wipLimits).toBeDefined();
      expect(body.data.stageOrder).toBeInstanceOf(Array);
      expect(body.data.version).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PUT /api/v1/kanban/config/:entityType', () => {
    let currentVersion: number;

    beforeEach(async () => {
      // Get current version
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/config/lead',
        headers: TEST_HEADERS,
      });
      const body = JSON.parse(response.body);
      currentVersion = body.data.version;
    });

    it('should update WIP limits', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/v1/kanban/config/lead',
        headers: TEST_HEADERS,
        payload: {
          wipLimits: {
            new: { softLimit: 25, hardLimit: 40 },
          },
          expectedVersion: currentVersion,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.version).toBe(currentVersion + 1);
    });

    it('should fail on version conflict', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/v1/kanban/config/lead',
        headers: TEST_HEADERS,
        payload: {
          wipLimits: {
            new: { softLimit: 30, hardLimit: 50 },
          },
          expectedVersion: 0, // Wrong version
        },
      });

      expect(response.statusCode).toBe(422);

      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VERSION_CONFLICT');
    });
  });

  // ============================================
  // Lock Operations
  // ============================================

  describe('POST /api/v1/kanban/lock/:entityType/:entityId', () => {
    it('should acquire a lock', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/kanban/lock/lead/${testLeadId}`,
        headers: TEST_HEADERS,
        payload: {
          sessionId: 'test-session-123',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.locked).toBe(true);
      expect(body.data.expiresAt).toBeDefined();
    });

    it('should fail when lock held by another user', async () => {
      const otherUserId = uuid();

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/kanban/lock/lead/${testLeadId}`,
        headers: {
          'x-tenant-id': TEST_TENANT_ID,
          'x-user-id': otherUserId,
        },
        payload: {
          sessionId: 'other-session',
        },
      });

      expect(response.statusCode).toBe(409);

      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('LOCK_CONFLICT');
      expect(body.error.conflictingUser).toBe(TEST_USER_ID);
    });
  });

  describe('DELETE /api/v1/kanban/lock/:entityType/:entityId', () => {
    it('should release a lock', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: `/api/v1/kanban/lock/lead/${testLeadId}`,
        headers: TEST_HEADERS,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.released).toBe(true);
    });
  });

  // ============================================
  // History Operations
  // ============================================

  describe('GET /api/v1/kanban/history/:entityType/:entityId', () => {
    it('should get move history for an entity', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/kanban/history/lead/${testLeadId}`,
        headers: TEST_HEADERS,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.moves).toBeInstanceOf(Array);
      expect(typeof body.data.total).toBe('number');
    });

    it('should support pagination', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/kanban/history/lead/${testLeadId}?limit=5&offset=0`,
        headers: TEST_HEADERS,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.data.moves.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/v1/kanban/history/:entityType', () => {
    it('should get board-level history', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/history/lead',
        headers: TEST_HEADERS,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.moves).toBeInstanceOf(Array);
    });

    it('should filter by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/kanban/history/lead?startDate=${startDate.toISOString()}&endDate=${new Date().toISOString()}`,
        headers: TEST_HEADERS,
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // ============================================
  // Metrics Operations
  // ============================================

  describe('GET /api/v1/kanban/metrics/:entityType', () => {
    it('should get metrics dashboard', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/metrics/lead',
        headers: TEST_HEADERS,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.stages).toBeInstanceOf(Array);
      expect(body.data.totals).toBeDefined();
      expect(body.data.totals.totalThroughput).toBeDefined();
      expect(body.data.totals.avgLeadTime).toBeDefined();
      expect(body.data.totals.bottlenecks).toBeInstanceOf(Array);
    });

    it('should support period type filter', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/metrics/lead?periodType=weekly&limit=4',
        headers: TEST_HEADERS,
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /api/v1/kanban/metrics/:entityType/calculate', () => {
    it('should calculate metrics for a period', async () => {
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - 1);

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/kanban/metrics/lead/calculate',
        headers: TEST_HEADERS,
        payload: {
          periodType: 'daily',
          periodStart: periodStart.toISOString(),
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.calculated).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // Consistency Operations
  // ============================================

  describe('GET /api/v1/kanban/consistency/:entityType', () => {
    it('should verify event sourcing consistency', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/consistency/lead',
        headers: TEST_HEADERS,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(typeof body.data.isConsistent).toBe('boolean');
      expect(body.data.discrepancies).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/v1/kanban/consistency/:entityType/repair', () => {
    it('should repair consistency issues', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/kanban/consistency/lead/repair',
        headers: TEST_HEADERS,
        payload: {
          entityId: testLeadId,
        },
      });

      // Either success (repaired) or success (nothing to repair)
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(typeof body.data.repaired).toBe('boolean');
    });
  });

  // ============================================
  // Snapshot Operations
  // ============================================

  describe('POST /api/v1/kanban/snapshot/:entityType', () => {
    it('should create a board snapshot', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/kanban/snapshot/lead',
        headers: TEST_HEADERS,
        payload: {
          reason: 'API test snapshot',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.snapshotId).toBeDefined();
      expect(body.data.version).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================
  // Error Handling
  // ============================================

  describe('Error Handling', () => {
    it('should return 400 for missing required headers', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/board/lead',
        // No headers
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('HEADERS_REQUIRED');
    });

    it('should return 400 for invalid entity type', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/board/invalid-entity',
        headers: TEST_HEADERS,
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_ENTITY_TYPE');
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/kanban/move',
        headers: TEST_HEADERS,
        payload: {
          entityType: 'lead',
          entityId: 'not-a-uuid',
          fromStageId: 'new',
          toStageId: 'contacted',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should include correlation ID in error responses', async () => {
      const correlationId = uuid();

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/board/invalid',
        headers: {
          ...TEST_HEADERS,
          'x-correlation-id': correlationId,
        },
      });

      expect(response.headers['x-correlation-id']).toBe(correlationId);
    });
  });

  // ============================================
  // Concurrency Tests
  // ============================================

  describe('Concurrency', () => {
    it('should handle concurrent moves to same entity', async () => {
      // Create a new lead for this test
      const leadResponse = await server.inject({
        method: 'POST',
        url: '/api/v1/leads',
        headers: TEST_HEADERS,
        payload: {
          tenantId: TEST_TENANT_ID,
          companyName: 'Concurrent Test',
          email: 'concurrent@test.com',
          source: 'Test',
        },
      });
      const concurrentLeadId = JSON.parse(leadResponse.body).leadId;

      // Two users try to move the same lead simultaneously
      const [response1, response2] = await Promise.all([
        server.inject({
          method: 'POST',
          url: '/api/v1/kanban/move',
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': uuid() },
          payload: {
            entityType: 'lead',
            entityId: concurrentLeadId,
            fromStageId: 'new',
            toStageId: 'contacted',
          },
        }),
        server.inject({
          method: 'POST',
          url: '/api/v1/kanban/move',
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': uuid() },
          payload: {
            entityType: 'lead',
            entityId: concurrentLeadId,
            fromStageId: 'new',
            toStageId: 'qualified',
          },
        }),
      ]);

      // One should succeed, one should get conflict
      const statuses = [response1.statusCode, response2.statusCode].sort();
      expect(statuses).toContain(200); // At least one succeeds
      // The other might be 200 (if processed sequentially) or 409 (conflict)
    });

    it('should handle concurrent config updates', async () => {
      // Get current version
      const configResponse = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/config/task',
        headers: TEST_HEADERS,
      });
      const version = JSON.parse(configResponse.body).data.version;

      // Two updates with same version
      const [response1, response2] = await Promise.all([
        server.inject({
          method: 'PUT',
          url: '/api/v1/kanban/config/task',
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': uuid() },
          payload: {
            wipLimits: { in_progress: { softLimit: 5, hardLimit: 10 } },
            expectedVersion: version,
          },
        }),
        server.inject({
          method: 'PUT',
          url: '/api/v1/kanban/config/task',
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': uuid() },
          payload: {
            wipLimits: { in_progress: { softLimit: 6, hardLimit: 12 } },
            expectedVersion: version,
          },
        }),
      ]);

      const statuses = [response1.statusCode, response2.statusCode].sort();
      expect(statuses).toContain(200); // One succeeds
      expect(statuses).toContain(422); // One gets version conflict
    });
  });
});
