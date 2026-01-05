/**
 * Notification Service Tests
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService, createLeadNotification } from './notification.service';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
} from './types';
import { Result } from '@zuclubit/domain';

// Mock the database pool
const createMockPool = () => ({
  query: vi.fn(),
});

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockPool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    mockPool = createMockPool();
    notificationService = new NotificationService(mockPool as never);
  });

  describe('send', () => {
    it('should create a notification for each specified channel', async () => {
      // Mock successful insert and update
      mockPool.query
        .mockResolvedValueOnce(
          Result.ok({
            rows: [
              {
                id: 'notif-123',
                tenant_id: 'tenant-1',
                type: NotificationType.LEAD_CREATED,
                priority: NotificationPriority.MEDIUM,
                recipient_user_id: 'user-1',
                channel: NotificationChannel.IN_APP,
                status: NotificationStatus.PENDING,
                title: 'New Lead Created',
                body: 'A new lead "Acme Corp" has been created.',
                data: {},
                metadata: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          })
        )
        // Mock markAsSent
        .mockResolvedValueOnce(Result.ok({ rows: [] }));

      await notificationService.send({
        tenantId: 'tenant-1',
        type: NotificationType.LEAD_CREATED,
        recipientUserId: 'user-1',
        channels: [NotificationChannel.IN_APP],
        content: {
          title: 'New Lead Created',
          body: 'A new lead has been created.',
        },
        metadata: { companyName: 'Acme Corp' },
      });

      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should default to IN_APP channel when no channels specified', async () => {
      mockPool.query
        .mockResolvedValueOnce(
          Result.ok({
            rows: [
              {
                id: 'notif-123',
                tenant_id: 'tenant-1',
                type: NotificationType.LEAD_ASSIGNED,
                priority: NotificationPriority.HIGH,
                recipient_user_id: 'user-1',
                channel: NotificationChannel.IN_APP,
                status: NotificationStatus.PENDING,
                title: 'Lead Assigned',
                body: 'Lead has been assigned to you.',
                data: {},
                metadata: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          })
        )
        .mockResolvedValueOnce(Result.ok({ rows: [] }));

      await notificationService.send({
        tenantId: 'tenant-1',
        type: NotificationType.LEAD_ASSIGNED,
        recipientUserId: 'user-1',
        priority: NotificationPriority.HIGH,
        content: {
          title: 'Lead Assigned',
          body: 'Lead has been assigned to you.',
        },
      });

      // Should only call once for IN_APP channel
      expect(mockPool.query).toHaveBeenCalledTimes(2); // insert + markAsSent
    });
  });

  describe('sendBatch', () => {
    it('should send notifications to multiple recipients', async () => {
      mockPool.query
        .mockResolvedValue(
          Result.ok({
            rows: [
              {
                id: 'notif-123',
                tenant_id: 'tenant-1',
                type: NotificationType.DAILY_SUMMARY,
                priority: NotificationPriority.LOW,
                recipient_user_id: 'user-1',
                channel: NotificationChannel.IN_APP,
                status: NotificationStatus.PENDING,
                title: 'Daily Summary',
                body: 'Your daily summary is ready.',
                data: {},
                metadata: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          })
        );

      await notificationService.sendBatch([
        {
          tenantId: 'tenant-1',
          type: NotificationType.DAILY_SUMMARY,
          recipientUserId: 'user-1',
          content: { title: 'Daily Summary', body: 'Summary for user 1' },
        },
        {
          tenantId: 'tenant-1',
          type: NotificationType.DAILY_SUMMARY,
          recipientUserId: 'user-2',
          content: { title: 'Daily Summary', body: 'Summary for user 2' },
        },
      ]);

      // 2 inserts + 2 markAsSent = 4 calls
      expect(mockPool.query).toHaveBeenCalledTimes(4);
    });
  });

  describe('markAsRead', () => {
    it('should update notification status to READ', async () => {
      mockPool.query.mockResolvedValueOnce(Result.ok({ rows: [] }));

      await notificationService.markAsRead('notif-123', 'user-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        [NotificationStatus.READ, 'notif-123', 'user-1']
      );
    });
  });

  describe('getUnread', () => {
    it('should return unread notifications for user', async () => {
      const notifications = [
        {
          id: 'notif-1',
          tenant_id: 'tenant-1',
          type: NotificationType.LEAD_CREATED,
          priority: NotificationPriority.MEDIUM,
          recipient_user_id: 'user-1',
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.SENT,
          title: 'Lead Created',
          body: 'New lead',
          data: {},
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'notif-2',
          tenant_id: 'tenant-1',
          type: NotificationType.FOLLOW_UP_DUE,
          priority: NotificationPriority.HIGH,
          recipient_user_id: 'user-1',
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.DELIVERED,
          title: 'Follow-up Due',
          body: 'Follow-up is due today',
          data: {},
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockPool.query.mockResolvedValueOnce(Result.ok({ rows: notifications }));

      const result = await notificationService.getUnread('user-1', 'tenant-1');

      expect(result.length).toBe(2);
      expect(result[0].type).toBe(NotificationType.LEAD_CREATED);
      expect(result[1].type).toBe(NotificationType.FOLLOW_UP_DUE);
    });

    it('should return empty array on query failure', async () => {
      mockPool.query.mockResolvedValueOnce(Result.fail('Database error'));

      const result = await notificationService.getUnread('user-1', 'tenant-1');

      expect(result).toEqual([]);
    });
  });

  describe('getByUser', () => {
    it('should return notifications with default limit', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'notif-1',
              tenant_id: 'tenant-1',
              type: NotificationType.LEAD_CONVERTED,
              priority: NotificationPriority.HIGH,
              recipient_user_id: 'user-1',
              channel: NotificationChannel.IN_APP,
              status: NotificationStatus.READ,
              title: 'Lead Converted',
              body: 'Lead converted to customer',
              data: { leadId: 'lead-1' },
              action_url: '/leads/lead-1',
              metadata: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              read_at: new Date().toISOString(),
            },
          ],
        })
      );

      const result = await notificationService.getByUser('user-1', 'tenant-1');

      expect(result.length).toBe(1);
      expect(result[0].status).toBe(NotificationStatus.READ);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-1', 'tenant-1', 20]
      );
    });

    it('should respect custom limit', async () => {
      mockPool.query.mockResolvedValueOnce(Result.ok({ rows: [] }));

      await notificationService.getByUser('user-1', 'tenant-1', 5);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-1', 'tenant-1', 5]
      );
    });
  });
});

describe('createLeadNotification', () => {
  it('should create a notification input for lead events', () => {
    const result = createLeadNotification(
      NotificationType.LEAD_CREATED,
      'tenant-1',
      'user-1',
      {
        leadId: 'lead-123',
        companyName: 'Acme Corp',
      }
    );

    expect(result.tenantId).toBe('tenant-1');
    expect(result.type).toBe(NotificationType.LEAD_CREATED);
    expect(result.recipientUserId).toBe('user-1');
    expect(result.channels).toEqual([NotificationChannel.IN_APP]);
    expect(result.content.actionUrl).toBe('/leads/lead-123');
    expect(result.metadata?.companyName).toBe('Acme Corp');
  });

  it('should include status change metadata', () => {
    const result = createLeadNotification(
      NotificationType.LEAD_STATUS_CHANGED,
      'tenant-1',
      'user-1',
      {
        leadId: 'lead-123',
        companyName: 'Acme Corp',
        oldStatus: 'new',
        newStatus: 'contacted',
      }
    );

    expect(result.metadata?.oldStatus).toBe('new');
    expect(result.metadata?.newStatus).toBe('contacted');
  });

  it('should include score in metadata when provided', () => {
    const result = createLeadNotification(
      NotificationType.LEAD_SCORE_INCREASED,
      'tenant-1',
      'user-1',
      {
        leadId: 'lead-123',
        companyName: 'Acme Corp',
        score: 85,
      }
    );

    expect(result.metadata?.score).toBe(85);
  });
});
