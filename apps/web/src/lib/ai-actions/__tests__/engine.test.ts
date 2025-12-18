// ============================================
// FASE 6.2 — AI Actions Engine Tests
// ============================================

import { describe, it, expect, vi } from 'vitest';

import {
  validateAIActionParams,
  checkRequiresApproval,
} from '../engine';

// Mock the AI engine functions to avoid actual API calls
vi.mock('@/lib/ai/engine', () => ({
  classifyLead: vi.fn(),
  enrichLead: vi.fn(),
  generateInsights: vi.fn(),
  generateLeadSummary: vi.fn(),
  predictConversion: vi.fn(),
  predictStageChange: vi.fn(),
  scoreLead: vi.fn(),
}));

vi.mock('@/lib/ai/security', () => ({
  logAIOperation: vi.fn(),
  sanitizeInput: vi.fn((input: string) => input),
  validateInput: vi.fn(() => ({ valid: true })),
}));

describe('AI Actions Engine', () => {
  describe('validateAIActionParams', () => {
    it('should validate ai_create_note params successfully', () => {
      const result = validateAIActionParams('ai_create_note', {
        confidence_threshold: 0.8,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid confidence threshold (too high)', () => {
      const result = validateAIActionParams('ai_create_note', {
        confidence_threshold: 1.5,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid confidence threshold (too low)', () => {
      const result = validateAIActionParams('ai_create_note', {
        confidence_threshold: -0.1,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate ai_generate_followup params', () => {
      const result = validateAIActionParams('ai_generate_followup', {
        due_days: 5,
      });

      expect(result.valid).toBe(true);
    });

    it('should reject invalid due_days (zero)', () => {
      const result = validateAIActionParams('ai_generate_followup', {
        due_days: 0,
      });

      expect(result.valid).toBe(false);
    });

    it('should reject invalid due_days (negative)', () => {
      const result = validateAIActionParams('ai_generate_followup', {
        due_days: -1,
      });

      expect(result.valid).toBe(false);
    });

    it('should validate ai_auto_assign params with valid strategy', () => {
      const result = validateAIActionParams('ai_auto_assign', {
        assign_strategy: 'round_robin',
      });

      expect(result.valid).toBe(true);
    });

    it('should validate ai_auto_assign params with all strategies', () => {
      const strategies = ['round_robin', 'least_loaded', 'best_match', 'performance_based'] as const;

      strategies.forEach(strategy => {
        const result = validateAIActionParams('ai_auto_assign', {
          assign_strategy: strategy,
        });
        expect(result.valid).toBe(true);
      });
    });

    it('should return error for unknown action', () => {
      const result = validateAIActionParams('unknown_action' as any, {});

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Unknown');
    });

    it('should validate ai_score_lead with no params', () => {
      const result = validateAIActionParams('ai_score_lead', {});
      expect(result.valid).toBe(true);
    });

    it('should validate ai_classify_lead with no params', () => {
      const result = validateAIActionParams('ai_classify_lead', {});
      expect(result.valid).toBe(true);
    });

    it('should validate ai_enrich_lead with enrich_fields', () => {
      const result = validateAIActionParams('ai_enrich_lead', {
        enrich_fields: ['industry', 'company_size'],
      });
      expect(result.valid).toBe(true);
    });

    it('should validate ai_auto_stage with min_probability', () => {
      const result = validateAIActionParams('ai_auto_stage', {
        min_probability: 0.7,
      });
      expect(result.valid).toBe(true);
    });

    it('should reject ai_auto_stage with invalid min_probability', () => {
      const result = validateAIActionParams('ai_auto_stage', {
        min_probability: 2.0,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('checkRequiresApproval', () => {
    it('should return true when require_approval is explicitly true', () => {
      const result = checkRequiresApproval('ai_auto_stage', { require_approval: true }, 0.9);
      expect(result).toBe(true);
    });

    it('should return true when confidence is below threshold', () => {
      const result = checkRequiresApproval('ai_classify_lead', { confidence_threshold: 0.9 }, 0.7);
      expect(result).toBe(true);
    });

    it('should return false when confidence is above threshold', () => {
      const result = checkRequiresApproval('ai_classify_lead', { confidence_threshold: 0.7 }, 0.9);
      expect(result).toBe(false);
    });

    it('should return false for ai_score_lead (non-modifying action)', () => {
      const result = checkRequiresApproval('ai_score_lead', {}, 0.9);
      expect(result).toBe(false);
    });

    it('should return false for ai_generate_summary (non-modifying action)', () => {
      const result = checkRequiresApproval('ai_generate_summary', {}, 0.9);
      expect(result).toBe(false);
    });

    it('should return true for ai_generate_followup by default', () => {
      const result = checkRequiresApproval('ai_generate_followup', {}, 0.9);
      expect(result).toBe(true);
    });

    it('should return false for ai_generate_followup when require_approval is false', () => {
      const result = checkRequiresApproval('ai_generate_followup', { require_approval: false }, 0.9);
      expect(result).toBe(false);
    });

    it('should return true for ai_auto_assign by default', () => {
      const result = checkRequiresApproval('ai_auto_assign', {}, 0.9);
      expect(result).toBe(true);
    });

    it('should return true for unknown action as safety measure', () => {
      const result = checkRequiresApproval('unknown_action' as any, {}, 0.9);
      expect(result).toBe(true);
    });

    it('should use default confidence threshold when not specified', () => {
      const result = checkRequiresApproval('ai_classify_lead', {}, 0.5);
      // Default threshold is 0.7, so 0.5 should require approval
      expect(result).toBe(true);
    });

    it('should not require approval when confidence equals threshold', () => {
      const result = checkRequiresApproval('ai_classify_lead', { confidence_threshold: 0.7 }, 0.7);
      expect(result).toBe(false);
    });
  });
});
