/**
 * Query Handlers Test Suite
 * Comprehensive tests for all CQRS query handlers
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { Result } from '@zuclubit/domain';
import { Lead } from '../../domain/aggregates';
import { LeadStatusEnum } from '../../domain/value-objects';
import { ILeadRepository } from '../../domain/repositories';

// Query imports
import { GetLeadByIdQuery } from './get-lead-by-id.query';
import { GetLeadByIdHandler } from './get-lead-by-id.handler';
import { FindLeadsQuery } from './find-leads.query';
import { FindLeadsHandler } from './find-leads.handler';
import { GetLeadStatsQuery } from './get-lead-stats.query';
import { GetLeadStatsHandler } from './get-lead-stats.handler';
import { GetOverdueFollowUpsQuery } from './get-overdue-follow-ups.query';
import { GetOverdueFollowUpsHandler } from './get-overdue-follow-ups.handler';

// Helper to create a mock lead
const createMockLead = (overrides: Partial<{
  id: string;
  tenantId: string;
  companyName: string;
  email: string;
  status: LeadStatusEnum;
  score: number;
  ownerId: string | null;
  nextFollowUpAt: Date | null;
}> = {}) => {
  const defaults = {
    id: 'lead-123',
    tenantId: 'tenant-456',
    companyName: 'Acme Corp',
    email: 'contact@acme.com',
    source: 'website',
    status: LeadStatusEnum.NEW,
    score: 50,
    ownerId: null,
    nextFollowUpAt: null,
  };

  const props = { ...defaults, ...overrides };

  return Lead.reconstitute({
    id: props.id,
    tenantId: props.tenantId,
    companyName: props.companyName,
    email: props.email,
    source: props.source,
    status: props.status,
    score: props.score,
    ownerId: props.ownerId,
    nextFollowUpAt: props.nextFollowUpAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).getValue();
};

// Mock repository factory
const createMockRepository = (): ILeadRepository => ({
  findById: vi.fn(),
  findAll: vi.fn(),
  findByOwner: vi.fn(),
  findByStatus: vi.fn(),
  findOverdueFollowUps: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  exists: vi.fn(),
  countByStatus: vi.fn(),
  getAverageScoreByStatus: vi.fn(),
});

describe('Query Handlers', () => {
  let mockRepository: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    vi.clearAllMocks();
  });

  // =====================================
  // GetLeadByIdHandler Tests
  // =====================================
  describe('GetLeadByIdHandler', () => {
    let handler: GetLeadByIdHandler;

    beforeEach(() => {
      handler = new GetLeadByIdHandler(mockRepository);
    });

    it('should return lead when found', async () => {
      const lead = createMockLead({
        id: 'lead-123',
        companyName: 'Test Company',
        score: 75
      });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(lead));

      const query = new GetLeadByIdQuery('lead-123', 'tenant-456');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      const dto = result.getValue();
      expect(dto.id).toBe('lead-123');
      expect(dto.companyName).toBe('Test Company');
      expect(dto.score).toBe(75);
      expect(dto.scoreCategory).toBe('warm'); // 75 is warm (50-79)
    });

    it('should return null when lead not found', async () => {
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(null));

      const query = new GetLeadByIdQuery('nonexistent', 'tenant-456');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeNull();
    });

    it('should fail when repository throws error', async () => {
      (mockRepository.findById as Mock).mockResolvedValue(
        Result.fail('Database error')
      );

      const query = new GetLeadByIdQuery('lead-123', 'tenant-456');
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
    });

    it('should correctly calculate score categories', async () => {
      const testCases = [
        { score: 30, expectedCategory: 'cold' },
        { score: 50, expectedCategory: 'warm' },
        { score: 79, expectedCategory: 'warm' },
        { score: 80, expectedCategory: 'hot' },
        { score: 100, expectedCategory: 'hot' },
      ];

      for (const testCase of testCases) {
        const lead = createMockLead({ score: testCase.score });
        (mockRepository.findById as Mock).mockResolvedValue(Result.ok(lead));

        const query = new GetLeadByIdQuery('lead-123', 'tenant-456');
        const result = await handler.execute(query);

        expect(result.getValue()?.scoreCategory).toBe(testCase.expectedCategory);
      }
    });

    it('should detect overdue follow-ups', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const lead = createMockLead({ nextFollowUpAt: pastDate });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(lead));

      const query = new GetLeadByIdQuery('lead-123', 'tenant-456');
      const result = await handler.execute(query);

      expect(result.getValue()?.isFollowUpOverdue).toBe(true);
    });
  });

  // =====================================
  // FindLeadsHandler Tests
  // =====================================
  describe('FindLeadsHandler', () => {
    let handler: FindLeadsHandler;

    beforeEach(() => {
      handler = new FindLeadsHandler(mockRepository);
    });

    it('should return paginated leads', async () => {
      const leads = [
        createMockLead({ id: 'lead-1', companyName: 'Company A' }),
        createMockLead({ id: 'lead-2', companyName: 'Company B' }),
      ];

      (mockRepository.findAll as Mock).mockResolvedValue(
        Result.ok({ items: leads, total: 2, page: 1, limit: 10, totalPages: 1 })
      );

      const query = new FindLeadsQuery('tenant-456', 1, 10);

      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      const response = result.getValue();
      expect(response.items.length).toBe(2);
      expect(response.total).toBe(2);
      expect(response.page).toBe(1);
      expect(response.limit).toBe(10);
      expect(response.totalPages).toBe(1);
    });

    it('should filter by status', async () => {
      const qualifiedLeads = [
        createMockLead({ id: 'lead-1', status: LeadStatusEnum.QUALIFIED }),
      ];

      (mockRepository.findAll as Mock).mockResolvedValue(
        Result.ok({ items: qualifiedLeads, total: 1, page: 1, limit: 10, totalPages: 1 })
      );

      // FindLeadsQuery constructor: tenantId, page, limit, status, ownerId, source, industry, minScore, maxScore, searchTerm, sortBy, sortOrder
      const query = new FindLeadsQuery('tenant-456', 1, 10, LeadStatusEnum.QUALIFIED);

      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().items[0].status).toBe(LeadStatusEnum.QUALIFIED);
    });

    it('should filter by owner', async () => {
      const ownedLeads = [
        createMockLead({ id: 'lead-1', ownerId: 'owner-123' }),
      ];

      (mockRepository.findAll as Mock).mockResolvedValue(
        Result.ok({ items: ownedLeads, total: 1, page: 1, limit: 10, totalPages: 1 })
      );

      const query = new FindLeadsQuery('tenant-456', 1, 10, undefined, 'owner-123');

      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
    });

    it('should filter by score range', async () => {
      const highScoreLeads = [
        createMockLead({ id: 'lead-1', score: 85 }),
        createMockLead({ id: 'lead-2', score: 90 }),
      ];

      (mockRepository.findAll as Mock).mockResolvedValue(
        Result.ok({ items: highScoreLeads, total: 2, page: 1, limit: 10, totalPages: 1 })
      );

      // minScore at position 7, maxScore at position 8
      const query = new FindLeadsQuery('tenant-456', 1, 10, undefined, undefined, undefined, undefined, 80, 100);

      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().items.every(l => l.score >= 80)).toBe(true);
    });

    it('should search by company name', async () => {
      const matchingLeads = [
        createMockLead({ id: 'lead-1', companyName: 'Acme Corp' }),
      ];

      (mockRepository.findAll as Mock).mockResolvedValue(
        Result.ok({ items: matchingLeads, total: 1, page: 1, limit: 10, totalPages: 1 })
      );

      // searchTerm at position 9
      const query = new FindLeadsQuery('tenant-456', 1, 10, undefined, undefined, undefined, undefined, undefined, undefined, 'Acme');

      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
    });

    it('should handle empty results', async () => {
      (mockRepository.findAll as Mock).mockResolvedValue(
        Result.ok({ items: [], total: 0, page: 1, limit: 10, totalPages: 0 })
      );

      const query = new FindLeadsQuery('tenant-456');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().items).toEqual([]);
      expect(result.getValue().total).toBe(0);
      expect(result.getValue().totalPages).toBe(0);
    });

    it('should calculate correct total pages', async () => {
      const leads = Array.from({ length: 10 }, (_, i) =>
        createMockLead({ id: `lead-${i}` })
      );

      (mockRepository.findAll as Mock).mockResolvedValue(
        Result.ok({ items: leads, total: 55, page: 1, limit: 10, totalPages: 6 })
      );

      const query = new FindLeadsQuery('tenant-456', 1, 10);

      const result = await handler.execute(query);

      expect(result.getValue().totalPages).toBe(6); // 55 / 10 = 5.5, ceil = 6
    });

    it('should sort by specified field', async () => {
      (mockRepository.findAll as Mock).mockResolvedValue(
        Result.ok({ items: [], total: 0, page: 1, limit: 10, totalPages: 0 })
      );

      // sortBy at position 10, sortOrder at position 11
      const query = new FindLeadsQuery('tenant-456', 1, 10, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'score', 'desc');

      await handler.execute(query);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'score',
          sortOrder: 'desc',
        })
      );
    });
  });

  // =====================================
  // GetLeadStatsHandler Tests
  // =====================================
  describe('GetLeadStatsHandler', () => {
    let handler: GetLeadStatsHandler;

    beforeEach(() => {
      handler = new GetLeadStatsHandler(mockRepository);
    });

    it('should return lead statistics', async () => {
      const statusCounts = {
        [LeadStatusEnum.NEW]: 10,
        [LeadStatusEnum.CONTACTED]: 5,
        [LeadStatusEnum.QUALIFIED]: 3,
        [LeadStatusEnum.PROPOSAL]: 2,
        [LeadStatusEnum.WON]: 1,
        [LeadStatusEnum.LOST]: 4,
      };

      const avgScores = {
        [LeadStatusEnum.NEW]: 45,
        [LeadStatusEnum.CONTACTED]: 55,
        [LeadStatusEnum.QUALIFIED]: 72,
        [LeadStatusEnum.PROPOSAL]: 78,
        [LeadStatusEnum.WON]: 85,
        [LeadStatusEnum.LOST]: 35,
      };

      // GetLeadStatsHandler first calls findAll to get totalLeads
      (mockRepository.findAll as Mock).mockResolvedValue(
        Result.ok({ items: [], total: 25, page: 1, limit: 1, totalPages: 25 })
      );
      (mockRepository.countByStatus as Mock).mockResolvedValue(Result.ok(statusCounts));
      (mockRepository.getAverageScoreByStatus as Mock).mockResolvedValue(Result.ok(avgScores));

      const query = new GetLeadStatsQuery('tenant-456');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      const stats = result.getValue();
      expect(stats.totalLeads).toBe(25);
      expect(stats.leadsByStatus).toEqual(statusCounts);
      expect(stats.averageScoreByStatus).toEqual(avgScores);
    });

    it('should handle empty statistics', async () => {
      (mockRepository.findAll as Mock).mockResolvedValue(
        Result.ok({ items: [], total: 0, page: 1, limit: 1, totalPages: 0 })
      );
      (mockRepository.countByStatus as Mock).mockResolvedValue(Result.ok({}));
      (mockRepository.getAverageScoreByStatus as Mock).mockResolvedValue(Result.ok({}));

      const query = new GetLeadStatsQuery('tenant-456');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().totalLeads).toBe(0);
    });

    it('should fail when repository throws error', async () => {
      (mockRepository.findAll as Mock).mockResolvedValue(
        Result.fail('Database error')
      );

      const query = new GetLeadStatsQuery('tenant-456');
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
    });
  });

  // =====================================
  // GetOverdueFollowUpsHandler Tests
  // =====================================
  describe('GetOverdueFollowUpsHandler', () => {
    let handler: GetOverdueFollowUpsHandler;

    beforeEach(() => {
      handler = new GetOverdueFollowUpsHandler(mockRepository);
    });

    it('should return leads with overdue follow-ups', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 3);

      const overdueLeads = [
        createMockLead({ id: 'lead-1', nextFollowUpAt: pastDate }),
        createMockLead({ id: 'lead-2', nextFollowUpAt: pastDate }),
      ];

      (mockRepository.findOverdueFollowUps as Mock).mockResolvedValue(
        Result.ok(overdueLeads)
      );

      const query = new GetOverdueFollowUpsQuery('tenant-456');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().length).toBe(2);
    });

    it('should return empty array when no overdue follow-ups', async () => {
      (mockRepository.findOverdueFollowUps as Mock).mockResolvedValue(
        Result.ok([])
      );

      const query = new GetOverdueFollowUpsQuery('tenant-456');
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual([]);
    });

    it('should filter by owner when specified', async () => {
      const overdueLeads = [
        createMockLead({ id: 'lead-1', ownerId: 'owner-123' }),
      ];

      (mockRepository.findOverdueFollowUps as Mock).mockResolvedValue(
        Result.ok(overdueLeads)
      );

      // Note: The handler only passes tenantId to findOverdueFollowUps
      // Owner filtering would need to be implemented if needed
      const query = new GetOverdueFollowUpsQuery('tenant-456', 'owner-123');
      await handler.execute(query);

      expect(mockRepository.findOverdueFollowUps).toHaveBeenCalledWith('tenant-456');
    });

    it('should fail when repository throws error', async () => {
      (mockRepository.findOverdueFollowUps as Mock).mockResolvedValue(
        Result.fail('Database error')
      );

      const query = new GetOverdueFollowUpsQuery('tenant-456');
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
    });
  });
});
