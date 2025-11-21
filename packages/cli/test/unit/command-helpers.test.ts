/**
 * @fileType: test
 * @status: current
 * @updated: 2025-11-18
 * @tags: [test, command-patterns, smart-defaults, adr-046]
 * @related: [../../src/utils/command-helpers.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest]
 */

import { jest } from '@jest/globals';
import {
  detectCategory,
  detectImpact,
  shouldCreateContextModule,
  getQualityDescription,
  getQualityBreakdown,
  formatFeedback,
  analyzeQuality,
} from '../../src/utils/command-helpers.js';
import type { LogEntry } from '../../src/core/session-log-manager.js';

describe('detectCategory', () => {
  it('should detect fix category from keywords', () => {
    expect(detectCategory('Fixed authentication bug in login flow')).toBe('fix');
    expect(detectCategory('Resolved timeout error. Root cause: bcrypt rounds too high')).toBe('fix');
    expect(detectCategory('Patched security issue in API endpoint')).toBe('fix');
  });

  it('should detect feature category from keywords', () => {
    expect(detectCategory('Implemented dark mode toggle in settings')).toBe('feature');
    expect(detectCategory('Added new feature for user preferences')).toBe('feature');
    expect(detectCategory('Created analytics dashboard component')).toBe('feature');
  });

  it('should detect decision category from keywords', () => {
    expect(detectCategory('Chose JWT over session cookies. Alternative was...')).toBe('decision');
    expect(detectCategory('Decided to use PostgreSQL instead of MySQL')).toBe('decision');
    expect(detectCategory('Selected approach A vs approach B. Rationale: performance')).toBe('decision');
  });

  it('should detect insight category from keywords', () => {
    expect(detectCategory('Discovered that bcrypt rounds 11 provide optimal balance')).toBe('insight');
    expect(detectCategory('Learned important pattern about async error handling')).toBe('insight');
    expect(detectCategory('Key finding: cache invalidation timing matters')).toBe('insight');
  });

  it('should detect achievement category from keywords', () => {
    expect(detectCategory('Completed milestone: all tests passing at 100%')).toBe('achievement');
    expect(detectCategory('Shipped v2.0 to production successfully')).toBe('achievement');
    expect(detectCategory('Delivered full authentication system')).toBe('achievement');
  });

  it('should detect git category from keywords', () => {
    expect(detectCategory('Merged PR #123 into main branch')).toBe('git');
    expect(detectCategory('Created feature branch for new auth system')).toBe('git');
    expect(detectCategory('Rebased commits onto latest main')).toBe('git');
  });

  it('should return null for ambiguous descriptions', () => {
    expect(detectCategory('Updated some code')).toBe(null);
    expect(detectCategory('Made changes')).toBe(null);
    expect(detectCategory('Modified file.ts')).toBe(null);
  });

  it('should return null for single weak match (low confidence)', () => {
    // Only one pattern matches - not enough confidence
    expect(detectCategory('Fixed typo')).toBe(null);
  });

  it('should handle edge cases safely', () => {
    // @ts-expect-error - testing runtime null handling
    expect(detectCategory(null)).toBe(null);
    // @ts-expect-error - testing runtime undefined handling
    expect(detectCategory(undefined)).toBe(null);
    expect(detectCategory('')).toBe(null);
    expect(detectCategory('   ')).toBe(null);
    expect(detectCategory('  \n\t  ')).toBe(null);
  });
});

