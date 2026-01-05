/**
 * Command Handlers Test Suite
 * Comprehensive tests for all CQRS command handlers
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { Result } from '@zuclubit/domain';
import { Lead } from '../../domain/aggregates';
import { LeadStatusEnum } from '../../domain/value-objects';
import { ILeadRepository } from '../../domain/repositories';

// Command imports
import { CreateLeadCommand } from './create-lead.command';
import { CreateLeadHandler } from './create-lead.handler';
import { UpdateLeadCommand } from './update-lead.command';
import { UpdateLeadHandler } from './update-lead.handler';
import { ChangeLeadStatusCommand } from './change-lead-status.command';
import { ChangeLeadStatusHandler } from './change-lead-status.handler';
import { UpdateLeadScoreCommand } from './update-lead-score.command';
import { UpdateLeadScoreHandler } from './update-lead-score.handler';
import { AssignLeadCommand } from './assign-lead.command';
import { AssignLeadHandler } from './assign-lead.handler';
import { QualifyLeadCommand } from './qualify-lead.command';
import { QualifyLeadHandler } from './qualify-lead.handler';
import { ScheduleFollowUpCommand } from './schedule-follow-up.command';
import { ScheduleFollowUpHandler } from './schedule-follow-up.handler';
import { ConvertLeadCommand } from './convert-lead.command';
import { ConvertLeadHandler } from './convert-lead.handler';

// Helper to create a mock lead
const createMockLead = (overrides: Partial<{
  id: string;
  tenantId: string;
  companyName: string;
  email: string;
  status: LeadStatusEnum;
  score: number;
  ownerId: string | null;
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

describe('Command Handlers', () => {
  let mockRepository: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    vi.clearAllMocks();
  });

  // =====================================
  // CreateLeadHandler Tests
  // =====================================
  describe('CreateLeadHandler', () => {
    let handler: CreateLeadHandler;

    beforeEach(() => {
      handler = new CreateLeadHandler(mockRepository);
    });

    it('should create a lead successfully with required fields', async () => {
      (mockRepository.save as Mock).mockResolvedValue(Result.ok(undefined));

      const command = new CreateLeadCommand(
        'tenant-123',
        'New Company',
        'new@company.com',
        'referral'
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().leadId).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should create a lead with all optional fields', async () => {
      (mockRepository.save as Mock).mockResolvedValue(Result.ok(undefined));

      const command = new CreateLeadCommand(
        'tenant-123',
        'Full Company',
        'full@company.com',
        'website',
        '+1234567890',
        'https://company.com',
        'Technology',
        100,
        1000000,
        'Important lead',
        { priority: 'high' }
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should fail when company name is empty', async () => {
      const command = new CreateLeadCommand(
        'tenant-123',
        '',
        'test@company.com',
        'website'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error?.toLowerCase()).toContain('company name');
    });

    it('should fail when email is invalid', async () => {
      const command = new CreateLeadCommand(
        'tenant-123',
        'Company',
        'invalid-email',
        'website'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('email');
    });

    it('should fail when repository save fails', async () => {
      (mockRepository.save as Mock).mockResolvedValue(
        Result.fail('Database connection error')
      );

      const command = new CreateLeadCommand(
        'tenant-123',
        'Company',
        'test@company.com',
        'website'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database connection error');
    });
  });

  // =====================================
  // UpdateLeadHandler Tests
  // =====================================
  describe('UpdateLeadHandler', () => {
    let handler: UpdateLeadHandler;

    beforeEach(() => {
      handler = new UpdateLeadHandler(mockRepository);
    });

    it('should update lead successfully', async () => {
      const existingLead = createMockLead();
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(existingLead));
      (mockRepository.save as Mock).mockResolvedValue(Result.ok(undefined));

      const command = new UpdateLeadCommand(
        'lead-123',
        'tenant-456',
        'Updated Company',
        'updated@company.com'
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should fail when lead not found', async () => {
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(null));

      const command = new UpdateLeadCommand(
        'nonexistent',
        'tenant-456',
        'Company'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('not found');
    });

    it('should fail when updating closed lead', async () => {
      const closedLead = createMockLead({ status: LeadStatusEnum.WON });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(closedLead));

      const command = new UpdateLeadCommand(
        'lead-123',
        'tenant-456',
        'Updated Company'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
    });

    it('should partially update lead', async () => {
      const existingLead = createMockLead();
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(existingLead));
      (mockRepository.save as Mock).mockResolvedValue(Result.ok(undefined));

      const command = new UpdateLeadCommand(
        'lead-123',
        'tenant-456',
        undefined,
        undefined,
        undefined,
        undefined,
        'New Industry'
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
    });
  });

  // =====================================
  // ChangeLeadStatusHandler Tests
  // =====================================
  describe('ChangeLeadStatusHandler', () => {
    let handler: ChangeLeadStatusHandler;

    beforeEach(() => {
      handler = new ChangeLeadStatusHandler(mockRepository);
    });

    it('should change status through valid transition', async () => {
      const lead = createMockLead({ status: LeadStatusEnum.NEW });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(lead));
      (mockRepository.save as Mock).mockResolvedValue(Result.ok(undefined));

      const command = new ChangeLeadStatusCommand(
        'lead-123',
        'tenant-456',
        LeadStatusEnum.CONTACTED,
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should fail for invalid status transition', async () => {
      const lead = createMockLead({ status: LeadStatusEnum.NEW });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(lead));

      const command = new ChangeLeadStatusCommand(
        'lead-123',
        'tenant-456',
        LeadStatusEnum.WON, // Invalid: can't go from NEW to WON directly
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
    });

    it('should not allow transition from closed status', async () => {
      const closedLead = createMockLead({ status: LeadStatusEnum.LOST });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(closedLead));

      const command = new ChangeLeadStatusCommand(
        'lead-123',
        'tenant-456',
        LeadStatusEnum.NEW,
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
    });

    it('should allow full lifecycle: NEW → CONTACTED → QUALIFIED → PROPOSAL → NEGOTIATION → WON', async () => {
      const transitions = [
        { from: LeadStatusEnum.NEW, to: LeadStatusEnum.CONTACTED },
        { from: LeadStatusEnum.CONTACTED, to: LeadStatusEnum.QUALIFIED },
        { from: LeadStatusEnum.QUALIFIED, to: LeadStatusEnum.PROPOSAL },
        { from: LeadStatusEnum.PROPOSAL, to: LeadStatusEnum.NEGOTIATION },
        { from: LeadStatusEnum.NEGOTIATION, to: LeadStatusEnum.WON },
      ];

      for (const transition of transitions) {
        const lead = createMockLead({ status: transition.from });
        (mockRepository.findById as Mock).mockResolvedValue(Result.ok(lead));
        (mockRepository.save as Mock).mockResolvedValue(Result.ok(undefined));

        const command = new ChangeLeadStatusCommand(
          'lead-123',
          'tenant-456',
          transition.to,
          'user-789'
        );

        const result = await handler.execute(command);
        expect(result.isSuccess).toBe(true);
      }
    });
  });

  // =====================================
  // UpdateLeadScoreHandler Tests
  // =====================================
  describe('UpdateLeadScoreHandler', () => {
    let handler: UpdateLeadScoreHandler;

    beforeEach(() => {
      handler = new UpdateLeadScoreHandler(mockRepository);
    });

    it('should update score successfully', async () => {
      const lead = createMockLead({ score: 50 });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(lead));
      (mockRepository.save as Mock).mockResolvedValue(Result.ok(undefined));

      const command = new UpdateLeadScoreCommand(
        'lead-123',
        'tenant-456',
        75,
        'user-789',
        'Engaged with demo'
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
    });

    it('should reject invalid score below 0', async () => {
      const lead = createMockLead();
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(lead));

      const command = new UpdateLeadScoreCommand(
        'lead-123',
        'tenant-456',
        -10,
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
    });

    it('should reject invalid score above 100', async () => {
      const lead = createMockLead();
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(lead));

      const command = new UpdateLeadScoreCommand(
        'lead-123',
        'tenant-456',
        150,
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
    });

    it('should update score even on closed lead (current behavior - gap identified)', async () => {
      // NOTE: This test documents current behavior. Ideally, closed leads
      // should not allow score updates. This is a potential improvement area.
      const closedLead = createMockLead({ status: LeadStatusEnum.WON });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(closedLead));
      (mockRepository.save as Mock).mockResolvedValue(Result.ok(undefined));

      const command = new UpdateLeadScoreCommand(
        'lead-123',
        'tenant-456',
        80,
        'user-789'
      );

      const result = await handler.execute(command);

      // Current behavior: allows score update on closed leads
      // Recommended: Reject score updates on closed leads (WON/LOST)
      expect(result.isSuccess).toBe(true);
    });
  });

  // =====================================
  // AssignLeadHandler Tests
  // =====================================
  describe('AssignLeadHandler', () => {
    let handler: AssignLeadHandler;

    beforeEach(() => {
      handler = new AssignLeadHandler(mockRepository);
    });

    it('should assign lead to owner', async () => {
      const lead = createMockLead({ ownerId: null });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(lead));
      (mockRepository.save as Mock).mockResolvedValue(Result.ok(undefined));

      const command = new AssignLeadCommand(
        'lead-123',
        'tenant-456',
        'owner-789',
        'assigner-111'
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
    });

    it('should reassign lead to different owner', async () => {
      const lead = createMockLead({ ownerId: 'old-owner' });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(lead));
      (mockRepository.save as Mock).mockResolvedValue(Result.ok(undefined));

      const command = new AssignLeadCommand(
        'lead-123',
        'tenant-456',
        'new-owner',
        'assigner-111'
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
    });

    it('should not assign closed lead', async () => {
      const closedLead = createMockLead({ status: LeadStatusEnum.LOST });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(closedLead));

      const command = new AssignLeadCommand(
        'lead-123',
        'tenant-456',
        'owner-789',
        'assigner-111'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
    });
  });

  // =====================================
  // QualifyLeadHandler Tests
  // =====================================
  describe('QualifyLeadHandler', () => {
    let handler: QualifyLeadHandler;

    beforeEach(() => {
      handler = new QualifyLeadHandler(mockRepository);
    });

    it('should qualify lead with sufficient score', async () => {
      const lead = createMockLead({
        status: LeadStatusEnum.CONTACTED,
        score: 70
      });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(lead));
      (mockRepository.save as Mock).mockResolvedValue(Result.ok(undefined));

      const command = new QualifyLeadCommand(
        'lead-123',
        'tenant-456',
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
    });

    it('should fail to qualify lead with insufficient score', async () => {
      const lead = createMockLead({
        status: LeadStatusEnum.CONTACTED,
        score: 40 // Below qualification threshold
      });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(lead));

      const command = new QualifyLeadCommand(
        'lead-123',
        'tenant-456',
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
    });

    it('should not qualify already qualified lead', async () => {
      const qualifiedLead = createMockLead({
        status: LeadStatusEnum.QUALIFIED,
        score: 80
      });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(qualifiedLead));

      const command = new QualifyLeadCommand(
        'lead-123',
        'tenant-456',
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
    });
  });

  // =====================================
  // ScheduleFollowUpHandler Tests
  // =====================================
  describe('ScheduleFollowUpHandler', () => {
    let handler: ScheduleFollowUpHandler;

    beforeEach(() => {
      handler = new ScheduleFollowUpHandler(mockRepository);
    });

    it('should schedule follow-up successfully', async () => {
      const lead = createMockLead();
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(lead));
      (mockRepository.save as Mock).mockResolvedValue(Result.ok(undefined));

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const command = new ScheduleFollowUpCommand(
        'lead-123',
        'tenant-456',
        futureDate,
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
    });

    it('should reject past date', async () => {
      const lead = createMockLead();
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(lead));

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const command = new ScheduleFollowUpCommand(
        'lead-123',
        'tenant-456',
        pastDate,
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
    });

    it('should not schedule follow-up for closed lead', async () => {
      const closedLead = createMockLead({ status: LeadStatusEnum.WON });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(closedLead));

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const command = new ScheduleFollowUpCommand(
        'lead-123',
        'tenant-456',
        futureDate,
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
    });
  });

  // =====================================
  // ConvertLeadHandler Tests
  // =====================================
  describe('ConvertLeadHandler', () => {
    let handler: ConvertLeadHandler;
    let mockPool: {
      query: Mock;
    };

    beforeEach(() => {
      mockPool = {
        query: vi.fn(),
      };
      handler = new ConvertLeadHandler(mockRepository, mockPool as any);
    });

    it('should convert negotiation lead successfully with contract details', async () => {
      // NEGOTIATION leads can transition directly to WON
      const negotiationLead = createMockLead({
        status: LeadStatusEnum.NEGOTIATION,
        score: 80,
        ownerId: 'owner-123',
      });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(negotiationLead));
      (mockRepository.save as Mock).mockResolvedValue(Result.ok(undefined));

      // Mock: no existing customer
      mockPool.query.mockResolvedValueOnce(Result.ok({ rows: [] }));
      // Mock: customer insert success
      mockPool.query.mockResolvedValueOnce(Result.ok({ rowCount: 1 }));

      const command = new ConvertLeadCommand(
        'lead-123',
        'tenant-456',
        'user-789',
        50000, // contract value
        new Date(),
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year contract
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().customerId).toBeDefined();
      expect(result.getValue().leadId).toBe('lead-123');
    });

    it('should convert lead in proposal status', async () => {
      const proposalLead = createMockLead({
        status: LeadStatusEnum.PROPOSAL,
        score: 75,
      });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(proposalLead));
      (mockRepository.save as Mock).mockResolvedValue(Result.ok(undefined));

      mockPool.query.mockResolvedValueOnce(Result.ok({ rows: [] }));
      mockPool.query.mockResolvedValueOnce(Result.ok({ rowCount: 1 }));

      const command = new ConvertLeadCommand(
        'lead-123',
        'tenant-456',
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
    });

    it('should convert lead in negotiation status', async () => {
      const negotiationLead = createMockLead({
        status: LeadStatusEnum.NEGOTIATION,
        score: 85,
      });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(negotiationLead));
      (mockRepository.save as Mock).mockResolvedValue(Result.ok(undefined));

      mockPool.query.mockResolvedValueOnce(Result.ok({ rows: [] }));
      mockPool.query.mockResolvedValueOnce(Result.ok({ rowCount: 1 }));

      const command = new ConvertLeadCommand(
        'lead-123',
        'tenant-456',
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
    });

    it('should fail to convert NEW lead', async () => {
      const newLead = createMockLead({ status: LeadStatusEnum.NEW });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(newLead));

      const command = new ConvertLeadCommand(
        'lead-123',
        'tenant-456',
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('cannot be converted');
    });

    it('should fail to convert CONTACTED lead', async () => {
      const contactedLead = createMockLead({ status: LeadStatusEnum.CONTACTED });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(contactedLead));

      const command = new ConvertLeadCommand(
        'lead-123',
        'tenant-456',
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('cannot be converted');
    });

    it('should fail to convert QUALIFIED lead (must go through PROPOSAL first)', async () => {
      const qualifiedLead = createMockLead({ status: LeadStatusEnum.QUALIFIED });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(qualifiedLead));

      const command = new ConvertLeadCommand(
        'lead-123',
        'tenant-456',
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('cannot be converted');
      expect(result.error).toContain('QUALIFIED leads must go through PROPOSAL');
    });

    it('should fail to convert already WON lead', async () => {
      const wonLead = createMockLead({ status: LeadStatusEnum.WON });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(wonLead));

      const command = new ConvertLeadCommand(
        'lead-123',
        'tenant-456',
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
    });

    it('should fail to convert LOST lead', async () => {
      const lostLead = createMockLead({ status: LeadStatusEnum.LOST });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(lostLead));

      const command = new ConvertLeadCommand(
        'lead-123',
        'tenant-456',
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
    });

    it('should fail when lead not found', async () => {
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(null));

      const command = new ConvertLeadCommand(
        'nonexistent',
        'tenant-456',
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('not found');
    });

    it('should fail when lead already converted', async () => {
      // Use PROPOSAL status which is convertible
      const proposalLead = createMockLead({ status: LeadStatusEnum.PROPOSAL });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(proposalLead));

      // Mock: existing customer found
      mockPool.query.mockResolvedValueOnce(Result.ok({
        rows: [{ id: 'existing-customer-123' }]
      }));

      const command = new ConvertLeadCommand(
        'lead-123',
        'tenant-456',
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('already been converted');
    });

    it('should rollback customer on lead save failure', async () => {
      // Use PROPOSAL status which is convertible
      const proposalLead = createMockLead({ status: LeadStatusEnum.PROPOSAL });
      (mockRepository.findById as Mock).mockResolvedValue(Result.ok(proposalLead));
      (mockRepository.save as Mock).mockResolvedValue(Result.fail('Save failed'));

      mockPool.query.mockResolvedValueOnce(Result.ok({ rows: [] }));
      mockPool.query.mockResolvedValueOnce(Result.ok({ rowCount: 1 }));
      // Mock delete for rollback
      mockPool.query.mockResolvedValueOnce(Result.ok({ rowCount: 1 }));

      const command = new ConvertLeadCommand(
        'lead-123',
        'tenant-456',
        'user-789'
      );

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      // Verify rollback was called (3rd query call is DELETE)
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });
  });
});
