import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from '@zuclubit/domain';
import { CommunicationService } from './communication.service';
import {
  CommunicationType,
  CommunicationDirection,
  CommunicationStatus,
  CallOutcome,
} from './types';

// Mock DatabasePool
const mockQuery = vi.fn();
const mockPool = {
  query: mockQuery,
};

describe('CommunicationService', () => {
  let communicationService: CommunicationService;

  beforeEach(() => {
    vi.clearAllMocks();
    communicationService = new CommunicationService(mockPool as any);
  });

  describe('logCommunication', () => {
    it('should log a call communication successfully', async () => {
      // Mock lead existence check
      mockQuery.mockResolvedValueOnce(
        Result.ok({ rows: [{ '?column?': 1 }] })
      );

      // Mock communication insert
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: '123',
              lead_id: 'lead-123',
              contact_id: null,
              tenant_id: 'tenant-123',
              communication_type: 'call',
              direction: 'outbound',
              status: 'completed',
              subject: 'Sales call',
              body: null,
              summary: 'Discussed pricing',
              scheduled_at: null,
              occurred_at: new Date(),
              completed_at: new Date(),
              duration: 300,
              created_by: 'user-123',
              assigned_to: null,
              call_details: JSON.stringify({ phoneNumber: '+1234567890', outcome: 'connected' }),
              email_details: null,
              meeting_details: null,
              participants: '[]',
              attachments: '[]',
              tags: [],
              metadata: '{}',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
      );

      // Mock lead activity update
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await communicationService.logCommunication(
        'tenant-123',
        {
          leadId: 'lead-123',
          type: CommunicationType.CALL,
          direction: CommunicationDirection.OUTBOUND,
          subject: 'Sales call',
          summary: 'Discussed pricing',
          duration: 300,
          callDetails: {
            phoneNumber: '+1234567890',
            outcome: CallOutcome.CONNECTED,
          },
        },
        'user-123'
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().type).toBe('call');
      expect(result.getValue().direction).toBe('outbound');
    });

    it('should fail if lead does not exist', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await communicationService.logCommunication(
        'tenant-123',
        {
          leadId: 'lead-123',
          type: CommunicationType.CALL,
          direction: CommunicationDirection.OUTBOUND,
        },
        'user-123'
      );

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Lead not found');
    });

    it('should log an email communication', async () => {
      // Mock lead existence
      mockQuery.mockResolvedValueOnce(
        Result.ok({ rows: [{ '?column?': 1 }] })
      );

      // Mock insert
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: '123',
              lead_id: 'lead-123',
              contact_id: null,
              tenant_id: 'tenant-123',
              communication_type: 'email',
              direction: 'outbound',
              status: 'completed',
              subject: 'Follow-up email',
              body: 'Thank you for your time...',
              summary: null,
              scheduled_at: null,
              occurred_at: new Date(),
              completed_at: new Date(),
              duration: null,
              created_by: 'user-123',
              assigned_to: null,
              call_details: null,
              email_details: JSON.stringify({
                subject: 'Follow-up',
                from: 'sales@company.com',
                to: ['lead@example.com'],
                status: 'sent',
              }),
              meeting_details: null,
              participants: '[]',
              attachments: '[]',
              tags: [],
              metadata: '{}',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
      );

      // Mock lead activity update
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await communicationService.logCommunication(
        'tenant-123',
        {
          leadId: 'lead-123',
          type: CommunicationType.EMAIL,
          direction: CommunicationDirection.OUTBOUND,
          subject: 'Follow-up email',
          body: 'Thank you for your time...',
        },
        'user-123'
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().type).toBe('email');
    });
  });

  describe('getCommunicationById', () => {
    it('should return communication when found', async () => {
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: '123',
              lead_id: 'lead-123',
              contact_id: null,
              tenant_id: 'tenant-123',
              communication_type: 'call',
              direction: 'outbound',
              status: 'completed',
              subject: 'Sales call',
              body: null,
              summary: 'Good conversation',
              scheduled_at: null,
              occurred_at: new Date(),
              completed_at: new Date(),
              duration: 300,
              created_by: 'user-123',
              assigned_to: null,
              call_details: null,
              email_details: null,
              meeting_details: null,
              participants: '[]',
              attachments: '[]',
              tags: [],
              metadata: '{}',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
      );

      const result = await communicationService.getCommunicationById(
        '123',
        'tenant-123'
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()?.id).toBe('123');
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await communicationService.getCommunicationById(
        '123',
        'tenant-123'
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeNull();
    });
  });

  describe('getCommunicationsByLead', () => {
    it('should return paginated communications', async () => {
      // Mock count
      mockQuery.mockResolvedValueOnce(
        Result.ok({ rows: [{ total: '5' }] })
      );

      // Mock data
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: '123',
              lead_id: 'lead-123',
              contact_id: null,
              tenant_id: 'tenant-123',
              communication_type: 'call',
              direction: 'outbound',
              status: 'completed',
              subject: 'Call 1',
              body: null,
              summary: null,
              scheduled_at: null,
              occurred_at: new Date(),
              completed_at: new Date(),
              duration: 300,
              created_by: 'user-123',
              assigned_to: null,
              call_details: null,
              email_details: null,
              meeting_details: null,
              participants: '[]',
              attachments: '[]',
              tags: [],
              metadata: '{}',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
      );

      const result = await communicationService.getCommunicationsByLead(
        'lead-123',
        'tenant-123',
        { page: 1, limit: 10 }
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().total).toBe(5);
      expect(result.getValue().items.length).toBe(1);
    });

    it('should filter by communication type', async () => {
      // Mock count
      mockQuery.mockResolvedValueOnce(
        Result.ok({ rows: [{ total: '2' }] })
      );

      // Mock data
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: '123',
              lead_id: 'lead-123',
              contact_id: null,
              tenant_id: 'tenant-123',
              communication_type: 'email',
              direction: 'outbound',
              status: 'completed',
              subject: 'Email 1',
              body: null,
              summary: null,
              scheduled_at: null,
              occurred_at: new Date(),
              completed_at: new Date(),
              duration: null,
              created_by: 'user-123',
              assigned_to: null,
              call_details: null,
              email_details: null,
              meeting_details: null,
              participants: '[]',
              attachments: '[]',
              tags: [],
              metadata: '{}',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
      );

      const result = await communicationService.getCommunicationsByLead(
        'lead-123',
        'tenant-123',
        { type: CommunicationType.EMAIL }
      );

      expect(result.isSuccess).toBe(true);
    });
  });

  describe('getTimeline', () => {
    it('should return timeline entries', async () => {
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: '123',
              communication_type: 'call',
              direction: 'outbound',
              status: 'completed',
              subject: 'Sales call',
              summary: 'Good conversation',
              occurred_at: new Date(),
              created_by: 'user-123',
              duration: 300,
              contact_name: 'John Doe',
            },
            {
              id: '124',
              communication_type: 'email',
              direction: 'outbound',
              status: 'completed',
              subject: 'Follow-up email',
              summary: null,
              occurred_at: new Date(),
              created_by: 'user-123',
              duration: null,
              contact_name: null,
            },
          ],
        })
      );

      const result = await communicationService.getTimeline(
        'lead-123',
        'tenant-123',
        50
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().length).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return communication statistics', async () => {
      // Mock type counts
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            { communication_type: 'call', count: '10' },
            { communication_type: 'email', count: '5' },
          ],
        })
      );

      // Mock direction counts
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            { direction: 'outbound', count: '12' },
            { direction: 'inbound', count: '3' },
          ],
        })
      );

      // Mock status counts
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            { status: 'completed', count: '14' },
            { status: 'scheduled', count: '1' },
          ],
        })
      );

      // Mock call stats
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [{ avg_duration: '240', total_duration: '2400' }],
        })
      );

      // Mock dates
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              last_communication: new Date().toISOString(),
              next_scheduled: null,
            },
          ],
        })
      );

      const result = await communicationService.getStats(
        'lead-123',
        'tenant-123'
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().total).toBe(15);
      expect(result.getValue().byType.call).toBe(10);
      expect(result.getValue().byType.email).toBe(5);
      expect(result.getValue().averageCallDuration).toBe(240);
    });
  });

  describe('scheduleFollowUp', () => {
    it('should schedule a follow-up communication', async () => {
      const scheduledAt = new Date(Date.now() + 86400000); // Tomorrow

      // Mock lead existence
      mockQuery.mockResolvedValueOnce(
        Result.ok({ rows: [{ '?column?': 1 }] })
      );

      // Mock insert
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: '123',
              lead_id: 'lead-123',
              contact_id: null,
              tenant_id: 'tenant-123',
              communication_type: 'call',
              direction: 'outbound',
              status: 'scheduled',
              subject: 'Follow-up call',
              body: null,
              summary: null,
              scheduled_at: scheduledAt,
              occurred_at: new Date(),
              completed_at: null,
              duration: null,
              created_by: 'user-123',
              assigned_to: 'user-456',
              call_details: null,
              email_details: null,
              meeting_details: null,
              participants: '[]',
              attachments: '[]',
              tags: [],
              metadata: '{}',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
      );

      // Mock lead activity update
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await communicationService.scheduleFollowUp(
        'lead-123',
        'tenant-123',
        {
          type: CommunicationType.CALL,
          scheduledAt,
          subject: 'Follow-up call',
          assignedTo: 'user-456',
        },
        'user-123'
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().status).toBe('scheduled');
    });
  });

  describe('updateCommunication', () => {
    it('should update communication status', async () => {
      // Mock get existing
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: '123',
              lead_id: 'lead-123',
              contact_id: null,
              tenant_id: 'tenant-123',
              communication_type: 'call',
              direction: 'outbound',
              status: 'scheduled',
              subject: 'Scheduled call',
              body: null,
              summary: null,
              scheduled_at: new Date(),
              occurred_at: new Date(),
              completed_at: null,
              duration: null,
              created_by: 'user-123',
              assigned_to: null,
              call_details: null,
              email_details: null,
              meeting_details: null,
              participants: '[]',
              attachments: '[]',
              tags: [],
              metadata: '{}',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
      );

      // Mock update
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: '123',
              lead_id: 'lead-123',
              contact_id: null,
              tenant_id: 'tenant-123',
              communication_type: 'call',
              direction: 'outbound',
              status: 'completed',
              subject: 'Scheduled call',
              body: null,
              summary: 'Great call, prospect is interested',
              scheduled_at: new Date(),
              occurred_at: new Date(),
              completed_at: new Date(),
              duration: 450,
              created_by: 'user-123',
              assigned_to: null,
              call_details: null,
              email_details: null,
              meeting_details: null,
              participants: '[]',
              attachments: '[]',
              tags: [],
              metadata: '{}',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
      );

      // Mock lead activity update
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await communicationService.updateCommunication(
        '123',
        'tenant-123',
        {
          status: CommunicationStatus.COMPLETED,
          summary: 'Great call, prospect is interested',
          duration: 450,
        },
        'user-123'
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().status).toBe('completed');
    });
  });

  describe('deleteCommunication', () => {
    it('should delete communication', async () => {
      mockQuery.mockResolvedValueOnce(
        Result.ok({ rows: [{ lead_id: 'lead-123' }] })
      );

      const result = await communicationService.deleteCommunication(
        '123',
        'tenant-123',
        'user-123'
      );

      expect(result.isSuccess).toBe(true);
    });

    it('should fail when communication not found', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await communicationService.deleteCommunication(
        '123',
        'tenant-123',
        'user-123'
      );

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Communication not found');
    });
  });

  describe('getUpcomingCommunications', () => {
    it('should return upcoming scheduled communications', async () => {
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: '123',
              lead_id: 'lead-123',
              contact_id: null,
              tenant_id: 'tenant-123',
              communication_type: 'call',
              direction: 'outbound',
              status: 'scheduled',
              subject: 'Follow-up call',
              body: null,
              summary: null,
              scheduled_at: new Date(Date.now() + 86400000),
              occurred_at: new Date(),
              completed_at: null,
              duration: null,
              created_by: 'user-123',
              assigned_to: 'user-123',
              call_details: null,
              email_details: null,
              meeting_details: null,
              participants: '[]',
              attachments: '[]',
              tags: [],
              metadata: '{}',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
      );

      const result = await communicationService.getUpcomingCommunications(
        'tenant-123',
        'user-123',
        7
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().length).toBe(1);
    });
  });

  describe('getOverdueCommunications', () => {
    it('should return overdue scheduled communications', async () => {
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: '123',
              lead_id: 'lead-123',
              contact_id: null,
              tenant_id: 'tenant-123',
              communication_type: 'call',
              direction: 'outbound',
              status: 'scheduled',
              subject: 'Overdue call',
              body: null,
              summary: null,
              scheduled_at: new Date(Date.now() - 86400000),
              occurred_at: new Date(),
              completed_at: null,
              duration: null,
              created_by: 'user-123',
              assigned_to: null,
              call_details: null,
              email_details: null,
              meeting_details: null,
              participants: '[]',
              attachments: '[]',
              tags: [],
              metadata: '{}',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
      );

      const result = await communicationService.getOverdueCommunications(
        'tenant-123'
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().length).toBe(1);
    });
  });
});