describe('detectImpact', () => {
  it('should detect high impact from percentage metrics', () => {
    expect(detectImpact('Reduced build time by 85%')).toBe('high');
    expect(detectImpact('Improved performance: 50% faster response time')).toBe('high');
    expect(detectImpact('Token reduction: 95% improvement')).toBe('high');
  });

  it('should detect high impact from multiplier metrics', () => {
    expect(detectImpact('Made queries 10x faster with indexing')).toBe('high');
    expect(detectImpact('Achieved 100x throughput increase')).toBe('high');
  });

  it('should detect high impact from time metrics', () => {
    expect(detectImpact('Startup time: 90s → 2s')).toBe('high');
    expect(detectImpact('Reduced latency from 500ms to 50ms')).toBe('high');
    expect(detectImpact('Build time 10 minutes → 1 minute')).toBe('high');
  });

  it('should detect high impact from severity keywords', () => {
    expect(detectImpact('Critical production bug blocking deployments')).toBe('high');
    expect(detectImpact('Major security vulnerability in authentication')).toBe('high');
    expect(detectImpact('Severe performance degradation affecting users')).toBe('high');
  });

  it('should detect high impact from high percentages', () => {
    expect(detectImpact('Test coverage now at 95%')).toBe('high');
    expect(detectImpact('Achieved 99% uptime SLA')).toBe('high');
  });

  it('should detect low impact from keywords', () => {
    expect(detectImpact('Minor typo correction in comments')).toBe('low');
    expect(detectImpact('Small formatting change for consistency')).toBe('low');
    expect(detectImpact('Trivial documentation update')).toBe('low');
    expect(detectImpact('Cosmetic UI adjustment')).toBe('low');
  });

  it('should detect medium impact from keywords', () => {
    expect(detectImpact('Updated API endpoint with better validation')).toBe('medium');
    expect(detectImpact('Refactored authentication module for clarity')).toBe('medium');
    expect(detectImpact('Improved error messages for users')).toBe('medium');
  });

  it('should default to medium for neutral descriptions', () => {
    expect(detectImpact('Changed implementation approach')).toBe('medium');
    expect(detectImpact('Modified database schema')).toBe('medium');
  });

  it('should handle edge cases with safe defaults', () => {
    // @ts-expect-error - testing runtime null handling
    expect(detectImpact(null)).toBe('medium');
    // @ts-expect-error - testing runtime undefined handling
    expect(detectImpact(undefined)).toBe('medium');
    expect(detectImpact('')).toBe('medium');
    expect(detectImpact('   ')).toBe('medium');
    expect(detectImpact('  \n\t  ')).toBe('medium');
  });
});

describe('shouldCreateContextModule', () => {
  it('should return true for high impact eligible categories', () => {
    expect(shouldCreateContextModule('fix', 'high')).toBe(true);
    expect(shouldCreateContextModule('feature', 'high')).toBe(true);
    expect(shouldCreateContextModule('decision', 'high')).toBe(true);
    expect(shouldCreateContextModule('insight', 'high')).toBe(true);
  });

  it('should return false for non-high impact', () => {
    expect(shouldCreateContextModule('fix', 'medium')).toBe(false);
    expect(shouldCreateContextModule('feature', 'low')).toBe(false);
  });

  it('should return false for ineligible categories', () => {
    expect(shouldCreateContextModule('git', 'high')).toBe(false);
    expect(shouldCreateContextModule('achievement', 'high')).toBe(false);
  });
});

describe('getQualityDescription', () => {
  it('should return Excellent for score >= 90', () => {
    const result = getQualityDescription({ score: 100, warnings: [] });
    expect(result).toContain('Excellent');
    expect(result).toContain('WHAT+WHY+HOW');
  });

  it('should return Good for score >= 70', () => {
    const result = getQualityDescription({ score: 80, warnings: ['Some warning'] });
    expect(result).toContain('Good');
    expect(result).toContain('meets quality threshold');
  });

  it('should return Fair for score >= 50', () => {
    const result = getQualityDescription({ score: 60, warnings: ['Warning 1', 'Warning 2'] });
    expect(result).toContain('Fair');
    expect(result).toContain('could use more context');
  });

  it('should return Needs improvement for score < 50', () => {
    const result = getQualityDescription({
      score: 40,
      warnings: ['W1', 'W2', 'W3'],
    });
    expect(result).toContain('Needs improvement');
    expect(result).toContain('add WHAT+WHY+HOW');
  });
});

describe('getQualityBreakdown', () => {
  it('should extract WHAT/WHY/HOW from well-formed description', () => {
    const description =
      'Fixed EventQueue timer. Root cause: setInterval kept process alive. Solution: Added .unref() call. Impact: 90s → 2s startup';
    const breakdown = getQualityBreakdown(description);

    expect(breakdown).toBeTruthy();
    expect(breakdown).toContain('WHAT');
    expect(breakdown).toContain('WHY');
    expect(breakdown).toContain('HOW');
    expect(breakdown).toContain('IMPACT');
  });

  it('should extract WHAT and WHY from description with "because"', () => {
    const description =
      'Implemented caching layer because API calls were too slow. Added Redis with 5-minute TTL';
    const breakdown = getQualityBreakdown(description);

    expect(breakdown).toBeTruthy();
    expect(breakdown).toContain('WHAT');
    expect(breakdown).toContain('WHY');
  });

  it('should return null for descriptions missing key components', () => {
    const description = 'Updated code';
    const breakdown = getQualityBreakdown(description);

    expect(breakdown).toBeNull();
  });

  it('should extract metrics from impact indicators', () => {
    const description = 'Optimized query performance from 500ms to 50ms';
    const breakdown = getQualityBreakdown(description);

    expect(breakdown).toBeTruthy();
    expect(breakdown).toContain('500ms');
    expect(breakdown).toContain('50ms');
  });
});

