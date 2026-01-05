// ============================================
// Utils Tests - FASE 5.11
// Unit tests for utility functions
// ============================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  cn,
  formatCurrency,
  formatRelativeDate,
  formatDate,
  getInitials,
  truncate,
  sleep,
  generateId,
  capitalize,
  isEmpty,
  debounce,
  getScoreCategory,
  getStatusColorClass,
} from './utils';

describe('Utils', () => {
  describe('cn', () => {
    it('merges class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('handles conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    });

    it('merges tailwind classes correctly', () => {
      expect(cn('p-2', 'p-4')).toBe('p-4');
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('handles arrays and objects', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('handles undefined and null', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });
  });

  describe('formatCurrency', () => {
    it('formats MXN currency by default', () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain('1,234.56');
    });

    it('formats USD currency', () => {
      const result = formatCurrency(1234.56, 'USD', 'en-US');
      expect(result).toContain('1,234.56');
      expect(result).toContain('$');
    });

    it('handles zero', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0.00');
    });

    it('handles negative numbers', () => {
      const result = formatCurrency(-500);
      expect(result).toContain('500');
    });

    it('handles large numbers', () => {
      const result = formatCurrency(1000000);
      expect(result).toContain('1,000,000');
    });
  });

  describe('formatRelativeDate', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('formats recent time as "hace un momento"', () => {
      const date = new Date('2025-01-15T11:59:30Z');
      expect(formatRelativeDate(date)).toBe('hace un momento');
    });

    it('formats minutes ago', () => {
      const date = new Date('2025-01-15T11:55:00Z');
      expect(formatRelativeDate(date)).toBe('hace 5 minutos');
    });

    it('formats single minute ago', () => {
      const date = new Date('2025-01-15T11:59:00Z');
      expect(formatRelativeDate(date)).toBe('hace 1 minuto');
    });

    it('formats hours ago', () => {
      const date = new Date('2025-01-15T09:00:00Z');
      expect(formatRelativeDate(date)).toBe('hace 3 horas');
    });

    it('formats single hour ago', () => {
      const date = new Date('2025-01-15T11:00:00Z');
      expect(formatRelativeDate(date)).toBe('hace 1 hora');
    });

    it('formats days ago', () => {
      const date = new Date('2025-01-13T12:00:00Z');
      expect(formatRelativeDate(date)).toBe('hace 2 días');
    });

    it('formats single day ago', () => {
      const date = new Date('2025-01-14T12:00:00Z');
      expect(formatRelativeDate(date)).toBe('hace 1 día');
    });

    it('formats older dates with full date', () => {
      const date = new Date('2025-01-01T12:00:00Z');
      const result = formatRelativeDate(date);
      expect(result).toContain('2025');
    });

    it('handles string dates', () => {
      const result = formatRelativeDate('2025-01-15T11:59:30Z');
      expect(result).toBe('hace un momento');
    });
  });

  describe('formatDate', () => {
    it('formats date correctly', () => {
      // Use specific time to avoid timezone issues
      const date = new Date('2025-01-15T12:00:00');
      const result = formatDate(date);
      expect(result).toContain('2025');
      // Date formatted according to locale, check for enero (Spanish) or January
      expect(result).toMatch(/enero|january/i);
    });

    it('handles string dates', () => {
      const result = formatDate('2025-01-15');
      expect(result).toContain('2025');
    });

    it('accepts custom options', () => {
      const date = new Date('2025-01-15');
      const result = formatDate(date, { weekday: 'long' });
      expect(typeof result).toBe('string');
    });
  });

  describe('getInitials', () => {
    it('returns initials from full name', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    it('handles single name', () => {
      expect(getInitials('John')).toBe('J');
    });

    it('handles multiple names', () => {
      expect(getInitials('John Michael Doe')).toBe('JM');
    });

    it('returns uppercase initials', () => {
      expect(getInitials('john doe')).toBe('JD');
    });

    it('handles empty string', () => {
      expect(getInitials('')).toBe('');
    });
  });

  describe('truncate', () => {
    it('truncates long strings', () => {
      expect(truncate('Hello World', 8)).toBe('Hello...');
    });

    it('returns original string if shorter than max length', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('returns original string if equal to max length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('handles empty string', () => {
      expect(truncate('', 5)).toBe('');
    });
  });

  describe('sleep', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns a promise', () => {
      const result = sleep(100);
      expect(result).toBeInstanceOf(Promise);
    });

    it('resolves after specified time', async () => {
      const promise = sleep(100);
      vi.advanceTimersByTime(100);
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('generateId', () => {
    it('generates a string', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
    });

    it('generates unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateId()));
      expect(ids.size).toBe(100);
    });

    it('generates IDs of correct length', () => {
      const id = generateId();
      expect(id.length).toBe(7);
    });
  });

  describe('capitalize', () => {
    it('capitalizes first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('handles already capitalized strings', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });

    it('handles empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('handles single character', () => {
      expect(capitalize('a')).toBe('A');
    });

    it('only capitalizes first letter', () => {
      expect(capitalize('hELLO wORLD')).toBe('HELLO wORLD');
    });
  });

  describe('isEmpty', () => {
    it('returns true for null', () => {
      expect(isEmpty(null)).toBe(true);
    });

    it('returns true for undefined', () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    it('returns true for empty string', () => {
      expect(isEmpty('')).toBe(true);
    });

    it('returns true for whitespace-only string', () => {
      expect(isEmpty('   ')).toBe(true);
    });

    it('returns true for empty array', () => {
      expect(isEmpty([])).toBe(true);
    });

    it('returns true for empty object', () => {
      expect(isEmpty({})).toBe(true);
    });

    it('returns false for non-empty string', () => {
      expect(isEmpty('hello')).toBe(false);
    });

    it('returns false for non-empty array', () => {
      expect(isEmpty([1, 2, 3])).toBe(false);
    });

    it('returns false for non-empty object', () => {
      expect(isEmpty({ key: 'value' })).toBe(false);
    });

    it('returns false for numbers', () => {
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(42)).toBe(false);
    });

    it('returns false for booleans', () => {
      expect(isEmpty(false)).toBe(false);
      expect(isEmpty(true)).toBe(false);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('delays function execution', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledOnce();
    });

    it('only calls function once for rapid calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledOnce();
    });

    it('passes arguments correctly', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('arg1', 'arg2');

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('uses last call arguments', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith('third');
    });

    it('allows subsequent calls after delay', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);

      debouncedFn();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('getScoreCategory', () => {
    it('returns "hot" for scores >= 61', () => {
      expect(getScoreCategory(61)).toBe('hot');
      expect(getScoreCategory(80)).toBe('hot');
      expect(getScoreCategory(100)).toBe('hot');
    });

    it('returns "warm" for scores 41-60', () => {
      expect(getScoreCategory(41)).toBe('warm');
      expect(getScoreCategory(50)).toBe('warm');
      expect(getScoreCategory(60)).toBe('warm');
    });

    it('returns "cold" for scores < 41', () => {
      expect(getScoreCategory(0)).toBe('cold');
      expect(getScoreCategory(20)).toBe('cold');
      expect(getScoreCategory(40)).toBe('cold');
    });
  });

  describe('getStatusColorClass', () => {
    it('returns correct class for known statuses', () => {
      expect(getStatusColorClass('new')).toBe('status-new');
      expect(getStatusColorClass('contacted')).toBe('status-contacted');
      expect(getStatusColorClass('qualified')).toBe('status-qualified');
      expect(getStatusColorClass('proposal')).toBe('status-proposal');
      expect(getStatusColorClass('negotiation')).toBe('status-negotiation');
      expect(getStatusColorClass('won')).toBe('status-won');
      expect(getStatusColorClass('lost')).toBe('status-lost');
    });

    it('returns default class for unknown status', () => {
      expect(getStatusColorClass('unknown')).toBe('status-new');
      expect(getStatusColorClass('')).toBe('status-new');
    });
  });
});
