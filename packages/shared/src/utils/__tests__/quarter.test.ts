/**
 * @fileType: test
 * @status: current
 * @updated: 2026-01-09
 * @tags: [quarter, test, roadmap]
 * @related: [../quarter.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [vitest]
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseQuarter,
  formatQuarter,
  compareQuarters,
  getCurrentQuarter,
  addQuarters,
  isValidQuarter,
  quartersBetween,
  getQuarterStartDate,
  getQuarterEndDate,
  isFarFuture,
  QUARTER_REGEX,
} from '../quarter';

describe('Quarter Utilities', () => {
  describe('QUARTER_REGEX', () => {
    it('should match valid quarter formats', () => {
      expect(QUARTER_REGEX.test('Q1-2026')).toBe(true);
      expect(QUARTER_REGEX.test('Q2-2025')).toBe(true);
      expect(QUARTER_REGEX.test('Q3-2030')).toBe(true);
      expect(QUARTER_REGEX.test('Q4-1999')).toBe(true);
    });

    it('should reject invalid quarter formats', () => {
      expect(QUARTER_REGEX.test('Q0-2026')).toBe(false);
      expect(QUARTER_REGEX.test('Q5-2026')).toBe(false);
      expect(QUARTER_REGEX.test('2026-Q1')).toBe(false);
      expect(QUARTER_REGEX.test('Q1-26')).toBe(false);
      expect(QUARTER_REGEX.test('Q12026')).toBe(false);
      expect(QUARTER_REGEX.test('q1-2026')).toBe(false);
    });
  });

  describe('parseQuarter', () => {
    it('should parse valid quarter strings', () => {
      expect(parseQuarter('Q1-2026')).toEqual({ year: 2026, quarter: 1 });
      expect(parseQuarter('Q4-2025')).toEqual({ year: 2025, quarter: 4 });
      expect(parseQuarter('Q2-2030')).toEqual({ year: 2030, quarter: 2 });
    });

    it('should throw on invalid quarter strings', () => {
      expect(() => parseQuarter('Q5-2026')).toThrow('Invalid quarter format');
      expect(() => parseQuarter('invalid')).toThrow('Invalid quarter format');
      expect(() => parseQuarter('')).toThrow('Invalid quarter format');
    });
  });

  describe('formatQuarter', () => {
    it('should format year and quarter', () => {
      expect(formatQuarter(2026, 1)).toBe('Q1-2026');
      expect(formatQuarter(2025, 4)).toBe('Q4-2025');
      expect(formatQuarter(2030, 2)).toBe('Q2-2030');
    });

    it('should throw on invalid quarter numbers', () => {
      expect(() => formatQuarter(2026, 0)).toThrow('Invalid quarter number');
      expect(() => formatQuarter(2026, 5)).toThrow('Invalid quarter number');
    });
  });

  describe('compareQuarters', () => {
    it('should compare quarters in same year', () => {
      expect(compareQuarters('Q1-2026', 'Q2-2026')).toBeLessThan(0);
      expect(compareQuarters('Q4-2026', 'Q1-2026')).toBeGreaterThan(0);
      expect(compareQuarters('Q2-2026', 'Q2-2026')).toBe(0);
    });

    it('should compare quarters across years', () => {
      expect(compareQuarters('Q4-2025', 'Q1-2026')).toBeLessThan(0);
      expect(compareQuarters('Q1-2027', 'Q4-2026')).toBeGreaterThan(0);
    });
  });

  describe('getCurrentQuarter', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return Q1 for January-March', () => {
      vi.setSystemTime(new Date(2026, 0, 15)); // Jan 15
      expect(getCurrentQuarter()).toBe('Q1-2026');

      vi.setSystemTime(new Date(2026, 2, 31)); // Mar 31
      expect(getCurrentQuarter()).toBe('Q1-2026');
    });

    it('should return Q2 for April-June', () => {
      vi.setSystemTime(new Date(2026, 3, 1)); // Apr 1
      expect(getCurrentQuarter()).toBe('Q2-2026');

      vi.setSystemTime(new Date(2026, 5, 30)); // Jun 30
      expect(getCurrentQuarter()).toBe('Q2-2026');
    });

    it('should return Q3 for July-September', () => {
      vi.setSystemTime(new Date(2026, 6, 1)); // Jul 1
      expect(getCurrentQuarter()).toBe('Q3-2026');
    });

    it('should return Q4 for October-December', () => {
      vi.setSystemTime(new Date(2026, 9, 1)); // Oct 1
      expect(getCurrentQuarter()).toBe('Q4-2026');

      vi.setSystemTime(new Date(2026, 11, 31)); // Dec 31
      expect(getCurrentQuarter()).toBe('Q4-2026');
    });
  });

  describe('addQuarters', () => {
    it('should add quarters within same year', () => {
      expect(addQuarters('Q1-2026', 1)).toBe('Q2-2026');
      expect(addQuarters('Q1-2026', 2)).toBe('Q3-2026');
      expect(addQuarters('Q1-2026', 3)).toBe('Q4-2026');
    });

    it('should roll over to next year', () => {
      expect(addQuarters('Q4-2025', 1)).toBe('Q1-2026');
      expect(addQuarters('Q3-2025', 2)).toBe('Q1-2026');
      expect(addQuarters('Q1-2026', 4)).toBe('Q1-2027');
    });

    it('should handle negative values', () => {
      expect(addQuarters('Q2-2026', -1)).toBe('Q1-2026');
      expect(addQuarters('Q1-2026', -1)).toBe('Q4-2025');
      expect(addQuarters('Q1-2026', -4)).toBe('Q1-2025');
    });
  });

  describe('isValidQuarter', () => {
    it('should return true for valid quarters', () => {
      expect(isValidQuarter('Q1-2026')).toBe(true);
      expect(isValidQuarter('Q4-2025')).toBe(true);
    });

    it('should return false for invalid quarters', () => {
      expect(isValidQuarter('Q5-2026')).toBe(false);
      expect(isValidQuarter('invalid')).toBe(false);
      expect(isValidQuarter('')).toBe(false);
    });
  });

  describe('quartersBetween', () => {
    it('should calculate quarters between dates', () => {
      expect(quartersBetween('Q1-2026', 'Q4-2026')).toBe(3);
      expect(quartersBetween('Q1-2026', 'Q1-2027')).toBe(4);
      expect(quartersBetween('Q1-2026', 'Q1-2028')).toBe(8);
    });

    it('should return negative for reverse order', () => {
      expect(quartersBetween('Q4-2026', 'Q1-2026')).toBe(-3);
    });

    it('should return 0 for same quarter', () => {
      expect(quartersBetween('Q1-2026', 'Q1-2026')).toBe(0);
    });
  });

  describe('getQuarterStartDate', () => {
    it('should return first day of quarter', () => {
      const q1 = getQuarterStartDate('Q1-2026');
      expect(q1.getFullYear()).toBe(2026);
      expect(q1.getMonth()).toBe(0); // January
      expect(q1.getDate()).toBe(1);

      const q3 = getQuarterStartDate('Q3-2026');
      expect(q3.getMonth()).toBe(6); // July
    });
  });

  describe('getQuarterEndDate', () => {
    it('should return last day of quarter', () => {
      const q1 = getQuarterEndDate('Q1-2026');
      expect(q1.getFullYear()).toBe(2026);
      expect(q1.getMonth()).toBe(2); // March
      expect(q1.getDate()).toBe(31);

      const q2 = getQuarterEndDate('Q2-2026');
      expect(q2.getMonth()).toBe(5); // June
      expect(q2.getDate()).toBe(30);

      const q4 = getQuarterEndDate('Q4-2026');
      expect(q4.getMonth()).toBe(11); // December
      expect(q4.getDate()).toBe(31);
    });
  });

  describe('isFarFuture', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 0, 9)); // Jan 9, 2026 (Q1-2026)
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for quarters > 2 years away', () => {
      expect(isFarFuture('Q2-2028')).toBe(true); // 9 quarters away
      expect(isFarFuture('Q1-2029')).toBe(true); // 12 quarters away
    });

    it('should return false for quarters <= 2 years away', () => {
      expect(isFarFuture('Q1-2028')).toBe(false); // 8 quarters away (exactly 2 years)
      expect(isFarFuture('Q4-2027')).toBe(false); // 7 quarters away
      expect(isFarFuture('Q1-2026')).toBe(false); // current
    });
  });
});
