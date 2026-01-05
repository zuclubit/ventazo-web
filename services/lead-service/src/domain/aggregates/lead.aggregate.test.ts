import { describe, it, expect } from 'vitest';
import { Lead } from './lead.aggregate';
import { LeadStatusEnum } from '../value-objects';
import { LeadEventTypes } from '../events';

describe('Lead Aggregate', () => {
  const validLeadProps = {
    tenantId: 'tenant-123',
    companyName: 'Acme Corp',
    email: 'contact@acme.com',
    source: 'website',
  };

  describe('create', () => {
    it('should create a valid lead', () => {
      const result = Lead.create(validLeadProps);

      expect(result.isSuccess).toBe(true);
      const lead = result.getValue();
      expect(lead.id).toBeDefined();
      expect(lead.tenantId).toBe('tenant-123');
      expect(lead.getCompanyName()).toBe('Acme Corp');
      expect(lead.getEmail().value).toBe('contact@acme.com');
      expect(lead.getStatus().value).toBe(LeadStatusEnum.NEW);
      expect(lead.getScore().value).toBe(50); // Default score
    });

    it('should generate Lead.Created domain event', () => {
      const result = Lead.create(validLeadProps);
      const lead = result.getValue();

      const events = lead.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(LeadEventTypes.LEAD_CREATED);
      expect(events[0].data).toMatchObject({
        leadId: lead.id,
        tenantId: 'tenant-123',
        companyName: 'Acme Corp',
        email: 'contact@acme.com',
        source: 'website',
      });
    });

    it('should reject empty company name', () => {
      const result = Lead.create({
        ...validLeadProps,
        companyName: '',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Company name is required');
    });

    it('should reject company name that is too long', () => {
      const result = Lead.create({
        ...validLeadProps,
        companyName: 'A'.repeat(256),
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('too long');
    });

    it('should reject invalid email', () => {
      const result = Lead.create({
        ...validLeadProps,
        email: 'invalid-email',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('email');
    });

    it('should reject empty source', () => {
      const result = Lead.create({
        ...validLeadProps,
        source: '',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('source is required');
    });

    it('should accept optional fields', () => {
      const result = Lead.create({
        ...validLeadProps,
        phone: '+52 55 1234 5678',
        website: 'https://acme.com',
        industry: 'Technology',
        employeeCount: 100,
        annualRevenue: 1000000,
        ownerId: 'user-123',
        notes: 'Promising lead',
        customFields: { region: 'LATAM' },
      });

      expect(result.isSuccess).toBe(true);
      const lead = result.getValue();
      expect(lead.getPhone()).toBe('+52 55 1234 5678');
      expect(lead.getWebsite()).toBe('https://acme.com');
      expect(lead.getIndustry()).toBe('Technology');
      expect(lead.getEmployeeCount()).toBe(100);
      expect(lead.getAnnualRevenue()).toBe(1000000);
      expect(lead.getOwnerId()).toBe('user-123');
      expect(lead.getNotes()).toBe('Promising lead');
      expect(lead.getCustomFields()).toEqual({ region: 'LATAM' });
    });
  });

  describe('update', () => {
    it('should update lead information', () => {
      const lead = Lead.create(validLeadProps).getValue();

      const result = lead.update({
        companyName: 'Acme Corporation',
        phone: '+52 55 9876 5432',
        website: 'https://acmecorp.com',
      });

      expect(result.isSuccess).toBe(true);
      expect(lead.getCompanyName()).toBe('Acme Corporation');
      expect(lead.getPhone()).toBe('+52 55 9876 5432');
      expect(lead.getWebsite()).toBe('https://acmecorp.com');
    });

    it('should not allow update of closed lead', () => {
      const lead = Lead.create(validLeadProps).getValue();
      // Force status to won
      lead.changeStatus(LeadStatusEnum.CONTACTED, 'user-1');
      lead.changeStatus(LeadStatusEnum.QUALIFIED, 'user-1');
      lead.changeStatus(LeadStatusEnum.PROPOSAL, 'user-1');
      lead.changeStatus(LeadStatusEnum.WON, 'user-1');

      const result = lead.update({
        companyName: 'Updated Name',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('closed');
    });

    it('should reject empty company name', () => {
      const lead = Lead.create(validLeadProps).getValue();

      const result = lead.update({
        companyName: '',
      });

      expect(result.isFailure).toBe(true);
    });

    it('should validate email on update', () => {
      const lead = Lead.create(validLeadProps).getValue();

      const result = lead.update({
        email: 'invalid-email',
      });

      expect(result.isFailure).toBe(true);
    });
  });

  describe('changeStatus', () => {
    it('should change status when transition is valid', () => {
      const lead = Lead.create(validLeadProps).getValue();
      lead.clearDomainEvents(); // Clear created event

      const result = lead.changeStatus(LeadStatusEnum.CONTACTED, 'user-123');

      expect(result.isSuccess).toBe(true);
      expect(lead.getStatus().value).toBe(LeadStatusEnum.CONTACTED);

      const events = lead.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(LeadEventTypes.LEAD_STATUS_CHANGED);
      expect(events[0].data).toMatchObject({
        leadId: lead.id,
        oldStatus: LeadStatusEnum.NEW,
        newStatus: LeadStatusEnum.CONTACTED,
        changedBy: 'user-123',
      });
    });

    it('should reject invalid status transition', () => {
      const lead = Lead.create(validLeadProps).getValue();

      const result = lead.changeStatus(LeadStatusEnum.WON, 'user-123');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Invalid status transition');
    });

    it('should allow full lifecycle workflow', () => {
      const lead = Lead.create(validLeadProps).getValue();

      // NEW → CONTACTED
      expect(lead.changeStatus(LeadStatusEnum.CONTACTED, 'user-1').isSuccess).toBe(true);
      // CONTACTED → QUALIFIED
      expect(lead.changeStatus(LeadStatusEnum.QUALIFIED, 'user-1').isSuccess).toBe(true);
      // QUALIFIED → PROPOSAL
      expect(lead.changeStatus(LeadStatusEnum.PROPOSAL, 'user-1').isSuccess).toBe(true);
      // PROPOSAL → NEGOTIATION
      expect(lead.changeStatus(LeadStatusEnum.NEGOTIATION, 'user-1').isSuccess).toBe(true);
      // NEGOTIATION → WON
      expect(lead.changeStatus(LeadStatusEnum.WON, 'user-1').isSuccess).toBe(true);

      expect(lead.getStatus().isWon()).toBe(true);
    });
  });

  describe('qualify', () => {
    it('should qualify lead when score is sufficient', () => {
      const lead = Lead.create(validLeadProps).getValue();
      lead.changeStatus(LeadStatusEnum.CONTACTED, 'user-1'); // First move to contacted
      lead.updateScore(65, 'High engagement'); // Above threshold
      lead.clearDomainEvents();

      const result = lead.qualify('user-123');

      expect(result.isSuccess).toBe(true);
      expect(lead.getStatus().isQualified()).toBe(true);

      const events = lead.getDomainEvents();
      expect(events.some((e) => e.type === LeadEventTypes.LEAD_QUALIFIED)).toBe(true);
      expect(events.some((e) => e.type === LeadEventTypes.LEAD_STATUS_CHANGED)).toBe(true);
    });

    it('should reject qualification when score is too low', () => {
      const lead = Lead.create(validLeadProps).getValue();
      lead.updateScore(30, 'Low engagement'); // Below threshold

      const result = lead.qualify('user-123');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('below qualification threshold');
    });
  });

  describe('updateScore', () => {
    it('should update lead score', () => {
      const lead = Lead.create(validLeadProps).getValue();
      lead.clearDomainEvents();

      const result = lead.updateScore(75, 'Good engagement');

      expect(result.isSuccess).toBe(true);
      expect(lead.getScore().value).toBe(75);

      const events = lead.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(LeadEventTypes.LEAD_SCORE_CHANGED);
      expect(events[0].data).toMatchObject({
        leadId: lead.id,
        oldScore: 50,
        newScore: 75,
        reason: 'Good engagement',
      });
    });

    it('should validate score value', () => {
      const lead = Lead.create(validLeadProps).getValue();

      const result = lead.updateScore(150, 'Invalid');

      expect(result.isFailure).toBe(true);
    });
  });

  describe('assignTo', () => {
    it('should assign lead to owner', () => {
      const lead = Lead.create(validLeadProps).getValue();
      lead.clearDomainEvents();

      const result = lead.assignTo('user-456', 'user-123');

      expect(result.isSuccess).toBe(true);
      expect(lead.getOwnerId()).toBe('user-456');

      const events = lead.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(LeadEventTypes.LEAD_ASSIGNED);
    });

    it('should not allow assignment of closed lead', () => {
      const lead = Lead.create(validLeadProps).getValue();
      // Force to closed
      lead.changeStatus(LeadStatusEnum.CONTACTED, 'user-1');
      lead.changeStatus(LeadStatusEnum.QUALIFIED, 'user-1');
      lead.changeStatus(LeadStatusEnum.PROPOSAL, 'user-1');
      lead.changeStatus(LeadStatusEnum.WON, 'user-1');

      const result = lead.assignTo('user-456', 'user-123');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('closed');
    });
  });

  describe('markAsLost', () => {
    it('should mark lead as lost', () => {
      const lead = Lead.create(validLeadProps).getValue();
      lead.clearDomainEvents();

      const result = lead.markAsLost('Not interested', 'user-123');

      expect(result.isSuccess).toBe(true);
      expect(lead.getStatus().isLost()).toBe(true);

      const events = lead.getDomainEvents();
      expect(events.some((e) => e.type === LeadEventTypes.LEAD_LOST)).toBe(true);
      expect(events.some((e) => e.type === LeadEventTypes.LEAD_STATUS_CHANGED)).toBe(true);
    });

    it('should not allow marking closed lead as lost', () => {
      const lead = Lead.create(validLeadProps).getValue();
      lead.markAsLost('First reason', 'user-1');

      const result = lead.markAsLost('Second reason', 'user-1');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('already closed');
    });
  });

  describe('scheduleFollowUp', () => {
    it('should schedule follow-up', () => {
      const lead = Lead.create(validLeadProps).getValue();
      const futureDate = new Date(Date.now() + 86400000); // +1 day

      const result = lead.scheduleFollowUp(futureDate);

      expect(result.isSuccess).toBe(true);
      expect(lead.getNextFollowUpAt()).toEqual(futureDate);
    });

    it('should reject past dates', () => {
      const lead = Lead.create(validLeadProps).getValue();
      const pastDate = new Date(Date.now() - 86400000); // -1 day

      const result = lead.scheduleFollowUp(pastDate);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('must be in the future');
    });

    it('should not allow scheduling for closed leads', () => {
      const lead = Lead.create(validLeadProps).getValue();
      lead.markAsLost('Not interested', 'user-1');
      const futureDate = new Date(Date.now() + 86400000);

      const result = lead.scheduleFollowUp(futureDate);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('closed');
    });
  });

  describe('recordActivity', () => {
    it('should update last activity timestamp', () => {
      const lead = Lead.create(validLeadProps).getValue();
      const beforeActivity = lead.getLastActivityAt();

      // Small delay to ensure timestamp difference
      lead.recordActivity();

      const afterActivity = lead.getLastActivityAt();
      expect(afterActivity).not.toBe(beforeActivity);
      expect(afterActivity).toBeDefined();
    });
  });

  describe('isFollowUpOverdue', () => {
    it('should return true when follow-up is overdue', () => {
      const lead = Lead.create(validLeadProps).getValue();
      const pastDate = new Date(Date.now() - 86400000); // -1 day
      // Directly set via reconstitute to bypass validation
      const leadWithOverdue = Lead.reconstitute({
        id: lead.id,
        tenantId: lead.tenantId,
        companyName: lead.getCompanyName(),
        email: lead.getEmail().value,
        phone: null,
        website: null,
        industry: null,
        employeeCount: null,
        annualRevenue: null,
        status: lead.getStatus().value,
        score: lead.getScore().value,
        source: lead.getSource(),
        ownerId: null,
        notes: null,
        customFields: {},
        createdAt: lead.createdAt,
        updatedAt: lead.getUpdatedAt(),
        lastActivityAt: null,
        nextFollowUpAt: pastDate,
      }).getValue();

      expect(leadWithOverdue.isFollowUpOverdue()).toBe(true);
    });

    it('should return false when no follow-up scheduled', () => {
      const lead = Lead.create(validLeadProps).getValue();

      expect(lead.isFollowUpOverdue()).toBe(false);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute lead from persistence', () => {
      const result = Lead.reconstitute({
        id: 'lead-123',
        tenantId: 'tenant-456',
        companyName: 'Test Corp',
        email: 'test@example.com',
        phone: '+52 55 1234 5678',
        website: 'https://test.com',
        industry: 'Tech',
        employeeCount: 50,
        annualRevenue: 500000,
        status: 'qualified',
        score: 80,
        source: 'referral',
        ownerId: 'user-789',
        notes: 'Important client',
        customFields: { priority: 'high' },
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-15'),
        lastActivityAt: new Date('2025-01-10'),
        nextFollowUpAt: new Date('2025-01-20'),
      });

      expect(result.isSuccess).toBe(true);
      const lead = result.getValue();
      expect(lead.id).toBe('lead-123');
      expect(lead.getCompanyName()).toBe('Test Corp');
      expect(lead.getStatus().isQualified()).toBe(true);
      expect(lead.getScore().value).toBe(80);
    });

    it('should validate data on reconstitution', () => {
      const result = Lead.reconstitute({
        id: 'lead-123',
        tenantId: 'tenant-456',
        companyName: 'Test Corp',
        email: 'invalid-email',
        phone: null,
        website: null,
        industry: null,
        employeeCount: null,
        annualRevenue: null,
        status: 'new',
        score: 50,
        source: 'website',
        ownerId: null,
        notes: null,
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivityAt: null,
        nextFollowUpAt: null,
      });

      expect(result.isFailure).toBe(true);
    });
  });

  describe('domain events', () => {
    it('should accumulate multiple events', () => {
      const lead = Lead.create(validLeadProps).getValue();
      lead.updateScore(75, 'Increased engagement');
      lead.changeStatus(LeadStatusEnum.CONTACTED, 'user-123');
      lead.assignTo('user-456', 'user-123');

      const events = lead.getDomainEvents();
      expect(events.length).toBeGreaterThan(3);
      expect(events[0].type).toBe(LeadEventTypes.LEAD_CREATED);
      expect(events.some((e) => e.type === LeadEventTypes.LEAD_SCORE_CHANGED)).toBe(true);
      expect(events.some((e) => e.type === LeadEventTypes.LEAD_STATUS_CHANGED)).toBe(true);
      expect(events.some((e) => e.type === LeadEventTypes.LEAD_ASSIGNED)).toBe(true);
    });

    it('should clear events after publishing', () => {
      const lead = Lead.create(validLeadProps).getValue();

      expect(lead.getDomainEvents()).toHaveLength(1);

      lead.clearDomainEvents();

      expect(lead.getDomainEvents()).toHaveLength(0);
    });
  });
});
