import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

/**
 * Kanban Concurrency Tests
 *
 * Tests focused on concurrent operations including:
 * - Optimistic locking (version conflicts)
 * - Pessimistic locking (lock acquisition/release)
 * - Race conditions in moves
 * - Multi-user scenarios
 */
describe('Kanban Concurrency', () => {
  let container: StartedPostgreSqlContainer;
  let pool: DatabasePool;
  let server: FastifyInstance;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('kanban_concurrency_test')
      .withUsername('test')
      .withPassword('test')
      .start();

    pool = new DatabasePool({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    });

    const connectResult = await pool.connect();
    expect(connectResult.isSuccess).toBe(true);

    const migrationSql = readFileSync(
      join(__dirname, '../../../drizzle/0000_careful_titania.sql'),
      'utf-8'
    );
    await pool.query(migrationSql, []);

    server = await buildTestServer(pool);
  }, 120000);

  afterAll(async () => {
    await cleanupTestServer(server);
    await pool.close();
    await container.stop();
  });

  // Helper to create a lead
  async function createTestLead(userId: string): Promise<string> {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: {
        'x-tenant-id': TEST_TENANT_ID,
        'x-user-id': userId,
      },
      payload: {
        tenantId: TEST_TENANT_ID,
        companyName: `Concurrency Test ${uuid().slice(0, 8)}`,
        email: `test-${uuid().slice(0, 8)}@example.com`,
        source: 'Concurrency Test',
      },
    });
    return JSON.parse(response.body).leadId;
  }

  // ============================================
  // Optimistic Locking Tests
  // ============================================

  describe('Optimistic Locking', () => {
    describe('Config Version Conflicts', () => {
      it('should reject update with stale version', async () => {
        const userId1 = uuid();
        const userId2 = uuid();

        // User 1 gets config
        const configResponse1 = await server.inject({
          method: 'GET',
          url: '/api/v1/kanban/config/opportunity',
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId1 },
        });
        const version1 = JSON.parse(configResponse1.body).data.version;

        // User 2 gets config (same version)
        const configResponse2 = await server.inject({
          method: 'GET',
          url: '/api/v1/kanban/config/opportunity',
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId2 },
        });
        const version2 = JSON.parse(configResponse2.body).data.version;

        expect(version1).toBe(version2);

        // User 1 updates config
        const update1 = await server.inject({
          method: 'PUT',
          url: '/api/v1/kanban/config/opportunity',
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId1 },
          payload: {
            wipLimits: { discovery: { softLimit: 15, hardLimit: 25 } },
            expectedVersion: version1,
          },
        });

        expect(update1.statusCode).toBe(200);
        const newVersion = JSON.parse(update1.body).data.version;
        expect(newVersion).toBe(version1 + 1);

        // User 2 tries to update with stale version
        const update2 = await server.inject({
          method: 'PUT',
          url: '/api/v1/kanban/config/opportunity',
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId2 },
          payload: {
            wipLimits: { discovery: { softLimit: 20, hardLimit: 30 } },
            expectedVersion: version2, // Stale!
          },
        });

        expect(update2.statusCode).toBe(422);
        const body = JSON.parse(update2.body);
        expect(body.error.code).toBe('VERSION_CONFLICT');
      });

      it('should handle rapid sequential updates from same user', async () => {
        const userId = uuid();

        // Get initial version
        const configResponse = await server.inject({
          method: 'GET',
          url: '/api/v1/kanban/config/customer',
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId },
        });
        let currentVersion = JSON.parse(configResponse.body).data.version;

        // Do 5 sequential updates
        for (let i = 0; i < 5; i++) {
          const updateResponse = await server.inject({
            method: 'PUT',
            url: '/api/v1/kanban/config/customer',
            headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId },
            payload: {
              wipLimits: { onboarding: { softLimit: 10 + i, hardLimit: 20 + i } },
              expectedVersion: currentVersion,
            },
          });

          expect(updateResponse.statusCode).toBe(200);
          currentVersion = JSON.parse(updateResponse.body).data.version;
        }

        // Final version should be initial + 5
        const finalConfig = await server.inject({
          method: 'GET',
          url: '/api/v1/kanban/config/customer',
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId },
        });

        expect(JSON.parse(finalConfig.body).data.version).toBe(currentVersion);
      });

      it('should allow parallel reads during update', async () => {
        const userId = uuid();

        // Get initial version
        const configResponse = await server.inject({
          method: 'GET',
          url: '/api/v1/kanban/config/task',
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId },
        });
        const version = JSON.parse(configResponse.body).data.version;

        // Start update and parallel reads
        const [updateResult, ...readResults] = await Promise.all([
          // Update
          server.inject({
            method: 'PUT',
            url: '/api/v1/kanban/config/task',
            headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId },
            payload: {
              wipLimits: { in_progress: { softLimit: 4, hardLimit: 8 } },
              expectedVersion: version,
            },
          }),
          // Multiple reads
          server.inject({
            method: 'GET',
            url: '/api/v1/kanban/config/task',
            headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': uuid() },
          }),
          server.inject({
            method: 'GET',
            url: '/api/v1/kanban/config/task',
            headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': uuid() },
          }),
          server.inject({
            method: 'GET',
            url: '/api/v1/kanban/config/task',
            headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': uuid() },
          }),
        ]);

        // Update should succeed
        expect(updateResult.statusCode).toBe(200);

        // All reads should succeed (may see old or new version)
        for (const readResult of readResults) {
          expect(readResult.statusCode).toBe(200);
          const readVersion = JSON.parse(readResult.body).data.version;
          expect(readVersion).toBeGreaterThanOrEqual(version);
        }
      });
    });

    describe('Entity Stage Conflicts', () => {
      it('should detect when entity moved by another user', async () => {
        const userId1 = uuid();
        const userId2 = uuid();

        // Create a lead
        const leadId = await createTestLead(userId1);

        // User 1 moves lead
        const move1 = await server.inject({
          method: 'POST',
          url: '/api/v1/kanban/move',
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId1 },
          payload: {
            entityType: 'lead',
            entityId: leadId,
            fromStageId: 'new',
            toStageId: 'contacted',
          },
        });

        expect(move1.statusCode).toBe(200);

        // User 2 tries to move from original position (now stale)
        const move2 = await server.inject({
          method: 'POST',
          url: '/api/v1/kanban/move',
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId2 },
          payload: {
            entityType: 'lead',
            entityId: leadId,
            fromStageId: 'new', // Lead is already in 'contacted'!
            toStageId: 'qualified',
          },
        });

        expect(move2.statusCode).toBe(409);
        const body = JSON.parse(move2.body);
        expect(body.error.code).toBe('CONFLICT');
        expect(body.error.message).toContain('moved by another user');
      });

      it('should handle idempotent moves correctly', async () => {
        const userId = uuid();
        const leadId = await createTestLead(userId);
        const idempotencyKey = uuid();

        // First move
        const move1 = await server.inject({
          method: 'POST',
          url: '/api/v1/kanban/move',
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId },
          payload: {
            entityType: 'lead',
            entityId: leadId,
            fromStageId: 'new',
            toStageId: 'contacted',
            metadata: { idempotencyKey },
          },
        });

        expect(move1.statusCode).toBe(200);
        const moveId = JSON.parse(move1.body).data.moveId;

        // Retry with same idempotency key
        const move2 = await server.inject({
          method: 'POST',
          url: '/api/v1/kanban/move',
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId },
          payload: {
            entityType: 'lead',
            entityId: leadId,
            fromStageId: 'new',
            toStageId: 'contacted',
            metadata: { idempotencyKey },
          },
        });

        expect(move2.statusCode).toBe(200);
        // Should return same move ID
        expect(JSON.parse(move2.body).data.moveId).toBe(moveId);
      });
    });
  });

  // ============================================
  // Pessimistic Locking Tests
  // ============================================

  describe('Pessimistic Locking', () => {
    describe('Lock Acquisition', () => {
      it('should allow only one user to hold a lock', async () => {
        const userId1 = uuid();
        const userId2 = uuid();
        const leadId = await createTestLead(userId1);

        // User 1 acquires lock
        const lock1 = await server.inject({
          method: 'POST',
          url: `/api/v1/kanban/lock/lead/${leadId}`,
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId1 },
          payload: { sessionId: 'session-1' },
        });

        expect(lock1.statusCode).toBe(200);
        expect(JSON.parse(lock1.body).data.locked).toBe(true);

        // User 2 tries to acquire same lock
        const lock2 = await server.inject({
          method: 'POST',
          url: `/api/v1/kanban/lock/lead/${leadId}`,
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId2 },
          payload: { sessionId: 'session-2' },
        });

        expect(lock2.statusCode).toBe(409);
        const body = JSON.parse(lock2.body);
        expect(body.error.code).toBe('LOCK_CONFLICT');
        expect(body.error.conflictingUser).toBe(userId1);

        // Cleanup
        await server.inject({
          method: 'DELETE',
          url: `/api/v1/kanban/lock/lead/${leadId}`,
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId1 },
        });
      });

      it('should allow same user to extend lock', async () => {
        const userId = uuid();
        const leadId = await createTestLead(userId);

        // First lock
        const lock1 = await server.inject({
          method: 'POST',
          url: `/api/v1/kanban/lock/lead/${leadId}`,
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId },
          payload: { sessionId: 'session-1' },
        });

        expect(lock1.statusCode).toBe(200);
        const expires1 = JSON.parse(lock1.body).data.expiresAt;

        // Wait a bit
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Extend lock
        const lock2 = await server.inject({
          method: 'POST',
          url: `/api/v1/kanban/lock/lead/${leadId}`,
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId },
          payload: { sessionId: 'session-1' },
        });

        expect(lock2.statusCode).toBe(200);
        const expires2 = JSON.parse(lock2.body).data.expiresAt;

        // New expiration should be later
        expect(new Date(expires2).getTime()).toBeGreaterThan(new Date(expires1).getTime());

        // Cleanup
        await server.inject({
          method: 'DELETE',
          url: `/api/v1/kanban/lock/lead/${leadId}`,
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId },
        });
      });

      it('should handle concurrent lock requests gracefully', async () => {
        const leadId = await createTestLead(uuid());
        const users = Array.from({ length: 5 }, () => uuid());

        // 5 users try to lock simultaneously
        const lockResults = await Promise.all(
          users.map((userId) =>
            server.inject({
              method: 'POST',
              url: `/api/v1/kanban/lock/lead/${leadId}`,
              headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId },
              payload: { sessionId: `session-${userId}` },
            })
          )
        );

        // Exactly one should succeed
        const successes = lockResults.filter((r) => r.statusCode === 200);
        const conflicts = lockResults.filter((r) => r.statusCode === 409);

        expect(successes.length).toBe(1);
        expect(conflicts.length).toBe(4);

        // Get the winning user
        const winnerBody = JSON.parse(successes[0].body);
        expect(winnerBody.data.locked).toBe(true);
      });
    });

    describe('Lock Release', () => {
      it('should allow only lock owner to release', async () => {
        const userId1 = uuid();
        const userId2 = uuid();
        const leadId = await createTestLead(userId1);

        // User 1 acquires lock
        await server.inject({
          method: 'POST',
          url: `/api/v1/kanban/lock/lead/${leadId}`,
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId1 },
          payload: { sessionId: 'session-1' },
        });

        // User 2 tries to release
        const release = await server.inject({
          method: 'DELETE',
          url: `/api/v1/kanban/lock/lead/${leadId}`,
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId2 },
        });

        // Should succeed but not actually release (only owner can)
        expect(release.statusCode).toBe(200);

        // User 2 still can't lock
        const lock2 = await server.inject({
          method: 'POST',
          url: `/api/v1/kanban/lock/lead/${leadId}`,
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId2 },
          payload: { sessionId: 'session-2' },
        });

        expect(lock2.statusCode).toBe(409);

        // Cleanup - actual owner releases
        await server.inject({
          method: 'DELETE',
          url: `/api/v1/kanban/lock/lead/${leadId}`,
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId1 },
        });
      });

      it('should allow lock acquisition after release', async () => {
        const userId1 = uuid();
        const userId2 = uuid();
        const leadId = await createTestLead(userId1);

        // User 1 acquires and releases
        await server.inject({
          method: 'POST',
          url: `/api/v1/kanban/lock/lead/${leadId}`,
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId1 },
          payload: { sessionId: 'session-1' },
        });

        await server.inject({
          method: 'DELETE',
          url: `/api/v1/kanban/lock/lead/${leadId}`,
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId1 },
        });

        // User 2 can now lock
        const lock2 = await server.inject({
          method: 'POST',
          url: `/api/v1/kanban/lock/lead/${leadId}`,
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId2 },
          payload: { sessionId: 'session-2' },
        });

        expect(lock2.statusCode).toBe(200);
        expect(JSON.parse(lock2.body).data.locked).toBe(true);
      });
    });

    describe('Lock Expiration', () => {
      // Note: These tests would need special handling for time manipulation
      // In a real scenario, you'd use time mocking or a very short lock duration

      it('should report expiration time', async () => {
        const userId = uuid();
        const leadId = await createTestLead(userId);

        const lock = await server.inject({
          method: 'POST',
          url: `/api/v1/kanban/lock/lead/${leadId}`,
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId },
          payload: { sessionId: 'session-1' },
        });

        expect(lock.statusCode).toBe(200);
        const body = JSON.parse(lock.body);
        expect(body.data.expiresAt).toBeDefined();

        const expiresAt = new Date(body.data.expiresAt);
        const now = new Date();

        // Should expire in the future (30 seconds default)
        expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
        expect(expiresAt.getTime()).toBeLessThan(now.getTime() + 60000);
      });
    });
  });

  // ============================================
  // Race Condition Tests
  // ============================================

  describe('Race Conditions', () => {
    it('should handle rapid moves on same entity', async () => {
      const userId = uuid();
      const leadId = await createTestLead(userId);

      const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation'];
      let currentStage = 'new';

      // Sequential rapid moves
      for (let i = 0; i < stages.length - 1; i++) {
        const move = await server.inject({
          method: 'POST',
          url: '/api/v1/kanban/move',
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId },
          payload: {
            entityType: 'lead',
            entityId: leadId,
            fromStageId: stages[i],
            toStageId: stages[i + 1],
          },
        });

        expect(move.statusCode).toBe(200);
        currentStage = stages[i + 1];
      }

      // Verify final state
      const board = await server.inject({
        method: 'GET',
        url: '/api/v1/kanban/board/lead',
        headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId },
      });

      const boardData = JSON.parse(board.body).data;
      const negotiationStage = boardData.stages.find((s: { id: string }) => s.id === 'negotiation');

      // Lead should be in negotiation stage
      const leadInNegotiation = negotiationStage?.items.some((i: { id: string }) => i.id === leadId);
      expect(leadInNegotiation).toBe(true);
    });

    it('should serialize undo/redo operations', async () => {
      const userId = uuid();
      const leadId = await createTestLead(userId);

      // Move
      await server.inject({
        method: 'POST',
        url: '/api/v1/kanban/move',
        headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId },
        payload: {
          entityType: 'lead',
          entityId: leadId,
          fromStageId: 'new',
          toStageId: 'contacted',
        },
      });

      // Undo
      const undo = await server.inject({
        method: 'POST',
        url: '/api/v1/kanban/undo',
        headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId },
        payload: { entityType: 'lead' },
      });

      expect(undo.statusCode).toBe(200);
      expect(JSON.parse(undo.body).data.restoredTo.stageId).toBe('new');

      // Redo
      const redo = await server.inject({
        method: 'POST',
        url: '/api/v1/kanban/redo',
        headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId },
        payload: { entityType: 'lead' },
      });

      expect(redo.statusCode).toBe(200);
      expect(JSON.parse(redo.body).data.toStageId).toBe('contacted');
    });

    it('should handle multi-user board access', async () => {
      const users = Array.from({ length: 10 }, () => uuid());

      // All users get board simultaneously
      const results = await Promise.all(
        users.map((userId) =>
          server.inject({
            method: 'GET',
            url: '/api/v1/kanban/board/lead',
            headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': userId },
          })
        )
      );

      // All should succeed
      for (const result of results) {
        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.data.entityType).toBe('lead');
      }
    });
  });

  // ============================================
  // Tenant Isolation Tests
  // ============================================

  describe('Tenant Isolation', () => {
    it('should not see other tenant data', async () => {
      const userId = uuid();
      const tenant1 = uuid();
      const tenant2 = uuid();

      // Create lead in tenant 1
      const lead1Response = await server.inject({
        method: 'POST',
        url: '/api/v1/leads',
        headers: { 'x-tenant-id': tenant1, 'x-user-id': userId },
        payload: {
          tenantId: tenant1,
          companyName: 'Tenant 1 Company',
          email: 'tenant1@test.com',
          source: 'Test',
        },
      });
      const lead1Id = JSON.parse(lead1Response.body).leadId;

      // Try to access from tenant 2
      const moveResult = await server.inject({
        method: 'POST',
        url: '/api/v1/kanban/move',
        headers: { 'x-tenant-id': tenant2, 'x-user-id': userId },
        payload: {
          entityType: 'lead',
          entityId: lead1Id, // Lead from tenant 1
          fromStageId: 'new',
          toStageId: 'contacted',
        },
      });

      expect(moveResult.statusCode).toBe(404);
    });

    it('should isolate locks per tenant', async () => {
      const userId = uuid();
      const tenant1 = uuid();
      const tenant2 = uuid();

      // Create leads in different tenants
      const lead1Response = await server.inject({
        method: 'POST',
        url: '/api/v1/leads',
        headers: { 'x-tenant-id': tenant1, 'x-user-id': userId },
        payload: {
          tenantId: tenant1,
          companyName: 'Tenant 1 Lock Test',
          email: 'lock1@test.com',
          source: 'Test',
        },
      });
      const lead1Id = JSON.parse(lead1Response.body).leadId;

      const lead2Response = await server.inject({
        method: 'POST',
        url: '/api/v1/leads',
        headers: { 'x-tenant-id': tenant2, 'x-user-id': userId },
        payload: {
          tenantId: tenant2,
          companyName: 'Tenant 2 Lock Test',
          email: 'lock2@test.com',
          source: 'Test',
        },
      });
      const lead2Id = JSON.parse(lead2Response.body).leadId;

      // Lock lead in tenant 1
      const lock1 = await server.inject({
        method: 'POST',
        url: `/api/v1/kanban/lock/lead/${lead1Id}`,
        headers: { 'x-tenant-id': tenant1, 'x-user-id': userId },
        payload: { sessionId: 'session-1' },
      });
      expect(lock1.statusCode).toBe(200);

      // Lock lead in tenant 2 should work (different tenant)
      const lock2 = await server.inject({
        method: 'POST',
        url: `/api/v1/kanban/lock/lead/${lead2Id}`,
        headers: { 'x-tenant-id': tenant2, 'x-user-id': userId },
        payload: { sessionId: 'session-2' },
      });
      expect(lock2.statusCode).toBe(200);
    });
  });

  // ============================================
  // Stress Tests
  // ============================================

  describe('Stress Tests', () => {
    it('should handle 50 concurrent board reads', async () => {
      const requests = Array.from({ length: 50 }, () =>
        server.inject({
          method: 'GET',
          url: '/api/v1/kanban/board/lead',
          headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': uuid() },
        })
      );

      const results = await Promise.all(requests);

      // All should succeed
      const successes = results.filter((r) => r.statusCode === 200);
      expect(successes.length).toBe(50);
    });

    it('should handle 20 concurrent moves on different entities', async () => {
      const userId = uuid();

      // Create 20 leads
      const leadIds = await Promise.all(
        Array.from({ length: 20 }, () => createTestLead(userId))
      );

      // Move all 20 leads concurrently
      const results = await Promise.all(
        leadIds.map((leadId, index) =>
          server.inject({
            method: 'POST',
            url: '/api/v1/kanban/move',
            headers: { 'x-tenant-id': TEST_TENANT_ID, 'x-user-id': uuid() },
            payload: {
              entityType: 'lead',
              entityId: leadId,
              fromStageId: 'new',
              toStageId: 'contacted',
              metadata: { idempotencyKey: uuid() },
            },
          })
        )
      );

      // All should succeed (different entities)
      const successes = results.filter((r) => r.statusCode === 200);
      expect(successes.length).toBe(20);
    });
  });
});