describe('formatFeedback', () => {
  it('should format basic feedback with category and impact', () => {
    const output = formatFeedback({
      category: 'fix',
      impact: 'high',
    });

    expect(output).toContain('Event logged: fix');
    expect(output).toContain('high impact');
  });

  it('should show auto-detection labels when applicable', () => {
    const output = formatFeedback({
      category: 'fix',
      impact: 'high',
      autoDetected: {
        category: true,
        impact: true,
      },
    });

    expect(output).toContain('auto-detected');
    expect(output).toContain('category=fix');
    expect(output).toContain('impact=high');
  });

  it('should include quality analysis when provided', () => {
    const output = formatFeedback({
      category: 'fix',
      impact: 'high',
      quality: {
        score: 95,
        warnings: [],
      },
    });

    expect(output).toContain('Quality:');
    expect(output).toContain('Excellent');
  });

  it('should list files when provided', () => {
    const output = formatFeedback({
      category: 'fix',
      impact: 'high',
      files: ['src/auth.ts', 'src/login.ts', 'src/utils.ts'],
    });

    expect(output).toContain('Files:');
    expect(output).toContain('3 auto-included');
    expect(output).toContain('src/auth.ts');
    expect(output).toContain('src/login.ts');
  });

  it('should truncate long file lists', () => {
    const files = ['file1.ts', 'file2.ts', 'file3.ts', 'file4.ts', 'file5.ts'];
    const output = formatFeedback({
      category: 'fix',
      impact: 'high',
      files,
    });

    expect(output).toContain('... and 2 more');
  });

  it('should show references when detected', () => {
    const output = formatFeedback({
      category: 'fix',
      impact: 'high',
      references: [{ rawText: 'TASK-001' }, { rawText: 'ADR-046' }],
    });

    expect(output).toContain('References:');
    expect(output).toContain('2 detected');
    expect(output).toContain('TASK-001');
  });

  it('should indicate context module creation', () => {
    const output = formatFeedback({
      category: 'fix',
      impact: 'high',
      moduleCreated: true,
    });

    expect(output).toContain('Context module:');
    expect(output).toContain('Created');
  });

  it('should include quality coaching for entries with warnings', () => {
    const output = formatFeedback({
      category: 'fix',
      impact: 'medium',
      quality: {
        score: 60,
        warnings: ['Description is terse', 'Missing root cause'],
      },
    });

    expect(output).toContain('Quality Tips:');
    expect(output).toContain('Description is terse');
    expect(output).toContain('Missing root cause');
    expect(output).toContain('WHAT+WHY+HOW');
  });
});

describe('analyzeQuality', () => {
  it('should return perfect score for entries without warnings', () => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      category: 'fix',
      description:
        'Fixed authentication timeout. Root cause: bcrypt rounds too high. Reduced to 11 for 200ms response time.',
      impact: 'high',
      files: ['src/auth.ts'],
    };

    const result = analyzeQuality(entry);
    expect(result.score).toBe(100);
    expect(result.warnings).toHaveLength(0);
  });

  it('should penalize score for terse descriptions', () => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      category: 'fix',
      description: 'Fixed bug',
      impact: 'medium',
    };

    const result = analyzeQuality(entry);
    expect(result.score).toBeLessThan(100);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should warn about missing root cause in fix entries', () => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      category: 'fix',
      description: 'Fixed the authentication timeout by reducing bcrypt rounds to eleven',
      impact: 'high',
    };

    const result = analyzeQuality(entry);
    expect(result.warnings).toContain('Fix entry should include root cause (why it happened).');
  });

  it('should warn about missing WHY in feature entries', () => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      category: 'feature',
      description: 'Implemented dark mode toggle in application settings panel',
      impact: 'medium',
    };

    const result = analyzeQuality(entry);
    expect(result.warnings).toContain('Feature entry should explain WHY (what problem it solves).');
  });

  it('should warn about missing alternatives in decision entries', () => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      category: 'decision',
      description: 'Chose JWT for authentication because it enables stateless scaling',
      impact: 'medium',
    };

    const result = analyzeQuality(entry);
    expect(result.warnings).toContain('Decision entry should mention alternatives considered.');
  });
});
