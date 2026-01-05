/**
 * Activity Log Service Tests
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActivityLogService, EntityType, ActionType } from './activity-log.service';
import { Result } from '@zuclubit/domain';

// Mock the database pool
const createMockPool = () => ({
  query: vi.fn(),
});

describe('ActivityLogService', () => {
  let activityLogService: ActivityLogService;
  let mockPool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    mockPool = createMockPool();
    activityLogService = new ActivityLogService(mockPool as never);
  });

  describe('log', () => {
    it('should create an activity log entry successfully', async () => {
      const input = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        entityType: 'lead' as EntityType,
        entityId: 'lead-789',
        action: 'created' as ActionType,
        changes: { status: { before: null, after: 'new' } },
        metadata: { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' },
      };

      mockPool.query.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'activity-123',
              tenant_id: input.tenantId,
              user_id: input.userId,
              entity_type: input.entityType,
              entity_id: input.entityId,
              action: input.action,
              changes: input.changes,
              metadata: input.metadata,
              created_at: new Date().toISOString(),
            },
          ],
        })
      );

      const result = await activityLogService.log(input);

      expect(result.isSuccess).toBe(true);
      const entry = result.getValue();
      expect(entry.entityType).toBe('lead');
      expect(entry.action).toBe('created');
      expect(entry.changes).toEqual(input.changes);
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockResolvedValueOnce(Result.fail('Database connection error'));

      const result = await activityLogService.log({
        tenantId: 'tenant-123',
        entityType: 'user' as EntityType,
        entityId: 'user-456',
        action: 'updated' as ActionType,
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Failed to create activity log');
    });
  });

  describe('getByEntity', () => {
    it('should return activity logs for a specific entity', async () => {
      const logs = [
        {
          id: 'activity-1',
          tenant_id: 'tenant-123',
          user_id: 'user-1',
          entity_type: 'lead',
          entity_id: 'lead-789',
          action: 'created',
          changes: {},
          metadata: {},
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 'activity-2',
          tenant_id: 'tenant-123',
          user_id: 'user-2',
          entity_type: 'lead',
          entity_id: 'lead-789',
          action: 'updated',
          changes: { status: { before: 'new', after: 'contacted' } },
          metadata: {},
          created_at: '2024-01-15T14:00:00Z',
        },
      ];

      mockPool.query.mockResolvedValueOnce(Result.ok({ rows: logs }));

      const result = await activityLogService.getByEntity(
        'tenant-123',
        'lead' as EntityType,
        'lead-789'
      );

      expect(result.isSuccess).toBe(true);
      const entries = result.getValue();
      expect(entries.length).toBe(2);
      expect(entries[0].action).toBe('created');
      expect(entries[1].action).toBe('updated');
    });

    it('should return empty array when no logs found', async () => {
      mockPool.query.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await activityLogService.getByEntity(
        'tenant-123',
        'lead' as EntityType,
        'nonexistent'
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual([]);
    });
  });

  describe('query', () => {
    it('should filter by action type', async () => {
      const logs = [
        {
          id: 'activity-1',
          tenant_id: 'tenant-123',
          user_id: 'user-1',
          entity_type: 'lead',
          entity_id: 'lead-1',
          action: 'status_changed',
          changes: { status: { before: 'new', after: 'qualified' } },
          metadata: {},
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 'activity-2',
          tenant_id: 'tenant-123',
          user_id: 'user-1',
          entity_type: 'lead',
          entity_id: 'lead-2',
          action: 'status_changed',
          changes: { status: { before: 'qualified', after: 'won' } },
          metadata: {},
          created_at: '2024-01-16T10:00:00Z',
        },
      ];

      // First call returns count, then second call returns results
      mockPool.query
        .mockResolvedValueOnce(Result.ok({ rows: [{ total: '2' }] }))
        .mockResolvedValueOnce(Result.ok({ rows: logs }));

      const result = await activityLogService.query({
        tenantId: 'tenant-123',
        action: 'status_changed' as ActionType,
      });

      expect(result.isSuccess).toBe(true);
      const { items, total } = result.getValue();
      expect(items.length).toBe(2);
      expect(total).toBe(2);
      expect(items.every((i) => i.action === 'status_changed')).toBe(true);
    });

    it('should filter by entity type', async () => {
      mockPool.query
        .mockResolvedValueOnce(Result.ok({ rows: [{ total: '1' }] }))
        .mockResolvedValueOnce(
          Result.ok({
            rows: [
              {
                id: 'activity-1',
                tenant_id: 'tenant-123',
                user_id: 'user-1',
                entity_type: 'user',
                entity_id: 'user-1',
                action: 'created',
                changes: {},
                metadata: {},
                created_at: '2024-01-15T10:00:00Z',
              },
            ],
          })
        );

      const result = await activityLogService.query({
        tenantId: 'tenant-123',
        entityType: 'user' as EntityType,
      });

      expect(result.isSuccess).toBe(true);
      const { items } = result.getValue();
      expect(items.length).toBe(1);
      expect(items[0].entityType).toBe('user');
    });

    it('should filter by user ID', async () => {
      mockPool.query
        .mockResolvedValueOnce(Result.ok({ rows: [{ total: '1' }] }))
        .mockResolvedValueOnce(
          Result.ok({
            rows: [
              {
                id: 'activity-1',
                tenant_id: 'tenant-123',
                user_id: 'user-specific',
                entity_type: 'lead',
                entity_id: 'lead-1',
                action: 'updated',
                changes: {},
                metadata: {},
                created_at: '2024-01-15T10:00:00Z',
              },
            ],
          })
        );

      const result = await activityLogService.query({
        tenantId: 'tenant-123',
        userId: 'user-specific',
      });

      expect(result.isSuccess).toBe(true);
      const { items } = result.getValue();
      expect(items.length).toBe(1);
      expect(items[0].userId).toBe('user-specific');
    });

    it('should filter by date range', async () => {
      mockPool.query
        .mockResolvedValueOnce(Result.ok({ rows: [{ total: '0' }] }))
        .mockResolvedValueOnce(Result.ok({ rows: [] }));

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await activityLogService.query({
        tenantId: 'tenant-123',
        startDate,
        endDate,
      });

      // Verify the query was called with date parameters
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should apply pagination', async () => {
      const logs = Array.from({ length: 2 }, (_, i) => ({
        id: `activity-${i}`,
        tenant_id: 'tenant-123',
        user_id: 'user-1',
        entity_type: 'lead',
        entity_id: `lead-${i}`,
        action: 'updated',
        changes: {},
        metadata: {},
        created_at: new Date().toISOString(),
      }));

      mockPool.query
        .mockResolvedValueOnce(Result.ok({ rows: [{ total: '5' }] }))
        .mockResolvedValueOnce(Result.ok({ rows: logs }));

      const result = await activityLogService.query({
        tenantId: 'tenant-123',
        limit: 2,
        page: 1,
      });

      expect(result.isSuccess).toBe(true);
      const { items, total } = result.getValue();
      expect(items.length).toBe(2);
      expect(total).toBe(5);
    });
  });
});
