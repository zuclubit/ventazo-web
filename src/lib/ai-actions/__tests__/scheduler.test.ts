// ============================================
// FASE 6.2 — AI Actions Scheduler Tests
// ============================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  scheduleAIAction,
  getScheduledActions,
  getScheduledAction,
  cancelScheduledAction,
  pauseScheduledAction,
  resumeScheduledAction,
  getSchedulerStats,
  bulkScheduleActions,
  cancelActionsForEntity,
  startScheduler,
  stopScheduler,
  isSchedulerRunning,
  toQueueItem,
} from '../scheduler';

describe('AI Actions Scheduler', () => {
  beforeEach(() => {
    stopScheduler();
  });

  afterEach(() => {
    stopScheduler();
  });

  describe('scheduleAIAction', () => {
    it('should schedule a one-time action', () => {
      const scheduledAt = new Date(Date.now() + 60000);
      const action = scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-123',
        tenantId: 'tenant-456',
        scheduledAt,
      });

      expect(action).toBeDefined();
      expect(action.id).toBeDefined();
      expect(action.action).toBe('ai_score_lead');
      expect(action.entityType).toBe('lead');
      expect(action.status).toBe('active');
    });

    it('should schedule a recurring daily action', () => {
      const action = scheduleAIAction({
        action: 'ai_classify_lead',
        entityType: 'lead',
        entityId: 'lead-123',
        tenantId: 'tenant-456',
        recurringPattern: {
          type: 'daily',
          interval: 1,
        },
      });

      expect(action.recurringPattern?.type).toBe('daily');
      expect(action.recurringPattern?.interval).toBe(1);
    });

    it('should schedule a recurring weekly action', () => {
      const action = scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-123',
        tenantId: 'tenant-456',
        recurringPattern: {
          type: 'weekly',
          daysOfWeek: [1, 3, 5],
        },
      });

      expect(action.recurringPattern?.type).toBe('weekly');
      expect(action.recurringPattern?.daysOfWeek).toEqual([1, 3, 5]);
    });

    it('should schedule a recurring monthly action', () => {
      const action = scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-123',
        tenantId: 'tenant-456',
        recurringPattern: {
          type: 'monthly',
          dayOfMonth: 15,
        },
      });

      expect(action.recurringPattern?.type).toBe('monthly');
      expect(action.recurringPattern?.dayOfMonth).toBe(15);
    });

    it('should schedule with cron expression', () => {
      const action = scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-123',
        tenantId: 'tenant-456',
        recurringPattern: {
          type: 'cron',
          cronExpression: '0 9 * * 1-5',
        },
      });

      expect(action.recurringPattern?.type).toBe('cron');
      expect(action.recurringPattern?.cronExpression).toBe('0 9 * * 1-5');
    });

    it('should set max executions', () => {
      const action = scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-123',
        tenantId: 'tenant-456',
        recurringPattern: {
          type: 'daily',
        },
        maxExecutions: 10,
      });

      expect(action.maxExecutions).toBe(10);
    });

    it('should include params', () => {
      const params = { confidence_threshold: 0.8, include_sentiment: true };
      const action = scheduleAIAction({
        action: 'ai_create_note',
        entityType: 'lead',
        entityId: 'lead-123',
        tenantId: 'tenant-456',
        params,
      });

      expect(action.params).toEqual(params);
    });

    it('should set priority', () => {
      const action = scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-123',
        tenantId: 'tenant-456',
        priority: 'high',
      });

      expect(action.priority).toBe('high');
    });
  });

  describe('getScheduledActions', () => {
    it('should return actions for tenant', () => {
      scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-1',
        tenantId: 'tenant-1',
      });
      scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-2',
        tenantId: 'tenant-2',
      });

      const actions = getScheduledActions('tenant-1');
      expect(actions.every(a => a.tenantId === 'tenant-1')).toBe(true);
    });

    it('should filter by status', () => {
      const action = scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-1',
        tenantId: 'tenant-1',
      });
      pauseScheduledAction(action.id);

      const activeActions = getScheduledActions('tenant-1', { status: 'active' });
      const pausedActions = getScheduledActions('tenant-1', { status: 'paused' });

      expect(activeActions.length).toBe(0);
      expect(pausedActions.length).toBe(1);
    });

    it('should filter by action type', () => {
      scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-1',
        tenantId: 'tenant-1',
      });
      scheduleAIAction({
        action: 'ai_classify_lead',
        entityType: 'lead',
        entityId: 'lead-2',
        tenantId: 'tenant-1',
      });

      const actions = getScheduledActions('tenant-1', { action: 'ai_score_lead' });
      expect(actions.every(a => a.action === 'ai_score_lead')).toBe(true);
    });

    it('should filter by entity type', () => {
      scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-1',
        tenantId: 'tenant-1',
      });
      scheduleAIAction({
        action: 'ai_predict_conversion',
        entityType: 'opportunity',
        entityId: 'opp-1',
        tenantId: 'tenant-1',
      });

      const actions = getScheduledActions('tenant-1', { entityType: 'lead' });
      expect(actions.every(a => a.entityType === 'lead')).toBe(true);
    });
  });

  describe('getScheduledAction', () => {
    it('should return null for non-existent action', () => {
      const action = getScheduledAction('non-existent-id');
      expect(action).toBeNull();
    });

    it('should return the scheduled action', () => {
      const scheduled = scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-1',
        tenantId: 'tenant-1',
      });

      const action = getScheduledAction(scheduled.id);
      expect(action).toBeDefined();
      expect(action?.id).toBe(scheduled.id);
    });
  });

  describe('cancelScheduledAction', () => {
    it('should cancel a scheduled action', () => {
      const scheduled = scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-1',
        tenantId: 'tenant-1',
      });

      const result = cancelScheduledAction(scheduled.id);
      expect(result).toBe(true);

      const action = getScheduledAction(scheduled.id);
      expect(action?.status).toBe('cancelled');
    });

    it('should return false for non-existent action', () => {
      const result = cancelScheduledAction('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('pauseScheduledAction', () => {
    it('should pause a scheduled action', () => {
      const scheduled = scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-1',
        tenantId: 'tenant-1',
      });

      const result = pauseScheduledAction(scheduled.id);
      expect(result).toBe(true);

      const action = getScheduledAction(scheduled.id);
      expect(action?.status).toBe('paused');
    });

    it('should return false for non-existent action', () => {
      const result = pauseScheduledAction('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('resumeScheduledAction', () => {
    it('should resume a paused action', () => {
      const scheduled = scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-1',
        tenantId: 'tenant-1',
      });

      pauseScheduledAction(scheduled.id);
      const result = resumeScheduledAction(scheduled.id);
      expect(result).toBe(true);

      const action = getScheduledAction(scheduled.id);
      expect(action?.status).toBe('active');
    });

    it('should return false for non-paused action', () => {
      const scheduled = scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-1',
        tenantId: 'tenant-1',
      });

      const result = resumeScheduledAction(scheduled.id);
      expect(result).toBe(false);
    });
  });

  describe('getSchedulerStats', () => {
    it('should return scheduler statistics', () => {
      scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-1',
        tenantId: 'tenant-1',
      });

      const stats = getSchedulerStats();
      expect(stats.totalScheduled).toBeGreaterThanOrEqual(1);
      expect(stats.activeCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('bulkScheduleActions', () => {
    it('should schedule multiple actions', () => {
      const actions = bulkScheduleActions([
        { action: 'ai_score_lead', entityType: 'lead', entityId: 'lead-1', tenantId: 'tenant-1' },
        { action: 'ai_classify_lead', entityType: 'lead', entityId: 'lead-2', tenantId: 'tenant-1' },
        { action: 'ai_enrich_lead', entityType: 'lead', entityId: 'lead-3', tenantId: 'tenant-1' },
      ]);

      expect(actions).toHaveLength(3);
      expect(actions[0]!.action).toBe('ai_score_lead');
      expect(actions[1]!.action).toBe('ai_classify_lead');
      expect(actions[2]!.action).toBe('ai_enrich_lead');
    });
  });

  describe('cancelActionsForEntity', () => {
    it('should cancel all actions for an entity', () => {
      scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-1',
        tenantId: 'tenant-1',
      });
      scheduleAIAction({
        action: 'ai_classify_lead',
        entityType: 'lead',
        entityId: 'lead-1',
        tenantId: 'tenant-1',
      });
      scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-2',
        tenantId: 'tenant-1',
      });

      const count = cancelActionsForEntity('lead', 'lead-1', 'tenant-1');
      expect(count).toBe(2);
    });
  });

  describe('Scheduler Control', () => {
    it('should start and stop scheduler', () => {
      expect(isSchedulerRunning()).toBe(false);

      startScheduler();
      expect(isSchedulerRunning()).toBe(true);

      stopScheduler();
      expect(isSchedulerRunning()).toBe(false);
    });
  });

  describe('toQueueItem', () => {
    it('should convert scheduled action to queue item', () => {
      const scheduled = scheduleAIAction({
        action: 'ai_score_lead',
        entityType: 'lead',
        entityId: 'lead-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        workflowId: 'workflow-1',
        params: { confidence_threshold: 0.8 },
        priority: 'high',
      });

      const queueItem = toQueueItem(scheduled);

      expect(queueItem.action).toBe('ai_score_lead');
      expect(queueItem.entityType).toBe('lead');
      expect(queueItem.entityId).toBe('lead-1');
      expect(queueItem.tenantId).toBe('tenant-1');
      expect(queueItem.userId).toBe('user-1');
      expect(queueItem.workflowId).toBe('workflow-1');
      expect(queueItem.params).toEqual({ confidence_threshold: 0.8 });
      expect(queueItem.priority).toBe('high');
    });
  });
});
