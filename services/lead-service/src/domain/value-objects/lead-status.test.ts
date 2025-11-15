import { describe, it, expect } from 'vitest';
import { LeadStatus, LeadStatusEnum } from './lead-status';

describe('LeadStatus Value Object', () => {
  describe('create', () => {
    it('should create a valid lead status', () => {
      const result = LeadStatus.create('new');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe(LeadStatusEnum.NEW);
    });

    it('should accept all valid status values', () => {
      const validStatuses = [
        'new',
        'contacted',
        'qualified',
        'proposal',
        'negotiation',
        'won',
        'lost',
        'unqualified',
      ];

      validStatuses.forEach((status) => {
        const result = LeadStatus.create(status);
        expect(result.isSuccess).toBe(true);
      });
    });

    it('should reject invalid status', () => {
      const result = LeadStatus.create('invalid_status');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Invalid lead status');
    });

    it('should be case insensitive', () => {
      const result = LeadStatus.create('NEW');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe(LeadStatusEnum.NEW);
    });
  });

  describe('state checks', () => {
    it('should correctly identify new status', () => {
      const status = LeadStatus.new();

      expect(status.isNew()).toBe(true);
      expect(status.isQualified()).toBe(false);
      expect(status.isWon()).toBe(false);
      expect(status.isLost()).toBe(false);
      expect(status.isClosed()).toBe(false);
    });

    it('should correctly identify closed status', () => {
      const wonStatus = LeadStatus.create('won').getValue();
      const lostStatus = LeadStatus.create('lost').getValue();

      expect(wonStatus.isClosed()).toBe(true);
      expect(lostStatus.isClosed()).toBe(true);
    });
  });

  describe('canTransitionTo', () => {
    it('should allow valid transition from new to contacted', () => {
      const newStatus = LeadStatus.new();
      const contactedStatus = LeadStatus.create('contacted').getValue();

      expect(newStatus.canTransitionTo(contactedStatus)).toBe(true);
    });

    it('should allow valid transition from qualified to proposal', () => {
      const qualifiedStatus = LeadStatus.create('qualified').getValue();
      const proposalStatus = LeadStatus.create('proposal').getValue();

      expect(qualifiedStatus.canTransitionTo(proposalStatus)).toBe(true);
    });

    it('should not allow transition from new to won', () => {
      const newStatus = LeadStatus.new();
      const wonStatus = LeadStatus.create('won').getValue();

      expect(newStatus.canTransitionTo(wonStatus)).toBe(false);
    });

    it('should not allow transitions from closed status', () => {
      const wonStatus = LeadStatus.create('won').getValue();
      const newStatus = LeadStatus.new();

      expect(wonStatus.canTransitionTo(newStatus)).toBe(false);
    });
  });

  describe('value object equality', () => {
    it('should be equal when values are the same', () => {
      const status1 = LeadStatus.create('new').getValue();
      const status2 = LeadStatus.create('new').getValue();

      expect(status1.equals(status2)).toBe(true);
    });

    it('should not be equal when values differ', () => {
      const status1 = LeadStatus.create('new').getValue();
      const status2 = LeadStatus.create('qualified').getValue();

      expect(status1.equals(status2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const status = LeadStatus.create('qualified').getValue();

      expect(status.toString()).toBe('qualified');
    });
  });
});
