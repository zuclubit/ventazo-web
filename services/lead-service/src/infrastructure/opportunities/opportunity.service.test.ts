/**
 * Opportunity Service Tests
 */
import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from '@zuclubit/domain';
import { OpportunityService } from './opportunity.service';
import { OpportunityStatus, OpportunitySource } from './types';

// Mock the database pool
const mockQuery = vi.fn();
const mockPool = {
  query: mockQuery,
};

describe('OpportunityService', () => {
  let service: OpportunityService;
  const tenantId = 'test-tenant-id';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OpportunityService(mockPool as any);
  });

  describe('createOpportunity', () => {
    it('should create an opportunity successfully', async () => {
      const opportunityRow = {
        id: 'opp-123',
        tenant_id: tenantId,
        lead_id: 'lead-123',
        name: 'Enterprise Deal',
        description: 'Large enterprise opportunity',
        status: 'open',
        stage: 'qualification',
        amount: 50000,
        currency: 'USD',
        probability: 50,
        owner_id: 'user-123',
        expected_close_date: '2025-03-01T00:00:00Z',
        source: 'lead_conversion',
        tags: '[]',
        metadata: '{}',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [opportunityRow] }));

      const result = await service.createOpportunity(tenantId, {
        leadId: 'lead-123',
        name: 'Enterprise Deal',
        description: 'Large enterprise opportunity',
        stage: 'qualification',
        amount: 50000,
        ownerId: 'user-123',
        expectedCloseDate: new Date('2025-03-01'),
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().name).toBe('Enterprise Deal');
      expect(result.getValue().amount).toBe(50000);
      expect(result.getValue().status).toBe(OpportunityStatus.OPEN);
    });

    it('should return failure when database error occurs', async () => {
      mockQuery.mockResolvedValueOnce(Result.fail('Database error'));

      const result = await service.createOpportunity(tenantId, {
        name: 'Test Deal',
        stage: 'qualification',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database error');
    });
  });

  describe('getOpportunityById', () => {
    it('should get opportunity by id', async () => {
      const opportunityRow = {
        id: 'opp-123',
        tenant_id: tenantId,
        name: 'Enterprise Deal',
        status: 'open',
        stage: 'proposal',
        amount: 75000,
        currency: 'USD',
        probability: 70,
        tags: '["enterprise", "high-value"]',
        metadata: '{}',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
        task_count: '3',
        is_overdue: false,
      };

      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [opportunityRow] }));

      const result = await service.getOpportunityById(tenantId, 'opp-123');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().id).toBe('opp-123');
      expect(result.getValue().stage).toBe('proposal');
      expect(result.getValue().probability).toBe(70);
      expect(result.getValue().tags).toEqual(['enterprise', 'high-value']);
    });

    it('should return failure when opportunity not found', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await service.getOpportunityById(tenantId, 'nonexistent');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Opportunity not found');
    });
  });

  describe('getOpportunities', () => {
    it('should get opportunities with filters', async () => {
      const opportunityRows = [
        {
          id: 'opp-1',
          tenant_id: tenantId,
          name: 'Deal 1',
          status: 'open',
          stage: 'proposal',
          amount: 50000,
          currency: 'USD',
          probability: 60,
          tags: '[]',
          metadata: '{}',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-15T00:00:00Z',
          task_count: '2',
          is_overdue: false,
          weighted_amount: '30000',
        },
        {
          id: 'opp-2',
          tenant_id: tenantId,
          name: 'Deal 2',
          status: 'open',
          stage: 'negotiation',
          amount: 100000,
          currency: 'USD',
          probability: 80,
          tags: '[]',
          metadata: '{}',
          created_at: '2025-01-02T00:00:00Z',
          updated_at: '2025-01-16T00:00:00Z',
          task_count: '5',
          is_overdue: false,
          weighted_amount: '80000',
        },
      ];

      mockQuery
        .mockResolvedValueOnce(Result.ok({ rows: [{ total: '2' }] })) // Count query
        .mockResolvedValueOnce(Result.ok({ rows: opportunityRows })); // Data query

      const result = await service.getOpportunities(
        tenantId,
        { status: OpportunityStatus.OPEN },
        { sortBy: 'amount', sortOrder: 'desc' },
        1,
        10
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().opportunities).toHaveLength(2);
      expect(result.getValue().total).toBe(2);
      expect(result.getValue().page).toBe(1);
    });
  });

  describe('updateOpportunity', () => {
    it('should update opportunity successfully', async () => {
      const existingOpportunity = {
        id: 'opp-123',
        tenant_id: tenantId,
        name: 'Original Deal',
        status: 'open',
        stage: 'qualification',
        amount: 50000,
        currency: 'USD',
        probability: 50,
        tags: '[]',
        metadata: '{}',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const updatedOpportunity = {
        ...existingOpportunity,
        name: 'Updated Deal',
        stage: 'proposal',
        amount: 75000,
        probability: 70,
        updated_at: '2025-01-15T00:00:00Z',
      };

      mockQuery
        .mockResolvedValueOnce(Result.ok({ rows: [existingOpportunity] })) // getOpportunityById check
        .mockResolvedValueOnce(Result.ok({ rows: [updatedOpportunity] })); // update query

      const result = await service.updateOpportunity(tenantId, 'opp-123', {
        name: 'Updated Deal',
        stage: 'proposal',
        amount: 75000,
        probability: 70,
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().name).toBe('Updated Deal');
      expect(result.getValue().stage).toBe('proposal');
      expect(result.getValue().amount).toBe(75000);
    });

    it('should return failure when opportunity not found', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await service.updateOpportunity(tenantId, 'nonexistent', {
        name: 'New Name',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Opportunity not found');
    });

    it('should return failure when no fields to update', async () => {
      const existingOpportunity = {
        id: 'opp-123',
        tenant_id: tenantId,
        name: 'Deal',
        status: 'open',
        stage: 'qualification',
        currency: 'USD',
        probability: 50,
        tags: '[]',
        metadata: '{}',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [existingOpportunity] }));

      const result = await service.updateOpportunity(tenantId, 'opp-123', {});

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('No fields to update');
    });
  });

  describe('winOpportunity', () => {
    it('should mark opportunity as won', async () => {
      const wonOpportunity = {
        id: 'opp-123',
        tenant_id: tenantId,
        name: 'Won Deal',
        status: 'won',
        stage: 'closed_won',
        amount: 100000,
        currency: 'USD',
        probability: 100,
        won_reason: 'Best proposal',
        actual_close_date: '2025-01-20T00:00:00Z',
        tags: '[]',
        metadata: '{}',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-20T00:00:00Z',
      };

      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [wonOpportunity] }));

      const result = await service.winOpportunity(tenantId, 'opp-123', {
        wonReason: 'Best proposal',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().status).toBe(OpportunityStatus.WON);
      expect(result.getValue().stage).toBe('closed_won');
      expect(result.getValue().probability).toBe(100);
    });

    it('should return failure when opportunity not found or already closed', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await service.winOpportunity(tenantId, 'opp-123', {});

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Opportunity not found or already closed');
    });
  });

  describe('loseOpportunity', () => {
    it('should mark opportunity as lost', async () => {
      const lostOpportunity = {
        id: 'opp-123',
        tenant_id: tenantId,
        name: 'Lost Deal',
        status: 'lost',
        stage: 'closed_lost',
        amount: 50000,
        currency: 'USD',
        probability: 0,
        lost_reason: 'Price too high',
        competitor_id: 'comp-123',
        actual_close_date: '2025-01-20T00:00:00Z',
        tags: '[]',
        metadata: '{}',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-20T00:00:00Z',
      };

      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [lostOpportunity] }));

      const result = await service.loseOpportunity(tenantId, 'opp-123', {
        lostReason: 'Price too high',
        competitorId: 'comp-123',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().status).toBe(OpportunityStatus.LOST);
      expect(result.getValue().stage).toBe('closed_lost');
      expect(result.getValue().probability).toBe(0);
      expect(result.getValue().lostReason).toBe('Price too high');
    });
  });

  describe('reopenOpportunity', () => {
    it('should reopen a closed opportunity', async () => {
      const reopenedOpportunity = {
        id: 'opp-123',
        tenant_id: tenantId,
        name: 'Reopened Deal',
        status: 'open',
        stage: 'proposal',
        amount: 50000,
        currency: 'USD',
        probability: 50,
        tags: '[]',
        metadata: '{}',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-25T00:00:00Z',
      };

      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [reopenedOpportunity] }));

      const result = await service.reopenOpportunity(tenantId, 'opp-123', 'proposal');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().status).toBe(OpportunityStatus.OPEN);
      expect(result.getValue().stage).toBe('proposal');
    });

    it('should return failure when opportunity not closed', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await service.reopenOpportunity(tenantId, 'opp-123');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Opportunity not found or not closed');
    });
  });

  describe('deleteOpportunity', () => {
    it('should delete opportunity successfully', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [{ id: 'opp-123' }] }));

      const result = await service.deleteOpportunity(tenantId, 'opp-123');

      expect(result.isSuccess).toBe(true);
    });

    it('should return failure when opportunity not found', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await service.deleteOpportunity(tenantId, 'nonexistent');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Opportunity not found');
    });
  });

  describe('getOpportunityStatistics', () => {
    it('should get opportunity statistics', async () => {
      const statsRow = {
        total: '100',
        open_count: '60',
        won_count: '30',
        lost_count: '8',
        on_hold_count: '2',
        total_value: '1500000',
        weighted_value: '900000',
        avg_deal_size: '50000',
        win_rate: '78.95',
        avg_time_to_close: '45',
        closing_this_month: '10',
        closing_this_quarter: '25',
        overdue_count: '5',
      };

      const stageRows = [
        { stage: 'qualification', count: '20' },
        { stage: 'proposal', count: '25' },
        { stage: 'negotiation', count: '15' },
      ];

      mockQuery
        .mockResolvedValueOnce(Result.ok({ rows: [statsRow] }))
        .mockResolvedValueOnce(Result.ok({ rows: stageRows }));

      const result = await service.getOpportunityStatistics(tenantId);

      expect(result.isSuccess).toBe(true);
      const stats = result.getValue();
      expect(stats.total).toBe(100);
      expect(stats.byStatus.open).toBe(60);
      expect(stats.byStatus.won).toBe(30);
      expect(stats.totalValue).toBe(1500000);
      expect(stats.weightedValue).toBe(900000);
      expect(stats.winRate).toBeCloseTo(78.95);
      expect(stats.byStage['qualification']).toBe(20);
      expect(stats.byStage['proposal']).toBe(25);
    });
  });

  describe('getPipelineForecast', () => {
    it('should get pipeline forecast', async () => {
      const forecastRows = [
        {
          period: '2025-01',
          open_opportunities: '10',
          total_value: '500000',
          weighted_value: '300000',
          expected_closes: '5',
          expected_value: '250000',
        },
        {
          period: '2025-02',
          open_opportunities: '8',
          total_value: '400000',
          weighted_value: '240000',
          expected_closes: '3',
          expected_value: '150000',
        },
      ];

      mockQuery.mockResolvedValueOnce(Result.ok({ rows: forecastRows }));

      const result = await service.getPipelineForecast(tenantId, 6);

      expect(result.isSuccess).toBe(true);
      const forecast = result.getValue();
      expect(forecast).toHaveLength(2);
      expect(forecast[0].period).toBe('2025-01');
      expect(forecast[0].totalValue).toBe(500000);
      expect(forecast[0].expectedCloses).toBe(5);
    });
  });

  describe('bulkOperation', () => {
    it('should perform bulk reassign operation', async () => {
      const updatedOpportunity = {
        id: 'opp-1',
        tenant_id: tenantId,
        name: 'Deal 1',
        status: 'open',
        stage: 'proposal',
        owner_id: 'new-owner',
        currency: 'USD',
        probability: 50,
        tags: '[]',
        metadata: '{}',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-20T00:00:00Z',
      };

      // For each opportunity, getOpportunityById is called first, then update
      mockQuery
        .mockResolvedValueOnce(Result.ok({ rows: [updatedOpportunity] })) // exists check for opp-1
        .mockResolvedValueOnce(Result.ok({ rows: [updatedOpportunity] })) // update opp-1
        .mockResolvedValueOnce(Result.ok({ rows: [{ ...updatedOpportunity, id: 'opp-2' }] })) // exists check for opp-2
        .mockResolvedValueOnce(Result.ok({ rows: [{ ...updatedOpportunity, id: 'opp-2' }] })); // update opp-2

      const result = await service.bulkOperation(tenantId, {
        opportunityIds: ['opp-1', 'opp-2'],
        action: 'reassign',
        ownerId: 'new-owner',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().successful).toHaveLength(2);
      expect(result.getValue().failed).toHaveLength(0);
    });

    it('should handle bulk operation failures', async () => {
      mockQuery
        .mockResolvedValueOnce(Result.ok({ rows: [] })) // opp-1 not found
        .mockResolvedValueOnce(Result.ok({ rows: [] })); // opp-2 not found

      const result = await service.bulkOperation(tenantId, {
        opportunityIds: ['opp-1', 'opp-2'],
        action: 'delete',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().successful).toHaveLength(0);
      expect(result.getValue().failed).toHaveLength(2);
    });

    it('should fail when required param is missing for reassign', async () => {
      const result = await service.bulkOperation(tenantId, {
        opportunityIds: ['opp-1'],
        action: 'reassign',
        // ownerId is missing
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().failed).toHaveLength(1);
      expect(result.getValue().failed[0].error).toContain('Owner ID required');
    });
  });

  describe('convertLeadToOpportunity', () => {
    it('should convert lead to opportunity', async () => {
      const leadRow = {
        id: 'lead-123',
        company_name: 'Acme Corp',
        first_name: 'John',
        last_name: 'Doe',
      };

      const opportunityRow = {
        id: 'opp-123',
        tenant_id: tenantId,
        lead_id: 'lead-123',
        name: 'Acme Corp Opportunity',
        status: 'open',
        stage: 'qualification',
        amount: 50000,
        currency: 'USD',
        probability: 50,
        source: 'lead_conversion',
        tags: '[]',
        metadata: '{}',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockQuery
        .mockResolvedValueOnce(Result.ok({ rows: [leadRow] })) // Lead lookup
        .mockResolvedValueOnce(Result.ok({ rows: [opportunityRow] })) // Create opportunity
        .mockResolvedValueOnce(Result.ok({ rows: [] })); // Update lead status

      const result = await service.convertLeadToOpportunity(tenantId, {
        leadId: 'lead-123',
        opportunityName: 'Acme Corp Opportunity',
        amount: 50000,
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().leadId).toBe('lead-123');
      expect(result.getValue().source).toBe('lead_conversion');
    });

    it('should return failure when lead not found', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await service.convertLeadToOpportunity(tenantId, {
        leadId: 'nonexistent',
        opportunityName: 'Test Opportunity',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Lead not found');
    });
  });

  describe('getOpportunitiesByEntity', () => {
    it('should get opportunities by lead', async () => {
      const opportunityRows = [
        {
          id: 'opp-1',
          tenant_id: tenantId,
          lead_id: 'lead-123',
          name: 'Deal 1',
          status: 'open',
          stage: 'proposal',
          amount: 50000,
          currency: 'USD',
          probability: 60,
          tags: '[]',
          metadata: '{}',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-15T00:00:00Z',
          is_overdue: false,
          weighted_amount: '30000',
        },
      ];

      mockQuery.mockResolvedValueOnce(Result.ok({ rows: opportunityRows }));

      const result = await service.getOpportunitiesByEntity(tenantId, 'lead', 'lead-123');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toHaveLength(1);
      expect(result.getValue()[0].leadId).toBe('lead-123');
    });

    it('should get opportunities by customer', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await service.getOpportunitiesByEntity(tenantId, 'customer', 'cust-123');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toHaveLength(0);
    });
  });
});
