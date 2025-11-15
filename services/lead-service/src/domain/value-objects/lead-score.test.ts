import { describe, it, expect } from 'vitest';
import { LeadScore } from './lead-score';

describe('LeadScore Value Object', () => {
  describe('create', () => {
    it('should create a valid score', () => {
      const result = LeadScore.create(75);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe(75);
    });

    it('should reject score below 0', () => {
      const result = LeadScore.create(-1);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('must be between');
    });

    it('should reject score above 100', () => {
      const result = LeadScore.create(101);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('must be between');
    });

    it('should accept boundary values', () => {
      const min = LeadScore.create(0);
      const max = LeadScore.create(100);

      expect(min.isSuccess).toBe(true);
      expect(max.isSuccess).toBe(true);
    });

    it('should reject non-integer values', () => {
      const result = LeadScore.create(75.5);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('must be an integer');
    });
  });

  describe('default', () => {
    it('should create default score of 50', () => {
      const score = LeadScore.default();

      expect(score.value).toBe(50);
    });
  });

  describe('fromPercentage', () => {
    it('should create score from percentage', () => {
      const result = LeadScore.fromPercentage(0.75);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe(75);
    });

    it('should round percentage correctly', () => {
      const result = LeadScore.fromPercentage(0.756);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe(76);
    });

    it('should reject percentage < 0', () => {
      const result = LeadScore.fromPercentage(-0.1);

      expect(result.isFailure).toBe(true);
    });

    it('should reject percentage > 1', () => {
      const result = LeadScore.fromPercentage(1.1);

      expect(result.isFailure).toBe(true);
    });
  });

  describe('isQualified', () => {
    it('should return true for score >= 60', () => {
      const score = LeadScore.create(60).getValue();

      expect(score.isQualified()).toBe(true);
    });

    it('should return false for score < 60', () => {
      const score = LeadScore.create(59).getValue();

      expect(score.isQualified()).toBe(false);
    });
  });

  describe('getCategory', () => {
    it('should return hot for score >= 80', () => {
      const score = LeadScore.create(85).getValue();

      expect(score.getCategory()).toBe('hot');
    });

    it('should return warm for score between 50-79', () => {
      const score = LeadScore.create(65).getValue();

      expect(score.getCategory()).toBe('warm');
    });

    it('should return cold for score < 50', () => {
      const score = LeadScore.create(30).getValue();

      expect(score.getCategory()).toBe('cold');
    });
  });

  describe('increase', () => {
    it('should increase score by amount', () => {
      const score = LeadScore.create(50).getValue();
      const result = score.increase(20);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe(70);
    });

    it('should cap at 100', () => {
      const score = LeadScore.create(95).getValue();
      const result = score.increase(10);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe(100);
    });
  });

  describe('decrease', () => {
    it('should decrease score by amount', () => {
      const score = LeadScore.create(50).getValue();
      const result = score.decrease(20);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe(30);
    });

    it('should floor at 0', () => {
      const score = LeadScore.create(5).getValue();
      const result = score.decrease(10);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe(0);
    });
  });

  describe('setScore', () => {
    it('should set new score', () => {
      const score = LeadScore.create(50).getValue();
      const result = score.setScore(75);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe(75);
    });

    it('should validate new score', () => {
      const score = LeadScore.create(50).getValue();
      const result = score.setScore(150);

      expect(result.isFailure).toBe(true);
    });
  });

  describe('toPercentage', () => {
    it('should convert to percentage', () => {
      const score = LeadScore.create(75).getValue();

      expect(score.toPercentage()).toBe(0.75);
    });
  });

  describe('value object equality', () => {
    it('should be equal when values are the same', () => {
      const score1 = LeadScore.create(75).getValue();
      const score2 = LeadScore.create(75).getValue();

      expect(score1.equals(score2)).toBe(true);
    });

    it('should not be equal when values differ', () => {
      const score1 = LeadScore.create(75).getValue();
      const score2 = LeadScore.create(80).getValue();

      expect(score1.equals(score2)).toBe(false);
    });
  });
});
