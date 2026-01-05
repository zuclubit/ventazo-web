// ============================================
// FASE 6.2 — AI Actions Queue Tests
// ============================================

import { describe, it, expect, beforeEach } from 'vitest';

import {
  enqueue,
  enqueueBatch,
  getQueueStats,
  getQueueItem,
  getQueueItemsByTenant,
  cancelItemsForEntity,
  clearQueue,
  clearDLQ,
  updateItemPriority,
} from '../queue';

describe('AI Actions Queue', () => {
  beforeEach(() => {
    clearQueue();
    clearDLQ();
  });

  describe('enqueue', () => {
    it('should enqueue an item with default priority', () => {
      const item = enqueue({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-123',
        tenantId: 'tenant-456',
      });

      expect(item).toBeDefined();
      expect(item.id).toBeDefined();
      expect(item.action).toBe('ai_score_lead');
      expect(item.entityType).toBe('lead');
      expect(item.entityId).toBe('lead-123');
      expect(item.priority).toBe('normal');
      expect(item.status).toBe('pending');
    });

    it('should enqueue an item with high priority', () => {
      const item = enqueue({
        action: 'ai_classify_lead',
        entityType: 'lead',
        entityId: 'lead-123',
        tenantId: 'tenant-456',
        priority: 'high',
      });

      expect(item.priority).toBe('high');
    });

    it('should enqueue an item with critical priority', () => {
      const item = enqueue({
        action: 'ai_predict_conversion',
        entityType: 'opportunity',
        entityId: 'opp-123',
        tenantId: 'tenant-456',
        priority: 'critical',
      });

      expect(item.priority).toBe('critical');
    });

    it('should include params in enqueued item', () => {
      const params = { confidence_threshold: 0.8 };
      const item = enqueue({
        action: 'ai_create_note',
        entityType: 'lead',
        entityId: 'lead-123',
        tenantId: 'tenant-456',
        params,
      });

      expect(item.params).toEqual(params);
    });

    it('should include userId and workflowId', () => {
      const item = enqueue({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-123',
        tenantId: 'tenant-456',
        userId: 'user-789',
        workflowId: 'workflow-111',
      });

      expect(item.userId).toBe('user-789');
      expect(item.workflowId).toBe('workflow-111');
    });

    it('should set scheduledAt for delayed items', () => {
      const scheduledAt = new Date(Date.now() + 60000).toISOString();
      const item = enqueue({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-123',
        tenantId: 'tenant-456',
        scheduledAt,
      });

      expect(item.scheduledAt).toBe(scheduledAt);
    });
  });

  describe('enqueueBatch', () => {
    it('should enqueue multiple items', () => {
      const items = enqueueBatch([
        { action: 'ai_score_lead', entityType: 'lead', entityId: 'lead-1', tenantId: 'tenant-1' },
        { action: 'ai_classify_lead', entityType: 'lead', entityId: 'lead-2', tenantId: 'tenant-1' },
        { action: 'ai_enrich_lead', entityType: 'lead', entityId: 'lead-3', tenantId: 'tenant-1' },
      ]);

      expect(items).toHaveLength(3);
      expect(items[0]!.action).toBe('ai_score_lead');
      expect(items[1]!.action).toBe('ai_classify_lead');
      expect(items[2]!.action).toBe('ai_enrich_lead');
    });
  });

  describe('getQueueStats', () => {
    it('should return stats for empty queue', () => {
      const stats = getQueueStats();

      expect(stats).toBeDefined();
      expect(stats.pending).toBe(0);
      expect(stats.processing).toBe(0);
    });

    it('should return correct pending count after enqueue', () => {
      enqueue({ action: 'ai_score_lead', entityType: 'lead', entityId: 'lead-1', tenantId: 'tenant-1' });
      enqueue({ action: 'ai_score_lead', entityType: 'lead', entityId: 'lead-2', tenantId: 'tenant-1' });

      const stats = getQueueStats();
      expect(stats.pending).toBe(2);
    });
  });

  describe('getQueueItem', () => {
    it('should return null for non-existent item', () => {
      const item = getQueueItem('non-existent-id');
      expect(item).toBeNull();
    });

    it('should return the correct item', () => {
      const enqueuedItem = enqueue({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-1',
        tenantId: 'tenant-1',
      });

      const item = getQueueItem(enqueuedItem.id);
      expect(item).toBeDefined();
      expect(item?.id).toBe(enqueuedItem.id);
    });
  });

  describe('getQueueItemsByTenant', () => {
    it('should return items for specific tenant', () => {
      enqueue({ action: 'ai_score_lead', entityType: 'lead', entityId: 'lead-1', tenantId: 'tenant-1' });
      enqueue({ action: 'ai_score_lead', entityType: 'lead', entityId: 'lead-2', tenantId: 'tenant-2' });
      enqueue({ action: 'ai_score_lead', entityType: 'lead', entityId: 'lead-3', tenantId: 'tenant-1' });

      const items = getQueueItemsByTenant('tenant-1');
      expect(items).toHaveLength(2);
      expect(items.every(item => item.tenantId === 'tenant-1')).toBe(true);
    });

    it('should filter by status', () => {
      enqueue({ action: 'ai_score_lead', entityType: 'lead', entityId: 'lead-1', tenantId: 'tenant-1' });
      enqueue({ action: 'ai_score_lead', entityType: 'lead', entityId: 'lead-2', tenantId: 'tenant-1' });

      const pendingItems = getQueueItemsByTenant('tenant-1', { status: 'pending' });
      expect(pendingItems).toHaveLength(2);
    });

    it('should filter by action', () => {
      enqueue({ action: 'ai_score_lead', entityType: 'lead', entityId: 'lead-1', tenantId: 'tenant-1' });
      enqueue({ action: 'ai_classify_lead', entityType: 'lead', entityId: 'lead-2', tenantId: 'tenant-1' });

      const items = getQueueItemsByTenant('tenant-1', { action: 'ai_score_lead' });
      expect(items).toHaveLength(1);
      expect(items[0]!.action).toBe('ai_score_lead');
    });
  });

  describe('cancelItemsForEntity', () => {
    it('should cancel items for specific entity', () => {
      enqueue({ action: 'ai_score_lead', entityType: 'lead', entityId: 'lead-1', tenantId: 'tenant-1' });
      enqueue({ action: 'ai_classify_lead', entityType: 'lead', entityId: 'lead-1', tenantId: 'tenant-1' });
      enqueue({ action: 'ai_score_lead', entityType: 'lead', entityId: 'lead-2', tenantId: 'tenant-1' });

      const count = cancelItemsForEntity('lead', 'lead-1', 'tenant-1');
      expect(count).toBe(2);

      const items = getQueueItemsByTenant('tenant-1');
      const lead1Items = items.filter(i => i.entityId === 'lead-1');
      expect(lead1Items.every(i => i.status === 'cancelled')).toBe(true);
    });
  });

  describe('updateItemPriority', () => {
    it('should update item priority', () => {
      const item = enqueue({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-1',
        tenantId: 'tenant-1',
        priority: 'low',
      });

      const success = updateItemPriority(item.id, 'critical');
      expect(success).toBe(true);

      const updatedItem = getQueueItem(item.id);
      expect(updatedItem?.priority).toBe('critical');
    });

    it('should return false for non-existent item', () => {
      const success = updateItemPriority('non-existent-id', 'high');
      expect(success).toBe(false);
    });
  });
});
