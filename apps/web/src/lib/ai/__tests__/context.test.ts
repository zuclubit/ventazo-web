// ============================================
// AI Context Tests - FASE 6.0
// ============================================

import { describe, expect, it } from 'vitest';

import {
  CRMContextBuilder,
  prepareLeadForAI,
  prepareOpportunityForAI,
  prepareCustomerForAI,
  prepareTaskForAI,
  prepareNotesForAI,
  estimateTokens,
  getMaxContextTokens,
  truncateToTokenLimit,
  sanitizeForAI,
  containsSensitiveData,
} from '../context';

describe('AI Context', () => {
  describe('CRMContextBuilder', () => {
    it('should build a valid context with required fields', () => {
      const context = new CRMContextBuilder()
        .setIdentifiers('tenant-1', 'user-1')
        .setEntity('lead', 'lead-123')
        .build();

      expect(context.tenantId).toBe('tenant-1');
      expect(context.userId).toBe('user-1');
      expect(context.entityType).toBe('lead');
      expect(context.entityId).toBe('lead-123');
    });

    it('should add notes to context', () => {
      const notes = [
        { id: 'n1', content: 'First note', createdAt: '2024-01-01' },
        { id: 'n2', content: 'Second note', createdAt: '2024-01-02' },
      ];

      const context = new CRMContextBuilder()
        .setIdentifiers('tenant-1', 'user-1')
        .setEntity('lead', 'lead-123')
        .addNotes(notes)
        .build();

      expect(context.relatedData?.notes).toHaveLength(2);
      expect(context.relatedData?.notes?.[0]?.content).toBe('First note');
    });

    it('should add activities to context', () => {
      const activities = [
        { type: 'call', description: 'Phone call', createdAt: '2024-01-01' },
        { type: 'email', description: 'Email sent', createdAt: '2024-01-02' },
      ];

      const context = new CRMContextBuilder()
        .setIdentifiers('tenant-1', 'user-1')
        .setEntity('lead', 'lead-123')
        .addActivities(activities)
        .build();

      expect(context.relatedData?.activities).toHaveLength(2);
    });

    it('should add communications to context', () => {
      const communications = [
        { channel: 'email' as const, summary: 'Intro email', createdAt: '2024-01-01' },
        { channel: 'phone' as const, summary: 'Follow-up call', createdAt: '2024-01-02' },
      ];

      const context = new CRMContextBuilder()
        .setIdentifiers('tenant-1', 'user-1')
        .setEntity('lead', 'lead-123')
        .addCommunications(communications)
        .build();

      expect(context.relatedData?.communications).toHaveLength(2);
    });

    it('should set pipeline context', () => {
      const stageHistory = [
        { stage: 'new', enteredAt: '2024-01-01' },
        { stage: 'qualified', enteredAt: '2024-01-15' },
      ];

      const context = new CRMContextBuilder()
        .setIdentifiers('tenant-1', 'user-1')
        .setEntity('opportunity', 'opp-123')
        .setPipelineContext('qualified', stageHistory, '2024-01-01')
        .build();

      expect(context.pipelineContext?.currentStage).toBe('qualified');
      expect(context.pipelineContext?.stageHistory).toHaveLength(2);
      expect(context.pipelineContext?.daysInPipeline).toBeGreaterThan(0);
    });

    it('should set user context', () => {
      const context = new CRMContextBuilder()
        .setIdentifiers('tenant-1', 'user-1')
        .setEntity('lead', 'lead-123')
        .setUserContext(['viewed lead', 'added note'], { theme: 'dark' })
        .build();

      expect(context.userContext?.recentActions).toHaveLength(2);
      expect(context.userContext?.preferences?.['theme']).toBe('dark');
    });

    it('should throw error without required fields', () => {
      expect(() => {
        new CRMContextBuilder()
          .setIdentifiers('tenant-1', 'user-1')
          .build();
      }).toThrow('Context must have entityType and entityId');

      expect(() => {
        new CRMContextBuilder()
          .setEntity('lead', 'lead-123')
          .build();
      }).toThrow('Context must have tenantId and userId');
    });
  });

  describe('Data Preparation', () => {
    describe('prepareLeadForAI', () => {
      it('should format lead data as text', () => {
        const lead = {
          id: 'lead-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          company: 'TechCorp',
          title: 'CEO',
          phone: '555-1234',
          source: 'website',
          status: 'qualified',
          score: 85,
          notes: 'Interested in enterprise plan',
        };

        const result = prepareLeadForAI(lead);

        expect(result).toContain('Name: John Doe');
        expect(result).toContain('Email: john@example.com');
        expect(result).toContain('Company: TechCorp');
        expect(result).toContain('Title: CEO');
        expect(result).toContain('Score: 85');
      });

      it('should handle missing fields gracefully', () => {
        const lead = {
          id: 'lead-2',
          email: 'test@example.com',
        };

        const result = prepareLeadForAI(lead);

        expect(result).toContain('Email: test@example.com');
        expect(result).not.toContain('Name:');
        expect(result).not.toContain('Company:');
      });
    });

    describe('prepareOpportunityForAI', () => {
      it('should format opportunity data', () => {
        const opportunity = {
          id: 'opp-1',
          name: 'Enterprise Deal',
          value: 50000,
          stage: 'proposal',
          probability: 75,
          expectedCloseDate: '2024-03-01',
          notes: 'Negotiating terms',
        };

        const result = prepareOpportunityForAI(opportunity);

        expect(result).toContain('Opportunity: Enterprise Deal');
        expect(result).toContain('Value: $50,000');
        expect(result).toContain('Stage: proposal');
        expect(result).toContain('Probability: 75%');
      });
    });

    describe('prepareCustomerForAI', () => {
      it('should format customer data', () => {
        const customer = {
          id: 'cust-1',
          name: 'Acme Corp',
          email: 'contact@acme.com',
          company: 'Acme Corporation',
          lifetimeValue: 150000,
          status: 'active',
        };

        const result = prepareCustomerForAI(customer);

        expect(result).toContain('Customer: Acme Corp');
        expect(result).toContain('Lifetime Value: $150,000');
        expect(result).toContain('Status: active');
      });
    });

    describe('prepareTaskForAI', () => {
      it('should format task data', () => {
        const task = {
          id: 'task-1',
          title: 'Follow up with client',
          description: 'Call to discuss proposal',
          dueDate: '2024-02-15',
          status: 'pending',
          priority: 'high',
        };

        const result = prepareTaskForAI(task);

        expect(result).toContain('Task: Follow up with client');
        expect(result).toContain('Description: Call to discuss proposal');
        expect(result).toContain('Priority: high');
      });
    });

    describe('prepareNotesForAI', () => {
      it('should combine and sort notes', () => {
        const notes = [
          { id: 'n1', content: 'First note', createdAt: '2024-01-01', author: 'Alice' },
          { id: 'n2', content: 'Second note', createdAt: '2024-01-15', author: 'Bob' },
          { id: 'n3', content: 'Third note', createdAt: '2024-01-10' },
        ];

        const result = prepareNotesForAI(notes);

        // Should be sorted by date descending (most recent first)
        expect(result.indexOf('Second note')).toBeLessThan(result.indexOf('Third note'));
        expect(result.indexOf('Third note')).toBeLessThan(result.indexOf('First note'));
        expect(result).toContain('by Alice');
        expect(result).toContain('by Bob');
      });

      it('should return empty string for empty notes', () => {
        const result = prepareNotesForAI([]);
        expect(result).toBe('');
      });
    });
  });

  describe('Token Management', () => {
    describe('estimateTokens', () => {
      it('should estimate tokens based on character count', () => {
        const text = 'This is a test string with some words.';
        const tokens = estimateTokens(text);

        // ~4 chars per token
        expect(tokens).toBeGreaterThan(5);
        expect(tokens).toBeLessThan(20);
      });
    });

    describe('getMaxContextTokens', () => {
      it('should return correct limits for providers', () => {
        expect(getMaxContextTokens('openai')).toBe(128000);
        expect(getMaxContextTokens('anthropic')).toBe(200000);
        expect(getMaxContextTokens('groq')).toBe(32768);
        expect(getMaxContextTokens('local')).toBe(4096);
      });

      it('should handle model-specific limits', () => {
        expect(getMaxContextTokens('openai', 'gpt-3.5-turbo')).toBe(16385);
        expect(getMaxContextTokens('openai', 'gpt-4-32k')).toBe(32768);
        expect(getMaxContextTokens('anthropic', 'claude-2')).toBe(100000);
      });
    });

    describe('truncateToTokenLimit', () => {
      it('should not truncate text within limit', () => {
        const text = 'Short text';
        const result = truncateToTokenLimit(text, 100);
        expect(result).toBe(text);
      });

      it('should truncate text exceeding limit', () => {
        const text = 'a'.repeat(1000);
        const result = truncateToTokenLimit(text, 100);

        expect(result.length).toBeLessThan(text.length);
        expect(result).toContain('[truncated]');
      });
    });
  });

  describe('Data Sanitization', () => {
    describe('sanitizeForAI', () => {
      it('should redact email addresses', () => {
        const text = 'Contact: john@example.com for more info';
        const result = sanitizeForAI(text, { removeEmails: true });
        expect(result).toContain('[EMAIL]');
        expect(result).not.toContain('john@example.com');
      });

      it('should redact phone numbers', () => {
        const text = 'Call me at 555-123-4567';
        const result = sanitizeForAI(text, { removePhones: true });
        expect(result).toContain('[PHONE]');
        expect(result).not.toContain('555-123-4567');
      });

      it('should redact SSN', () => {
        const text = 'SSN: 123-45-6789';
        const result = sanitizeForAI(text, { removeSSN: true });
        expect(result).toContain('[SSN]');
        expect(result).not.toContain('123-45-6789');
      });

      it('should redact credit cards', () => {
        const text = 'Card: 4111-1111-1111-1111';
        const result = sanitizeForAI(text, { removeCreditCards: true });
        expect(result).toContain('[CARD]');
        expect(result).not.toContain('4111');
      });

      it('should redact all sensitive data by default', () => {
        const text = 'Email: test@test.com, Phone: 555-123-4567';
        const result = sanitizeForAI(text);
        expect(result).toContain('[EMAIL]');
        expect(result).toContain('[PHONE]');
      });
    });

    describe('containsSensitiveData', () => {
      it('should detect email addresses', () => {
        const result = containsSensitiveData('Contact john@example.com');
        expect(result.hasSensitiveData).toBe(true);
        expect(result.types).toContain('email');
      });

      it('should detect phone numbers', () => {
        const result = containsSensitiveData('Call 555-123-4567');
        expect(result.hasSensitiveData).toBe(true);
        expect(result.types).toContain('phone');
      });

      it('should detect SSN', () => {
        const result = containsSensitiveData('SSN is 123-45-6789');
        expect(result.hasSensitiveData).toBe(true);
        expect(result.types).toContain('ssn');
      });

      it('should detect credit cards', () => {
        const result = containsSensitiveData('Card 4111-1111-1111-1111');
        expect(result.hasSensitiveData).toBe(true);
        expect(result.types).toContain('credit_card');
      });

      it('should return false for clean text', () => {
        const result = containsSensitiveData('This is a normal business message');
        expect(result.hasSensitiveData).toBe(false);
        expect(result.types).toHaveLength(0);
      });

      it('should detect multiple types', () => {
        const result = containsSensitiveData('Email: test@test.com, SSN: 123-45-6789');
        expect(result.hasSensitiveData).toBe(true);
        expect(result.types).toContain('email');
        expect(result.types).toContain('ssn');
      });
    });
  });
});
